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
    REPORT_AUTO_HIDE_THRESHOLD,
    detectPersonalInfo,
    checkUserRestrictions,
    checkRateLimit,
    detectSpam
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

        if (!userId) {
            logger.warn(`[onPostCreated] 작성자 UID 없음: ${postId}`);
            return;
        }

        // ✅ 통합 모더레이션 검사
        const moderationResults: string[] = [];

        // 1. 신뢰도 기반 제재 확인
        try {
            const restrictions = await checkUserRestrictions(userId);
            if (!restrictions.canPost) {
                logger.warn(`[모더레이션] 게시물 작성 제한: ${postId}, 사용자: ${userId}, 제한: ${restrictions.restrictions.join(",")}`);
                await snapshot.ref.update({
                    hidden: true,
                    hiddenReason: `restriction: ${restrictions.restrictions.join(",")}`,
                    autoHiddenAt: admin.firestore.FieldValue.serverTimestamp(),
                });
                return; // 제한된 사용자는 더 이상 처리하지 않음
            }
        } catch (error) {
            logger.error(`[모더레이션] 신뢰도 확인 실패 (${postId})`, { error: (error as Error).message });
        }

        // 2. Rate Limiting 확인
        try {
            await checkRateLimit(userId, "createPost");
        } catch (error) {
            logger.warn(`[Rate Limit] 게시물 삭제: ${postId}, 사용자: ${userId}`);
            await snapshot.ref.delete();
            return;
        }

        // 3. 욕설 필터링
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
                moderationResults.push(`profanity: ${detectedWord}`);
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

        // 4. 개인정보 유출 감지
        try {
            const title = post.title || "";
            const content = post.content || "";
            const fullText = `${title} ${content}`;
            const personalInfo = detectPersonalInfo(fullText);

            if (personalInfo.hasPersonalInfo && !post.hidden) {
                moderationResults.push(`personal_info: ${personalInfo.detectedTypes.join(",")}`);
                logger.warn(`🚫 [자동 숨김] 개인정보 유출: ${postId}, 유형: ${personalInfo.detectedTypes.join(",")}`);
                await snapshot.ref.update({
                    hidden: true,
                    hiddenReason: `personal_info: ${personalInfo.detectedTypes.join(",")}`,
                    autoHiddenAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
        } catch (error) {
            logger.error(`[personal_info] 게시글(${postId}) 검사 실패`, { error: (error as Error).message });
        }

        // 5. 스팸 감지
        try {
            const title = post.title || "";
            const content = post.content || "";
            const fullText = `${title} ${content}`;
            const spamCheck = await detectSpam(userId, fullText, "post");

            if (spamCheck.isSpam && !post.hidden) {
                moderationResults.push(`spam: ${spamCheck.reason}`);
                logger.warn(`🚫 [자동 숨김] 스팸 감지: ${postId}, 사유: ${spamCheck.reason}`);
                await snapshot.ref.update({
                    hidden: true,
                    hiddenReason: `spam: ${spamCheck.reason}`,
                    autoHiddenAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
        } catch (error) {
            logger.error(`[spam] 게시글(${postId}) 검사 실패`, { error: (error as Error).message });
        }

        // ✅ 게시글 본문 멘션(@) 알림 처리
        try {
            const postContent = post.content || "";
            const mentionRegex = /@([가-힣a-zA-Z0-9_]{2,12})/g;
            const matches = postContent.match(mentionRegex);
            if (matches) {
                const mentionedNicknames = [...new Set(matches.map((m: string) => m.substring(1)))];
                const postAuthorNickname = post.author || "";
                const postAuthorAvatar = post.authorAvatar || null;
                
                for (const nickname of mentionedNicknames.slice(0, 3)) { // 최대 3명까지만 처리
                    const userQuery = await db.collection("users").where("nickname", "==", nickname).limit(1).get();
                    if (!userQuery.empty) {
                        const targetUid = userQuery.docs[0].id;
                        if (targetUid !== userId) { // 자기 자신을 멘션한 경우 제외
                            // user_notifications에 알림 문서 생성 (onNotificationCreated 트리거가 푸시 알림 발송)
                            const mentionNotifRef = db.collection("user_notifications").doc(targetUid).collection("items").doc();
                            await mentionNotifRef.set({
                                type: "mention",
                                fromUserUid: userId,
                                toUserUid: targetUid,
                                categoryId: post.categoryId || post.category || null,
                                data: {
                                    postId: postId,
                                    userId: userId,
                                    userName: postAuthorNickname,
                                    userAvatar: postAuthorAvatar,
                                },
                                read: false,
                                timestamp: Date.now(),
                                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                            });
                        }
                    }
                }
            }
        } catch (error) {
            logger.error(`[onPostCreated] 멘션 알림 생성 실패 (${postId})`, error);
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

        // 2-1. 게시글 자체의 내용 변경 감지 (통합 모더레이션)
        try {
            const hasBadTitle = await containsProfanity(after.title);
            const hasBadContent = await containsProfanity(after.content);
            const hasBadTag = (await Promise.all((after.tags || []).map((t: any) => containsProfanity(String(t))))).some((v) => v);

            // 개인정보 유출 감지
            const title = after.title || "";
            const content = after.content || "";
            const fullText = `${title} ${content}`;
            const personalInfo = detectPersonalInfo(fullText);

            const moderationReasons: string[] = [];
            if (hasBadTitle || hasBadContent || hasBadTag) {
                moderationReasons.push("profanity_filter");
            }
            if (personalInfo.hasPersonalInfo) {
                moderationReasons.push(`personal_info: ${personalInfo.detectedTypes.join(",")}`);
            }

            // 스팸 감지 (수정된 내용에 대해)
            if (!moderationReasons.length) {
                const userId = after.authorUid || after.userId;
                if (userId) {
                    const spamCheck = await detectSpam(userId, fullText, "post");
                    if (spamCheck.isSpam) {
                        moderationReasons.push(`spam: ${spamCheck.reason}`);
                    }
                }
            }

            if (moderationReasons.length > 0 && !after.hidden) {
                updatePayload.hidden = true;
                updatePayload.hiddenReason = `update_${moderationReasons.join(", ")}`;
                updatePayload.autoHiddenAt = admin.firestore.FieldValue.serverTimestamp();
                logger.warn(`🚫 [게시글 수정 자동 숨김] ${postId}, 이유: ${moderationReasons.join(", ")}`);
            }
        } catch (e) {
            logger.error(`[모더레이션] 게시글(${postId}) 수정 필터 처리 실패`, { error: (e as Error).message });
        }

        // ✅ 게시글 본문 수정 시 멘션(@) 알림 처리 (새로 추가된 멘션만)
        try {
            const beforeContent = before.content || "";
            const afterContent = after.content || "";
            
            // 내용이 변경되었고, 새로운 멘션이 추가된 경우만 처리
            if (beforeContent !== afterContent) {
                const beforeMentions = new Set((beforeContent.match(/@([가-힣a-zA-Z0-9_]{2,12})/g) || []).map((m: string) => m.substring(1)));
                const afterMentions = (afterContent.match(/@([가-힣a-zA-Z0-9_]{2,12})/g) || []).map((m: string) => m.substring(1));
                const newMentions = [...new Set(afterMentions.filter((nickname: string) => !beforeMentions.has(nickname)))];
                
                if (newMentions.length > 0) {
                    const postAuthorUid = after.authorUid || after.userId;
                    const postAuthorNickname = after.author || "";
                    const postAuthorAvatar = after.authorAvatar || null;
                    
                    for (const nickname of newMentions.slice(0, 3)) { // 최대 3명까지만 처리
                        const userQuery = await db.collection("users").where("nickname", "==", nickname).limit(1).get();
                        if (!userQuery.empty) {
                            const targetUid = userQuery.docs[0].id;
                            if (targetUid !== postAuthorUid) { // 자기 자신을 멘션한 경우 제외
                                // user_notifications에 알림 문서 생성 (onNotificationCreated 트리거가 푸시 알림 발송)
                                const mentionNotifRef = db.collection("user_notifications").doc(targetUid).collection("items").doc();
                                await mentionNotifRef.set({
                                    type: "mention",
                                    fromUserUid: postAuthorUid,
                                    toUserUid: targetUid,
                                    categoryId: after.categoryId || after.category || null,
                                    data: {
                                        postId: postId,
                                        userId: postAuthorUid,
                                        userName: postAuthorNickname,
                                        userAvatar: postAuthorAvatar,
                                    },
                                    read: false,
                                    timestamp: Date.now(),
                                    createdAt: admin.firestore.FieldValue.serverTimestamp(),
                                });
                            }
                        }
                    }
                }
            }
        } catch (error) {
            logger.error(`[onPostUpdated] 게시글 멘션 알림 생성 실패 (${postId})`, error);
        }

        // 2-2. 댓글 배열 변경 감지 (욕설 필터링 및 알림)
        const beforeReplies = before.replies || [];
        const afterReplies = after.replies || [];

        // 2-2-A. 새로 추가된 댓글에 대한 통합 모더레이션
        if (afterReplies.length > beforeReplies.length) {
            let repliesChanged = false;
            // 배열 전체를 순회하며 새로 추가되거나 변경된 댓글을 확인
            for (let i = 0; i < afterReplies.length; i++) {
                const reply = afterReplies[i] || {};
                const prev = beforeReplies.find((r: any) => r.id === reply.id); // ID 기반으로 이전 상태 찾기
                // 새 댓글이거나, 이전에 숨김 처리되지 않은 댓글이 업데이트된 경우
                if ((!prev || !prev.hidden) && !reply.hidden) {
                    const replyAuthorUid = reply.authorUid || reply.userId;
                    const replyContent = reply.content || "";
                    const moderationReasons: string[] = [];

                    // 1. 신뢰도 기반 제재 확인
                    if (replyAuthorUid) {
                        try {
                            const restrictions = await checkUserRestrictions(replyAuthorUid);
                            if (!restrictions.canReply) {
                                moderationReasons.push(`restriction: ${restrictions.restrictions.join(",")}`);
                            }
                        } catch (error) {
                            logger.error(`[모더레이션] 답글 신뢰도 확인 실패 (${postId})`, { error: (error as Error).message });
                        }

                        // 2. Rate Limiting 확인 (답글 작성자)
                        if (replyAuthorUid && !moderationReasons.length) {
                            try {
                                await checkRateLimit(replyAuthorUid, "createReply");
                            } catch (error) {
                                // Rate limit 초과 시 답글 삭제 (배열에서 제거)
                                afterReplies.splice(i, 1);
                                repliesChanged = true;
                                logger.warn(`[Rate Limit] 답글 삭제: ${postId}, 사용자: ${replyAuthorUid}`);
                                continue;
                            }
                        }
                    }

                    // 3. 욕설 필터링
                    if (await containsProfanity(replyContent)) {
                        moderationReasons.push("profanity_filter");
                    }

                    // 4. 개인정보 유출 감지
                    const personalInfo = detectPersonalInfo(replyContent);
                    if (personalInfo.hasPersonalInfo) {
                        moderationReasons.push(`personal_info: ${personalInfo.detectedTypes.join(",")}`);
                    }

                    // 5. 스팸 감지
                    if (replyAuthorUid && !moderationReasons.length) {
                        const spamCheck = await detectSpam(replyAuthorUid, replyContent, "reply");
                        if (spamCheck.isSpam) {
                            moderationReasons.push(`spam: ${spamCheck.reason}`);
                        }
                    }

                    // 모더레이션 결과 적용
                    if (moderationReasons.length > 0) {
                        afterReplies[i] = {
                            ...reply,
                            hidden: true,
                            hiddenReason: moderationReasons.join(", ")
                        };
                        repliesChanged = true;
                        logger.warn(`🚫 [답글 자동 숨김] ${postId}, 이유: ${moderationReasons.join(", ")}`);
                    }
                }
            }
            if (repliesChanged) {
                updatePayload.replies = afterReplies;
            }

            // 2-2-B. 새로운 댓글 및 멘션 알림
            // 참고: 클라이언트에서 이미 createNotificationForEvent를 통해 알림을 생성하므로
            // 여기서는 멘션 알림만 처리하고, 댓글 알림은 클라이언트에서 생성된 알림이 onNotificationCreated 트리거를 통해 발송됨
            const newReply = afterReplies[afterReplies.length - 1]; // 가장 마지막 댓글을 새 댓글로 가정
            const postAuthorUid = after.authorUid || after.userId;
            const replyAuthorUid = newReply.authorUid || newReply.userId;
            const replyContent = newReply.content || "";
            const replyAuthor = newReply.author || "알 수 없음"; // authorNickname 대신 author 사용

            // 멘션(@) 알림 처리 (댓글에 멘션이 있는 경우)
            // 참고: 클라이언트에서도 createNotificationForEvent를 통해 멘션 알림을 생성하지만,
            // 서버에서도 처리하여 클라이언트에서 처리되지 않은 경우를 대비
            const mentionRegex = /@([가-힣a-zA-Z0-9_]{2,12})/g;
            const matches = replyContent.match(mentionRegex);
            if (matches) {
                const mentionedNicknames = [...new Set(matches.map((m: string) => m.substring(1)))];
                for (const nickname of mentionedNicknames.slice(0, 3)) { // 최대 3명까지만 처리
                    const userQuery = await db.collection("users").where("nickname", "==", nickname).limit(1).get();
                    if (!userQuery.empty) {
                        const targetUid = userQuery.docs[0].id;
                        if (targetUid !== replyAuthorUid && targetUid !== postAuthorUid) { // 자기 자신 및 글 작성자 제외
                            // user_notifications에 알림 문서 생성 (onNotificationCreated 트리거가 푸시 알림 발송)
                            const mentionNotifRef = db.collection("user_notifications").doc(targetUid).collection("items").doc();
                            await mentionNotifRef.set({
                                type: "mention",
                                fromUserUid: replyAuthorUid,
                                toUserUid: targetUid,
                                categoryId: after.categoryId || after.category || null,
                                data: {
                                    postId: postId,
                                    replyId: newReply.id || null,
                                    userId: replyAuthorUid,
                                    userName: replyAuthor,
                                    userAvatar: newReply.authorAvatar || null,
                                },
                                read: false,
                                timestamp: Date.now(),
                                createdAt: admin.firestore.FieldValue.serverTimestamp(),
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

        // ✅ 팔로우 알림 문서 생성 (onNotificationCreated 트리거가 푸시 알림 발송)
        try {
            // 팔로워 닉네임 가져오기
            const followerNickname = data.followerNickname || (await db.collection("users").doc(followerUid).get()).data()?.nickname || "누군가";
            const followerAvatar = data.followerAvatar || (await db.collection("users").doc(followerUid).get()).data()?.profileImage || null;
            
            // user_notifications에 알림 문서 생성 (onNotificationCreated 트리거가 푸시 알림 발송)
            const notifRef = db.collection("user_notifications").doc(followingUid).collection("items").doc(event.params.followId);
            await notifRef.set({
                type: "follow",
                fromUserUid: followerUid,
                toUserUid: followingUid,
                data: {
                    userId: followerUid,
                    userName: followerNickname,
                    userAvatar: followerAvatar,
                },
                read: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        } catch (error) {
            // 알림 생성 실패는 로그만 남기고 계속 진행
            logger.error("[onFollowCreated] 알림 생성 실패", error);
        }
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

/**
 * 7. 사용자 알림 생성 시 실행되는 트리거
 * - user_notifications/{uid}/items 컬렉션에 문서가 생성될 때 푸시 알림 발송
 */
export const onNotificationCreated = onDocumentCreated(
    { document: "user_notifications/{uid}/items/{notificationId}", region: "asia-northeast3" },
    async (event) => {
        const snapshot = event.data;
        if (!snapshot) return;

        const notificationData = snapshot.data();
        const uid = event.params.uid;
        const notificationId = event.params.notificationId;

        if (!uid || !notificationData) return;

        // type 필드 확인 (없으면 알림 발송하지 않음)
        const type = notificationData.type;
        if (!type) return;

        try {
            // 알림 타입을 notificationService의 NotificationType으로 매핑
            let mappedType: "reply" | "mention" | "follow" | "guide_selected" | "lantern" | "popular" | "achievement" | "daily_digest" | "marketing";
            if (type === "reply") mappedType = "reply";
            else if (type === "mention") mappedType = "mention";
            else if (type === "follow") mappedType = "follow";
            else if (type === "guide") mappedType = "guide_selected";
            else if (type === "lantern") mappedType = "lantern";
            else if (type === "popular") mappedType = "popular";
            else if (type === "achievement") mappedType = "achievement";
            else if (type === "system") mappedType = "daily_digest"; // system은 daily_digest로 처리
            else {
                logger.info(`[onNotificationCreated] 알 수 없는 알림 타입: ${type}`);
                return;
            }

            // data 필드에서 정보 추출
            const data = notificationData.data || {};
            const userName = data.userName || "누군가";
            const postId = data.postId || null;

            // 알림 제목과 메시지 생성
            let title = "";
            let body = "";
            let link = "";

            switch (type) {
                case "reply":
                    title = "새 답글";
                    body = `${userName}님이 회원님의 글에 답글을 남겼습니다.`;
                    link = postId ? `/post/${postId}` : "/main";
                    break;
                case "mention":
                    title = "멘션";
                    body = `${userName}님이 회원님을 멘션했습니다.`;
                    link = postId ? `/post/${postId}` : "/main";
                    break;
                case "follow":
                    title = "새 팔로워";
                    body = `${userName}님이 회원님을 승선했습니다.`;
                    link = data.userId ? `/user/${userName}` : "/main";
                    break;
                case "guide":
                    title = "길잡이 채택";
                    const lumenReward = data.lumenReward;
                    const titleName = data.titleName || userName;
                    body = lumenReward
                        ? `${titleName}님의 답글이 길잡이로 채택되었습니다. (+${lumenReward} 루멘)`
                        : `${userName}님의 답글이 길잡이로 채택되었습니다.`;
                    link = postId ? `/post/${postId}` : "/main";
                    break;
                case "lantern":
                    title = "등불";
                    const lanternCount = data.lanternCount || 1;
                    body = lanternCount > 1
                        ? `${userName}님 외 ${lanternCount - 1}명이 등불을 밝혔습니다.`
                        : `${userName}님이 등불을 밝혔습니다.`;
                    link = postId ? `/post/${postId}` : "/main";
                    break;
                case "popular":
                    title = "인기 글";
                    body = "작성하신 글이 인기 글이 되었습니다.";
                    link = postId ? `/post/${postId}` : "/main";
                    break;
                case "achievement":
                    title = "업적";
                    body = "새 업적을 달성했습니다.";
                    link = "/main";
                    break;
                default:
                    return; // 알 수 없는 타입은 발송하지 않음
            }

            // 푸시 알림 발송
            // 알림 문서는 이미 user_notifications/{uid}/items에 생성되었으므로
            // sendPushNotification을 호출하면 users/{uid}/notifications에도 저장되지만
            // 기존 코드와의 호환성을 위해 그대로 두고, 필요시 나중에 최적화
            await sendPushNotification({
                targetUid: uid,
                type: mappedType,
                title,
                body,
                link,
                data: {
                    notificationId,
                    postId: postId ? String(postId) : "",
                },
            });
        } catch (error) {
            logger.error(`[onNotificationCreated] 알림 발송 실패 (${uid}/${notificationId})`, error);
        }
    }
);

/**
 * 8. 등불 생성 시 실행되는 트리거
 * - 등불을 받은 게시글 작성자에게 알림 발송
 */
export const onLanternCreated = onDocumentCreated(
    { document: "user_lanterns/{uid}/posts/{postId}", region: "asia-northeast3" },
    async (event) => {
        const snapshot = event.data;
        if (!snapshot) return;

        const { uid: giverUid, postId } = event.params;
        if (!giverUid || !postId) return;

        try {
            // 게시글 정보 가져오기
            const postSnap = await db.collection("posts").doc(postId).get();
            if (!postSnap.exists) return;

            const postData = postSnap.data()!;
            const authorUid = postData.authorUid;
            if (!authorUid || authorUid === giverUid) return; // 자기 자신에게는 알림 안 보냄

            // 등불 준 사람 정보 가져오기
            const giverSnap = await db.collection("users").doc(giverUid).get();
            const giverData = giverSnap.exists ? giverSnap.data() : null;
            const giverNickname = giverData?.nickname || "누군가";

            // 등불 개수 확인 (현재 등불 개수)
            const currentLanternCount = postData.lanternCount || postData.lanterns || 0;

            // user_notifications에 알림 문서 생성 (onNotificationCreated 트리거가 푸시 알림 발송)
            const notifRef = db.collection("user_notifications").doc(authorUid).collection("items").doc();
            await notifRef.set({
                type: "lantern",
                fromUserUid: giverUid,
                toUserUid: authorUid,
                categoryId: postData.categoryId || postData.category || null,
                data: {
                    postId: postId,
                    userId: giverUid,
                    userName: giverNickname,
                    lanternCount: currentLanternCount,
                },
                read: false,
                timestamp: Date.now(),
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
        } catch (error) {
            logger.error("[onLanternCreated] 알림 생성 실패", error);
        }
    }
);