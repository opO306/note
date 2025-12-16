import { onDocumentCreated, onDocumentUpdated, onDocumentDeleted } from "firebase-functions/v2/firestore";
import * as logger from "firebase-functions/logger";

// core.ts 파일에서 공유 모듈과 함수를 가져옵니다.
import {
    db,
    admin,
    containsProfanity,
    findProfanity,
    updateTrustScore,
    REPORT_NEEDS_REVIEW_THRESHOLD,
    REPORT_AUTO_HIDE_THRESHOLD
} from "./core";
import { sendPushNotification } from "./notificationService"; // 별도 파일로 분리된 경우

// =====================================================
// Firestore Triggers
// =====================================================

/**
 * 1. 게시글 생성 시 실행되는 트리거
 * - 욕설 포함 시 자동 숨김 처리
 * - 사용자 게시글 수 업데이트 및 첫 글 작성 업적 부여
 */
export const onPostCreated = onDocumentCreated(
    { document: "posts/{postId}", region: "asia-northeast3" },
    async (event) => {
        const snapshot = event.data;
        if (!snapshot) return;

        const post = snapshot.data();
        const userId = post.authorUid || post.userId;
        const postId = event.params.postId;

        // 욕설 필터링 로직
        try {
            const title = post.title || "";
            const content = post.content || "";
            const tags = Array.isArray(post.tags) ? post.tags : [];

            let detectedWord = await findProfanity(title);
            if (!detectedWord) detectedWord = await findProfanity(content);
            if (!detectedWord) {
                for (const t of tags) {
                    const res = await findProfanity(String(t));
                    if (res) { detectedWord = res; break; }
                }
            }

            if (detectedWord && !post.hidden) {
                logger.warn(`🚫 [자동 숨김] 문서: ${postId}, 감지된 단어: "${detectedWord}"`);
                await snapshot.ref.update({
                    hidden: true,
                    hiddenReason: `profanity_filter: ${detectedWord}`,
                    autoHiddenAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
        } catch (error) {
            logger.error(`[profanity] 게시글(${postId}) 필터 처리 실패`, { error: (error as Error).message });
        }

        // 사용자 게시글 카운트 및 업적 처리
        if (userId) {
            await db.runTransaction(async (t) => {
                const userRef = db.collection("users").doc(userId);
                const userSnap = await t.get(userRef);
                if (!userSnap.exists) return;

                const currentCount = (userSnap.data()?.postCount || 0) + 1;
                t.update(userRef, { postCount: currentCount });

                // 첫 게시글 업적 처리
                if (currentCount === 1) {
                    const achRef = userRef.collection("achievements").doc("first_post");
                    const achSnap = await t.get(achRef);
                    if (!achSnap.exists) {
                        t.set(achRef, {
                            id: "first_post",
                            title: "첫 발걸음",
                            description: "첫 게시글을 작성했습니다.",
                            acquiredAt: admin.firestore.FieldValue.serverTimestamp(),
                            isRead: false
                        });
                    }
                }
            });
        }
    },
);

/**
 * 2. 게시글 수정 시 실행되는 트리거
 * - 수정된 내용에 욕설 포함 시 자동 숨김 처리
 * - 새로 추가된 댓글에 욕설 포함 시 자동 숨김 처리
 * - 새로운 댓글/멘션에 대한 알림 처리
 */
export const onPostUpdated = onDocumentUpdated(
    { document: "posts/{postId}", region: "asia-northeast3" },
    async (event) => {
        const before = event.data?.before?.data();
        const after = event.data?.after?.data();
        if (!before || !after) return;

        const postRef = event.data?.after?.ref;
        const postId = event.params.postId;
        const updatePayload: any = {};

        // 2-1. 게시글 자체의 내용 변경 감지 (욕설 필터링)
        try {
            const hasBadTitle = await containsProfanity(after.title);
            const hasBadContent = await containsProfanity(after.content);
            const hasBadTag = (await Promise.all((after.tags || []).map((t: any) => containsProfanity(String(t))))).some((v) => v);

            if ((hasBadTitle || hasBadContent || hasBadTag) && !after.hidden) {
                updatePayload.hidden = true;
                updatePayload.hiddenReason = "profanity_filter_update";
                updatePayload.autoHiddenAt = admin.firestore.FieldValue.serverTimestamp();
            }
        } catch (e) {
            logger.error(`[profanity] 게시글(${postId}) 수정 필터 처리 실패`, { error: (e as Error).message });
        }

        // 2-2. 댓글 배열 변경 감지 (욕설 필터링 및 알림)
        const beforeReplies = before.replies || [];
        const afterReplies = after.replies || [];

        // 2-2-A. 새로 추가된 댓글에 대한 욕설 필터링
        if (afterReplies.length > beforeReplies.length) {
            let repliesChanged = false;
            // 배열 전체를 순회하며 새로 추가되거나 변경된 댓글을 확인
            for (let i = 0; i < afterReplies.length; i++) {
                const reply = afterReplies[i] || {};
                const prev = beforeReplies.find((r: any) => r.id === reply.id); // ID 기반으로 이전 상태 찾기
                // 새 댓글이거나, 이전에 숨김 처리되지 않은 댓글이 업데이트된 경우
                if ((!prev || !prev.hidden) && !reply.hidden) {
                    if (await containsProfanity(reply.content)) {
                        afterReplies[i] = { ...reply, hidden: true, hiddenReason: "profanity_filter" };
                        repliesChanged = true;
                    }
                }
            }
            if (repliesChanged) {
                updatePayload.replies = afterReplies;
            }

            // 2-2-B. 새로운 댓글 및 멘션 알림
            const newReply = afterReplies[afterReplies.length - 1]; // 가장 마지막 댓글을 새 댓글로 가정
            const postAuthorUid = after.authorUid || after.userId;
            const replyAuthorUid = newReply.authorUid || newReply.userId;
            const replyContent = newReply.content || "";

            // 내 글에 내가 댓글 단 경우는 제외하고 알림
            if (postAuthorUid && postAuthorUid !== replyAuthorUid) {
                await sendPushNotification({
                    targetUid: postAuthorUid,
                    type: "reply",
                    title: "내 글에 새 댓글이 달렸어요 💬",
                    body: `${newReply.authorNickname}: ${replyContent.substring(0, 30)}...`,
                    link: `/post/${postId}`
                });
            }

            // 멘션(@) 알림 처리
            const mentionRegex = /@([가-힣a-zA-Z0-9_]{2,12})/g;
            const matches = replyContent.match(mentionRegex);
            if (matches) {
                const mentionedNicknames = [...new Set(matches.map((m: string) => m.substring(1)))];
                for (const nickname of mentionedNicknames.slice(0, 3)) { // 최대 3명까지만 처리
                    const userQuery = await db.collection("users").where("nickname", "==", nickname).limit(1).get();
                    if (!userQuery.empty) {
                        const targetUid = userQuery.docs[0].id;
                        if (targetUid !== replyAuthorUid) { // 자기 자신을 멘션한 경우 제외
                            await sendPushNotification({
                                targetUid: targetUid,
                                type: "mention",
                                title: "누군가 나를 언급했어요 📢",
                                body: `${newReply.authorNickname}님이 답글에서 회원님을 언급했습니다.`,
                                link: `/post/${postId}`
                            });
                        }
                    }
                }
            }
        }

        // 변경 사항이 있으면 Firestore에 한 번에 업데이트
        if (Object.keys(updatePayload).length > 0 && postRef) {
            await postRef.update(updatePayload);
        }
    },
);

/**
 * 3. 신고 생성 시 실행되는 트리거
 * - 신고 횟수를 집계하고, 임계값 도달 시 콘텐츠 상태를 변경 (검토 필요, 자동 숨김 등)
 */
export const onReportCreated = onDocumentCreated(
    { document: "reports/{reportId}", region: "asia-northeast3" },
    async (event) => {
        const snapshot = event.data;
        if (!snapshot) return;

        const report = snapshot.data();
        const { targetType, targetId, postId } = report;
        const reportRef = snapshot.ref;

        if (!targetType || !targetId) return;

        // 게시글 신고 처리
        if (targetType === "post") {
            const targetRef = db.collection("posts").doc(String(targetId));
            await db.runTransaction(async (tx) => {
                const targetSnap = await tx.get(targetRef);
                if (!targetSnap.exists) return;

                const newCount = (targetSnap.data()?.reportCount || 0) + 1;
                const updateTargetPayload: any = {
                    reportCount: admin.firestore.FieldValue.increment(1),
                    lastReportedAt: admin.firestore.FieldValue.serverTimestamp(),
                };
                const updateReportPayload: any = {};

                if (newCount >= REPORT_NEEDS_REVIEW_THRESHOLD) {
                    updateReportPayload.status = "needs_review";
                }
                if (newCount >= REPORT_AUTO_HIDE_THRESHOLD) {
                    updateTargetPayload.hidden = true;
                    updateTargetPayload.autoHiddenAt = admin.firestore.FieldValue.serverTimestamp();
                    updateReportPayload.status = "auto_hidden";
                    updateReportPayload.autoHidden = true;
                }

                tx.update(targetRef, updateTargetPayload);
                if (Object.keys(updateReportPayload).length > 0) {
                    tx.update(reportRef, updateReportPayload);
                }
            });
        }
        // 댓글 신고 처리 (리팩토링 제안을 반영한 하위 컬렉션 구조 기준)
        else if (targetType === "reply") {
            if (!postId) return;
            const replyRef = db.collection("posts").doc(String(postId)).collection("replies").doc(String(targetId));
            await db.runTransaction(async (tx) => {
                const replySnap = await tx.get(replyRef);
                if (!replySnap.exists) return;

                const newCount = (replySnap.data()?.reportCount || 0) + 1;
                const updateReplyPayload: any = {
                    reportCount: admin.firestore.FieldValue.increment(1),
                };
                const updateReportPayload: any = {};

                if (newCount >= REPORT_NEEDS_REVIEW_THRESHOLD) {
                    updateReportPayload.status = "needs_review";
                }
                if (newCount >= REPORT_AUTO_HIDE_THRESHOLD) {
                    updateReplyPayload.hidden = true;
                    updateReplyPayload.autoHiddenAt = admin.firestore.FieldValue.serverTimestamp();
                    updateReportPayload.status = "auto_hidden";
                    updateReportPayload.autoHidden = true;
                }

                tx.update(replyRef, updateReplyPayload);
                if (Object.keys(updateReportPayload).length > 0) {
                    tx.update(reportRef, updateReportPayload);
                }
            });
        }
    }
);

/**
 * 4. 신고 상태 변경 시 실행되는 트리거
 * - 관리자가 신고를 '확정'하면 피신고자의 신뢰도를 낮추고, 신고자의 신뢰도를 높입니다.
 * - 확정된 콘텐츠를 숨김 처리합니다.
 */
export const onReportStatusChanged = onDocumentUpdated(
    { document: "reports/{reportId}", region: "asia-northeast3" },
    async (event) => {
        const before = event.data?.before?.data();
        const after = event.data?.after?.data();
        if (!before || !after || before.status === after.status || after.status !== "confirmed") return;

        const { targetAuthorUid, reporterUid, targetType, targetId, postId } = after;

        await db.runTransaction(async (tx) => {
            // 신뢰도 업데이트 (피신고자 -10, 신고자 +1)
            if (targetAuthorUid) {
                await updateTrustScore(tx, targetAuthorUid, -10, "report_confirmed_penalty");
            }
            if (reporterUid) {
                await updateTrustScore(tx, reporterUid, 1, "report_confirmed_reward");
            }

            // 콘텐츠 숨김 처리
            if (targetType === "post") {
                const postRef = db.collection("posts").doc(targetId);
                tx.update(postRef, {
                    hidden: true,
                    hiddenReason: "report_confirmed",
                    confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            } else if (targetType === "reply" && postId) {
                const replyRef = db.collection("posts").doc(postId).collection("replies").doc(targetId);
                tx.update(replyRef, {
                    hidden: true,
                    hiddenReason: "report_confirmed",
                    confirmedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
        });
    }
);

/**
 * 5. 팔로우 생성 시 실행되는 트리거
 * - 팔로워/팔로잉 카운트를 업데이트하고, 팔로우 알림을 생성합니다.
 */
export const onFollowCreated = onDocumentCreated(
    { document: "follows/{followId}", region: "asia-northeast3" },
    async (event) => {
        const data = event.data?.data();
        if (!data) return;

        const { followerUid, followingUid } = data;
        if (!followerUid || !followingUid) return;

        const batch = db.batch();
        const followerRef = db.collection("users").doc(followerUid);
        batch.update(followerRef, { followingCount: admin.firestore.FieldValue.increment(1) });
        const followingRef = db.collection("users").doc(followingUid);
        batch.update(followingRef, { followerCount: admin.firestore.FieldValue.increment(1) });
        await batch.commit();

        // 알림 생성
        const notifRef = db.collection("user_notifications").doc(followingUid).collection("items").doc(event.params.followId);
        await notifRef.set({
            type: "follow",
            fromUid: followerUid,
            toUid: followingUid,
            read: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });
    }
);

/**
 * 6. 팔로우 삭제 시 실행되는 트리거
 * - 팔로워/팔로잉 카운트를 감소시킵니다.
 */
export const onFollowDeleted = onDocumentDeleted(
    { document: "follows/{followId}", region: "asia-northeast3" },
    async (event) => {
        const data = event.data?.data();
        if (!data) return;

        const { followerUid, followingUid } = data;
        if (!followerUid || !followingUid) return;

        const batch = db.batch();
        const followerRef = db.collection("users").doc(followerUid);
        batch.update(followerRef, { followingCount: admin.firestore.FieldValue.increment(-1) });
        const followingRef = db.collection("users").doc(followingUid);
        batch.update(followingRef, { followerCount: admin.firestore.FieldValue.increment(-1) });
        await batch.commit();
    }
);