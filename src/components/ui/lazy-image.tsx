import { useState, useEffect, useRef } from "react";
import { useIntersectionObserver } from "../hooks/useIntersectionObserver";
import { cn } from "./utils";

interface LazyImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackSrc?: string;
  className?: string;
  containerClassName?: string;
  aspectRatio?: number;
  showSkeleton?: boolean;
  threshold?: number;
  rootMargin?: string;
  onLoad?: () => void;
  onError?: () => void;
}

export function LazyImage({
  src,
  alt,
  fallbackSrc,
  className,
  containerClassName,
  aspectRatio,
  showSkeleton = true,
  threshold = 0.01,
  rootMargin = "50px",
  onLoad,
  onError,
  ...props
}: LazyImageProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  const { targetRef: imgRef, isIntersecting } = useIntersectionObserver<HTMLDivElement>({
    threshold,
    rootMargin,
  });

  const isVisible = isIntersecting;
  useEffect(() => {
    if (!isVisible) return;

    setIsLoading(true);
    setHasError(false);

    const img = new Image();

    img.onload = () => {
      setImageSrc(src);
      setIsLoading(false);
      onLoad?.();
    };

    img.onerror = () => {
      setHasError(true);
      setIsLoading(false);
      if (fallbackSrc) {
        setImageSrc(fallbackSrc);
      }
      onError?.();
    };

    img.src = src;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [isVisible, src, fallbackSrc, onLoad, onError]);

  const containerStyle = aspectRatio
    ? { paddingBottom: `${(1 / aspectRatio) * 100}%` }
    : undefined;

  return (
    <div
      ref={imgRef}
      className={cn(
        "relative overflow-hidden bg-muted",
        aspectRatio && "h-0",
        containerClassName
      )}
      style={containerStyle}
    >
      {isLoading && showSkeleton && (
        <div className="absolute inset-0 image-skeleton" />
      )}

      {imageSrc && !hasError && (
        <img
          src={imageSrc}
          alt={alt}
          className={cn(
            "transition-opacity duration-300",
            aspectRatio && "absolute inset-0 w-full h-full object-cover",
            isLoading ? "opacity-0" : "opacity-100 lazy-image-loaded",
            className
          )}
          loading="lazy"
          {...props}
        />
      )}

      {hasError && !fallbackSrc && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted text-muted-foreground">
          <div className="flex flex-col items-center gap-2">
            <svg
              className="w-8 h-8 opacity-50"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="text-xs">이미지 로드 실패</span>
          </div>
        </div>
      )}
    </div>
  );
}

// Avatar용 LazyImage 래퍼
interface LazyAvatarImageProps {
  src: string;
  alt: string;
  className?: string;
  fallbackSrc?: string;
}

export function LazyAvatarImage({
  src,
  alt,
  className,
  fallbackSrc,
}: LazyAvatarImageProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [hasError, setHasError] = useState(false);

  const { targetRef: imgRef, isIntersecting } = useIntersectionObserver<HTMLDivElement>({
    threshold: 0.01,
    rootMargin: "50px",
  });

  const isVisible = isIntersecting;

  useEffect(() => {
    if (!isVisible) return;

    const img = new Image();

    img.onload = () => {
      setImageSrc(src);
      setHasError(false);
    };

    img.onerror = () => {
      setHasError(true);
      if (fallbackSrc) {
        setImageSrc(fallbackSrc);
      }
    };

    img.src = src;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [isVisible, src, fallbackSrc]);

  return (
    <div ref={imgRef} className="w-full h-full">
      {imageSrc && !hasError && (
        <img
          src={imageSrc}
          alt={alt}
          className={cn("w-full h-full object-cover lazy-image-loaded", className)}
          loading="lazy"
        />
      )}
      {!imageSrc && !hasError && (
        <div className="w-full h-full image-skeleton" />
      )}
    </div>
  );
}
