// src/components/utils/timeUtils.ts

// 24시간 이내: "방금 전", "N분 전", "N시간 전"
// 24시간 이후: "YYYY.MM.DD"
export function formatRelativeOrDate(date?: Date, nowInput?: Date): string {
    if (!date) return "";

    const now = nowInput ?? new Date(); // 🔹 없으면 내부에서 new Date() 사용

    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    // 24시간 이내 → 상대 시간
    if (diffDays < 1) {
        if (diffSecs < 60) return "방금 전";
        if (diffMins < 60) return `${diffMins}분 전`;
        return `${diffHours}시간 전`;
    }

    // 24시간 지나면 → 날짜(YYYY.MM.DD)
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}.${month}.${day}`;
}
