// src/components/NotificationSettingsDialog.tsx
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Button } from "./ui/button";
import { Switch } from "./ui/switch";
import { Separator } from "./ui/separator";
import { toast } from "@/toastHelper";
import { Settings, Bell } from "lucide-react";
import { cn } from "./ui/utils";

// Firestore
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";
import { AppHeader } from "./layout/AppHeader";

// Safe localStorage helper
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      return typeof window === "undefined" ? null : localStorage.getItem(key);
    } catch (error) {
      console.error("localStorage getItem error:", error);
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      if (typeof window === "undefined") return;
      localStorage.setItem(key, value);
    } catch (error) {
      console.error("localStorage setItem error:", error);
    }
  },
};

interface Category {
  id: string;
  name: string;
  icon: any;
  count: number;
  subCategories: { id: string; name: string; count: number }[];
}

interface NotificationSettingsDialogProps {
  onBack: () => void;
  categories: Category[];
}

interface UserNotificationSettings {
  allEnabled: boolean;
  enabledCategories: string[];
}

export function NotificationSettingsDialog({
  onBack,
  categories,
}: NotificationSettingsDialogProps) {
  const [enabledCategories, setEnabledCategories] = useState<Set<string>>(
    new Set(),
  );
  const [allNotificationsEnabled, setAllNotificationsEnabled] =
    useState(true);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const updateTimerRef = useRef<number | null>(null);
  const lastPayloadRef = useRef<UserNotificationSettings | null>(null);

  // 🔹 localStorage 저장 헬퍼 (계정별로 분리)
  const saveSettingsToLocal = useCallback(
    (enabled: Set<string>, allEnabled: boolean, uid?: string | null) => {
      const owner = uid ?? auth.currentUser?.uid ?? "guest";
      const arr = Array.from(enabled);
      safeLocalStorage.setItem(`notificationSettings:${owner}`, JSON.stringify(arr));
      safeLocalStorage.setItem(`allNotificationsEnabled:${owner}`, allEnabled.toString());
    },
    [],
  );

  // 🔹 Firestore + localStorage 동시 반영 헬퍼 (쓰기 디바운스)
  const persistSettings = useCallback(
    (enabled: Set<string>, allEnabled: boolean) => {
      const uid = auth.currentUser?.uid ?? null;
      saveSettingsToLocal(enabled, allEnabled, uid);

      if (!uid) return;

      const userRef = doc(db, "users", uid);
      const payload: UserNotificationSettings = {
        allEnabled,
        enabledCategories: Array.from(enabled),
      };

      lastPayloadRef.current = payload;

      if (updateTimerRef.current) {
        window.clearTimeout(updateTimerRef.current);
      }

      updateTimerRef.current = window.setTimeout(async () => {
        const latest = lastPayloadRef.current;
        if (!latest) return;
        try {
          await updateDoc(userRef, {
            notificationSettings: latest,
          });
        } catch (error) {
          console.error("알림 설정 Firestore 동기화 실패:", error);
          toast.error("알림 설정을 저장하지 못했어요. 잠시 후 다시 시도해주세요.");
        }
      }, 400);
    },
    [saveSettingsToLocal],
  );

  // 🔹 언마운트 시 디바운스 타이머 정리
  useEffect(() => {
    return () => {
      if (updateTimerRef.current) {
        window.clearTimeout(updateTimerRef.current);
      }
    };
  }, []);

  // 🔹 초기 로드: localStorage → Firestore 순으로 합쳐서 상태 구성
  useEffect(() => {
    const defaultCategoryIds = categories.map((cat) => cat.id);
    const owner = auth.currentUser?.uid ?? "guest";

    // 1) localStorage 기반 기본값
    let initialEnabled = new Set<string>(defaultCategoryIds);
    let initialAllEnabled = true;

    const savedSettings = safeLocalStorage.getItem(`notificationSettings:${owner}`);
    const savedAllEnabled = safeLocalStorage.getItem(`allNotificationsEnabled:${owner}`);

    if (savedSettings) {
      try {
        const arr = JSON.parse(savedSettings);
        if (Array.isArray(arr)) {
          initialEnabled = new Set(
            arr.filter((id: string) => defaultCategoryIds.includes(id)),
          );
        }
      } catch (error) {
        console.error("notificationSettings 파싱 실패:", error);
      }
    }

    if (savedAllEnabled !== null) {
      initialAllEnabled = savedAllEnabled === "true";
    }

    const uid = auth.currentUser?.uid;
    if (!uid) {
      setEnabledCategories(initialEnabled);
      setAllNotificationsEnabled(initialAllEnabled);
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
          const ns = data.notificationSettings;

          if (ns && typeof ns === "object") {
            const serverAll =
              typeof ns.allEnabled === "boolean"
                ? ns.allEnabled
                : initialAllEnabled;

            const rawEnabled = Array.isArray(ns.enabledCategories)
              ? (ns.enabledCategories as string[])
              : Array.from(initialEnabled);

            const filtered = rawEnabled.filter((id) =>
              defaultCategoryIds.includes(id),
            );

            const nextEnabled = new Set<string>(
              serverAll
                ? filtered.length > 0
                  ? filtered
                  : defaultCategoryIds
                : filtered,
            );

            if (!cancelled) {
              setEnabledCategories(nextEnabled);
              setAllNotificationsEnabled(serverAll);
              saveSettingsToLocal(nextEnabled, serverAll, uid);
            }
          } else {
            // 필드가 없는 경우 → 기본값으로 초기화
            if (!cancelled) {
              setEnabledCategories(initialEnabled);
              setAllNotificationsEnabled(initialAllEnabled);
              saveSettingsToLocal(initialEnabled, initialAllEnabled, uid);
            }
            const payload: UserNotificationSettings = {
              allEnabled: initialAllEnabled,
              enabledCategories: Array.from(initialEnabled),
            };
            await updateDoc(userRef, { notificationSettings: payload });
          }
        } else {
          // 문서가 없는 경우 → 기본값으로 생성
          if (!cancelled) {
            setEnabledCategories(initialEnabled);
            setAllNotificationsEnabled(initialAllEnabled);
            saveSettingsToLocal(initialEnabled, initialAllEnabled);
          }
          const payload: UserNotificationSettings = {
            allEnabled: initialAllEnabled,
            enabledCategories: Array.from(initialEnabled),
          };
          await setDoc(
            userRef,
            { notificationSettings: payload },
            { merge: true },
          );
        }
      } catch (error) {
        console.error("알림 설정 Firestore 로드 실패:", error);
        toast.error("알림 설정을 불러오지 못했어요. 기본 설정을 사용합니다.");
        if (!cancelled) {
          setEnabledCategories(initialEnabled);
          setAllNotificationsEnabled(initialAllEnabled);
        }
      } finally {
        if (!cancelled) setSettingsLoaded(true);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [categories, saveSettingsToLocal]);

  const handleCategoryToggle = useCallback(
    (categoryId: string) => {
      const newEnabledCategories = new Set(enabledCategories);
      const wasEnabled = newEnabledCategories.has(categoryId);

      if (wasEnabled) {
        newEnabledCategories.delete(categoryId);
      } else {
        newEnabledCategories.add(categoryId);
      }

      setEnabledCategories(newEnabledCategories);
      persistSettings(newEnabledCategories, allNotificationsEnabled);

      const categoryName = categories.find((c) => c.id === categoryId)?.name;
      toast.success(
        wasEnabled
          ? `${categoryName} 알림이 비활성화되었습니다`
          : `${categoryName} 알림이 활성화되었습니다`,
      );
    },
    [enabledCategories, categories, allNotificationsEnabled, persistSettings],
  );

  const createCategoryToggleHandler = useCallback(
    (categoryId: string) => {
      return () => {
        handleCategoryToggle(categoryId);
      };
    },
    [handleCategoryToggle],
  );

  const handleAllNotificationsToggle = useCallback(
    (enabled: boolean) => {
      setAllNotificationsEnabled(enabled);

      if (!enabled) {
        const empty = new Set<string>();
        setEnabledCategories(empty);
        persistSettings(empty, false);
        toast.success("모든 알림이 비활성화되었습니다");
      } else {
        const allCategoryIds = categories.map((cat) => cat.id);
        const allSet = new Set(allCategoryIds);
        setEnabledCategories(allSet);
        persistSettings(allSet, true);
        toast.success("모든 알림이 활성화되었습니다");
      }
    },
    [categories, persistSettings],
  );

  const handleSelectAll = useCallback(() => {
    const allCategoryIds = categories.map((cat) => cat.id);
    const allSet = new Set(allCategoryIds);
    setEnabledCategories(allSet);
    persistSettings(allSet, allNotificationsEnabled);
    toast.success("모든 카테고리 알림이 활성화되었습니다");
  }, [categories, allNotificationsEnabled, persistSettings]);

  const handleSelectNone = useCallback(() => {
    const empty = new Set<string>();
    setEnabledCategories(empty);
    persistSettings(empty, allNotificationsEnabled);
    toast.success("모든 카테고리 알림이 비활성화되었습니다");
  }, [allNotificationsEnabled, persistSettings]);

  const _handleClose = useCallback(() => {
    onBack();
  }, [onBack]);

  const getIconComponent = useCallback((IconComponent: any) => {
    return <IconComponent className="w-4 h-4" />;
  }, []);

  const filteredCategories = useMemo(() => {
    return categories.filter((cat) => cat.id !== "전체");
  }, [categories]);

  const enabledCategoriesCount = useMemo(() => {
    return enabledCategories.size;
  }, [enabledCategories]);

  if (!settingsLoaded) {
    // 로딩 상태
    return (
      <div className="w-full h-full bg-background text-foreground flex flex-col">
        <AppHeader
          title="알림 설정"
          icon={<Settings className="w-5 h-5" />}
          onBack={onBack}
        />
        <div className="flex-1 flex items-center justify-center">
          <span className="text-sm text-muted-foreground">
            알림 설정을 불러오는 중...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-background text-foreground flex flex-col">
      {/* 상단 헤더 */}
      <AppHeader
        title="알림 설정"
        icon={<Settings className="w-5 h-5" />}
        onBack={onBack}
      />

      {/* 스크롤 가능한 컨텐츠 영역 */}
      <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-6">
        {/* 전체 알림 설정 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bell className="w-4 h-4 text-primary" />
              <span className="font-medium">전체 알림</span>
            </div>
            <Switch
              checked={allNotificationsEnabled}
              onCheckedChange={handleAllNotificationsToggle}
            />
          </div>
          <p className="text-sm text-muted-foreground">
            모든 알림을 일괄적으로 켜거나 끌 수 있습니다
          </p>
        </div>

        <Separator />

        {/* 카테고리별 알림 설정 */}
        <div className={cn("space-y-4", !allNotificationsEnabled && "opacity-60")}>
          <div className="flex items-center justify-between">
            <h3 className="font-medium">카테고리별 알림</h3>
            {allNotificationsEnabled && (
              <div className="space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectAll}
                  className="touch-target px-3 text-xs"
                >
                  전체 선택
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSelectNone}
                  className="touch-target px-3 text-xs"
                >
                  전체 해제
                </Button>
              </div>
            )}
          </div>

          <p className="text-sm text-muted-foreground">
            {allNotificationsEnabled
              ? "관심 있는 카테고리만 선택하여 알림을 받을 수 있습니다"
              : "전체 알림을 활성화하면 카테고리별 알림 설정을 변경할 수 있습니다"}
          </p>

          <div className="space-y-3">
            {filteredCategories.map((category) => (
              <div
                key={category.id}
                className={cn(
                  "flex items-center justify-between p-3 border border-border rounded-lg",
                  !allNotificationsEnabled && "pointer-events-none"
                )}
              >
                <div className="flex items-center space-x-3">
                  {getIconComponent(category.icon)}
                  <div>
                    <p className="font-medium">{category.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {category.count}개 게시글
                    </p>
                  </div>
                </div>
                <Switch
                  checked={enabledCategories.has(category.id)}
                  onCheckedChange={createCategoryToggleHandler(category.id)}
                  disabled={!allNotificationsEnabled}
                />
              </div>
            ))}
          </div>

          {allNotificationsEnabled && (
            <div className="mt-4 p-3 bg-muted/50 rounded-lg">
              <div className="flex items-center space-x-2 text-sm">
                <Bell className="w-4 h-4" />
                <span>
                  현재{" "}
                  <span className="font-medium text-primary">
                    {enabledCategoriesCount}개 카테고리
                  </span>
                  의 알림을 받고 있습니다
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 하단 고정 버튼 (safe area 적용) */}
      <div className="bg-background/95 backdrop-blur-xl border-t border-border p-4 safe-nav-bottom flex-shrink-0">
        <Button onClick={_handleClose} className="w-full">
          완료
        </Button>
      </div>
    </div>
  );
}
