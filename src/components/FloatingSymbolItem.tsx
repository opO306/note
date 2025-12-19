// src/components/FloatingSymbolItem.tsx

import React, { useCallback } from "react";

interface FloatingSymbolItemProps {
    item: {
        id: number;
        symbol: string;
        x: number;
        y: number;
        size: number;
        duration: number;
        delay: number;
        opacity: number;
    };
}

export const FloatingSymbolItem = React.memo(({ item }: FloatingSymbolItemProps) => {
    const animationName =
        item.opacity < 0.2 ? "fadeInOut1" :
            item.opacity < 0.25 ? "fadeInOut2" :
                "fadeInOut3";

    const setSymbolStyles = useCallback((el: HTMLDivElement | null) => {
        if (el) {
            el.style.setProperty("--symbol-x", `${item.x}%`);
            el.style.setProperty("--symbol-y", `${item.y}%`);
            el.style.setProperty("--symbol-size", `${item.size}px`);
            el.style.setProperty(
                "--symbol-animation",
                `${animationName} ${item.duration}s ease-in-out ${item.delay}s infinite both`
            );
        }
    }, [item.x, item.y, item.size, animationName, item.duration, item.delay]);

    return (
        <div
            className="floating-symbol text-slate-600 dark:text-slate-400"
            ref={setSymbolStyles}
        >
            {item.symbol}
        </div>
    );
});

FloatingSymbolItem.displayName = "FloatingSymbolItem";
