/**
 * 개인정보 유출 감지 유틸리티
 * 텍스트에서 전화번호, 이메일, 주소 등 개인정보를 감지합니다
 */

/**
 * 텍스트에서 개인정보 유출 여부를 감지합니다.
 * @param text - 검사할 텍스트
 * @returns 개인정보 유출 여부 및 감지된 유형
 */
export function detectPersonalInfo(text: string): {
    hasPersonalInfo: boolean;
    detectedTypes: string[];
} {
    if (!text || typeof text !== "string") {
        return { hasPersonalInfo: false, detectedTypes: [] };
    }

    const detected: string[] = [];
    const normalized = text.replace(/\s/g, ""); // 공백 제거

    // 전화번호 패턴 (010-1234-5678, 01012345678, 010 1234 5678 등)
    const phoneRegex = /(01[0-9])[-.\s]?(\d{3,4})[-.\s]?(\d{4})/g;
    if (phoneRegex.test(text)) {
        detected.push("phone");
    }

    // 이메일 패턴
    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    if (emailRegex.test(text)) {
        detected.push("email");
    }

    // 주소 패턴 (도로명 주소, 지번 주소)
    const addressRegex = /(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주).*(시|도|군|구|동|로|길|번지)/g;
    if (addressRegex.test(text)) {
        detected.push("address");
    }

    // 주민등록번호 패턴 (민감 정보)
    const ssnRegex = /\d{6}[-.\s]?\d{7}/g;
    if (ssnRegex.test(normalized)) {
        detected.push("ssn");
    }

    // 계좌번호 패턴 (은행 계좌번호 - 길이가 충분한 경우만)
    const accountRegex = /(\d{3,4})[-.\s]?(\d{4,6})[-.\s]?(\d{4,8})/g;
    if (accountRegex.test(normalized) && normalized.length > 10) {
        detected.push("account");
    }

    return {
        hasPersonalInfo: detected.length > 0,
        detectedTypes: detected
    };
}

/**
 * 개인정보 유형에 따른 사용자 친화적 메시지 반환
 */
export function getPersonalInfoMessage(detectedTypes: string[]): string {
    const messages: Record<string, string> = {
        phone: "전화번호",
        email: "이메일",
        address: "주소",
        ssn: "주민등록번호",
        account: "계좌번호"
    };

    const types = detectedTypes.map(type => messages[type] || type).join(", ");
    return `개인정보(${types})가 포함되어 있습니다. 개인정보는 공개하지 마세요.`;
}

