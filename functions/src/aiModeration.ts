// force deploy v3
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
import { VertexAI } from "@google-cloud/vertexai"; // SDK import

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

// ⚠️ 이제 API KEY나 복잡한 ENDPOINT 설정이 필요 없습니다.
const PROJECT_ID = "dddd-e6a52"; // 본인 프로젝트 ID 확인 필요
const LOCATION = "asia-northeast3";
const MODEL_ID = "gemini-1.5-flash"; // 모델명 간소화

export const aiModerationReview = onCall(
    {
        region: "asia-northeast3",
        // secrets: [...] <-- 필요 없음
    },
    async (request): Promise<AiModerationResponse> => {
        // 1. 운영자 권한 확인
        const isAdmin =
            request.auth?.token?.role === "admin" ||
            request.auth?.token?.admin === true;

        if (!isAdmin) {
            throw new HttpsError("permission-denied", "운영자만 사용할 수 있습니다.");
        }

        const { targetType, title, content, reasons, details } = request.data as AiModerationRequest || {};

        if (!targetType || (targetType !== "post" && targetType !== "reply")) {
            throw new HttpsError("invalid-argument", "targetType이 잘못되었습니다.");
        }
        if (!content || typeof content !== "string") {
            throw new HttpsError("invalid-argument", "content가 비어 있습니다.");
        }

        // 2. 프롬프트 구성
        const userPrompt = [
            `다음 신고된 콘텐츠를 검토하고 JSON 형식으로만 응답하세요.`,
            ``,
            `필수 출력 필드:`,
            `- summary: 2~3문장 요약`,
            `- recommendation: "reject" | "needs_review" | "action_needed" 중 하나 (무효/보류/조치 필요)`,
            `- riskScore: 0~1 사이 실수 (높을수록 문제 가능성 높음)`,
            `- rationale: 판단 근거 1~2문장`,
            `- flags: 감지된 위험 키워드 문자열 배열 (없으면 빈 배열)`,
            ``,
            `콘텐츠 타입: ${targetType}`,
            title ? `제목: ${title}` : ``,
            `본문: ${content}`,
            reasons && reasons.length ? `신고 사유: ${reasons.join(", ")}` : `신고 사유: 없음`,
            details ? `신고 상세: ${details}` : `신고 상세: 없음`,
            ``,
            `JSON 외에 마크다운 코드 블록(\`\`\`json)이나 다른 설명은 포함하지 마세요.`,
        ].filter(Boolean).join("\n");

        try {
            // 3. Vertex AI SDK 초기화 (API Key 불필요)
            const vertex_ai = new VertexAI({
                project: PROJECT_ID,
                location: LOCATION,
            });

            const model = vertex_ai.getGenerativeModel({
                model: MODEL_ID,
                generationConfig: {
                    temperature: 0, // 일관된 판단을 위해 0으로 설정
                    maxOutputTokens: 500,
                    responseMimeType: "application/json", // JSON 모드 강제
                },
            });

            // 4. 생성 요청
            const result = await model.generateContent(userPrompt);
            const response = result.response;
            let rawText = "";

            if (response.candidates && response.candidates.length > 0) {
                rawText = response.candidates[0].content.parts[0].text || "";
            }

            if (!rawText) {
                logger.error("[aiModeration] AI 응답 비어있음");
                throw new HttpsError("internal", "AI 응답을 받을 수 없습니다.");
            }

            // 5. JSON 파싱 및 응답 구성
            // (JSON 모드를 썼지만 혹시 모를 마크다운 제거 처리)
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

        } catch (error) {
            logger.error("[aiModeration] 처리 실패", error);
            if (error instanceof HttpsError) throw error;
            throw new HttpsError("internal", "AI 검수 중 오류가 발생했습니다.");
        }
    }
);