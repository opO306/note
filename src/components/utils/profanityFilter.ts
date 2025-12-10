/**
 * 욕설 필터링 유틸리티
 * 텍스트에서 부적절한 단어를 감지합니다
 */

// 금지된 단어 목록
// 실제 서비스에서는 더 많은 단어를 추가하거나 외부 파일로 관리할 수 있습니다
const PROFANITY_LIST: string[] = [
    // 강한 욕설
    "시발",
    "씨발",
    "씨바",
    "씨바알",
    "ㅅㅂ",
    "싯팔",
    "개새끼",
    "개 새끼",
    "개새",
    "병신",
    "븅신",
    "ㅂㅅ",
    "좆같",
    "ㅈ같",
    "염병",
    "엠창",
    "시벌",
    "애미",
    "시1발",
    "ㅈㄹ",
    "지랄",
    "병1신",
    // 필요하면 여기 계속 추가
    "테스트욕설",
];

/**
 * 비교를 위한 간단한 정규화:
 * - 소문자로 변환
 * - 공백 제거
 * (한글/자모는 그대로 유지)
 */
function normalize(text: string): string {
    return (text || "")
        .toLowerCase()
        // 숫자, 공백, 특수문자 대부분 제거
        .replace(/[0-9\s~!@#$%^&*()\-_=+\[\]{};:'",.<>/?\\|`]/g, "");
}

/**
 * 주어진 텍스트에 금지 단어가 하나라도 포함되어 있는지 검사
 * 금지 단어도 같은 방식으로 정규화해서 비교한다.
 *
 * @param text 검사할 텍스트
 * @returns 금지 단어가 포함되어 있으면 true, 아니면 false
 */
export function containsProfanity(text: string): boolean {
    const normalized = normalize(text);

    if (!normalized) return false;

    return PROFANITY_LIST.some((word) => {
        const normalizedWord = normalize(word);
        if (!normalizedWord) return false;
        return normalized.includes(normalizedWord);
    });
}

/**
 * 텍스트 안에 등장하는 금지 단어 종류 개수
 * (서비스에서 필요 없으면 안 써도 됨)
 */
export function countProfanity(text: string): number {
    const normalized = normalize(text);
    if (!normalized) return 0;

    let count = 0;

    for (const word of PROFANITY_LIST) {
        const normalizedWord = normalize(word);
        if (!normalizedWord) continue;

        if (normalized.includes(normalizedWord)) {
            count++;
        }
    }

    return count;
}

/**
 * 여러 텍스트 필드를 한 번에 검사
 * 하나라도 욕설이 있으면 true
 */
export function checkMultipleFields(fields: string[]): boolean {
    return fields.some((field) => containsProfanity(field));
}
