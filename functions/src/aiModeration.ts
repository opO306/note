// functions/src/aiModeration.ts
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { VertexAI } from "@google-cloud/vertexai";

type TargetType = "post" | "reply";

interface AiModerationRequest {
    targetType: TargetType;
    title?: string;
    content: string;
    reasons?: string[];
    details?: string | null;
    reporterUid?: string | null;
    targetAuthorUid?: string | null;
}

interface AiModerationResponse {
    summary: string;
    recommendation: "reject" | "needs_review" | "action_needed";
    riskScore: number;
    rationale: string;
    flags?: string[];
}

// ✅ [핵심 설정]
// 1. 프로젝트 ID
const PROJECT_ID = "dddd-e6a52";
// 2. 모델 위치: 최신 모델(Gemini 2.0) 사용을 위해 'us-central1' 유지
const VERTEX_LOCATION = "us-central1";
// 3. 모델명
const MODEL_ID = "gemini-2.0-flash";

export const aiModerationReview = onCall(
    {
        // ✅ [수정] 함수는 다시 '서울'에서 실행 (DB/사용자와 가까운 곳)
        region: "asia-northeast3",
    },
    async (request): Promise<AiModerationResponse> => {
        // 1. 운영자 권한 확인
        const isAdmin =
            request.auth?.token?.role === "admin" ||
            request.auth?.token?.admin === true;

        if (!isAdmin) {
            throw new HttpsError("permission-denied", "운영자만 사용할 수 있는 기능입니다.");
        }

        const data = request.data as AiModerationRequest;
        if (!data.content) {
            throw new HttpsError("invalid-argument", "검사할 내용(content)이 없습니다.");
        }

        logger.info(`[aiModeration] 요청 수신 (Region: Seoul / Model: US) - ${data.targetType}`, { uid: request.auth?.uid });

        return await _performAiModeration(data);
    }
);

export async function _performAiModeration(data: AiModerationRequest): Promise<AiModerationResponse> {
    try {
        // 1. Vertex AI 초기화 (모델은 US 리전 사용)
        const vertex_ai = new VertexAI({
            project: PROJECT_ID,
            location: VERTEX_LOCATION // "us-central1"
        });

        // 2. 모델 설정
        const model = vertex_ai.getGenerativeModel({
            model: MODEL_ID,
            generationConfig: {
                maxOutputTokens: 1000,
                temperature: 0.2,
                responseMimeType: "application/json"
            }
        });

        // 3. 프롬프트 구성
        const prompt = `
            You are a strict content moderator for a community app.
            Analyze the following content and provide a JSON response.
            
            Content Type: ${data.targetType}
            Title: ${data.title || "N/A"}
            Content: ${data.content}
            
            Output JSON format:
            {
                "summary": "Brief summary of the content in Korean",
                "recommendation": "reject" | "needs_review" | "action_needed" (approve is not needed here, default is keep),
                "riskScore": 0.0 to 1.0 (1.0 is highest risk),
                "rationale": "Explanation in Korean",
                "flags": ["profanity", "harassment", "spam", "hate_speech", "sexual"] (select applicable)
            }
            `;

        const result = await model.generateContent(prompt);
        const response = result.response;
        const rawText = response.candidates?.[0]?.content?.parts?.[0]?.text || "";

        if (!rawText) {
            logger.error("[aiModeration] AI 응답 비어있음");
            throw new HttpsError("internal", "AI 응답을 받을 수 없습니다.");
        }

        // 4. JSON 파싱
        const jsonStr = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
        let parsed: any;
        try {
            parsed = JSON.parse(jsonStr);
        } catch (error) {
            logger.error("[aiModeration] JSON 파싱 실패", { rawText });
            throw new HttpsError("internal", "AI 응답 형식이 올바르지 않습니다.");
        }

        const responsePayload: AiModerationResponse = {
            summary: String(parsed.summary || ""),
            recommendation: ["reject", "needs_review", "action_needed"].includes(parsed.recommendation)
                ? parsed.recommendation
                : "needs_review",
            riskScore: typeof parsed.riskScore === "number"
                ? Math.min(Math.max(parsed.riskScore, 0), 1)
                : 0.5,
            rationale: String(parsed.rationale || ""),
            flags: Array.isArray(parsed.flags) ? parsed.flags.map(String) : [],
        };

        return responsePayload;

    } catch (error: any) {
        logger.error("[aiModeration] 처리 실패", error);
        throw new HttpsError("internal", "AI 검수 중 오류가 발생했습니다.");
    }
}
