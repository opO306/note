// src/utils/deletedUserHelpers.ts

// 화면에서 쓸 공통 상수
export const DELETED_USER_NAME = "탈퇴한 사용자";

/**
 * 이 작성자가 "탈퇴한 사용자"인지 판별
 * - name: 닉네임(문자열)
 * - deletedFlag: Firestore에서 내려오는 authorDeleted / isDeleted 같은 플래그
 */
export function isDeletedAuthor(
    name?: string | null,
    deletedFlag?: boolean
): boolean {
    return deletedFlag === true || name === DELETED_USER_NAME;
}

/**
 * 화면에 보여줄 닉네임
 * - 삭제된 유저면 무조건 "탈퇴한 사용자" 반환
 * - 아니면 원래 이름 그대로
 */
export function getDisplayName(
    name?: string | null,
    deletedFlag?: boolean
): string {
    if (isDeletedAuthor(name, deletedFlag) || !name) {
        return DELETED_USER_NAME;
    }
    return name;
}
