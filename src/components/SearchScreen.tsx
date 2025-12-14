// src/components/SearchScreen.tsx
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useScrollIntoView } from "./hooks/useScrollIntoView";
import { KeyboardDismissButton } from "./ui/keyboard-dismiss-button";
import { SlowConnectionWarning } from "./ui/offline-indicator";
import { Button } from "./ui/button";
import { ArrowLeft, Search, Clock, TrendingUp, Settings } from "lucide-react";
import { Input } from "./ui/input";
import { Switch } from "./ui/switch";
import { PostCardsList } from "./MainScreen/components/PostListView";
import { useUserProfiles } from "./MainScreen/hooks/useUserProfiles";
import type { Post } from "./MainScreen/types";
import type { UserProfileLite } from "./MainScreen/hooks/useUserProfiles";

// Firestore
import { auth, db } from "../firebase";
import {
  addDoc,
  collection,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";

interface SearchScreenProps {
  onBack: () => void;
  posts: Post[];
  onPostSelect: (post: Post) => void;
  userNickname: string;
  userProfileImage: string;
  currentTitle: string;
  isPostLanterned: (postId: string | number) => boolean;
  isBookmarked: (postId: string | number) => boolean;
  onLanternToggle: (postId: string | number) => void;
  onBookmarkToggle: (postId: string | number) => void;
  formatTimeAgo: (date?: Date) => string;
  formatCreatedAt: (date?: Date) => string;
}

interface UserSearchSettings {
  autoSave: boolean;
  recentSearches: string[];
}

interface SearchResultsListProps {
  searchResults: Post[];
  searchResultUserProfiles: Record<string, UserProfileLite>;
  userNickname: string;
  userProfileImage: string;
  isPostLanterned: (postId: string | number) => boolean;
  isBookmarked: (postId: string | number) => boolean;
  formatTimeAgo: (date?: Date) => string;
  formatCreatedAt: (date?: Date) => string;
  currentTitle: string;
  onPostSelect: (post: Post) => void;
  onLanternToggle: (postId: string | number) => void;
  onBookmarkToggle: (postId: string | number) => void;
}

// Optimization: Constant for popular tags
const POPULAR_TAGS = [
  "AI", "머신러닝", "수학", "물리학", "프로그래밍",
  "알고리즘", "데이터사이언스", "양자역학", "적분",
  "미술", "음악", "철학", "건의사항", "자유토론",
];

const SearchResultsListComponent = ({
  searchResults,
  searchResultUserProfiles,
  userNickname,
  userProfileImage,
  isPostLanterned,
  isBookmarked,
  formatTimeAgo,
  formatCreatedAt,
  currentTitle,
  onPostSelect,
  onLanternToggle,
  onBookmarkToggle,
}: SearchResultsListProps) => {
  return (
    <PostCardsList
      posts={searchResults}
      userNickname={userNickname}
      userProfileImage={userProfileImage}
      isPostLanterned={isPostLanterned}
      isBookmarked={isBookmarked}
      currentTitle={currentTitle}
      userProfiles={searchResultUserProfiles}
      formatTimeAgo={formatTimeAgo}
      formatCreatedAt={formatCreatedAt}
      onPostClick={onPostSelect}
      onLanternToggle={onLanternToggle}
      onBookmarkToggle={onBookmarkToggle}
    />
  );
};

// Refined Memoization: Removed the heavy manual comparison loop.
// If you need deep comparison, rely on stable props from the parent or
// implement memoization inside PostCardsList items.
export const SearchResultsList = React.memo(SearchResultsListComponent);

export function SearchScreen({
  onBack,
  posts,
  onPostSelect,
  userNickname,
  userProfileImage,
  currentTitle,
  isPostLanterned,
  isBookmarked,
  onLanternToggle,
  onBookmarkToggle,
  formatTimeAgo,
  formatCreatedAt,
}: SearchScreenProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchResults, setSearchResults] = useState<Post[]>([]);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [isAutoSaveEnabled, setIsAutoSaveEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);

  // Keyboard handling
  const searchInputRef = useScrollIntoView<HTMLInputElement>({ delay: 350, offset: 80 });

  // Check if search is active
  const hasQuery = searchTerm.trim().length > 0;

  // Collect Author UIDs for profile fetching
  const searchResultAuthorUids = useMemo(() => {
    const uids = new Set<string>();
    searchResults.forEach((post) => {
      if (typeof post.authorUid === "string" && post.authorUid.length > 0) {
        uids.add(post.authorUid);
      }
    });
    return Array.from(uids);
  }, [searchResults]);

  // Fetch Profiles
  const searchResultUserProfiles = useUserProfiles(searchResultAuthorUids);

  // 🔹 Load Settings (LocalStorage + Firestore)
  useEffect(() => {
    if (typeof window === "undefined") {
      setSettingsLoaded(true);
      return;
    }

    // 1. Load from LocalStorage
    let localRecent: string[] = [];
    let localAutoSave = true;

    try {
      const saved = localStorage.getItem("recentSearches");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) localRecent = parsed;
      }
      const autoSavePref = localStorage.getItem("searchAutoSave");
      if (autoSavePref !== null) localAutoSave = autoSavePref !== "false";
    } catch (error) {
      console.error("Failed to load local settings", error);
    }

    const uid = auth.currentUser?.uid;
    if (!uid) {
      setRecentSearches(localRecent);
      setIsAutoSaveEnabled(localAutoSave);
      setSettingsLoaded(true);
      return;
    }

    // 2. Load/Sync with Firestore
    let cancelled = false;
    const userRef = doc(db, "users", uid);

    (async () => {
      try {
        const snap = await getDoc(userRef);
        let finalRecent = localRecent;
        let finalAutoSave = localAutoSave;

        if (snap.exists()) {
          const data = snap.data();
          const ss = data?.searchSettings as UserSearchSettings | undefined;

          if (ss) {
            finalRecent = ss.recentSearches || localRecent;
            finalAutoSave = ss.autoSave ?? localAutoSave;

            // Update local storage to match server
            localStorage.setItem("recentSearches", JSON.stringify(finalRecent));
            localStorage.setItem("searchAutoSave", finalAutoSave.toString());
          } else {
            // Init server settings if missing
            await updateDoc(userRef, {
              searchSettings: { autoSave: localAutoSave, recentSearches: localRecent }
            });
          }
        } else {
          // Create user doc if missing
          await setDoc(userRef, {
            searchSettings: { autoSave: localAutoSave, recentSearches: localRecent }
          }, { merge: true });
        }

        if (!cancelled) {
          setRecentSearches(finalRecent);
          setIsAutoSaveEnabled(finalAutoSave);
        }
      } catch (error) {
        console.error("Firestore settings sync error:", error);
        if (!cancelled) {
          setRecentSearches(localRecent);
          setIsAutoSaveEnabled(localAutoSave);
        }
      } finally {
        if (!cancelled) setSettingsLoaded(true);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // 🔹 Persist Settings Helper
  const persistSearchSettings = useCallback(async (nextRecent: string[], nextAutoSave: boolean) => {
    // Local
    try {
      localStorage.setItem("recentSearches", JSON.stringify(nextRecent));
      localStorage.setItem("searchAutoSave", nextAutoSave.toString());
    } catch { /* ignore */ }

    // Remote
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    try {
      const userRef = doc(db, "users", uid);
      await updateDoc(userRef, {
        searchSettings: { autoSave: nextAutoSave, recentSearches: nextRecent }
      });
    } catch (e) {
      console.warn("Firestore save failed", e);
    }
  }, []);

  const handleToggleSettings = useCallback(() => {
    setShowSettings((prev) => !prev);
  }, []);

  const handleSearchTermChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value);
  }, []);

  // 🔹 Main Search Logic
  const executeSearch = useCallback((term: string) => {
    if (!term.trim()) {
      setSearchResults([]);
      return;
    }

    const normalizedTerm = term.toLowerCase().trim();

    const results = posts.filter((post) => {
      const fieldsToCheck = [
        post.title,
        post.content,
        post.author,
        post.category,
        post.subCategory,
        ...post.tags
      ];

      return fieldsToCheck.some(field =>
        field.toLowerCase().includes(normalizedTerm)
      );
    }).sort((a, b) => {
      // Sort logic: Exact starts -> Lanterns -> Date
      const aTitle = a.title.toLowerCase();
      const bTitle = b.title.toLowerCase();
      const aStarts = aTitle.startsWith(normalizedTerm);
      const bStarts = bTitle.startsWith(normalizedTerm);

      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      if (b.lanterns !== a.lanterns) return b.lanterns - a.lanterns;
      return b.createdAt.getTime() - a.createdAt.getTime();
    });

    setSearchResults(results);
  }, [posts]);

  const handleSearchSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = searchTerm.trim();
    if (!trimmed) return;

    executeSearch(trimmed);

    // Save History
    if (isAutoSaveEnabled) {
      const newRecent = [
        trimmed,
        ...recentSearches.filter((s) => s !== trimmed),
      ].slice(0, 10);

      setRecentSearches(newRecent);
      persistSearchSettings(newRecent, isAutoSaveEnabled);
    }

    // Analytics Log
    const uid = auth.currentUser?.uid;
    if (uid) {
      addDoc(collection(db, "user_activity", uid, "searchLogs"), {
        keyword: trimmed,
        createdAt: serverTimestamp(),
      }).catch(err => console.warn("Log error", err));
    }
  }, [searchTerm, executeSearch, isAutoSaveEnabled, recentSearches, persistSearchSettings]);

  // Wrapper handlers for buttons to avoid arrow functions in render
  const handleHistoryItemClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const val = e.currentTarget.dataset.value;
    if (val) {
      setSearchTerm(val);
      executeSearch(val);
    }
  }, [executeSearch]);

  const handleTagItemClick = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const val = e.currentTarget.dataset.value;
    if (val) {
      setSearchTerm(val);
      executeSearch(val);
    }
  }, [executeSearch]);

  const handleBackClick = useCallback(() => {
    setSearchTerm("");
    setSearchResults([]);
    onBack();
  }, [onBack]);

  const clearRecentSearches = useCallback(() => {
    setRecentSearches([]);
    persistSearchSettings([], isAutoSaveEnabled);
  }, [isAutoSaveEnabled, persistSearchSettings]);

  const toggleAutoSave = useCallback((checked: boolean) => {
    if (!checked && recentSearches.length > 0) {
      if (confirm("검색 기록 자동저장을 끄시겠습니까?\n기존 검색 기록도 함께 삭제됩니다.")) {
        setRecentSearches([]);
        setIsAutoSaveEnabled(false);
        persistSearchSettings([], false);
        return;
      }
      // If user cancels, do nothing (toggle remains true)
      return;
    }

    setIsAutoSaveEnabled(checked);
    persistSearchSettings(recentSearches, checked);
  }, [recentSearches, persistSearchSettings]);

  if (!settingsLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <span className="text-sm text-muted-foreground">검색 설정을 불러오는 중...</span>
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
            <Button variant="ghost" size="icon" onClick={handleToggleSettings}>
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
                  <p className="text-xs text-muted-foreground">검색한 키워드를 자동으로 저장합니다</p>
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
      <div className="flex-1 flex flex-col overflow-hidden">
        {!hasQuery && (
          <div className="px-4 pt-4 pb-2 flex-shrink-0">
            <SlowConnectionWarning />
          </div>
        )}

        {hasQuery && searchResults.length > 0 && (
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="bg-card/98 glass-effect border-b border-border px-4 py-3 flex-shrink-0 shadow-sm relative z-20">
              <span className="text-sm text-muted-foreground">
                '{searchTerm}' 검색 결과 {searchResults.length}개
              </span>
            </div>

            <div className="flex-1 overflow-hidden bg-background">
              <SearchResultsList
                searchResults={searchResults}
                searchResultUserProfiles={searchResultUserProfiles}
                userNickname={userNickname}
                userProfileImage={userProfileImage}
                isPostLanterned={isPostLanterned}
                isBookmarked={isBookmarked}
                formatTimeAgo={formatTimeAgo}
                formatCreatedAt={formatCreatedAt}
                currentTitle={currentTitle}
                onPostSelect={onPostSelect}
                onLanternToggle={onLanternToggle}
                onBookmarkToggle={onBookmarkToggle}
              />
            </div>
          </div>
        )}

        {hasQuery && searchResults.length === 0 && (
          <div className="flex-1 overflow-y-auto scrollbar-hide p-4">
            <div className="text-center py-16 px-4">
              <div className="relative mb-6">
                <div className="absolute inset-0 bg-slate-500/30 dark:bg-slate-400/30 blur-2xl rounded-full"></div>
                <div className="relative w-24 h-24 rounded-full bg-slate-100 dark:bg-slate-700/40 flex items-center justify-center border-4 border-slate-400 dark:border-slate-600 shadow-lg mx-auto">
                  <Search className="w-14 h-14 text-slate-900 dark:text-slate-200" strokeWidth={2.5} />
                </div>
              </div>
              <p className="text-muted-foreground font-medium mb-1">'{searchTerm}'에 대한 검색 결과가 없습니다.</p>
              <p className="text-muted-foreground text-sm">다른 키워드로 검색해보세요.</p>
            </div>
          </div>
        )}

        {!hasQuery && (
          <div className="flex-1 overflow-y-auto scrollbar-hide p-4 pb-24">
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
                    {recentSearches.map((search, index) => (
                      <Button
                        key={`${search}-${index}`}
                        variant="outline"
                        size="sm"
                        data-value={search}
                        onClick={handleHistoryItemClick}
                        className="text-xs h-8"
                      >
                        {search}
                      </Button>
                    ))}
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
                  {POPULAR_TAGS.map((tag) => (
                    <Button
                      key={tag}
                      variant="secondary"
                      size="sm"
                      data-value={tag}
                      onClick={handleTagItemClick}
                      className="text-xs h-8"
                    >
                      #{tag}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Tips */}
              <div className="bg-muted/30 rounded-lg p-4">
                <h3 className="font-medium mb-2 text-sm">검색 팁</h3>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• 키워드로 글 제목, 내용, 작성자를 검색할 수 있어요</li>
                  <li>• #태그명으로 특정 태그를 검색해보세요</li>
                  <li>• 카테고리명으로도 검색이 가능해요</li>
                </ul>
              </div>
            </div>
          </div>
        )}
      </div>

      <KeyboardDismissButton />
    </div>
  );
}