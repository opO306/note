// functions/src/seedTitles.ts

import { admin, db } from "./firebaseAdmin";

/**
 * Firestore에 titles 컬렉션을 한 번에 채워 넣는 스크립트
 * - node 환경에서 한 번만 실행하면 됨
 */

interface TitleSeedData {
    id: string;
    name: string;
    price: number;
}

// TitleShop.tsx에서 쓰는 칭호들 + cost 값 그대로 가져온 것
const TITLE_SEED_DATA: TitleSeedData[] = [
    { id: "guide_sprout", name: "길잡이 꿈나무", price: 0 },
    { id: "little_guide", name: "꼬마 길잡이", price: 3 },
    { id: "ordinary_guide", name: "평범한 길잡이", price: 8 },
    { id: "kind_guide", name: "친절한 길잡이", price: 15 },
    { id: "famous_guide", name: "유명한 길잡이", price: 25 },
    { id: "master_on_path", name: "길 위의 스승", price: 40 },
    { id: "sherpa", name: "세르파", price: 60 },
    { id: "immortal_lantern", name: "네비게이션", price: 80 },
    { id: "curiosity_spark", name: "호기심의 불꽃", price: 5 },
    { id: "truth_seeker", name: "진리의 탐험가", price: 10 },
    { id: "thought_architect", name: "사고의 건축가", price: 15 },
    { id: "insight_collector", name: "통찰의 수집가", price: 20 },
    { id: "knowledge_sage", name: "지혜의 현자", price: 30 },
    { id: "discussion_maestro", name: "토론의 거장", price: 35 },
    { id: "wisdom_lighthouse", name: "지혜의 등대", price: 45 },
    { id: "philosopher_soul", name: "사유의 항해자", price: 50 },
];

async function seedTitles() {
    console.log("[seedTitles] seeding titles...");

    const batch = db.batch();

    for (const title of TITLE_SEED_DATA) {
        const ref = db.collection("titles").doc(title.id);

        batch.set(
            ref,
            {
                // 서버에서 실제로 사용할 필드
                price: title.price,
                name: title.name,

                // 나중에 디버깅용으로 도움 되는 메타 정보
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }, // 있으면 덮어쓰고, 없으면 새로 생성
        );

        console.log(
            `[seedTitles] 준비: titles/${title.id} (name=${title.name}, price=${title.price})`,
        );
    }

    await batch.commit();
    console.log("[seedTitles] batch commit 완료");
}

seedTitles()
    .then(() => {
        console.log("[seedTitles] 완료");
        process.exit(0);
    })
    .catch((err) => {
        console.error("[seedTitles] 오류:", err);
        process.exit(1);
    });
