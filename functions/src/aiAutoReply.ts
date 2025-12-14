// force deploy v3
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { VertexAI } from "@google-cloud/vertexai"; // 👈 Vertex AI SDK

// ─────────────────────────────────────────────────────
// AI 자동 답변 (Vertex AI 버전 - API Key 불필요)
// ─────────────────────────────────────────────────────
export const aiAutoReply = onCall(
    {
        region: "asia-northeast3",
        // ⚠️ secrets: ["GEMINI_API_KEY"]  <-- 더 이상 필요하지 않습니다!
    },
    async (request) => {
        // 1. 인증 확인
        if (!request.auth) {
            throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
        }

        // 2. 입력값 검증 (클라이언트에서 prompt 또는 content를 보낸다고 가정)
        // (입력 데이터 형식에 맞춰 수정 가능)
        const prompt = request.data.prompt || request.data.content;

        if (!prompt || typeof prompt !== 'string') {
            throw new HttpsError("invalid-argument", "질문 내용(prompt)이 필요합니다.");
        }

        logger.info("[aiAutoReply] 요청 수신", { uid: request.auth.uid });

        try {
            // 3. Vertex AI 초기화 (API Key 없이 IAM 인증 자동 사용)
            const vertex_ai = new VertexAI({
                project: "dddd-e6a52", // 본인 프로젝트 ID
                location: "us-central1"
            });

            // 4. 모델 선택
            const model = vertex_ai.getGenerativeModel({
                model: "gemini-1.5-flash",
                generationConfig: {
                    maxOutputTokens: 500,
                    temperature: 0.7,
                }
            });

            // 5. 콘텐츠 생성 요청
            const result = await model.generateContent(prompt);
            const response = result.response;

            // 응답 텍스트 추출
            let replyText = "";
            if (response.candidates && response.candidates.length > 0) {
                replyText = response.candidates[0].content.parts[0].text || "";
            }

            if (!replyText) {
                throw new Error("AI 응답이 비어있습니다.");
            }

            logger.info("[aiAutoReply] 생성 성공");
            return { reply: replyText };

        } catch (error) {
            logger.error("[aiAutoReply] Vertex AI 오류", error);

            // 구체적인 에러 메시지는 보안상 숨기고 일반적인 오류 메시지 반환
            throw new HttpsError(
                "internal",
                "AI 답변 생성 중 오류가 발생했습니다. (Vertex AI)"
            );
        }
    }
);