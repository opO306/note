import { onSchedule } from "firebase-functions/v2/scheduler";
import * as logger from "firebase-functions/logger";
import * as admin from "firebase-admin";
import { generateAiReply } from "./aiAutoReply"; // 추출한 함수 임포트
import { db } from "./firebaseAdmin"; // db 객체 임포트

const SYSTEM_AI_UID = "AI_BOT"; // AI 시스템 UID

export const autoAiReply = onSchedule("every 60 minutes", async (event): Promise<void> => {
    try {
        // DB 초기화 (함수 인스턴스마다 한 번만 실행되도록)
        if (!admin.apps.length) {
            admin.initializeApp();
        }

        const oneHourAgo = admin.firestore.Timestamp.fromMillis(Date.now() - 60 * 60 * 1000);

        const snap = await db.collection("posts")
            .where("category", "==", "ramen") // "ramen" 카테고리 예시
            .where("aiReplySent", "==", false) // AI 답글이 아직 없는 게시글만
            .where("createdAt", "<=", oneHourAgo) // 1시간 이상 경과된 게시글
            .limit(10) // 한 번에 처리할 게시글 수 제한
            .get();

        if (snap.empty) {
            logger.info("AI 답글을 생성할 게시글이 없습니다.");
            return;
        }

        const batch = db.batch();

        for (const post of snap.docs) {
            const postRef = post.ref;
            const postData = post.data();

            const rawInput = postData.content || "";
            const postTitle = postData.title || "";

            if (!rawInput) {
                logger.warn(`게시글 ${post.id}에 내용이 없어 AI 답글을 생성할 수 없습니다.`);
                continue;
            }

            const replyText = await generateAiReply(rawInput, postTitle);

            const replyRef = postRef.collection("replies").doc(); // 서브컬렉션

            batch.set(replyRef, {
                authorId: SYSTEM_AI_UID,
                content: replyText,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                system: true,
                author: "AI 길잡이", // UI 표시에 필요한 추가 필드
                authorUid: SYSTEM_AI_UID,
                authorAvatar: null,
                isAi: true,
                aiLabel: "Gemini 2.0",
                lanterns: 0,
                isGuide: false
            });

            batch.update(postRef, {
                aiReplySent: true,
                aiReplySentAt: admin.firestore.FieldValue.serverTimestamp(),
                replyCount: admin.firestore.FieldValue.increment(1) // replyCount 증가
            });
        }

        await batch.commit();
        logger.info(`AI 답글 ${snap.size}개 생성 완료.`);

        return;

    } catch (error: any) {
        logger.error("[autoAiReply] 오류:", error);
        // 오류 발생 시에도 Cloud Scheduler는 재시도하므로, 특정 오류에 대한 추가 로직 필요 시 여기에 추가
        throw error;
    }
});

