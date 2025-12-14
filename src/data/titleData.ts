// 칭호 정보
export interface TitleData {
    id: string;
    name: string;
    requiredGuideCount: number;
}

export const titles: TitleData[] = [
    {
        id: "guide_sprout",
        name: "길잡이 꿈나무",
        // 상점/도감/마이페이지 요구조건과 일치하도록 0 → 1로 수정
        requiredGuideCount: 1,
    },
    {
        id: "little_guide",
        name: "꼬마 길잡이",
        requiredGuideCount: 1,
    },
    {
        id: "ordinary_guide",
        name: "평범한 길잡이",
        requiredGuideCount: 5,
    },
    {
        id: "kind_guide",
        name: "친절한 길잡이",
        requiredGuideCount: 15,
    },
    {
        id: "famous_guide",
        name: "유명한 길잡이",
        requiredGuideCount: 30,
    },
    {
        id: "master_on_path",
        name: "길 위의 스승",
        requiredGuideCount: 50,
    },
    {
        id: "sherpa",
        name: "세르파",
        requiredGuideCount: 100,
    },
    {
        id: "immortal_lantern",
        name: "네비게이션",
        requiredGuideCount: 200,
    },
];

// 🔹 앱 전체에서 사용하는 "칭호 ID → 실제 이름" 중앙 맵
// - 상점 칭호(TitleShop)
// - 업적 칭호(achievements.ts - specialTitle 있는 것들)
// 을 모두 포함합니다.
export const ALL_TITLE_LABELS: Record<string, string> = {
    'best_contributor': '베스트 컨트리뷰터',
    'captain_captain': '선장',
    'community_fellow': '커뮤니티 펠로우',
    'curiosity_spark': '호기심의 불꽃',
    'diligent_visitor': '성실한 방문자',
    'discussion_expert': '마라톤 토론러',
    'discussion_maestro': '토론의 거장',
    'economy_analyst': '경제 분석인',
    'economy_expert': '경제 전문가',
    'engineering_curious': '변수 연구자',
    'engineering_destroyer': '방정식 해결사',
    'engineering_first_light': '공학자의 첫 등불',
    'engineering_focused': '함수 마스터',
    'explore_brave_questioner': '용기 있는 질문러',
    'explore_inquirer': '질문자',
    'explore_investigator': '조사자',
    'explore_philosopher': '사색가',
    'explore_steady_questioner': '꾸준한 질문러',
    'famous_guide': '유명한 길잡이',
    'first_explore': '탐색자',
    'guide_guide': '가이드',
    'guide_luminary': '선도자',
    'guide_navigator': '내비게이터',
    'guide_pathfinder': '개척자',
    'guide_sprout': '길잡이 꿈나무',
    'honorary_scholar': '명예 학자',
    'immortal_lantern': '네비게이션',
    'insight_collector': '통찰의 수집가',
    'it_consultant': '기술 상담인',
    'it_expert': '기술 전문가',
    'kind_guide': '친절한 길잡이',
    'knowledge_sage': '지혜의 현자',
    'language_expert': '언어 전문가',
    'language_tutor': '언어 튜터',
    'lantern_campfire': '모닥불',
    'lantern_candle': '촛불',
    'lantern_furnace': '용광로',
    'lantern_giver': '등불 나눔이',
    'lantern_giver_captain': '응원단장',
    'lantern_giver_small': '좋아요 요정',
    'lantern_lantern': '랜턴',
    'little_guide': '꼬마 길잡이',
    'master_on_path': '길 위의 스승',
    'multi_specialist': '멀티 전문가',
    'ordinary_guide': '평범한 길잡이',
    'philosopher_soul': '사유의 항해자',
    'popular_questioner': '인기 질문러',
    'reply_advisor': '조언자',
    'reply_challenger': '도전하는 답변가',
    'reply_helper': '조력자',
    'reply_mentor': '멘토',
    'reply_persistent_helper': '끈기 있는 답변가',
    'reply_scholar': '학자',
    'share_archivist': '기록 관리자',
    'share_curator': '큐레이터',
    'share_publisher': '발행자',
    'share_sharer': '공유자',
    'sherpa': '세르파',
    'specialized_replier': '특화 답변가',
    'streak_pillar': '기둥',
    'streak_regular': '단골',
    'streak_resident': '주민',
    'streak_visitor': '방문자',
    'thought_architect': '사고의 건축가',
    'truth_seeker': '진리의 탐험가',
    'wisdom_lighthouse': '지혜의 등대',
};

// 칭호 표시 함수
export const getUserTitle = (
    author: string | undefined,
    userNickname: string,
    currentTitle: string
): string => {
    const safeAuthor = author ?? "";

    // 1) 작성자 정보가 없으면 아무 칭호도 안 보여줌
    if (!safeAuthor) {
        return "";
    }

    // 2) "내가 쓴 글/답변"이 아닐 때는 칭호를 숨김
    //    (지금은 자기 자신만 보이게 설계되어 있음)
    if (safeAuthor !== userNickname) {
        return "";
    }

    // 3) 현재 착용 중인 칭호 ID가 없으면 빈 문자열
    if (!currentTitle) {
        return "";
    }

    // 4) 중앙 맵에서 ID → 한글 이름 변환
    return ALL_TITLE_LABELS[currentTitle] ?? "";
};

// 이 파일 어딘가 export 영역에 추가

/** 칭호 ID를 받아 사람이 읽는 칭호 이름으로 바꿔주는 함수 */
export const getTitleLabelById = (titleId?: string | null): string => {
    if (!titleId) return "";
    return ALL_TITLE_LABELS[titleId] ?? "";
};
