import { onCallGenkit } from "firebase-functions/v2/https";
import { genkit, z } from "genkit";
import { vertexAI } from "@genkit-ai/vertexai";
import * as logger from "firebase-functions/logger";

// =====================================================
// Genkit & AI Functions
// =====================================================

// 1. Genkit 플러그인 설정
const ai = genkit({
    plugins: [
        vertexAI({
            location: "us-central1", // 사용 가능한 Vertex AI 리전
        }),
    ],
    // 🚨 [수정] 'enableTracingAndMetrics' 옵션 역시 최신 버전에서 지원되지 않으므로 삭제합니다.
    // index.ts의 enableFirebaseTelemetry() 호출이 이 기능을 자동으로 활성화합니다.
});

// 2. AI 작업 흐름(Flow) 정의
const generatePoemFlow = ai.defineFlow(
    {
        name: "generatePoemFlow",
        inputSchema: z.object({ subject: z.string() }),
        outputSchema: z.object({ poem: z.string() }),
    },
    async (input) => {
        const { subject } = input;
        logger.info(`[Genkit] 시 생성 요청: "${subject}"`);

        const llmResponse = await ai.generate({
            model: "gemini-1.5-flash",
            prompt: `"${subject}"라는 주제로 짧고 감성적인 시를 한국어로 지어줘.`,
            config: {
                temperature: 0.7,
            },
        });

        return { poem: llmResponse.text };
    }
);

// 3. Flow를 호출 가능한 Firebase 함수로 변환하여 내보내기
export const generatePoem = onCallGenkit(
    {
        region: "asia-northeast3",
    },
    generatePoemFlow
);