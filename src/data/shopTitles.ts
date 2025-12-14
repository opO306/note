import { Star, Award, Sparkles, Compass, BookOpen, Mountain } from "lucide-react";
import { LanternFilledIcon } from "@/components/icons/Lantern";

export interface ShopTitle {
  id: string;
  name: string;
  description: string;
  cost: number;
  tier: number;
  icon: any;
  requiredReplyLanterns: number;
  requiredGuideCount: number;
  color: string;
  type?: "shop";
}

// 칭호 상점/도감/마이페이지에서 공통으로 사용하는 상점 칭호 데이터
export const SHOP_TITLES: ShopTitle[] = [
  // ===== 길잡이 계열 =====
  {
    id: "guide_sprout",
    name: "길잡이 꿈나무",
    description: "길잡이의 씨앗이 막 싹튼 초심자",
    cost: 0,
    tier: 1,
    icon: Star,
    requiredReplyLanterns: 0,
    requiredGuideCount: 1, // 0 → 1
    color: "text-green-500",
  },

  {
    id: "little_guide",
    name: "꼬마 길잡이",
    description: "처음으로 길잡이 채택을 경험한 작은 안내자",
    cost: 3,
    tier: 1,
    icon: Star,
    requiredReplyLanterns: 0,
    requiredGuideCount: 1,
    color: "text-green-500",
  },
  {
    id: "ordinary_guide",
    name: "평범한 길잡이",
    description: "여러 글에서 자연스럽게 길을 안내하는 일상적인 길잡이",
    cost: 8,
    tier: 2,
    icon: BookOpen,
    requiredReplyLanterns: 0,
    requiredGuideCount: 5,
    color: "text-blue-500",
  },
  {
    id: "kind_guide",
    name: "친절한 길잡이",
    description: "공감과 배려로 질문자의 이해를 도와주는 따뜻한 길잡이",
    cost: 15,
    tier: 3,
    icon: Sparkles,
    requiredReplyLanterns: 20,
    requiredGuideCount: 15,
    color: "text-purple-500",
  },
  {
    id: "famous_guide",
    name: "유명한 길잡이",
    description: "채택과 등불로 커뮤니티에 이름이 오르내리는 인기 길잡이",
    cost: 25,
    tier: 4,
    icon: Award,
    requiredReplyLanterns: 50,
    requiredGuideCount: 30,
    color: "text-orange-500",
  },
  {
    id: "master_on_path",
    name: "길 위의 스승",
    description: "꾸준한 채택과 높은 등불로 실력을 인정받은 교육적 스승",
    cost: 40,
    tier: 5,
    icon: Compass,
    requiredReplyLanterns: 100,
    requiredGuideCount: 50,
    color: "text-red-500",
  },
  {
    id: "sherpa",
    name: "세르파",
    description: "어려운 여정도 끝까지 함께하는 베테랑 안내자",
    cost: 60,
    tier: 6,
    icon: Mountain,
    requiredReplyLanterns: 200,
    requiredGuideCount: 100,
    color: "text-amber-500",
  },
  {
    id: "immortal_lantern",
    name: "네비게이션",
    description: "수많은 질문을 안내해 본 길찾기의 끝판왕",
    cost: 80,
    tier: 7,
    icon: LanternFilledIcon,
    requiredReplyLanterns: 400,
    requiredGuideCount: 200,
    color: "text-yellow-500",
  },

  // ===== 지식·통찰 계열 =====
  {
    id: "curiosity_spark",
    name: "호기심의 불꽃",
    description: "사소한 것에도 물음표를 던지는 작은 불꽃",
    cost: 5,
    tier: 1,
    icon: Sparkles,
    requiredReplyLanterns: 5,
    requiredGuideCount: 1, // 0 → 1
    color: "text-amber-500",
  },

  {
    id: "truth_seeker",
    name: "진리의 탐험가",
    description: "진리를 향해 끊임없이 질문을 던지는 탐험가",
    cost: 10,
    tier: 2,
    icon: Compass,
    requiredReplyLanterns: 15, // 20 → 15
    requiredGuideCount: 3,     // 0 → 3
    color: "text-blue-500",
  },

  {
    id: "thought_architect",
    name: "사고의 건축가",
    description: "논리적인 구조로 생각을 설계하는 사고의 건축가",
    cost: 15,
    tier: 3,
    icon: BookOpen,
    requiredReplyLanterns: 40, // 50 → 40
    requiredGuideCount: 5,     // 0 → 5
    color: "text-blue-500",
  },

  {
    id: "insight_collector",
    name: "통찰의 수집가",
    description: "주고받는 대화 속에서 통찰을 모아두는 수집가",
    cost: 20,
    tier: 3,
    icon: Award,
    requiredReplyLanterns: 70, // 80 → 70
    requiredGuideCount: 7,     // 0 → 7
    color: "text-orange-500",
  },

  {
    id: "knowledge_sage",
    name: "지혜의 현자",
    description: "지식을 맥락까지 설명해주는 깊은 지혜의 현자",
    cost: 30,
    tier: 4,
    icon: BookOpen,
    requiredReplyLanterns: 110, // 120 → 110
    requiredGuideCount: 10,     // 5 → 10
    color: "text-purple-500",
  },

  {
    id: "discussion_maestro",
    name: "토론의 거장",
    description: "격한 토론도 배움의 장으로 바꾸는 토론의 지휘자",
    cost: 35,
    tier: 4,
    icon: Award,
    requiredReplyLanterns: 150,
    requiredGuideCount: 10,
    color: "text-red-500",
  },
  {
    id: "wisdom_lighthouse",
    name: "지혜의 등대",
    description: "방향을 잃은 질문에 빛을 비추는 지혜의 등대",
    cost: 45,
    tier: 5,
    icon: LanternFilledIcon,
    requiredReplyLanterns: 200,
    requiredGuideCount: 30,
    color: "text-amber-500",
  },
  {
    id: "philosopher_soul",
    name: "사유의 항해자",
    description: "생각의 바다를 끝없이 항해하는 사람",
    cost: 50,
    tier: 5,
    icon: Sparkles,
    requiredReplyLanterns: 250,
    requiredGuideCount: 40,
    color: "text-purple-500",
  },
];

