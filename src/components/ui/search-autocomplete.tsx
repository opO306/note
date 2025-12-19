import { useState, useRef, useEffect } from "react";
import { Input } from "./input";
import { Button } from "./button";
import { Card } from "./card";
import { Badge } from "./badge";
import { Separator } from "./separator";
import { cn } from "./utils";
import {
  Search,
  X,
  Clock,
  TrendingUp,
  Hash,
  ArrowUpRight,
  Loader2,
} from "lucide-react";
import { SearchSuggestion } from "../hooks/useSearchSuggestions";

interface SearchAutocompleteProps {
  /** 검색어 */
  value: string;
  /** 검색어 변경 */
  onChange: (value: string) => void;
  /** 검색 실행 */
  onSearch: (query: string) => void;
  /** 검색 제안 */
  suggestions: SearchSuggestion[];
  /** 로딩 상태 */
  isLoading?: boolean;
  /** Placeholder */
  placeholder?: string;
  /** 자동완성 비활성화 */
  disabled?: boolean;
  /** 추가 클래스명 */
  className?: string;
  /** 최근 검색어 삭제 */
  onDeleteHistory?: (id: string) => void;
  /** 전체 히스토리 삭제 */
  onClearHistory?: () => void;
  /** Did you mean 제안 */
  didYouMean?: string | null;
}

/**
 * 검색 자동완성 컴포넌트
 */
export function SearchAutocomplete({
  value,
  onChange,
  onSearch,
  suggestions,
  isLoading = false,
  placeholder = "검색어를 입력하세요",
  disabled = false,
  className,
  onDeleteHistory,
  onClearHistory,
  didYouMean,
}: SearchAutocompleteProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const showSuggestions =
    isFocused && (suggestions.length > 0 || isLoading || didYouMean);

  // 키보드 네비게이션
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions) return;

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : prev
        );
        break;

      case "ArrowUp":
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;

      case "Enter":
        e.preventDefault();
        if (selectedIndex >= 0 && suggestions[selectedIndex]) {
          handleSelectSuggestion(suggestions[selectedIndex]);
        } else if (value.trim()) {
          onSearch(value.trim());
          setIsFocused(false);
        }
        break;

      case "Escape":
        e.preventDefault();
        setIsFocused(false);
        inputRef.current?.blur();
        break;
    }
  };

  // 제안 선택
  const handleSelectSuggestion = (suggestion: SearchSuggestion) => {
    onChange(suggestion.text);
    onSearch(suggestion.text);
    setIsFocused(false);
    setSelectedIndex(-1);
  };

  // 히스토리 삭제
  const handleDeleteHistory = (
    e: React.MouseEvent,
    id: string
  ) => {
    e.stopPropagation();
    onDeleteHistory?.(id);
  };

  // 클릭 외부 감지
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setIsFocused(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 선택된 항목 스크롤
  useEffect(() => {
    if (selectedIndex >= 0 && suggestionsRef.current) {
      const selectedElement = suggestionsRef.current.querySelector(
        `[data-suggestion-index="${selectedIndex}"]`
      );
      selectedElement?.scrollIntoView({ block: "nearest" });
    }
  }, [selectedIndex]);

  // 제안 타입별 아이콘
  const getSuggestionIcon = (type: SearchSuggestion["type"]) => {
    switch (type) {
      case "history":
        return <Clock className="w-4 h-4 text-muted-foreground" />;
      case "popular":
        return <TrendingUp className="w-4 h-4 text-primary" />;
      case "category":
        return <Hash className="w-4 h-4 text-muted-foreground" />;
      default:
        return <Search className="w-4 h-4 text-muted-foreground" />;
    }
  };

  // 제안 타입별 라벨
  const getSuggestionLabel = (type: SearchSuggestion["type"]) => {
    switch (type) {
      case "history":
        return "최근 검색";
      case "popular":
        return "인기 검색어";
      case "category":
        return "카테고리";
      default:
        return "추천";
    }
  };

  // 그룹화된 제안
  const groupedSuggestions = suggestions.reduce((acc, suggestion) => {
    if (!acc[suggestion.type]) {
      acc[suggestion.type] = [];
    }
    acc[suggestion.type].push(suggestion);
    return acc;
  }, {} as Record<string, SearchSuggestion[]>);

  return (
    <div className={cn("relative w-full", className)}>
      {/* 검색 입력 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setSelectedIndex(-1);
          }}
          onFocus={() => setIsFocused(true)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          className="pl-10 pr-10"
        />
        {value && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              onChange("");
              inputRef.current?.focus();
            }}
            className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      {/* 자동완성 드롭다운 */}
      {showSuggestions && (
        <Card
          ref={suggestionsRef}
          className="absolute top-full left-0 right-0 mt-2 z-50 max-h-96 overflow-y-auto shadow-lg"
        >
          {/* Did you mean */}
          {didYouMean && (
            <>
              <button
                onClick={() => {
                  onChange(didYouMean);
                  onSearch(didYouMean);
                  setIsFocused(false);
                }}
                className="w-full px-4 py-3 text-left hover:bg-muted/50 transition-colors flex items-center gap-2"
              >
                <span className="text-sm text-muted-foreground">
                  다음을 찾으셨나요?
                </span>
                <span className="text-sm font-medium text-primary">
                  {didYouMean}
                </span>
              </button>
              <Separator />
            </>
          )}

          {/* 로딩 */}
          {isLoading && (
            <div className="px-4 py-8 flex items-center justify-center">
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* 제안 목록 */}
          {!isLoading && suggestions.length > 0 && (
            <div className="py-2">
              {Object.entries(groupedSuggestions).map(
                ([type, items], groupIndex) => (
                  <div key={type}>
                    {groupIndex > 0 && <Separator className="my-2" />}

                    {/* 그룹 헤더 */}
                    <div className="px-4 py-2 flex items-center justify-between">
                      <span className="text-xs font-medium text-muted-foreground">
                        {getSuggestionLabel(type as SearchSuggestion["type"])}
                      </span>
                      {type === "history" && onClearHistory && items.length > 0 && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={onClearHistory}
                          className="h-6 text-xs"
                        >
                          전체 삭제
                        </Button>
                      )}
                    </div>

                    {/* 제안 항목 */}
                    {items.map((suggestion) => {
                      const globalIndex = suggestions.findIndex(
                        (s) => s.id === suggestion.id
                      );
                      const isSelected = globalIndex === selectedIndex;

                      return (
                        <button
                          key={suggestion.id}
                          data-suggestion-index={globalIndex}
                          onClick={() => handleSelectSuggestion(suggestion)}
                          className={cn(
                            "w-full px-4 py-2.5 text-left transition-colors flex items-center gap-3 group",
                            isSelected
                              ? "bg-muted"
                              : "hover:bg-muted/50"
                          )}
                        >
                          {getSuggestionIcon(suggestion.type)}

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="text-sm truncate">
                                {suggestion.text}
                              </span>
                              {suggestion.category && (
                                <Badge
                                  variant="secondary"
                                  className="text-xs px-1.5 py-0"
                                >
                                  {suggestion.category}
                                </Badge>
                              )}
                            </div>
                            {suggestion.count !== undefined && (
                              <span className="text-xs text-muted-foreground">
                                {suggestion.count}회 검색됨
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            {suggestion.type === "history" && onDeleteHistory && (
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) =>
                                  handleDeleteHistory(e, suggestion.id)
                                }
                                className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <X className="w-3 h-3" />
                              </Button>
                            )}
                            <ArrowUpRight className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )
              )}
            </div>
          )}

          {/* 제안 없음 */}
          {!isLoading && suggestions.length === 0 && !didYouMean && value && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              검색 제안이 없습니다
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

/**
 * 간단한 검색 바
 */
export function SimpleSearchBar({
  value,
  onChange,
  onSearch,
  placeholder = "검색",
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  onSearch: (query: string) => void;
  placeholder?: string;
  className?: string;
}) {
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (value.trim()) {
      onSearch(value.trim());
    }
  };

  return (
    <form onSubmit={handleSubmit} className={cn("relative", className)}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground pointer-events-none" />
      <Input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="pl-10 pr-10"
      />
      {value && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => onChange("")}
          className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8"
        >
          <X className="w-4 h-4" />
        </Button>
      )}
    </form>
  );
}
