import { useMemo } from "react";
import { cn } from "./utils";

interface SearchHighlightProps {
  /** 하이라이트할 텍스트 */
  text: string;
  /** 검색어 */
  query: string;
  /** 추가 클래스명 */
  className?: string;
  /** 하이라이트 클래스명 */
  highlightClassName?: string;
  /** 대소문자 구분 */
  caseSensitive?: boolean;
  /** HTML 태그로 렌더링 */
  dangerouslySetInnerHTML?: boolean;
}

/**
 * 검색어 하이라이트 컴포넌트
 */
export function SearchHighlight({
  text,
  query,
  className,
  highlightClassName = "bg-primary/20 text-primary font-medium px-0.5 rounded",
  caseSensitive = false,
  dangerouslySetInnerHTML = false,
}: SearchHighlightProps) {
  const highlightedText = useMemo(() => {
    if (!query.trim() || !text) {
      return { parts: [{ text, isHighlight: false }] };
    }

    const normalizedQuery = query.trim();
    const flags = caseSensitive ? "g" : "gi";

    try {
      // 특수 문자 이스케이프
      const escapedQuery = normalizedQuery.replace(
        /[.*+?^${}()|[\]\\]/g,
        "\\$&"
      );
      const regex = new RegExp(`(${escapedQuery})`, flags);

      const parts: Array<{ text: string; isHighlight: boolean }> = [];
      let lastIndex = 0;

      text.replace(regex, (match, _p1, offset) => {
        // 매칭 전 텍스트
        if (offset > lastIndex) {
          parts.push({
            text: text.substring(lastIndex, offset),
            isHighlight: false,
          });
        }

        // 매칭된 텍스트
        parts.push({
          text: match,
          isHighlight: true,
        });

        lastIndex = offset + match.length;
        return match;
      });

      // 남은 텍스트
      if (lastIndex < text.length) {
        parts.push({
          text: text.substring(lastIndex),
          isHighlight: false,
        });
      }

      return { parts };
    } catch (error) {
      console.error("Highlight error:", error);
      return { parts: [{ text, isHighlight: false }] };
    }
  }, [text, query, caseSensitive]);

  if (dangerouslySetInnerHTML) {
    const htmlString = highlightedText.parts
      .map((part) =>
        part.isHighlight
          ? `<mark class="${highlightClassName}">${part.text}</mark>`
          : part.text
      )
      .join("");

    return (
      <span
        className={className}
        dangerouslySetInnerHTML={{ __html: htmlString }}
      />
    );
  }

  return (
    <span className={className}>
      {highlightedText.parts.map((part, index) =>
        part.isHighlight ? (
          <mark key={index} className={highlightClassName}>
            {part.text}
          </mark>
        ) : (
          <span key={index}>{part.text}</span>
        )
      )}
    </span>
  );
}

/**
 * 여러 줄 텍스트 하이라이트
 */
export function MultilineSearchHighlight({
  text,
  query,
  className,
  highlightClassName,
  maxLines = 3,
}: SearchHighlightProps & { maxLines?: number }) {
  const lines = text.split("\n").slice(0, maxLines);

  return (
    <div className={cn("space-y-1", className)}>
      {lines.map((line, index) => (
        <SearchHighlight
          key={index}
          text={line}
          query={query}
          highlightClassName={highlightClassName}
        />
      ))}
      {text.split("\n").length > maxLines && (
        <span className="text-xs text-muted-foreground">...</span>
      )}
    </div>
  );
}

/**
 * 컨텍스트와 함께 하이라이트 (검색 결과용)
 */
export function SearchHighlightWithContext({
  text,
  query,
  contextLength = 50,
  className,
  highlightClassName,
}: SearchHighlightProps & { contextLength?: number }) {
  const { excerpt } = useMemo(() => {
    if (!query.trim() || !text) {
      return {
        excerpt: text.substring(0, contextLength * 2) + "...",
      };
    }

    const normalizedText = text.toLowerCase();
    const normalizedQuery = query.toLowerCase().trim();
    const matchIndex = normalizedText.indexOf(normalizedQuery);

    if (matchIndex === -1) {
      return {
        excerpt: text.substring(0, contextLength * 2) + "...",
      };
    }

    // 매칭 위치 주변 컨텍스트 추출
    const start = Math.max(0, matchIndex - contextLength);
    const end = Math.min(
      text.length,
      matchIndex + normalizedQuery.length + contextLength
    );

    let excerpt = text.substring(start, end);

    // 앞뒤에 ... 추가
    if (start > 0) excerpt = "..." + excerpt;
    if (end < text.length) excerpt = excerpt + "...";

    return { excerpt };
  }, [text, query, contextLength]);

  return (
    <SearchHighlight
      text={excerpt}
      query={query}
      className={className}
      highlightClassName={highlightClassName}
    />
  );
}

/**
 * 제목 하이라이트 (더 강조)
 */
export function TitleHighlight({
  title,
  query,
  className,
}: {
  title: string;
  query: string;
  className?: string;
}) {
  return (
    <SearchHighlight
      text={title}
      query={query}
      className={cn("font-medium", className)}
      highlightClassName="bg-primary/30 text-primary font-semibold px-1 rounded"
    />
  );
}

/**
 * 태그 하이라이트
 */
export function TagHighlight({
  tag,
  query,
  className,
}: {
  tag: string;
  query: string;
  className?: string;
}) {
  const isMatch = tag.toLowerCase().includes(query.toLowerCase().trim());

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-1 rounded-full text-xs",
        isMatch
          ? "bg-primary/20 text-primary font-medium ring-1 ring-primary/30"
          : "bg-muted text-muted-foreground",
        className
      )}
    >
      #{tag}
    </span>
  );
}

/**
 * 카테고리 하이라이트
 */
export function CategoryHighlight({
  category,
  query,
  className,
}: {
  category: string;
  query: string;
  className?: string;
}) {
  const isMatch = category.toLowerCase().includes(query.toLowerCase().trim());

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-1 rounded text-xs font-medium",
        isMatch
          ? "bg-primary/20 text-primary ring-1 ring-primary/30"
          : "bg-secondary text-secondary-foreground",
        className
      )}
    >
      {category}
    </span>
  );
}

/**
 * 검색 결과 카운트 하이라이트
 */
export function SearchResultCount({
  query,
  count,
  className,
}: {
  query: string;
  count: number;
  className?: string;
}) {
  return (
    <div className={cn("text-sm text-muted-foreground", className)}>
      <span className="text-foreground font-medium">'{query}'</span> 검색 결과{" "}
      <span className="text-primary font-semibold">{count}개</span>
    </div>
  );
}
