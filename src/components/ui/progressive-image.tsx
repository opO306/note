import { useState, useEffect, useRef } from "react";
import { useIntersectionObserver } from "../hooks/useIntersectionObserver";
import { cn } from "./utils";

interface ProgressiveImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  placeholderSrc?: string;
  alt: string;
  className?: string;
  containerClassName?: string;
  aspectRatio?: number;
  threshold?: number;
  rootMargin?: string;
  onLoad?: () => void;
  onError?: () => void;
}

/**
 * Progressive image component with blur-up effect
 * Shows a low-quality placeholder while loading the full image
 */
export function ProgressiveImage({
  src,
  placeholderSrc,
  alt,
  className,
  containerClassName,
  aspectRatio,
  threshold = 0.01,
  rootMargin = "50px",
  onLoad,
  onError,
  ...props
}: ProgressiveImageProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(placeholderSrc || null);
  const [isLoading, setIsLoading] = useState(true);
  const [isPlaceholder, setIsPlaceholder] = useState(!!placeholderSrc);

  const { targetRef: imgRef, isIntersecting } = useIntersectionObserver<HTMLDivElement>({
    threshold,
    rootMargin,
  });

  const isVisible = isIntersecting;

  useEffect(() => {
    if (!isVisible || !src) return;

    // Load full image
    const img = new Image();

    img.onload = () => {
      setImageSrc(src);
      setIsPlaceholder(false);
      setIsLoading(false);
      onLoad?.();
    };

    img.onerror = () => {
      setIsLoading(false);
      onError?.();
    };

    img.src = src;

    return () => {
      img.onload = null;
      img.onerror = null;
    };
  }, [isVisible, src, onLoad, onError]);

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
      {!imageSrc && isLoading && (
        <div className="absolute inset-0 image-skeleton" />
      )}

      {imageSrc && (
        <img
          src={imageSrc}
          alt={alt}
          className={cn(
            "transition-all duration-500",
            aspectRatio && "absolute inset-0 w-full h-full object-cover",
            isPlaceholder && "blur-sm scale-105",
            !isPlaceholder && "blur-0 scale-100 lazy-image-loaded",
            className
          )}
          loading="lazy"
          {...props}
        />
      )}
    </div>
  );
}
