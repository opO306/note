import { admin, db } from "./firebaseAdmin";

interface TitleSeedData {
    id: string;
    name: string;
    price: number;
}

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

export async function seedTitles() {
    console.log("[seedTitles] seeding titles...");

    const batch = db.batch();

    for (const title of TITLE_SEED_DATA) {
        const ref = db.collection("titles").doc(title.id);

        batch.set(
            ref,
            {
                price: title.price,
                name: title.name,
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true },
        );

        console.log(
            `[seedTitles] 준비: titles/${title.id} (name=${title.name}, price=${title.price})`,
        );
    }

    await batch.commit();
    console.log("[seedTitles] batch commit 완료");
}

// 이 스크립트가 로컬에서 단독으로 실행될 때만 호출되도록 변경하거나,
// Firebase Functions로 배포된 후 필요에 따라 호출되도록 변경해야 합니다.
// 현재는 배포 시 자동으로 실행되지 않도록 제거합니다.
// seedTitles()
//     .then(() => {
//         console.log("[seedTitles] 완료");
//         process.exit(0);
//     })
//     .catch((err) => {
//         console.error("[seedTitles] 오류:", err);
//         process.exit(1);
//     });
