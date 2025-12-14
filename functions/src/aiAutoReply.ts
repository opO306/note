// force deploy v8 - Gemini 2.0 Flash
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { VertexAI } from "@google-cloud/vertexai";

export const aiAutoReply = onCall(
    {
        region: "asia-northeast3", // 함수 실행 위치 (서울)
    },
    async (request) => {
        if (!request.auth) {
            throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
        }

        const prompt = request.data.prompt || request.data.content;
        if (!prompt || typeof prompt !== 'string') {
            throw new HttpsError("invalid-argument", "질문 내용(prompt)이 필요합니다.");
        }

        logger.info("[aiAutoReply] 요청 수신 (Gemini 2.0)", { uid: request.auth.uid });

        try {
            const projectId = process.env.GCLOUD_PROJECT || "dddd-e6a52";

            // ✅ Gemini 2.0은 'us-central1'에서 가장 확실하게 지원됩니다.
            const vertex_ai = new VertexAI({
                project: projectId,
                location: "us-central1"
            });

            // 🚨 [핵심 수정] 모델명을 'gemini-2.0-flash'로 변경
            // (만약 001 버전이 있다면 gemini-2.0-flash-001 사용)
            const model = vertex_ai.getGenerativeModel({
                model: "gemini-2.0-flash",
                generationConfig: {
                    maxOutputTokens: 500,
                    temperature: 0.7,
                }
            });

            const result = await model.generateContent(prompt);
            const response = result.response;

            let replyText = "";
            if (response.candidates && response.candidates.length > 0) {
                replyText = response.candidates[0].content.parts[0].text || "";
            }

            if (!replyText) {
                throw new Error("AI 응답이 비어있습니다.");
            }

            logger.info("[aiAutoReply] 생성 성공 (2.0)");
            return { reply: replyText };

        } catch (error: any) {
            logger.error("[aiAutoReply] Vertex AI 오류 상세:", {
                message: error.message,
                status: error.status,
                details: error.stack
            });

            throw new HttpsError(
                "internal",
                "AI 답변 생성 중 오류가 발생했습니다. (Gemini 2.0)"
            );
        }
    }
);