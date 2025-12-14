import { ReactNode } from "react";
import { cn } from "./utils";

/**
 * 스크린 리더 전용 텍스트
 */
export function VisuallyHidden({
  children,
  asChild = false,
}: {
  children: ReactNode;
  asChild?: boolean;
}) {
  const className = "sr-only";

  if (asChild) {
    return <span className={className}>{children}</span>;
  }

  return <span className={className}>{children}</span>;
}

/**
 * Skip to content 링크
 */
export function SkipLink({
  href,
  children = "본문으로 건너뛰기",
}: {
  href: string;
  children?: ReactNode;
}) {
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-primary focus:text-primary-foreground focus:rounded-md focus:outline-none focus:ring-2 focus:ring-ring"
    >
      {children}
    </a>
  );
}

/**
 * 랜드마크 건너뛰기 링크들
 */
export function SkipLinks() {
  return (
    <div className="skip-links">
      <SkipLink href="#main-content">본문으로 건너뛰기</SkipLink>
      <SkipLink href="#navigation">네비게이션으로 건너뛰기</SkipLink>
      <SkipLink href="#search">검색으로 건너뛰기</SkipLink>
    </div>
  );
}

/**
 * ARIA 라이브 리전
 */
export function LiveRegion({
  children,
  priority = "polite",
  atomic = true,
  className,
}: {
  children: ReactNode;
  priority?: "polite" | "assertive" | "off";
  atomic?: boolean;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live={priority}
      aria-atomic={atomic}
      className={cn("sr-only", className)}
    >
      {children}
    </div>
  );
}

/**
 * 포커스 링 스타일
 */
export function FocusRing({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background rounded-md",
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * 키보드 전용 포커스 링
 */
export function KeyboardFocusRing({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded-md",
        className
      )}
    >
      {children}
    </div>
  );
}

/**
 * 접근성 알림 (토스트 대체)
 */
export function AccessibleAlert({
  children,
  role = "status",
  className,
}: {
  children: ReactNode;
  role?: "status" | "alert";
  className?: string;
}) {
  return (
    <div
      role={role}
      aria-live={role === "alert" ? "assertive" : "polite"}
      aria-atomic="true"
      className={cn("rounded-lg border p-4 shadow-lg", className)}
    >
      {children}
    </div>
  );
}

/**
 * 랜드마크 헤더
 */
export function LandmarkHeader({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <header role="banner" className={className}>
      {children}
    </header>
  );
}

/**
 * 랜드마크 네비게이션
 */
export function LandmarkNav({
  children,
  label,
  className,
}: {
  children: ReactNode;
  label?: string;
  className?: string;
}) {
  return (
    <nav role="navigation" aria-label={label} className={className}>
      {children}
    </nav>
  );
}

/**
 * 랜드마크 메인 콘텐츠
 */
export function LandmarkMain({
  children,
  id = "main-content",
  className,
}: {
  children: ReactNode;
  id?: string;
  className?: string;
}) {
  return (
    <main role="main" id={id} tabIndex={-1} className={className}>
      {children}
    </main>
  );
}

/**
 * 랜드마크 푸터
 */
export function LandmarkFooter({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <footer role="contentinfo" className={className}>
      {children}
    </footer>
  );
}

/**
 * 검색 랜드마크
 */
export function LandmarkSearch({
  children,
  id = "search",
  label = "검색",
  className,
}: {
  children: ReactNode;
  id?: string;
  label?: string;
  className?: string;
}) {
  return (
    <div role="search" id={id} aria-label={label} className={className}>
      {children}
    </div>
  );
}

/**
 * 접근성 버튼 (아이콘만 있을 때)
 */
export function AccessibleIconButton({
  icon,
  label,
  onClick,
  className,
  disabled = false,
}: {
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center rounded-md p-2 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50",
        className
      )}
    >
      {icon}
      <VisuallyHidden>{label}</VisuallyHidden>
    </button>
  );
}

/**
 * 접근성 링크 (외부 링크)
 */
export function AccessibleExternalLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn("underline hover:no-underline focus-visible:ring-2 focus-visible:ring-ring rounded", className)}
    >
      {children}
      <VisuallyHidden>(새 창에서 열림)</VisuallyHidden>
    </a>
  );
}

/**
 * 로딩 인디케이터 (스크린 리더용)
 */
export function AccessibleLoadingIndicator({
  children = "로딩 중...",
  visible = true,
}: {
  children?: ReactNode;
  visible?: boolean;
}) {
  if (!visible) return null;

  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <VisuallyHidden>{children}</VisuallyHidden>
    </div>
  );
}

/**
 * 에러 메시지 (스크린 리더용)
 */
export function AccessibleErrorMessage({
  children,
  id,
}: {
  children: ReactNode;
  id?: string;
}) {
  return (
    <div role="alert" aria-live="assertive" id={id} className="text-destructive text-sm mt-1">
      {children}
    </div>
  );
}

/**
 * 진행 상태 (스크린 리더용)
 */
export function AccessibleProgress({
  value,
  max = 100,
  label,
}: {
  value: number;
  max?: number;
  label?: string;
}) {
  const percentage = Math.round((value / max) * 100);

  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label}
    >
      <VisuallyHidden>
        {label ? `${label}: ` : ""}
        {percentage}% 완료
      </VisuallyHidden>
    </div>
  );
}

/**
 * 탭 패널
 */
export function AccessibleTabPanel({
  children,
  id,
  tabId,
  hidden,
  className,
}: {
  children: ReactNode;
  id: string;
  tabId: string;
  hidden: boolean;
  className?: string;
}) {
  return (
    <div
      role="tabpanel"
      id={id}
      aria-labelledby={tabId}
      hidden={hidden}
      tabIndex={0}
      className={className}
    >
      {children}
    </div>
  );
}

/**
 * 페이지 제목 업데이트
 */
export function usePageTitle(title: string) {
  if (typeof document !== 'undefined') {
    document.title = title;
  }
}

/**
 * 메타 설명 업데이트
 */
export function useMetaDescription(description: string) {
  if (typeof document !== 'undefined') {
    let meta = document.querySelector('meta[name="description"]');
    if (!meta) {
      meta = document.createElement('meta');
      meta.setAttribute('name', 'description');
      document.head.appendChild(meta);
    }
    meta.setAttribute('content', description);
  }
}
