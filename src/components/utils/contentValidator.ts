// contentValidator.ts - 컨텐츠 품질 검증 시스템

import { containsProfanity } from './profanityFilter';

/**
 * 검증 규칙 설정
 * 이 숫자들을 조정하면 검증 기준을 더 엄격하게 또는 느슨하게 만들 수 있어요
 */
const VALIDATION_RULES = {
    // 최소 글자수 규칙
    MIN_TITLE_LENGTH: 5,        // 제목 최소 5글자 (예: "수학 질문")
    MIN_CONTENT_LENGTH: 20,      // 본문 최소 20글자 (의미있는 질문을 하려면 이 정도는 필요해요)
    MIN_REPLY_LENGTH: 10,        // 답변 최소 10글자 (도움이 되는 답변을 하려면 이 정도는 필요해요)

    // 시간 제한 규칙
    MIN_POST_INTERVAL: 30000,    // 글 작성 최소 간격 30초 (1000 = 1초)
    MIN_REPLY_INTERVAL: 10000,   // 답변 작성 최소 간격 10초

    // 중복 방지 규칙
    MAX_DUPLICATE_CHECK: 5,      // 최근 5개 글/답변과 비교
};

/**
 * 최근 작성한 글/답변을 기억하는 저장소
 * 이걸로 중복이나 연속 작성을 체크해요
 */
interface RecentContent {
    content: string;      // 글/답변 내용
    timestamp: number;    // 작성 시간
}

// 메모리에 최근 작성 기록 저장 (로컬 스토리지에 저장하면 새로고침해도 유지돼요)
let recentPosts: RecentContent[] = [];
let recentReplies: RecentContent[] = [];

// 앱 시작할 때 로컬 스토리지에서 기록 불러오기
try {
    const savedPosts = localStorage.getItem('recent_posts');
    const savedReplies = localStorage.getItem('recent_replies');

    if (savedPosts) recentPosts = JSON.parse(savedPosts);
    if (savedReplies) recentReplies = JSON.parse(savedReplies);
} catch (error) {
    console.error('최근 작성 기록 로드 실패:', error);
}

/**
 * 글 검증 결과
 * 검증을 통과했는지, 안 됐다면 왜 안 됐는지 알려줘요
 */
export interface ValidationResult {
    isValid: boolean;      // 통과했나요?
    reason?: string;       // 안 됐다면 이유가 뭔가요?
}

/**
 * 글 제목 검증
 * 제목이 너무 짧거나 욕설이 있으면 안 돼요
 */
export function validateTitle(title: string): ValidationResult {
    // 1단계: 앞뒤 공백 제거
    const trimmedTitle = title.trim();

    // 2단계: 최소 글자수 체크
    if (trimmedTitle.length < VALIDATION_RULES.MIN_TITLE_LENGTH) {
        return {
            isValid: false,
            reason: `제목은 최소 ${VALIDATION_RULES.MIN_TITLE_LENGTH}글자 이상이어야 합니다`
        };
    }

    // 3단계: 욕설 체크
    if (containsProfanity(trimmedTitle)) {
        return {
            isValid: false,
            reason: '제목에 부적절한 단어가 포함되어 있습니다'
        };
    }

    // 모든 검증 통과!
    return { isValid: true };
}

/**
 * 글 본문 검증
 * 본문이 너무 짧거나 욕설이 있거나 중복이면 안 돼요
 */
export function validateContent(content: string): ValidationResult {
    // 1단계: 앞뒤 공백 제거
    const trimmedContent = content.trim();

    // 2단계: 최소 글자수 체크
    if (trimmedContent.length < VALIDATION_RULES.MIN_CONTENT_LENGTH) {
        return {
            isValid: false,
            reason: `내용은 최소 ${VALIDATION_RULES.MIN_CONTENT_LENGTH}글자 이상이어야 합니다`
        };
    }

    // 3단계: 욕설 체크
    if (containsProfanity(trimmedContent)) {
        return {
            isValid: false,
            reason: '내용에 부적절한 단어가 포함되어 있습니다'
        };
    }

    // 4단계: 중복 체크 (최근 5개 글과 비교)
    const recentDuplicates = recentPosts
        .slice(-VALIDATION_RULES.MAX_DUPLICATE_CHECK)
        .filter(post => post.content === trimmedContent);

    if (recentDuplicates.length > 0) {
        return {
            isValid: false,
            reason: '동일한 내용을 반복해서 작성할 수 없습니다'
        };
    }

    // 모든 검증 통과!
    return { isValid: true };
}

/**
 * 글 작성 시간 간격 체크
 * 너무 빠르게 연속으로 글을 올리면 의심스러워요
 */
export function validatePostInterval(): ValidationResult {
    const now = Date.now();

    // 최근 글이 있나 확인
    if (recentPosts.length > 0) {
        const lastPost = recentPosts[recentPosts.length - 1];
        const timeDiff = now - lastPost.timestamp;

        // 30초가 안 지났으면 너무 빨라요
        if (timeDiff < VALIDATION_RULES.MIN_POST_INTERVAL) {
            const waitSeconds = Math.ceil((VALIDATION_RULES.MIN_POST_INTERVAL - timeDiff) / 1000);
            return {
                isValid: false,
                reason: `글 작성은 ${waitSeconds}초 후에 가능합니다`
            };
        }
    }

    return { isValid: true };
}

/**
 * 답변 검증
 * 답변이 너무 짧거나 욕설이 있거나 중복이면 안 돼요
 */
export function validateReply(content: string): ValidationResult {
    // 1단계: 앞뒤 공백 제거
    const trimmedContent = content.trim();

    // 2단계: 최소 글자수 체크
    if (trimmedContent.length < VALIDATION_RULES.MIN_REPLY_LENGTH) {
        return {
            isValid: false,
            reason: `답변은 최소 ${VALIDATION_RULES.MIN_REPLY_LENGTH}글자 이상이어야 합니다`
        };
    }

    // 3단계: 욕설 체크
    if (containsProfanity(trimmedContent)) {
        return {
            isValid: false,
            reason: '답변에 부적절한 단어가 포함되어 있습니다'
        };
    }

    // 4단계: 중복 체크 (최근 5개 답변과 비교)
    const recentDuplicates = recentReplies
        .slice(-VALIDATION_RULES.MAX_DUPLICATE_CHECK)
        .filter(reply => reply.content === trimmedContent);

    if (recentDuplicates.length > 0) {
        return {
            isValid: false,
            reason: '동일한 답변을 반복해서 작성할 수 없습니다'
        };
    }

    return { isValid: true };
}

/**
 * 답변 작성 시간 간격 체크
 */
export function validateReplyInterval(): ValidationResult {
    const now = Date.now();

    if (recentReplies.length > 0) {
        const lastReply = recentReplies[recentReplies.length - 1];
        const timeDiff = now - lastReply.timestamp;

        // 10초가 안 지났으면 너무 빨라요
        if (timeDiff < VALIDATION_RULES.MIN_REPLY_INTERVAL) {
            const waitSeconds = Math.ceil((VALIDATION_RULES.MIN_REPLY_INTERVAL - timeDiff) / 1000);
            return {
                isValid: false,
                reason: `답변 작성은 ${waitSeconds}초 후에 가능합니다`
            };
        }
    }

    return { isValid: true };
}

/**
 * 글 작성 기록 저장
 * 검증을 통과한 글만 기록해요
 */
export function recordPost(content: string): void {
    const record: RecentContent = {
        content: content.trim(),
        timestamp: Date.now()
    };

    recentPosts.push(record);

    // 최근 10개만 유지 (너무 많이 쌓이면 메모리 낭비예요)
    if (recentPosts.length > 10) {
        recentPosts = recentPosts.slice(-10);
    }

    // 로컬 스토리지에 저장
    try {
        localStorage.setItem('recent_posts', JSON.stringify(recentPosts));
    } catch (error) {
        console.error('글 작성 기록 저장 실패:', error);
    }
}

/**
 * 답변 작성 기록 저장
 */
export function recordReply(content: string): void {
    const record: RecentContent = {
        content: content.trim(),
        timestamp: Date.now()
    };

    recentReplies.push(record);

    // 최근 10개만 유지
    if (recentReplies.length > 10) {
        recentReplies = recentReplies.slice(-10);
    }

    // 로컬 스토리지에 저장
    try {
        localStorage.setItem('recent_replies', JSON.stringify(recentReplies));
    } catch (error) {
        console.error('답변 작성 기록 저장 실패:', error);
    }
}

/**
 * 전체 글 검증 (제목 + 본문 + 시간 간격)
 * 한 번에 모든 걸 체크해요
 */
export function validatePost(title: string, content: string): ValidationResult {
    // 1단계: 제목 검증
    const titleResult = validateTitle(title);
    if (!titleResult.isValid) {
        return titleResult;
    }

    // 2단계: 본문 검증
    const contentResult = validateContent(content);
    if (!contentResult.isValid) {
        return contentResult;
    }

    // 3단계: 시간 간격 검증
    const intervalResult = validatePostInterval();
    if (!intervalResult.isValid) {
        return intervalResult;
    }

    // 모든 검증 통과!
    return { isValid: true };
}

/**
 * 전체 답변 검증 (내용 + 시간 간격)
 */
export function validateFullReply(content: string): ValidationResult {
    // 1단계: 답변 내용 검증
    const contentResult = validateReply(content);
    if (!contentResult.isValid) {
        return contentResult;
    }

    // 2단계: 시간 간격 검증
    const intervalResult = validateReplyInterval();
    if (!intervalResult.isValid) {
        return intervalResult;
    }

    // 모든 검증 통과!
    return { isValid: true };
}