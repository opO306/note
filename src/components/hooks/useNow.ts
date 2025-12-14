// src/components/hooks/useNow.ts
// 일정 간격(기본 1분)마다 현재 시각을 업데이트해서
// 컴포넌트를 강제로 다시 렌더링해 주는 훅

import { useEffect, useState } from "react";

export function useNow(intervalMs = 60_000) {
    const [now, setNow] = useState(() => new Date());

    useEffect(() => {
        const id = setInterval(() => {
            setNow(new Date());
        }, intervalMs);

        return () => clearInterval(id);
    }, [intervalMs]);

    return now;
}
