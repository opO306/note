// 예시 경로: src/screens/TitleShopScreen.tsx
/* eslint-disable react/jsx-no-bind, react-perf/jsx-no-new-function-as-prop */
import React, { useEffect, useState } from "react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import app, { db } from "../firebase"; // ✅ app까지 같이 가져오기
import { TitleShop } from "../components/TitleShop";

interface TitleShopScreenProps {
    userId: string;              // 로그인한 유저 uid
    userReplyLanterns: number;   // 답변 등불 수 (이미 계산된 값)
    userGuideCount: number;      // 길잡이 채택 수 (이미 계산된 값)
    onBack: () => void;
}

// 🔹 Cloud Functions - purchaseTitle 호출 타입 정의
interface PurchaseTitleRequest {
    titleId: string;
}

interface PurchaseTitleResponse {
    success: boolean;
}

// 🔹 Cloud Functions 인스턴스 & callable 함수 준비
const functions = getFunctions(app, "asia-northeast3");
// Request/Response 타입을 제네릭으로 넣어주면 타입 추론이 더 안전해짐
const purchaseTitleFn = httpsCallable<PurchaseTitleRequest, PurchaseTitleResponse>(
    functions,
    "purchaseTitle",
);

export function TitleShopScreen({
    userId,
    userReplyLanterns,
    userGuideCount,
    onBack,
}: TitleShopScreenProps) {
    const [userLumens, setUserLumens] = useState(0);
    const [ownedTitles, setOwnedTitles] = useState<string[]>([]);
    const [currentTitle, setCurrentTitle] = useState("");

    // ✅ 실제 구매 로직: Cloud Function을 통해서만 루멘 차감 + 칭호 추가
    const handleTitlePurchase = async (titleId: string, cost: number) => {
        // 0) 프론트단에서 한 번 더 루멘 충분성 체크 (UX용)
        if (userLumens < cost) {
            console.warn(
                "[titles] 루멘이 부족해서 칭호를 구매할 수 없습니다.",
                { userLumens, cost },
            );
            return;
        }
    
        // 1) 기존 상태를 저장해 둔다 (서버 에러 시 롤백용)
        const prevLumens = userLumens;
        const prevOwnedTitles = ownedTitles;
    
        const newLumens = userLumens - cost;
    
        // 2) 화면 먼저 반영 (낙관적 업데이트)
        setUserLumens(newLumens);
        setOwnedTitles((prev) =>
            prev.includes(titleId) ? prev : [...prev, titleId],
        );
    
        try {
            // 3) 🔹 서버 Cloud Function에 "이 칭호를 구매하고 싶다" 요청
            const result = await purchaseTitleFn({ titleId });
            const data = result.data as PurchaseTitleResponse;
    
            // 서버에서 success=false 를 준 경우 → 롤백
            if (!data.success) {
                console.warn(
                    "[titles] purchaseTitle 응답이 success=false 입니다. UI를 롤백합니다.",
                    data,
                );
                setUserLumens(prevLumens);
                setOwnedTitles(prevOwnedTitles);
            }
        } catch (error) {
            console.error(
                "[titles] purchaseTitle Cloud Function 호출 실패, UI를 롤백합니다.",
                error,
            );
            // 4) 서버 호출 자체가 실패한 경우에도 롤백
            setUserLumens(prevLumens);
            setOwnedTitles(prevOwnedTitles);
        }
    };    

    // ✅ 칭호 장착 로직
    const handleTitleEquip = async (titleId: string) => {
        const userRef = doc(db, "users", userId);

        setCurrentTitle(titleId);

        // ✅ Firestore 스키마 통일: currentTitle
        await updateDoc(userRef, {
            currentTitle: titleId,
        });
    };

    return (
        <TitleShop
            onBack={onBack}
            userPostLanterns={0}               // 지금은 안 쓰이니까 0 넣어도 됨
            userReplyLanterns={userReplyLanterns}
            userGuideCount={userGuideCount}
            userLumens={userLumens}
            ownedTitles={ownedTitles}
            currentTitle={currentTitle}
            onTitlePurchase={handleTitlePurchase}
            onTitleEquip={handleTitleEquip}
        />
    );
}
