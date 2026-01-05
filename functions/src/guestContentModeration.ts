import { onDocumentCreated, DocumentSnapshot, FirestoreEvent } from "firebase-functions/v2/firestore";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { _performAiModeration } from "./aiModeration"; // 분리한 moderation 헬퍼 함수 임포트
import { db } from "./firebaseAdmin"; // admin에서 db 인스턴스 임포트

/**
 * 차단된 IP인지 확인하는 헬퍼 함수
 * @param ip 확인할 IP 주소
 * @returns 차단되었으면 true, 아니면 false
 */
async function isIpBlocked(ip: string): Promise<boolean> {
    const docSnap = await db.collection("blockedIPs").doc(ip).get();
    return docSnap.exists;
}

/**
 * 게스트 ID가 정지되었는지 확인하는 헬퍼 함수
 * @param guestId 확인할 게스트 ID
 * @returns 정지되었으면 true, 아니면 false
 */
async function isGuestIdSuspended(guestId: string): Promise<boolean> {
    const docSnap = await db.collection("suspendedGuestIds").doc(guestId).get();
    return docSnap.exists;
}

/**
 * 게스트가 새 게시글을 작성할 때 트리거되는 함수
 * AI Moderation을 수행하고 결과를 게시글에 업데이트합니다.
 */
export const onGuestPostCreate = onDocumentCreated(
    "posts/{postId}",
    async (event: FirestoreEvent<DocumentSnapshot | undefined, { postId: string }>) => {
        const snapshot = event.data;
        if (!snapshot) {
            logger.error("[Guest Moderation] No snapshot data for post creation.");
            return;
        }
        const contextParams = event.params;
        const postData = snapshot.data();
        const postId = contextParams.postId;
        const clientIp = postData?.clientIp as string | undefined;
        const guestId = postData?.guestId as string | undefined; // guestId 추가

        // 게스트 게시글인지 확인 (예: 'authorUid'가 없는 경우)
        if (postData && !postData.authorUid) {
            logger.info(`[Guest Moderation] 게스트 게시글 생성 감지: ${postId}`);

            // IP 차단 확인
            if (clientIp) {
                const blocked = await isIpBlocked(clientIp);
                if (blocked) {
                    logger.warn(`[Guest Moderation] 차단된 IP(${clientIp})로부터의 게시글 작성 시도 (${postId}).`);
                    await snapshot.ref.update({
                        moderationStatus: "rejected",
                        moderationRationale: "차단된 IP로부터의 작성",
                        moderatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                    return; // 함수 실행 중단
                }
            }

            // 게스트 ID 정지 확인
            if (guestId) {
                const suspended = await isGuestIdSuspended(guestId);
                if (suspended) {
                    logger.warn(`[Guest Moderation] 정지된 게스트 ID(${guestId})로부터의 게시글 작성 시도 (${postId}).`);
                    await snapshot.ref.update({
                        moderationStatus: "rejected",
                        moderationRationale: "정지된 게스트 ID로부터의 작성",
                        moderatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                    return; // 함수 실행 중단
                }
            }

            try {
                const moderationResult = await _performAiModeration({
                    targetType: "post",
                    title: postData.title || "",
                    content: postData.content || "",
                });

                logger.info(`[Guest Moderation] 게시글 AI 검수 결과 (${postId}): ${moderationResult.recommendation}, Risk Score: ${moderationResult.riskScore}`);

                // moderation 결과 업데이트
                await snapshot.ref.update({
                    moderationStatus: moderationResult.recommendation, // reject, needs_review, action_needed
                    moderationRiskScore: moderationResult.riskScore,
                    moderationRationale: moderationResult.rationale,
                    moderationFlags: moderationResult.flags,
                    moderatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                // AI moderation 결과가 "reject"인 경우 IP 및 게스트 ID 차단/정지 고려
                if (moderationResult.recommendation === "reject") { // "rejected" -> "reject" 수정
                    if (clientIp) {
                        await db.collection("blockedIPs").doc(clientIp).set({
                            ip: clientIp,
                            reason: "AI Moderation Rejected (Guest Post)",
                            blockedAt: admin.firestore.FieldValue.serverTimestamp(),
                            triggeredByPostId: postId,
                        });
                        logger.warn(`[Guest Moderation] AI Moderation 거부로 IP(${clientIp}) 자동 차단됨 (게시글: ${postId}).`);
                    }
                    if (guestId) {
                        await db.collection("suspendedGuestIds").doc(guestId).set({
                            guestId: guestId,
                            reason: "AI Moderation Rejected (Guest Post)",
                            suspendedAt: admin.firestore.FieldValue.serverTimestamp(),
                            triggeredByPostId: postId,
                        });
                        logger.warn(`[Guest Moderation] AI Moderation 거부로 게스트 ID(${guestId}) 자동 정지됨 (게시글: ${postId}).`);
                    }
                }

            } catch (error) {
                logger.error(`[Guest Moderation] 게시글 AI 검수 실패 (${postId}):`, error);
                // 에러 발생 시 상태를 'error' 등으로 업데이트하여 수동 검토 필요 알림
                await snapshot.ref.update({
                    moderationStatus: "error",
                    moderatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
        }
    });

/**
 * 게스트가 새 댓글을 작성할 때 트리거되는 함수
 * AI Moderation을 수행하고 결과를 댓글에 업데이트합니다.
 */
export const onGuestReplyCreate = onDocumentCreated(
    "posts/{postId}/replies/{replyId}", // 댓글은 게시글의 하위 컬렉션으로 가정
    async (event: FirestoreEvent<DocumentSnapshot | undefined, { postId: string; replyId: string }>) => {
        const snapshot = event.data;
        if (!snapshot) {
            logger.error("[Guest Moderation] No snapshot data for reply creation.");
            return;
        }
        const contextParams = event.params;
        const replyData = snapshot.data();
        const postId = contextParams.postId;
        const replyId = contextParams.replyId;
        const clientIp = replyData?.clientIp as string | undefined;
        const guestId = replyData?.guestId as string | undefined; // guestId 추가

        // 게스트 댓글인지 확인 및 IP 차단 확인
        if (replyData && !replyData.authorUid) {
            logger.info(`[Guest Moderation] 게스트 댓글 생성 감지: ${postId} / ${replyId}`);

            // IP 차단 확인
            if (clientIp) {
                const blocked = await isIpBlocked(clientIp);
                if (blocked) {
                    logger.warn(`[Guest Moderation] 차단된 IP(${clientIp})로부터의 댓글 작성 시도 (${replyId}).`);
                    await snapshot.ref.update({
                        moderationStatus: "rejected",
                        moderationRationale: "차단된 IP로부터의 작성",
                        moderatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                    return; // 함수 실행 중단
                }
            }

            // 게스트 ID 정지 확인
            if (guestId) {
                const suspended = await isGuestIdSuspended(guestId);
                if (suspended) {
                    logger.warn(`[Guest Moderation] 정지된 게스트 ID(${guestId})로부터의 댓글 작성 시도 (${replyId}).`);
                    await snapshot.ref.update({
                        moderationStatus: "rejected",
                        moderationRationale: "정지된 게스트 ID로부터의 작성",
                        moderatedAt: admin.firestore.FieldValue.serverTimestamp(),
                    });
                    return; // 함수 실행 중단
                }
            }

            try {
                const moderationResult = await _performAiModeration({
                    targetType: "reply",
                    content: replyData.content || "",
                });

                logger.info(`[Guest Moderation] 댓글 AI 검수 결과 (${replyId}): ${moderationResult.recommendation}, Risk Score: ${moderationResult.riskScore}`);

                // moderation 결과 업데이트
                await snapshot.ref.update({
                    moderationStatus: moderationResult.recommendation,
                    moderationRiskScore: moderationResult.riskScore,
                    moderationRationale: moderationResult.rationale,
                    moderationFlags: moderationResult.flags,
                    moderatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });

                // AI moderation 결과가 "reject"인 경우 IP 및 게스트 ID 차단/정지 고려
                if (moderationResult.recommendation === "reject") { // "rejected" -> "reject" 수정
                    if (clientIp) {
                        await db.collection("blockedIPs").doc(clientIp).set({
                            ip: clientIp,
                            reason: "AI Moderation Rejected (Guest Reply)",
                            blockedAt: admin.firestore.FieldValue.serverTimestamp(),
                            triggeredByPostId: postId,
                            triggeredByReplyId: replyId,
                        });
                        logger.warn(`[Guest Moderation] AI Moderation 거부로 IP(${clientIp}) 자동 차단됨 (댓글: ${replyId}).`);
                    }
                    if (guestId) {
                        await db.collection("suspendedGuestIds").doc(guestId).set({
                            guestId: guestId,
                            reason: "AI Moderation Rejected (Guest Reply)",
                            suspendedAt: admin.firestore.FieldValue.serverTimestamp(),
                            triggeredByPostId: postId,
                            triggeredByReplyId: replyId,
                        });
                        logger.warn(`[Guest Moderation] AI Moderation 거부로 게스트 ID(${guestId}) 자동 정지됨 (댓글: ${replyId}).`);
                    }
                }

            } catch (error) {
                logger.error(`[Guest Moderation] 댓글 AI 검수 실패 (${replyId}):`, error);
                await snapshot.ref.update({
                    moderationStatus: "error",
                    moderatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
            }
        }
    });
