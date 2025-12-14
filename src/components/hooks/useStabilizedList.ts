import { useEffect, useRef } from "react";

/**
 * 배열이 잠깐 비거나 로딩 중일 때 마지막 비어있지 않은 값을 유지해
 * 화면 깜빡임을 줄입니다.
 *
 * @param items 현재 목록
 * @param retainWhenEmpty true면 items가 비었을 때 직전 비어있지 않은 목록을 유지
 */
export function useStabilizedList<T>(items: T[], retainWhenEmpty = false) {
    const lastNonEmptyRef = useRef<T[]>([]);

    useEffect(() => {
        if (items.length > 0) {
            lastNonEmptyRef.current = items;
        }
    }, [items]);

    const visible =
        items.length > 0 ? items : retainWhenEmpty ? lastNonEmptyRef.current : [];

    return { visible, lastNonEmpty: lastNonEmptyRef.current };
}

