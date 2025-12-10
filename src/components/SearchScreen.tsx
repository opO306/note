// src/components/SearchScreen.tsx
import { useState, useEffect, useCallback } from "react";
import { useKeyboard } from "./hooks/useKeyboard";
import { useScrollIntoView } from "./hooks/useScrollIntoView";
import { KeyboardDismissButton } from "./ui/keyboard-dismiss-button";
import { SlowConnectionWarning } from "./ui/offline-indicator";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { OptimizedAvatar } from "@/components/OptimizedAvatar";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Switch } from "./ui/switch";
import { ArrowLeft, Search, Clock, TrendingUp, Settings } from "lucide-react";
import { LanternFilledIcon } from "./icons/Lantern";

// Firestore
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

interface SearchScreenProps {
  onBack: () => void;
  posts: any[];
  onPostSelect: (post: any) => void;
}

interface UserSearchSettings {
  autoSave: boolean;
  recentSearches: string[];
}

export function SearchScreen({
  onBack,
  posts,
  onPostSelect,
}: SearchScreenProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [_autoSuggestions, setAutoSuggestions] = useState<string[]>([]);
  const [_showSuggestions, setShowSuggestions] = useState(false);
  const [popularTags] = useState([
    "AI",
    "머신러닝",
    "수학",
    "물리학",
    "프로그래밍",
    "알고리즘",
    "데이터사이언스",
    "양자역학",
    "적분",
    "미술",
    "음악",
    "철학",
    "건의사항",
    "자유토론",
  ]);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  // 검색어가 "실제로" 입력된 상태인지(공백 제외)
  const hasQuery = searchTerm.trim().length > 0;


  // Keyboard handling
  const keyboard = useKeyboard();
  const searchInputRef =
    useScrollIntoView<HTMLInputElement>({ delay: 350, offset: 80 });

  // 🔹 localStorage + Firestore 기반 검색 설정 로드
  useEffect(() => {
    // SSR 대비
    if (typeof window === "undefined") {
      setRecentSearches([]);
      setIsAutoSaveEnabled(true);
      setSettingsLoaded(true);
      return;
    }

    // 1) localStorage 기반 기본값
    let localRecent: string[] = [];
    let localAutoSave = true;

    try {
      const saved = localStorage.getItem("recentSearches");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          localRecent = parsed.filter((s) => typeof s === "string");
        }
      }
    } catch (error) {
      console.error("recentSearches 파싱 실패:", error);
    }

    try {
      const autoSavePref = localStorage.getItem("searchAutoSave");
      if (autoSavePref !== null) {
        localAutoSave = autoSavePref !== "false";
      }
    } catch (error) {
      console.error("searchAutoSave 로드 실패:", error);
    }

    const uid = auth.currentUser?.uid;
    if (!uid) {
      setRecentSearches(localRecent);
      setIsAutoSaveEnabled(localAutoSave);
      setSettingsLoaded(true);
      return;
    }

    let cancelled = false;
    const userRef = doc(db, "users", uid);

    (async () => {
      try {
        const snap = await getDoc(userRef);
        if (snap.exists()) {
          const data = snap.data() as any;
          const ss = data.searchSettings;

          if (ss && typeof ss === "object") {
            const serverAutoSave =
              typeof ss.autoSave === "boolean"
                ? ss.autoSave
                : localAutoSave;
            const serverRecent = Array.isArray(ss.recentSearches)
              ? (ss.recentSearches as string[]).filter(
                (s) => typeof s === "string",
              )
              : localRecent;

            if (!cancelled) {
              setRecentSearches(serverRecent);
              setIsAutoSaveEnabled(serverAutoSave);
              try {
                localStorage.setItem(
                  "recentSearches",
                  JSON.stringify(serverRecent),
                );
                localStorage.setItem(
                  "searchAutoSave",
                  serverAutoSave.toString(),
                );
              } catch { }
            }
          } else {
            if (!cancelled) {
              setRecentSearches(localRecent);
              setIsAutoSaveEnabled(localAutoSave);
            }
            const payload: UserSearchSettings = {
              autoSave: localAutoSave,
              recentSearches: localRecent,
            };
            await updateDoc(userRef, { searchSettings: payload });
          }
        } else {
          if (!cancelled) {
            setRecentSearches(localRecent);
            setIsAutoSaveEnabled(localAutoSave);
          }
          const payload: UserSearchSettings = {
            autoSave: localAutoSave,
            recentSearches: localRecent,
          };
          await setDoc(userRef, { searchSettings: payload }, { merge: true });
        }
      } catch (error) {
        console.error("검색 설정 Firestore 로드 실패:", error);
        if (!cancelled) {
          setRecentSearches(localRecent);
          setIsAutoSaveEnabled(localAutoSave);
        }
      } finally {
        if (!cancelled) setSettingsLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  // 🔹 검색 설정 저장 헬퍼 (localStorage + Firestore)
  const persistSearchSettings = useCallback(
    async (nextRecent: string[], nextAutoSave: boolean) => {
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(
            "recentSearches",
            JSON.stringify(nextRecent),
          );
          localStorage.setItem("searchAutoSave", nextAutoSave.toString());
        } catch (error) {
          console.error("검색 설정 localStorage 저장 실패:", error);
        }
      }

      const uid = auth.currentUser?.uid;
      if (!uid) return;

      const userRef = doc(db, "users", uid);
      const payload: UserSearchSettings = {
        autoSave: nextAutoSave,
        recentSearches: nextRecent,
      };

      try {
        await updateDoc(userRef, { searchSettings: payload });
      } catch (error) {
        console.error("검색 설정 Firestore 동기화 실패:", error);
      }
    },
    [],
  );

  const _generateSuggestions = (term: string) => {
    if (!term.trim() || term.length < 2) {
      setAutoSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const normalizedTerm = term.toLowerCase().trim();
    const suggestions = new Set<string>();

    posts.forEach((post) => {
      const titleLower = post.title.toLowerCase();
      const authorLower = post.author.toLowerCase();
      const categoryLower = post.category.toLowerCase();
      const subCategoryLower = post.subCategory.toLowerCase();

      if (titleLower.includes(normalizedTerm)) {
        suggestions.add(post.title);
      }
      if (authorLower.includes(normalizedTerm)) {
        suggestions.add(post.author);
      }
      if (categoryLower.includes(normalizedTerm)) {
        suggestions.add(post.category);
      }
      if (subCategoryLower.includes(normalizedTerm)) {
        suggestions.add(post.subCategory);
      }

      post.tags.forEach((tag: string) => {
        if (tag.toLowerCase().includes(normalizedTerm)) {
          suggestions.add(tag);
        }
      });
    });

    recentSearches.forEach((search) => {
      if (search.toLowerCase().includes(normalizedTerm)) {
        suggestions.add(search);
      }
    });

    popularTags.forEach((tag) => {
      if (tag.toLowerCase().includes(normalizedTerm)) {
        suggestions.add(tag);
      }
    });

    const suggestionArray = Array.from(suggestions)
      .filter((s) => s.toLowerCase() !== normalizedTerm)
      .slice(0, 5);

    setAutoSuggestions(suggestionArray);
    setShowSuggestions(suggestionArray.length > 0);
  };

  const handleToggleSettings = useCallback(() => {
    setShowSettings((prev) => !prev);
  }, []);

  const handleSearchTermChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      setSearchTerm(e.target.value);
    },
    [],
  );

  const handleMainRef = useCallback(
    (el: HTMLElement | null) => {
      if (el) {
        el.style.setProperty(
          "--dynamic-padding-bottom",
          keyboard.isVisible ? `${keyboard.height}px` : "0px",
        );
      }
    },
    [keyboard.isVisible, keyboard.height],
  );

  const handleSearch = useCallback(
    (term: string) => {
      if (!term.trim()) {
        setSearchResults([]);
        return;
      }

      const normalizedTerm = term.toLowerCase().trim();

      const results = posts
        .filter((post) => {
          const titleLower = post.title.toLowerCase();
          const contentLower = post.content.toLowerCase();
          const authorLower = post.author.toLowerCase();
          const categoryLower = post.category.toLowerCase();
          const subCategoryLower = post.subCategory.toLowerCase();
          const tagsLower = post.tags.map((tag: string) =>
            tag.toLowerCase(),
          );

          if (
            titleLower === normalizedTerm ||
            authorLower === normalizedTerm ||
            categoryLower === normalizedTerm ||
            subCategoryLower === normalizedTerm ||
            tagsLower.some((tag: string) => tag === normalizedTerm)
          ) {
            return true;
          }

          if (
            titleLower.startsWith(normalizedTerm) ||
            authorLower.startsWith(normalizedTerm) ||
            categoryLower.startsWith(normalizedTerm) ||
            subCategoryLower.startsWith(normalizedTerm) ||
            tagsLower.some((tag: string) => tag.startsWith(normalizedTerm))
          ) {
            return true;
          }

          return (
            titleLower.includes(normalizedTerm) ||
            contentLower.includes(normalizedTerm) ||
            authorLower.includes(normalizedTerm) ||
            categoryLower.includes(normalizedTerm) ||
            subCategoryLower.includes(normalizedTerm) ||
            tagsLower.some((tag: string) =>
              tag.includes(normalizedTerm),
            )
          );
        })
        .sort((a, b) => {
          const aTitle = a.title.toLowerCase();
          const bTitle = b.title.toLowerCase();

          if (
            aTitle.startsWith(normalizedTerm) &&
            !bTitle.startsWith(normalizedTerm)
          )
            return -1;
          if (
            !aTitle.startsWith(normalizedTerm) &&
            bTitle.startsWith(normalizedTerm)
          )
            return 1;

          if (b.lanterns !== a.lanterns) return b.lanterns - a.lanterns;

          return b.createdAt.getTime() - a.createdAt.getTime();
        });

      setSearchResults(results);
      setShowSuggestions(false);
    },
    [posts],
  );

  const handleSearchSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!searchTerm.trim()) return;

      handleSearch(searchTerm);

      if (isAutoSaveEnabled) {
        const newRecentSearches = [
          searchTerm,
          ...recentSearches.filter((s) => s !== searchTerm),
        ].slice(0, 10);

        setRecentSearches(newRecentSearches);
        persistSearchSettings(newRecentSearches, isAutoSaveEnabled);
      }
    },
    [
      searchTerm,
      handleSearch,
      isAutoSaveEnabled,
      recentSearches,
      persistSearchSettings,
    ],
  );

  // SearchScreen 컴포넌트 안
  const handleBackClick = useCallback(() => {
    // 검색 상태 리셋
    setSearchTerm("");
    setSearchResults([]);
    setShowSuggestions(false); // _showSuggestions 쓰고 있다면 여기도 같이 리셋

    onBack();
  }, [onBack]);

  const handleTagClick = useCallback(
    (tag: string) => {
      setSearchTerm(tag);
      handleSearch(tag);
      setShowSuggestions(false);
    },
    [handleSearch],
  );

  const handleRecentSearchClick = useCallback(
    (search: string) => {
      setSearchTerm(search);
      handleSearch(search);
      setShowSuggestions(false);
    },
    [handleSearch],
  );

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    persistSearchSettings([], isAutoSaveEnabled);
  }, [isAutoSaveEnabled, persistSearchSettings]);

  const toggleAutoSave = useCallback(() => {
    const newValue = !isAutoSaveEnabled;

    if (!newValue) {
      let nextRecent = recentSearches;
      if (recentSearches.length > 0) {
        const shouldClear = confirm(
          "검색 기록 자동저장을 끄시겠습니까?\n기존 검색 기록도 함께 삭제됩니다.",
        );
        if (shouldClear) {
          nextRecent = [];
          setRecentSearches([]);
        }
      }
      setIsAutoSaveEnabled(false);
      persistSearchSettings(nextRecent, false);
    } else {
      setIsAutoSaveEnabled(true);
      persistSearchSettings(recentSearches, true);
    }
  }, [
    isAutoSaveEnabled,
    recentSearches,
    persistSearchSettings,
  ]);

  if (!settingsLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <span className="text-sm text-muted-foreground">
          검색 설정을 불러오는 중...
        </span>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="bg-card/95 backdrop-blur-xl border-b border-border flex-shrink-0 safe-top">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-3">
              <Button variant="ghost" size="icon" onClick={handleBackClick}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <h1 className="font-medium">검색</h1>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleToggleSettings}
            >
              <Settings className="w-5 h-5" />
            </Button>
          </div>

          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              type="text"
              placeholder="글 제목, 내용, 작성자, 태그를 검색하세요..."
              value={searchTerm}
              onChange={handleSearchTermChange}
              className="pl-10 h-10 input-keyboard-safe"
              autoFocus
            />
          </form>

          {showSettings && (
            <div className="mt-3 p-3 bg-muted/30 rounded-lg border border-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">검색 기록 자동저장</p>
                  <p className="text-xs text-muted-foreground">
                    검색한 키워드를 자동으로 저장합니다
                  </p>
                </div>
                <Switch
                  checked={isAutoSaveEnabled}
                  onCheckedChange={toggleAutoSave}
                />
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Content */}
      <div
        className="flex-1 overflow-y-auto scrollbar-hide keyboard-aware-container dynamic-container"
        ref={handleMainRef}
      >
        <div className="p-4 pb-24">
          {/* 느린 연결 경고 */}
          <div className="mb-4">
            <SlowConnectionWarning />
          </div>

          {hasQuery && searchResults.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm text-muted-foreground">
                  '{searchTerm}'에 대한 {searchResults.length}개의 검색 결과
                </p>
              </div>

              {/* eslint-disable react/jsx-no-bind, react-perf/jsx-no-new-function-as-prop */}
              {searchResults.map((post) => (
                <Card
                  key={post.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => onPostSelect(post)}
                >
                  {/* eslint-enable react/jsx-no-bind, react-perf/jsx-no-new-function-as-prop */}
                  <CardContent className="p-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <OptimizedAvatar
                            src={post.authorAvatar}
                            alt={post.author}
                            size={32} // 8 * 4
                            fallbackText={post.author?.charAt(0)?.toUpperCase() || "?"}
                          />
                          <div>
                            <p className="font-medium text-sm">{post.author}</p>
                            <p className="text-xs text-muted-foreground">{post.timeAgo}</p>
                          </div>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {post.subCategory}
                        </Badge>
                      </div>

                      <div>
                        <h3 className="font-medium mb-2 text-sm">{post.title}</h3>
                        <p className="text-muted-foreground text-sm leading-relaxed line-clamp-3">
                          {post.content}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-border">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-1">
                            <LanternFilledIcon className="w-4 h-4 text-amber-500" />
                            <span className="text-xs text-muted-foreground">{post.lanterns}</span>
                          </div>
                          <span className="text-xs text-muted-foreground">댓글 {post.comments}</span>
                        </div>

                        {post.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {post.tags.slice(0, 2).map((tag: string) => (
                              <Badge key={tag} variant="secondary" className="text-xs">
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {hasQuery && searchResults.length === 0 && (
            <div className="text-center py-16 px-4">
              {/* Search empty state with visual icon */}
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-slate-500/30 dark:bg-slate-400/30 blur-2xl rounded-full"></div>
                <div className="relative w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-700/40 flex items-center justify-center border-4 border-slate-400 dark:border-slate-600 shadow-lg mx-auto">
                  <Search className="w-14 h-14 text-slate-900 dark:text-slate-200" strokeWidth={2.5} />
                </div>
              </div>
              <p className="text-muted-foreground font-medium mb-1">'{searchTerm}'에 대한 검색 결과가 없습니다.</p>
              <p className="text-muted-foreground text-sm">
                다른 키워드로 검색해보세요.
              </p>
            </div>
          )}

          {!hasQuery && (
            <div className="space-y-6">
              {/* Recent Searches */}
              {recentSearches.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-medium flex items-center space-x-2">
                      <Clock className="w-4 h-4" />
                      <span>최근 검색</span>
                    </h2>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={clearRecentSearches}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      전체 삭제
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {/* eslint-disable react/jsx-no-bind, react-perf/jsx-no-new-function-as-prop */}
                    {recentSearches.map((search, index) => (
                      <Button
                        key={index}
                        variant="outline"
                        size="sm"
                        onClick={() => handleRecentSearchClick(search)}
                        className="text-xs h-8"
                      >
                        {search}
                      </Button>
                    ))}
                    {/* eslint-enable react/jsx-no-bind, react-perf/jsx-no-new-function-as-prop */}
                  </div>
                </div>
              )}

              {/* Popular Tags */}
              <div>
                <h2 className="font-medium mb-3 flex items-center space-x-2">
                  <TrendingUp className="w-4 h-4" />
                  <span>인기 태그</span>
                </h2>
                <div className="flex flex-wrap gap-2">
                  {/* eslint-disable react/jsx-no-bind, react-perf/jsx-no-new-function-as-prop */}
                  {popularTags.map((tag) => (
                    <Button
                      key={tag}
                      variant="secondary"
                      size="sm"
                      onClick={() => handleTagClick(tag)}
                      className="text-xs h-8"
                    >
                      #{tag}
                    </Button>
                  ))}
                  {/* eslint-enable react/jsx-no-bind, react-perf/jsx-no-new-function-as-prop */}
                </div>
              </div>

              {/* Search Tips */}
              <div className="bg-muted/30 rounded-lg p-4">
                <h3 className="font-medium mb-2 text-sm">검색 팁</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• 키워드로 글 제목, 내용, 작성자를 검색할 수 있어요</li>
                  <li>• #태그명으로 특정 태그를 검색해보세요</li>
                  <li>• 카테고리명으로도 검색이 가능해요</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 키보드 완료 버튼 */}
      <KeyboardDismissButton />
    </div>
  );
}