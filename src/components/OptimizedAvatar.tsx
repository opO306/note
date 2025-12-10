// src/components/OptimizedAvatar.tsx
import React, { useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export interface OptimizedAvatarProps {
    src?: string | null;
    alt?: string;
    /** 프로필 글자 (닉네임 첫 글자 등) */
    fallbackText: string;
    /** Avatar 전체에 줄 클래스 (테두리, 그림자 등) */
    className?: string;
    /** 이미지에 추가로 줄 클래스 (object-cover 등) */
    imageClassName?: string;
    /**
     * 픽셀 단위 크기.
     * 예: size={40} -> width/height 40px
     */
    size?: number;
    /** lazy/eager – 리스트처럼 많이 나오는 곳은 lazy 추천 */
    loading?: "lazy" | "eager";
    /** async/sync/auto – 기본 async */
    decoding?: "async" | "sync" | "auto";
}

/**
 * 공용 프로필 아바타
 * - 이미지 로딩 전: .image-skeleton (globals.css)
 * - 로딩 후: .lazy-image-loaded 로 부드럽게 등장
 */
export function OptimizedAvatar({
    src,
    alt,
    fallbackText,
    className = "",
    imageClassName = "",
    size,
    loading = "eager",
    decoding = "async",
}: OptimizedAvatarProps) {
    const [loaded, setLoaded] = useState(false);

    const hasImage = !!src;

    const baseImageClass = "w-full h-full object-cover";
    const loadingClass = loaded ? "lazy-image-loaded" : "image-skeleton";

    // size가 있으면 width/height 스타일로 강제
    const sizeStyle: React.CSSProperties | undefined = size
        ? {
            width: size,
            height: size,
            minWidth: size,
            minHeight: size,
        }
        : undefined;

    return (
        <Avatar className={className} style={sizeStyle}>
            {hasImage && (
                <AvatarImage
                    src={src ?? undefined}
                    alt={alt}
                    loading={loading}
                    decoding={decoding}
                    onLoad={() => setLoaded(true)}
                    className={`${baseImageClass} ${imageClassName} ${loadingClass}`}
                />
            )}
            {/* 이미지가 없거나 아직 안 로딩돼도 항상 fallback 준비 */}
            <AvatarFallback className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xl flex items-center justify-center rounded-full">
                {fallbackText || "?"}
            </AvatarFallback>
        </Avatar>
    );
}
