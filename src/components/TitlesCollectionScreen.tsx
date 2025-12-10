// 예시 경로: src/screens/TitlesCollectionScreen.tsx
/* eslint-disable react/jsx-no-bind, react-perf/jsx-no-new-function-as-prop */
import React, { useEffect, useState } from "react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { db } from "../firebase"; // 경로 수정
import { TitlesCollection } from "../components/TitlesCollection";

interface TitlesCollectionScreenProps {
    userId: string;
    onBack: () => void;
}

export function TitlesCollectionScreen({
    userId,
    onBack,
}: TitlesCollectionScreenProps) {
    const [userTitles, setUserTitles] = useState<string[]>([]);
    const [equippedTitle, setEquippedTitle] = useState<string>("");

    useEffect(() => {
        const userRef = doc(db, "users", userId);

        const unsubscribe = onSnapshot(userRef, (snap) => {
            const data = snap.data();
            if (!data) return;

            // ✅ Firestore 스키마 통일: ownedTitles / currentTitle
            setUserTitles(
                Array.isArray(data.ownedTitles) ? data.ownedTitles : []
            );
            setEquippedTitle(
                typeof data.currentTitle === "string" ? data.currentTitle : ""
            );
        });

        return () => unsubscribe();
    }, [userId]);

    const handleTitleEquip = async (titleId: string) => {
        const userRef = doc(db, "users", userId);
    
        // 1) 내가 가진 칭호가 아니면 장착 시도 안 함 (방어 코드)
        if (!userTitles.includes(titleId)) {
            console.warn("[titles] 소유하지 않은 칭호는 장착할 수 없습니다.", {
                titleId,
            });
            return;
        }
    
        // 2) 기존 장착 상태를 기억해 둔다 (오류 발생 시 되돌리기용)
        const previous = equippedTitle;
    
        // 3) 화면 먼저 바꾸고, 서버 저장 시도
        setEquippedTitle(titleId);
    
        try {
            await updateDoc(userRef, {
                currentTitle: titleId,
            });
        } catch (error) {
            console.error("[titles] currentTitle 업데이트 실패", error);
            // 4) 서버 저장 실패하면 화면도 원래 상태로 되돌림
            setEquippedTitle(previous);
        }
    };
    
    const handleTitleUnequip = async () => {
        const userRef = doc(db, "users", userId);
    
        const previous = equippedTitle;
        setEquippedTitle("");
    
        try {
            await updateDoc(userRef, {
                currentTitle: "",
            });
        } catch (error) {
            console.error("[titles] currentTitle 초기화 실패", error);
            // 실패하면 원래 장착 상태로 되돌리기
            setEquippedTitle(previous);
        }
    };    

    return (
        <TitlesCollection
            onBack={onBack}
            userTitles={userTitles}
            equippedTitle={equippedTitle}
            onTitleEquip={handleTitleEquip}
            onTitleUnequip={handleTitleUnequip}
        />
    );
}
