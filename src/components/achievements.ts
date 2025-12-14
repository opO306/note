// achievements.ts - 완전히 새로운 칭호 체계

export type AchievementCategory =
    | 'guide'      // 길잡이 (채택)
    | 'explore'    // 탐구 (질문)
    | 'share'      // 공유 (정보)
    | 'reply'      // 답변
    | 'lantern'    // 등불 (좋아요)
    | 'streak'     // 출석
    | 'captain'    // 선장 (팔로워)
    | 'economy'    // 경제 전문가
    | 'it'         // IT 전문가
    | 'language';  // 외국어 전문가

/**
 * 업적 인터페이스
 */
export interface Achievement {
    id: string;
    name: string;
    description: string;
    category: AchievementCategory;
    hidden: boolean;
    condition: {
        type: string;
        target: number;
        minLanterns?: number;      // 평균 등불 개수 (분야별 전문가용)
        minAverageLanterns?: number; // 평균 등불 개수 (품질 확인용)
    };
    reward: {
        lumens: number;        // 루멘 개수
        specialTitle?: string; // 특별 칭호
    };
}

// ============================================
// 일반 업적 (화면에 바로 표시되는 업적)
// ============================================

export const normalAchievements: Achievement[] = [

    // ========== 첫걸음 업적 (루멘 없음) ==========
    {
        id: 'first_explore',
        name: '첫 탐구',
        description: '첫 번째 질문 글을 작성했습니다',
        category: 'explore',
        hidden: false,
        condition: { type: 'explore_post_count', target: 1 },
        reward: { lumens: 0 }
    },
    {
        id: 'first_share',
        name: '첫 공유',
        description: '첫 번째 정보 공유 글을 작성했습니다',
        category: 'share',
        hidden: false,
        condition: { type: 'share_post_count', target: 1 },
        reward: { lumens: 0 }
    },
    {
        id: 'first_reply',
        name: '첫 답변',
        // 등불 10개 조건 제거 → 진짜 “첫 답변” 업적
        description: '첫 번째 답변을 작성했습니다',
        category: 'reply',
        hidden: false,
        // 👉 아무 답변이나 1개만 작성하면 달성
        condition: { type: 'reply_count', target: 1 },
        reward: { lumens: 0 }
    },
    {
        id: 'first_guide',
        name: '첫 길잡이',
        description: '처음으로 길잡이로 채택되었습니다 - 당신의 설명이 누군가의 길을 밝혔습니다',
        category: 'guide',
        hidden: false,
        condition: { type: 'guide_count', target: 1 },
        reward: { lumens: 0 }
    },
    {
        id: 'first_lantern_received',
        name: '첫 등불',
        description: '처음으로 등불을 받았습니다',
        category: 'lantern',
        hidden: false,
        condition: { type: 'lanterns_received', target: 1 },
        reward: { lumens: 0 }
    },
    {
        id: 'first_login_streak',
        name: '첫 출석',
        description: '연속 3일 로그인했습니다',
        category: 'streak',
        hidden: false,
        condition: { type: 'login_streak', target: 3 },
        reward: { lumens: 0 }
    },

    // ========== 탐구 (질문) 칭호 ==========
    {
        id: 'explore_seeker',
        name: '탐색자',
        description: '질문 글을 10개 작성했습니다',
        category: 'explore',
        hidden: false,
        condition: { type: 'explore_post_count', target: 10 },
        reward: { lumens: 0, specialTitle: '탐색자' }
    },
    {
        id: 'explore_inquirer',
        name: '질문자',
        description: '질문 글을 30개 작성했습니다',
        category: 'explore',
        hidden: false,
        condition: { type: 'explore_post_count', target: 30 },
        reward: { lumens: 1, specialTitle: '질문자' }
    },
    {
        id: 'explore_investigator',
        name: '조사자',
        description: '질문 글을 100개 작성했습니다',
        category: 'explore',
        hidden: false,
        condition: { type: 'explore_post_count', target: 100 },
        reward: { lumens: 3, specialTitle: '조사자' }
    },
    {
        id: 'explore_philosopher',
        name: '사색가',
        description: '질문 글을 300개 작성했습니다',
        category: 'explore',
        hidden: false,
        condition: { type: 'explore_post_count', target: 300 },
        reward: { lumens: 5, specialTitle: '사색가' }
    },

    // ========== 답변 칭호 ==========
    {
        id: 'reply_helper',
        name: '조력자',
        description: '등불 10개 이상 받은 답변을 10개 작성했습니다 - 작은 도움이 큰 힘이 됩니다',
        category: 'reply',
        hidden: false,
        condition: { type: 'quality_reply_count', target: 10, minLanterns: 10 },
        reward: { lumens: 0, specialTitle: '조력자' }
    },
    {
        id: 'reply_advisor',
        name: '조언자',
        description: '등불 10개 이상 받은 답변을 30개 작성했습니다 - 신뢰할 수 있는 조언자가 되었습니다',
        category: 'reply',
        hidden: false,
        condition: { type: 'quality_reply_count', target: 30, minLanterns: 10 },
        reward: { lumens: 1, specialTitle: '조언자' }
    },
    {
        id: 'reply_mentor',
        name: '멘토',
        description: '등불 10개 이상 받은 답변을 100개 작성했습니다 - 많은 이들의 멘토가 되었습니다',
        category: 'reply',
        hidden: false,
        condition: { type: 'quality_reply_count', target: 100, minLanterns: 10 },
        reward: { lumens: 3, specialTitle: '멘토' }
    },
    {
        id: 'reply_scholar',
        name: '학자',
        description: '등불 10개 이상 받은 답변을 300개 작성했습니다 - 진정한 학자의 길을 걷고 있습니다',
        category: 'reply',
        hidden: false,
        condition: { type: 'quality_reply_count', target: 300, minLanterns: 10 },
        reward: { lumens: 5, specialTitle: '학자' }
    },

    // ========== 길잡이 (채택) 칭호 ==========
    {
        id: 'guide_guide',
        name: '가이드',
        description: '길잡이로 5회 채택되었습니다 - 여러 사람의 이해를 도왔습니다',
        category: 'guide',
        hidden: false,
        condition: { type: 'guide_count', target: 5 },
        reward: { lumens: 0, specialTitle: '가이드' }
    },
    {
        id: 'guide_navigator',
        name: '내비게이터',
        description: '길잡이로 20회 채택되었습니다 - 많은 이들의 길잡이가 되었습니다',
        category: 'guide',
        hidden: false,
        condition: { type: 'guide_count', target: 20 },
        reward: { lumens: 1, specialTitle: '내비게이터' }
    },
    {
        id: 'guide_pathfinder',
        name: '개척자',
        description: '길잡이로 50회 채택되었습니다 - 새로운 이해의 길을 개척했습니다',
        category: 'guide',
        hidden: false,
        condition: { type: 'guide_count', target: 50 },
        reward: { lumens: 3, specialTitle: '개척자' }
    },
    {
        id: 'guide_luminary',
        name: '선도자',
        description: '길잡이로 100회 채택되었습니다 - 커뮤니티의 빛이 되었습니다',
        category: 'guide',
        hidden: false,
        condition: { type: 'guide_count', target: 100 },
        reward: { lumens: 5, specialTitle: '선도자' }
    },

    // ========== 등불 칭호 ==========
    {
        id: 'lantern_candle',
        name: '촛불',
        description: '등불을 50개 받았습니다 - 작은 빛이 모여 밝은 길이 됩니다',
        category: 'lantern',
        hidden: false,
        condition: { type: 'lanterns_received', target: 50 },
        reward: { lumens: 0, specialTitle: '촛불' }
    },
    {
        id: 'lantern_campfire',
        name: '모닥불',
        description: '등불을 200개 받았습니다 - 당신의 지식이 많은 이를 따뜻하게 합니다',
        category: 'lantern',
        hidden: false,
        condition: { type: 'lanterns_received', target: 200 },
        reward: { lumens: 1, specialTitle: '모닥불' }
    },
    {
        id: 'lantern_lantern',
        name: '랜턴',
        description: '등불을 500개 받았습니다 - 어둠을 밝히는 든든한 등불이 되었습니다',
        category: 'lantern',
        hidden: false,
        condition: { type: 'lanterns_received', target: 500 },
        reward: { lumens: 3, specialTitle: '랜턴' }
    },
    {
        id: 'lantern_furnace',
        name: '용광로',
        description: '등불을 1500개 받았습니다 - 끊임없이 타오르는 지식의 불꽃입니다',
        category: 'lantern',
        hidden: false,
        condition: { type: 'lanterns_received', target: 1500 },
        reward: { lumens: 5, specialTitle: '용광로' }
    },

    // ========== 공유 칭호 ==========
    {
        id: 'share_sharer',
        name: '공유자',
        // 예전: '정보 공유 글을 10개 작성했습니다'
        // → 등불 3개 이상 받은 유익한 공유글 기준으로 변경
        description: '등불 3개 이상 받은 정보 공유 글을 10개 작성했습니다',
        category: 'share',
        hidden: false,
        // "share_post_count"는 등불 3개 이상 받은 공유 글만 세도록 서버/로직에서 처리
        condition: { type: 'share_post_count', target: 10, minLanterns: 3 },
        reward: { lumens: 0, specialTitle: '공유자' }
    },
    {
        id: 'share_curator',
        name: '큐레이터',
        // 예전: '정보 공유 글을 30개 작성했습니다'
        description: '등불 3개 이상 받은 정보 공유 글을 30개 작성했습니다',
        category: 'share',
        hidden: false,
        condition: { type: 'share_post_count', target: 30, minLanterns: 3 },
        reward: { lumens: 1, specialTitle: '큐레이터' }
    },
    {
        id: 'share_publisher',
        name: '발행자',
        // 예전: '정보 공유 글을 100개 작성했습니다'
        description: '등불 3개 이상 받은 정보 공유 글을 100개 작성했습니다',
        category: 'share',
        hidden: false,
        condition: { type: 'share_post_count', target: 100, minLanterns: 3 },
        reward: { lumens: 3, specialTitle: '발행자' }
    },
    {
        id: 'share_archivist',
        name: '기록 관리자',
        // 예전: '정보 공유 글을 300개 작성했습니다'
        description: '등불 3개 이상 받은 정보 공유 글을 300개 작성했습니다',
        category: 'share',
        hidden: false,
        condition: { type: 'share_post_count', target: 300, minLanterns: 3 },
        reward: { lumens: 5, specialTitle: '기록 관리자' }
    },



    // ========== 출석 칭호 ==========
    {
        id: 'streak_visitor',
        name: '방문자',
        description: '연속 7일 로그인했습니다',
        category: 'streak',
        hidden: false,
        condition: { type: 'login_streak', target: 7 },
        reward: { lumens: 0, specialTitle: '방문자' }
    },
    {
        id: 'streak_regular',
        name: '단골',
        description: '연속 30일 로그인했습니다',
        category: 'streak',
        hidden: false,
        condition: { type: 'login_streak', target: 30 },
        // 출석은 재화 X, 칭호만
        reward: { lumens: 0, specialTitle: '단골' }
    },
    {
        id: 'streak_resident',
        name: '주민',
        description: '연속 100일 로그인했습니다',
        category: 'streak',
        hidden: false,
        condition: { type: 'login_streak', target: 100 },
        // 출석은 재화 X, 칭호만
        reward: { lumens: 0, specialTitle: '주민' }
    },

    {
        id: 'streak_pillar',
        name: '기둥',
        description: '연속 365일 로그인했습니다',
        category: 'streak',
        hidden: false,
        condition: { type: 'login_streak', target: 365 },
        // 출석은 재화 X, 칭호만
        reward: { lumens: 0, specialTitle: '기둥' }
    },
    // ========== 선장 (팔로워) 칭호 ==========
    {
        id: 'captain_captain',
        name: '선장',
        description: '선원 100명을 모았습니다',
        category: 'captain',
        hidden: false,
        condition: { type: 'follower_count', target: 100 },
        reward: { lumens: 0, specialTitle: '선장' }
    },
    // ========== 분야별 전문가 칭호 ==========
    // 경제 분야
    {
        id: 'economy_analyst',
        name: '경제 분석인',
        description: '경제 카테고리에서 등불 5개 이상 받은 답변을 40개 작성했습니다',
        category: 'economy',
        hidden: false,
        condition: { type: 'category_quality_reply', target: 40, minAverageLanterns: 5 },
        reward: { lumens: 2, specialTitle: '경제 분석인' }
    },

    {
        id: 'economy_expert',
        name: '경제 전문가',
        description: '경제 카테고리에서 등불 10개 이상 받은 답변을 150개 작성했습니다',
        category: 'economy',
        hidden: false,
        condition: { type: 'category_quality_reply', target: 150, minAverageLanterns: 10 },
        reward: { lumens: 5, specialTitle: '경제 전문가' }
    },

    // IT 분야
    {
        id: 'it_consultant',
        name: '기술 상담인',
        description: 'IT 카테고리에서 등불 5개 이상 받은 답변을 40개 작성했습니다',
        category: 'it',
        hidden: false,
        condition: { type: 'category_quality_reply', target: 40, minAverageLanterns: 5 },
        reward: { lumens: 2, specialTitle: '기술 상담인' }
    },

    {
        id: 'it_expert',
        name: '기술 전문가',
        description: 'IT 카테고리에서 등불 10개 이상 받은 답변을 150개 작성했습니다',
        category: 'it',
        hidden: false,
        condition: { type: 'category_quality_reply', target: 150, minAverageLanterns: 10 },
        reward: { lumens: 5, specialTitle: '기술 전문가' }
    },


    // 외국어 분야
    {
        id: 'language_tutor',
        name: '언어 튜터',
        description: '외국어 카테고리에서 등불 5개 이상 받은 답변을 40개 작성했습니다',
        category: 'language',
        hidden: false,
        condition: { type: 'category_quality_reply', target: 40, minAverageLanterns: 5 },
        reward: { lumens: 2, specialTitle: '언어 튜터' }
    },

    {
        id: 'language_expert',
        name: '언어 전문가',
        description: '외국어 카테고리에서 등불 10개 이상 받은 답변을 150개 작성했습니다',
        category: 'language',
        hidden: false,
        condition: { type: 'category_quality_reply', target: 150, minAverageLanterns: 10 },
        reward: { lumens: 5, specialTitle: '언어 전문가' }
    },


    // ========== 공학 특화 칭호 ==========
    {
        id: 'engineering_curious',
        name: '변수 연구자',
        description: '공학 카테고리에서 질문 글을 10개 작성했습니다',
        category: 'explore',
        hidden: false,
        condition: { type: 'category_explore_count', target: 10 },
        reward: { lumens: 1, specialTitle: '변수 연구자' }
    },

    {
        id: 'engineering_focused',
        name: '함수 마스터',
        description: '공학 카테고리에만 집중해서 글 40개를 작성했습니다',
        category: 'reply',
        hidden: true,
        condition: { type: 'single_category_posts', target: 40 },
        reward: { lumens: 2, specialTitle: '함수 마스터' }
    },


    {
        id: 'engineering_first_light',
        name: '공학자의 첫 등불',
        description: '공학 카테고리에서 처음으로 등불을 받았습니다',
        category: 'lantern',
        hidden: false,
        condition: { type: 'category_first_lantern', target: 1 },
        reward: { lumens: 1, specialTitle: '공학자의 첫 등불' }
    },

    {
        id: 'engineering_destroyer',
        name: '방정식 해결사',
        description: '공학 카테고리에서 답변을 50개 작성했습니다',
        category: 'reply',
        hidden: false,
        condition: { type: 'category_reply_count', target: 50 },
        reward: { lumens: 3, specialTitle: '방정식 해결사' }
    },

    // ========== 참여/노력형 질문 업적 ==========
    {
        id: 'explore_brave_questioner',
        name: '용기 있는 질문러',
        description: '부끄러움을 이겨내고 질문 글을 5개 작성했습니다 - 모르는 것을 인정하는 용기가 배움의 시작입니다',
        category: 'explore',
        hidden: false,
        condition: { type: 'explore_post_count', target: 5 },
        reward: { lumens: 1, specialTitle: '용기 있는 질문러' }
    },
    {
        id: 'explore_steady_questioner',
        name: '꾸준한 질문러',
        description: '포기하지 않고 질문 글을 20개 작성했습니다 - 꾸준함이 성장의 열쇠입니다',
        category: 'explore',
        hidden: false,
        condition: { type: 'explore_post_count', target: 20 },
        reward: { lumens: 2, specialTitle: '꾸준한 질문러' }
    },

    // ========== 시도 자체를 보는 답변 업적 ==========
    {
        id: 'reply_challenger',
        name: '도전하는 답변가',
        description: '완벽하지 않아도, 자신의 이해 방식을 담은 답변을 10개 시도했습니다 - 시도하는 것만으로도 가치가 있습니다',
        category: 'reply',
        hidden: false,
        condition: { type: 'reply_count', target: 10 },
        reward: { lumens: 1, specialTitle: '도전하는 답변가' }
    },

    {
        id: 'reply_persistent_helper',
        name: '끈기 있는 답변가',
        description: '도움을 주기 위해 답변 50개를 남겼습니다 - 끈기 있는 도움은 커뮤니티의 힘입니다',
        category: 'reply',
        hidden: false,
        condition: { type: 'reply_count', target: 50 },
        reward: { lumens: 3, specialTitle: '끈기 있는 답변가' }
    },

    // ========== 남을 응원하는 업적 ==========
    {
        id: 'lantern_giver_small',
        name: '좋아요 요정',
        description: '다른 사람의 글에 등불을 50개 켜줬습니다 - 당신의 응원이 누군가에게 힘이 됩니다',
        category: 'lantern',
        hidden: false,
        condition: { type: 'lanterns_given', target: 50 },
        reward: { lumens: 1, specialTitle: '좋아요 요정' }
    },
    {
        id: 'lantern_giver_captain',
        name: '응원단장',
        description: '다른 사람의 글에 등불을 200개 켜줬습니다 - 따뜻한 응원이 커뮤니티를 밝힙니다',
        category: 'lantern',
        hidden: false,
        condition: { type: 'lanterns_given', target: 200 },
        reward: { lumens: 3, specialTitle: '응원단장' }
    },

];

// ============================================
// 히든 업적 (특별하고 숨겨진 업적)
// ============================================

export const hiddenAchievements: Achievement[] = [
    {
        id: 'multi_specialist',
        name: '멀티 전문가',
        description: '3개 분야에서 전문가 칭호를 획득했습니다',
        category: 'reply',
        hidden: true,
        condition: { type: 'multi_field_expert', target: 3 },
        reward: { lumens: 10, specialTitle: '멀티 전문가' }
    },
    {
        id: 'discussion_expert',
        name: '마라톤 토론러',
        description: '한 글에서 답변을 15회 이상 주고받았습니다',
        category: 'reply',
        hidden: true,
        condition: { type: 'discussion_exchanges', target: 15 },
        reward: { lumens: 5, specialTitle: '마라톤 토론러' }
    },


    {
        id: 'best_contributor',
        name: '베스트 컨트리뷰터',
        description: '한 글에서 등불 100개 이상을 받았습니다',
        category: 'lantern',
        hidden: true,
        condition: { type: 'max_post_lanterns', target: 100 },
        reward: { lumens: 10, specialTitle: '베스트 컨트리뷰터' }
    },
    {
        id: 'community_fellow',
        name: '커뮤니티 펠로우',
        description: '모든 기본 칭호에서 3단계 이상을 달성했습니다',
        category: 'guide',
        hidden: true,
        condition: { type: 'all_categories_tier3', target: 1 },
        reward: { lumens: 15, specialTitle: '커뮤니티 펠로우' }
    },
    {
        id: 'honorary_scholar',
        name: '명예 학자',
        description: '모든 기본 칭호에서 4단계(최고)를 달성했습니다',
        category: 'guide',
        hidden: true,
        condition: { type: 'all_categories_tier4', target: 1 },
        reward: { lumens: 50, specialTitle: '명예 학자' }
    },
    {
        id: 'lantern_giver',
        name: '등불 나눔이',
        description: '다른 사람에게 등불을 500개 켜줬습니다',
        category: 'lantern',
        hidden: true,
        condition: { type: 'lanterns_given', target: 500 },
        reward: { lumens: 3, specialTitle: '등불 나눔이' }
    },

    {
        id: 'diligent_visitor',
        name: '성실한 방문자',
        description: '최근 30일 중 27일 이상 로그인했습니다',
        category: 'streak',
        hidden: true,
        condition: { type: 'monthly_login_rate', target: 27 },
        // 출석은 재화 X, 칭호만
        reward: { lumens: 0, specialTitle: '성실한 방문자' }
    },

    {
        id: 'popular_questioner',
        name: '인기 질문러',
        description: '내가 올린 질문 중 하나가 등불 30개 이상을 받아, 많은 사람들이 공감한 질문이 되었습니다',
        category: 'explore',
        hidden: true,
        // ⚠ 서버/로직에서는 가능하면 "질문 글만" 대상으로 max_post_lanterns 계산해 주는 게 좋음
        condition: { type: 'max_post_lanterns', target: 30 },
        reward: { lumens: 2, specialTitle: '인기 질문러' }
    },


    {
        id: 'specialized_replier',
        name: '특화 답변가',
        description: '한 카테고리에서 답변 300개를 작성했습니다',
        category: 'reply',
        hidden: true,
        condition: { type: 'single_category_replies', target: 300 },
        reward: { lumens: 3, specialTitle: '특화 답변가' }
    }

];

// ============================================
// 전체 업적 리스트
// ============================================

export const allAchievements: Achievement[] = [
    ...normalAchievements,
    ...hiddenAchievements
];

// ============================================
// 유틸리티 함수
// ============================================

/**
 * 카테고리 이름 반환
 */
export function getCategoryName(category: AchievementCategory): string {
    const names = {
        guide: '길잡이',
        explore: '탐구',
        share: '지식 공유',
        reply: '답변',
        lantern: '등불',
        streak: '출석',
        captain: '선장',
        economy: '경제',
        it: 'IT',
        language: '외국어'
    };
    return names[category];
}

/**
 * 특정 카테고리의 모든 업적 반환
 */
export function getAchievementsByCategory(category: AchievementCategory): Achievement[] {
    return allAchievements.filter(achievement => achievement.category === category);
}

/**
 * 특정 업적 ID로 업적 찾기
 */
export function getAchievementById(id: string): Achievement | undefined {
    return allAchievements.find(achievement => achievement.id === id);
}