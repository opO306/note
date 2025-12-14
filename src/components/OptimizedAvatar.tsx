// src/components/OptimizedAvatar.tsx
import React, { useEffect, useMemo, useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useIntersectionObserver } from "@/components/hooks/useIntersectionObserver";
import { getImagePriority, getFetchPriority, optimizeImageUrl } from "@/utils/imageOptimization";

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
    /** 아바타 전체 클릭 시 호출될 콜백 */
    onClick?: () => void;
    /** Intersection Observer rootMargin (기본: "50px") */
    rootMargin?: string;
    /** Intersection Observer threshold (기본: 0.01) */
    threshold?: number;
    /** 이미지 캐시 버전 (선택적) */
    cacheVersion?: string;
}


/**
 * 공용 프로필 아바타
 * - Intersection Observer로 화면에 보일 때만 로딩
 * - 이미지 로딩 전: .image-skeleton (globals.css)
 * - 로딩 후: .lazy-image-loaded 로 부드럽게 등장
 * - fetchpriority로 로딩 우선순위 관리
 */
export function OptimizedAvatar({
    src,
    alt,
    fallbackText,
    className = "",
    imageClassName = "",
    size,
    loading = "lazy",
    decoding = "async",
    onClick,
    rootMargin = "50px",
    threshold = 0.01,
    cacheVersion,
}: OptimizedAvatarProps) {
    // 전역 로드 캐시: 가상 스크롤에서 언마운트/리마운트 시 깜빡임 방지
    const staticLoadedCache = useMemo(() => {
        if (!(globalThis as any).__AVATAR_LOADED_CACHE__) {
            (globalThis as any).__AVATAR_LOADED_CACHE__ = new Set<string>();
        }
        return (globalThis as any).__AVATAR_LOADED_CACHE__ as Set<string>;
    }, []);

    const [loaded, setLoaded] = useState(false);
    const [shouldLoad, setShouldLoad] = useState(loading === "eager");

    const normalizedSrc = useMemo(() => {
        if (typeof src !== "string") return undefined;
        const trimmed = src.trim();
        return trimmed.length > 0 ? optimizeImageUrl(trimmed, cacheVersion) : undefined;
    }, [src, cacheVersion]);

    const { targetRef, isIntersecting } = useIntersectionObserver<HTMLDivElement>({
        threshold,
        rootMargin,
        enabled: loading === "lazy" && !shouldLoad,
    });

    // 이미지 우선순위 계산
    const priority = useMemo(() => getImagePriority(size, loading), [size, loading]);
    const fetchPriority = useMemo(() => getFetchPriority(priority), [priority]);

    // src가 글로벌 캐시에 있으면 즉시 로딩 완료 상태로 처리 (가상 스크롤 깜빡임 방지)
    useEffect(() => {
        const alreadyLoaded = normalizedSrc ? staticLoadedCache.has(normalizedSrc) : false;
        setLoaded(alreadyLoaded);

        // eager는 바로 로드, lazy는 이미 로드된 경우 바로 표시
        if (loading === "eager" || alreadyLoaded) {
            setShouldLoad(true);
        } else if (normalizedSrc) {
            setShouldLoad(false);
        }
    }, [normalizedSrc, loading, staticLoadedCache]);

    // Intersection Observer로 화면에 보일 때만 로딩 시작 (이미 로드된 경우 스킵)
    useEffect(() => {
        if (shouldLoad || loading === "eager") return;
        if (isIntersecting) {
            setShouldLoad(true);
        }
    }, [isIntersecting, loading, shouldLoad]);

    // 안전망: 교차감지가 실패하거나 hidden 상태에서 전환될 때를 대비해 타임아웃으로 로드 강제
    useEffect(() => {
        if (shouldLoad || loading === "eager" || !normalizedSrc) return;
        const timer = setTimeout(() => setShouldLoad(true), 600); // 0.6초 후 강제 로드
        return () => clearTimeout(timer);
    }, [shouldLoad, loading, normalizedSrc]);

    const hasImage = !!normalizedSrc && shouldLoad;

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
        <Avatar
            ref={loading === "lazy" ? targetRef : undefined}
            className={className}
            style={sizeStyle}
            onClick={onClick}
        >
            {hasImage && (
                <AvatarImage
                    src={normalizedSrc}
                    alt={alt}
                    loading={loading}
                    decoding={decoding}
                    {...(fetchPriority && { fetchpriority: fetchPriority })}
                    onLoad={() => {
                        if (normalizedSrc) staticLoadedCache.add(normalizedSrc);
                        setLoaded(true);
                    }}
                    onError={() => setLoaded(true)}
                    className={`${baseImageClass} ${imageClassName} ${loadingClass}`}
                    sizes={size ? `${size}px` : undefined}
                />
            )}
            {/* 이미지가 없거나 아직 안 로딩돼도 항상 fallback 준비 */}
            <AvatarFallback className="w-full h-full bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xl flex items-center justify-center rounded-full">
                {fallbackText || "?"}
            </AvatarFallback>
        </Avatar>
    );
}
