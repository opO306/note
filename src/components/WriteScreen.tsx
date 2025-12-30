import { useState, useEffect, useRef, useCallback } from "react";
import { useKeyboard } from "./hooks/useKeyboard";
import { useScrollIntoView } from "./hooks/useScrollIntoView";
import { useOnlineStatus } from "./hooks/useOnlineStatus";
import { KeyboardDismissButton } from "./ui/keyboard-dismiss-button";
import { ConnectionBadge } from "./ui/offline-indicator";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Badge } from "./ui/badge";
import { Switch } from "./ui/switch";
import { useNavigation } from "./MainScreen/contexts/NavigationContext";
import { AlertDialogSimple } from "./ui/alert-dialog-simple";
import {
  ArrowLeft,
  Send,
  Hash,
  FolderOpen,
  X,
  Plus,
  MessageCircle,
  Compass,
  Save,
  Bell,
} from "lucide-react";
import { toast } from "@/toastHelper";
import { containsProfanity } from "./utils/profanityFilter";
import { detectPersonalInfo, getPersonalInfoMessage } from "./utils/personalInfoDetector";
import { 
  isInAppPurchaseAvailable, 
  initializeInAppPurchase, 
  purchaseProduct, 
  SAGES_BELL_PRODUCT_ID 
} from "../utils/inAppPurchase";
import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "../firebase";
import { Capacitor } from "@capacitor/core";

// Safe localStorage helper
const safeLocalStorage = {
  getItem: (key: string): string | null => {
    try {
      return localStorage.getItem(key);
    } catch (error) {
      console.error("localStorage getItem error:", error);
      return null;
    }
  },
  setItem: (key: string, value: string): void => {
    try {
      localStorage.setItem(key, value);
    } catch (error) {
      console.error("localStorage setItem error:", error);
    }
  },
  removeItem: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error("localStorage removeItem error:", error);
    }
  },
};

// 임시저장 만료 시간: 1시간 (밀리초)
const DRAFT_EXPIRE_MS = 60 * 60 * 1000;
// 게시글 작성 쿨타임: 1분 (밀리초)
const POST_COOLDOWN_MS = 60 * 1000;
const LAST_POST_SUBMIT_TIME_KEY = "lastPostSubmitTime";

interface WriteScreenProps {
  onBack: () => void;
  onSubmit: (post: {
    title: string;
    content: string;
    category: string;
    subCategory: string;
    type: "question" | "guide";
    tags: string[];
    useSagesBell?: boolean;
  }) => void;
  categories: Array<{
    id: string;
    name: string;
    subCategories: Array<{ id: string; name: string }>;
  }>;
  lumenBalance?: number;
  spendLumens?: (amount: number, reason: string) => Promise<boolean>;
}

export function WriteScreen({ onBack, onSubmit, categories, lumenBalance = 0, spendLumens }: WriteScreenProps) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [postType, setPostType] = useState<"question" | "guide">("question");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("전체");
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  const [showCategorySelect, setShowCategorySelect] = useState(false);
  const [showTagInput, setShowTagInput] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [useSagesBell, setUseSagesBell] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasUnsavedChanges = useRef(false);

  // Keyboard handling
  const keyboard = useKeyboard();
  const titleRef = useScrollIntoView<HTMLInputElement>({ delay: 350, offset: 100 });
  const contentRef = useScrollIntoView<HTMLTextAreaElement>({ delay: 350, offset: 100 });
  const tagInputRef = useScrollIntoView<HTMLInputElement>({ delay: 350, offset: 100 });

  // Online status
  const { isOnline } = useOnlineStatus();

  const selectedCategoryData = categories.find(cat => cat.id === selectedCategory);
  const subCategories = selectedCategoryData?.subCategories || [];
  const exitDescription = autoSaveEnabled
    ? "작성 중인 내용은 자동으로 임시 저장됩니다. 임시 저장된 내용은 1시간 후 자동으로 삭제됩니다."
    : "작성 중인 내용은 저장되지 않습니다. 나가면 현재 작성 중인 내용이 사라집니다.";

  // 설정 화면에서 저장한 자동 저장 여부 불러오기
  useEffect(() => {
    try {
      const raw = safeLocalStorage.getItem("userSettings");
      if (!raw) return;

      const settings = JSON.parse(raw);
      if (typeof settings.autoSave === "boolean") {
        setAutoSaveEnabled(settings.autoSave);
      }
    } catch (error) {
      console.error("Failed to load userSettings in WriteScreen:", error);
    }
  }, []);
  const { writeDraft, setWriteDraft } = useNavigation();
  // 임시저장 데이터 로드
  useEffect(() => {
    // ✅ 노트/질문정리에서 넘어온 초안이 있으면, 임시저장은 로드하지 않음
    if (writeDraft) return;

    const savedDraft = safeLocalStorage.getItem("draftPost");
    if (!savedDraft) return;

    try {
      const draft = JSON.parse(savedDraft);

      // ⏰ 1시간 이상 지난 임시저장은 자동 삭제
      if (draft.savedAt) {
        const savedTime = new Date(draft.savedAt).getTime();

        // savedAt이 이상한 값이면 그냥 삭제
        if (!savedTime || Number.isNaN(savedTime)) {
          safeLocalStorage.removeItem("draftPost");
          return;
        }

        const diff = Date.now() - savedTime;
        if (diff > DRAFT_EXPIRE_MS) {
          // 1시간 지났으니 임시저장 삭제
          safeLocalStorage.removeItem("draftPost");
          return;
        }
      }

      // 여기부터는 기존 동작 그대로
      setTitle(draft.title || "");
      setContent(draft.content || "");
      setPostType(draft.postType || "question");
      setSelectedCategory(draft.category || "");
      setSelectedSubCategory(draft.subCategory || "전체");
      setTags(draft.tags || []);
      setLastSaved(draft.savedAt ? new Date(draft.savedAt) : null);
      toast.success("임시 저장된 글을 불러왔습니다.");
    } catch (error) {
      console.error("Failed to load draft:", error);
    }
  }, [writeDraft]);
  // ✅ store hook 이름은 프로젝트 기준에 맞추세요.
  // (너 프로젝트는 useNavigationStore가 표준이면 그걸 쓰는 게 안전)


  useEffect(() => {
    if (!writeDraft) return;

    // 1) 초안 주입
    setTitle(writeDraft.title ?? "");
    setContent(writeDraft.body ?? "");

    // 2) postType 반영 (노트=guide, 질문정리=question)
    setPostType(writeDraft.postType ?? "question");

    // 3) 임시저장 관련 UI 상태 정리(선택이지만 권장)
    setLastSaved(null);

    // 4)  1회성 소비
    setWriteDraft(null);
  }, [writeDraft, setWriteDraft]);


  // 임시저장 함수
  const saveDraft = useCallback(() => {
    if (!title.trim() && !content.trim()) {
      return;
    }

    const draft = {
      title,
      content,
      postType,
      category: selectedCategory,
      subCategory: selectedSubCategory,
      tags,
      savedAt: new Date().toISOString(),
    };

    safeLocalStorage.setItem("draftPost", JSON.stringify(draft));
    setLastSaved(new Date());
    hasUnsavedChanges.current = false;
  }, [title, content, postType, selectedCategory, selectedSubCategory, tags]);

  // 자동 임시저장 (디바운스)
  useEffect(() => {
    // 설정에서 자동 저장을 꺼두면 아무 것도 하지 않음
    if (!autoSaveEnabled) {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
      return;
    }

    // 내용이 있을 때만 자동 저장
    if (title.trim() || content.trim()) {
      hasUnsavedChanges.current = true;

      // 기존 타이머 취소
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }

      // 3초 후 자동 저장
      autoSaveTimerRef.current = setTimeout(() => {
        saveDraft();
      }, 3000);
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [
    title,
    content,
    postType,
    selectedCategory,
    selectedSubCategory,
    tags,
    saveDraft,
    autoSaveEnabled,   // ← 의존성에도 추가
  ]);

  // 게시글 유형 선택 핸들러
  const handleSelectQuestion = useCallback(() => {
    setPostType("question");
  }, []);

  const handleSelectGuide = useCallback(() => {
    setPostType("guide");
  }, []);

  // 카테고리 선택 토글
  const handleToggleCategorySelect = useCallback(() => {
    setShowCategorySelect(prev => !prev);
  }, []);

  // 서브카테고리 "전체" 선택
  const handleSelectSubCategoryAll = useCallback(() => {
    setSelectedSubCategory("전체");
  }, []);

  // 제목 입력 핸들러
  const handleTitleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTitle(e.target.value);
  }, []);

  // 내용 입력 핸들러
  const handleContentChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  }, []);

  // 태그 입력 토글
  const handleToggleTagInput = useCallback(() => {
    setShowTagInput(prev => !prev);
  }, []);

  // 태그 입력 핸들러
  const handleTagInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setTagInput(e.target.value);
  }, []);

  // Main 영역 ref 핸들러 (키보드 높이에 따른 동적 패딩)
  const handleMainRef = useCallback((el: HTMLElement | null) => {
    if (el) {
      el.style.setProperty('--dynamic-padding-bottom', keyboard.isVisible ? `${keyboard.height}px` : '0px');
    }
  }, [keyboard.isVisible, keyboard.height]);

  // 임시저장 삭제 함수
  const clearDraft = useCallback(() => {
    safeLocalStorage.removeItem("draftPost");
    hasUnsavedChanges.current = false;
  }, []);  // 의존성 없음

  // 카테고리가 변경되면 서브카테고리를 "전체"로 리셋
  useEffect(() => {
    if (selectedCategory) {
      // 카테고리 선택 시, "전체"로 기본 설정
      setSelectedSubCategory("전체");
    }
  }, [selectedCategory]);

  const handleSubmit = useCallback(async () => {
    // 1단계: 오프라인 체크 (가장 먼저)
    if (!isOnline) {
      toast.error("인터넷 연결이 필요합니다. 연결 후 다시 시도해주세요.");
      return;
    }

    // 2단계: 쿨타임 체크
    const lastSubmitTimeStr = safeLocalStorage.getItem(LAST_POST_SUBMIT_TIME_KEY);
    if (lastSubmitTimeStr) {
      try {
        const lastSubmitTime = parseInt(lastSubmitTimeStr, 10);
        const now = Date.now();
        const timeSinceLastSubmit = now - lastSubmitTime;
        
        if (timeSinceLastSubmit < POST_COOLDOWN_MS) {
          const remainingSeconds = Math.ceil((POST_COOLDOWN_MS - timeSinceLastSubmit) / 1000);
          toast.error(`게시글 작성 쿨타임이 남아있습니다. ${remainingSeconds}초 후 다시 시도해주세요.`);
          return;
        }
      } catch (error) {
        console.error("쿨타임 체크 오류:", error);
        // 오류가 발생해도 계속 진행
      }
    }

    // 3단계: 필수 입력 확인
    if (!title.trim()) {
      toast.error("제목을 입력해주세요.");
      return;
    }

    if (!content.trim()) {
      toast.error("내용을 입력해주세요.");
      return;
    }

    if (!selectedCategory) {
      toast.error("카테고리를 선택해주세요.");
      return;
    }

    // 4단계: 욕설 필터링 검사
    if (containsProfanity(title)) {
      toast.error("제목에 부적절한 단어가 포함되어 있습니다");
      return;
    }

    if (containsProfanity(content)) {
      toast.error("내용에 부적절한 단어가 포함되어 있습니다");
      return;
    }

    // ✅ 태그들 전체 욕설 검사
    if (tags.some(tag => containsProfanity(tag))) {
      toast.error("태그에 부적절한 단어가 포함되어 있습니다");
      return;
    }

    // ✅ 개인정보 유출 감지
    const fullText = `${title} ${content}`;
    const personalInfo = detectPersonalInfo(fullText);
    if (personalInfo.hasPersonalInfo) {
      toast.error(getPersonalInfoMessage(personalInfo.detectedTypes));
      return;
    }

    // 🔔 5단계: 현자의 종 결제 처리 (질문글이고 스위치가 켜져 있을 때만)
    const shouldUseSagesBell = useSagesBell && postType === "question";
    if (shouldUseSagesBell) {
      setIsProcessingPayment(true);
      try {
        // 인앱 구매가 가능한 플랫폼인지 확인
        const iapAvailable = isInAppPurchaseAvailable();
        
        if (iapAvailable) {
          // 모바일 앱: 인앱 구매 진행
          await initializeInAppPurchase();
          const purchaseResult = await purchaseProduct(SAGES_BELL_PRODUCT_ID);
          
          if (!purchaseResult.success || !purchaseResult.transactionId) {
            // 결제 실패 또는 취소
            setIsProcessingPayment(false);
            return; // 제출 중단
          }

          // 서버에서 구매 검증 (선택사항, 필요시 구현)
          // const functions = getFunctions(app, "asia-northeast3");
          // const verifyPurchaseFn = httpsCallable(functions, "verifySagesBellPurchase");
          // await verifyPurchaseFn({
          //   transactionId: purchaseResult.transactionId,
          //   receipt: purchaseResult.receipt || "",
          //   platform: Capacitor.getPlatform() === "ios" ? "ios" : "android",
          // });
        } else {
          // 웹 환경: 루멘 차감
          if (!spendLumens) {
            toast.error("현자의 종은 모바일 앱에서만 사용할 수 있습니다.");
            setIsProcessingPayment(false);
            return;
          }

          const SAGES_BELL_COST = 0; // 🧪 테스트용: 무료
          
          // 비용이 0이면 결제 없이 바로 통과
          if (SAGES_BELL_COST > 0) {
            if (lumenBalance < SAGES_BELL_COST) {
              toast.error(`루멘이 부족합니다! (필요: ${SAGES_BELL_COST}, 보유: ${lumenBalance})`);
              setIsProcessingPayment(false);
              return;
            }

            const paymentSuccess = await spendLumens(SAGES_BELL_COST, "현자의 종 호출");
            if (!paymentSuccess) {
              setIsProcessingPayment(false);
              return; // 결제 실패 시 제출 중단
            }
          }

          toast.success("현자의 종이 울렸습니다! 🔔");
        }
      } catch (error: any) {
        console.error("현자의 종 결제 실패:", error);
        toast.error(error.message || "결제 처리 중 오류가 발생했습니다.");
        setIsProcessingPayment(false);
        return;
      } finally {
        setIsProcessingPayment(false);
      }
    }

    // 6단계: 모든 검사를 통과하면 제출
    onSubmit({
      title: title.trim(),
      content: content.trim(),
      category: selectedCategory,
      subCategory: selectedSubCategory,
      type: postType,
      tags,
      useSagesBell: shouldUseSagesBell, // 결제 성공한 경우에만 true
    });

    // 쿨타임 시간 저장
    safeLocalStorage.setItem(LAST_POST_SUBMIT_TIME_KEY, Date.now().toString());

    // 임시저장 삭제
    clearDraft();
  }, [isOnline, title, content, selectedCategory, postType, selectedSubCategory, tags, useSagesBell, onSubmit, clearDraft]);

  const handleBack = useCallback(() => {
    // 작성 중인 내용이 있으면 확인
    if (title.trim() || content.trim()) {
      setShowExitConfirm(true);
    } else {
      clearDraft();
      onBack();
    }
  }, [title, content, onBack, clearDraft]);

  const handleConfirmExit = useCallback(() => {
    setShowExitConfirm(false);

    // 자동 저장이 꺼져 있으면,
    // 안내 문구대로 임시 저장된 글을 지워준다.
    if (!autoSaveEnabled) {
      clearDraft();
    }

    onBack();
  }, [onBack, autoSaveEnabled, clearDraft]);

  const handleAddTag = useCallback(() => {
    const trimmedTag = tagInput.trim();

    // 1) 비어 있으면 무시
    if (!trimmedTag) return;

    // 2) 욕설 필터
    if (containsProfanity(trimmedTag)) {
      toast.error("태그에 부적절한 단어가 포함되어 있습니다.");
      return;
    }

    // 3) 중복 태그 방지
    if (tags.includes(trimmedTag)) {
      toast.error("이미 추가된 태그입니다.");
      return;
    }

    // 4) 개수 제한
    if (tags.length >= 5) {
      toast.error("태그는 최대 5개까지 추가할 수 있습니다.");
      return;
    }

    // 5) 통과하면 추가
    setTags([...tags, trimmedTag]);
    setTagInput("");
  }, [tagInput, tags]);

  const handleRemoveTag = useCallback((tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  }, [tags]);

  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddTag();
    }
  }, [handleAddTag]);

  return (
    <div className="w-full h-full bg-background text-foreground overflow-hidden flex flex-col">
      {/* Header */}
      <header className="bg-card/95 backdrop-blur-xl border-b border-border flex-shrink-0 safe-top">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <h1 className="font-medium">새 글 작성</h1>
                  <ConnectionBadge />
                </div>
                {lastSaved && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Save className="w-3 h-3" />
                    {new Date().getTime() - lastSaved.getTime() < 60000
                      ? "방금 저장됨"
                      : `${Math.floor((new Date().getTime() - lastSaved.getTime()) / 60000)}분 전 저장됨`}
                  </span>
                )}
              </div>
            </div>
            <Button
              onClick={handleSubmit}
              className="flex items-center space-x-2"
              disabled={!title.trim() || !content.trim() || !selectedCategory || !isOnline || isProcessingPayment}
            >
              <Send className="w-4 h-4" />
              <span>게시</span>
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main
        className="flex-1 overflow-y-auto scrollbar-hide keyboard-aware-container dynamic-container"
        ref={handleMainRef}
      >
        <div className="p-4 space-y-4 pb-24">
          {/* 게시글 유형 선택 */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                <label className="text-sm font-medium">게시글 유형</label>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    variant={postType === "question" ? "default" : "outline"}
                    onClick={handleSelectQuestion}
                    className="flex items-center space-x-2 h-12"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>질문글</span>
                  </Button>
                  <Button
                    variant={postType === "guide" ? "default" : "outline"}
                    onClick={handleSelectGuide}
                    className="flex items-center space-x-2 h-12"
                  >
                    <Compass className="w-4 h-4" />
                    <span>길잡이글</span>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 카테고리 선택 */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">카테고리</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleToggleCategorySelect}
                    className="flex items-center space-x-1"
                  >
                    <FolderOpen className="w-4 h-4" />
                    <span>선택</span>
                  </Button>
                </div>

                {showCategorySelect && (
                  <div className="space-y-3 border-2 border-primary bg-muted/30 p-4 rounded-lg">
                    {/* 메인 카테고리 선택 */}
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">메인 카테고리를 선택하세요</p>
                      <div className="grid grid-cols-2 gap-2">
                        {/* eslint-disable react/jsx-no-bind, react-perf/jsx-no-new-function-as-prop */}
                        {categories
                          .filter(category => category.id !== "전체")
                          .map((category) => (
                            <Button
                              key={category.id}
                              variant={selectedCategory === category.id ? "default" : "outline"}
                              onClick={() => setSelectedCategory(category.id)}
                              className="h-auto py-3"
                            >
                              {category.name}
                            </Button>
                          ))}
                        {/* eslint-enable react/jsx-no-bind, react-perf/jsx-no-new-function-as-prop */}
                      </div>
                    </div>

                    {/* 서브 카테고리 선택 */}
                    {selectedCategory && selectedCategory !== "전체" && subCategories.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs text-muted-foreground">세부 카테고리를 선택하세요 (선택사항)</p>
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            variant={selectedSubCategory === "전체" ? "default" : "outline"}
                            onClick={handleSelectSubCategoryAll}
                            size="sm"
                          >
                            전체
                          </Button>
                          {/* eslint-disable react/jsx-no-bind, react-perf/jsx-no-new-function-as-prop */}
                          {subCategories
                            .filter(subCategory => subCategory.id !== "전체")
                            .map((subCategory) => (
                              <Button
                                key={subCategory.id}
                                variant={selectedSubCategory === subCategory.id ? "default" : "outline"}
                                onClick={() => setSelectedSubCategory(subCategory.id)}
                                size="sm"
                              >
                                {subCategory.name}
                              </Button>
                            ))}
                          {/* eslint-enable react/jsx-no-bind, react-perf/jsx-no-new-function-as-prop */}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {selectedCategory && (
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <FolderOpen className="w-4 h-4" />
                    <span>
                      {selectedCategoryData?.name}
                      {selectedCategory !== "전체" && selectedSubCategory && selectedSubCategory !== "전체" && subCategories.find(sub => sub.id === selectedSubCategory) &&
                        ` > ${subCategories.find(sub => sub.id === selectedSubCategory)?.name}`
                      }
                    </span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* 제목 입력 */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                <label className="text-sm font-medium">제목</label>
                <Input
                  ref={titleRef as React.RefObject<HTMLInputElement>}
                  value={title}
                  onChange={handleTitleChange}
                  placeholder="제목을 입력하세요"
                  maxLength={100}
                  className="input-keyboard-safe"
                />
                <div className="text-xs text-muted-foreground text-right">
                  {title.length}/100
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 내용 입력 */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                <label className="text-sm font-medium">내용</label>
                <Textarea
                  ref={contentRef as React.RefObject<HTMLTextAreaElement>}
                  value={content}
                  onChange={handleContentChange}
                  placeholder="내용을 입력하세요"
                  className="min-h-[200px] resize-none input-keyboard-safe"
                  maxLength={2000}
                />
                <div className="text-xs text-muted-foreground text-right">
                  {content.length}/2000
                </div>

                {/* 안내문 추가 */}
                <div className="pt-2 border-t border-border/50">
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    ⚠️ 욕설, 타인을 비난하는 글 등 게시판 이용 방향과 위배되는 글들은 경고 없이 삭제 및 사용자 이용 정지 조치됩니다.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 태그 입력 */}
          <Card>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium">태그</label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleToggleTagInput}
                    className="flex items-center space-x-1"
                  >
                    <Hash className="w-4 h-4" />
                    <span>추가</span>
                  </Button>
                </div>

                {showTagInput && (
                  <div className="flex space-x-2">
                    <Input
                      ref={tagInputRef as React.RefObject<HTMLInputElement>}
                      value={tagInput}
                      onChange={handleTagInputChange}
                      onKeyPress={handleKeyPress}
                      placeholder="태그를 입력하세요 (최대 5개)"
                      maxLength={20}
                      disabled={tags.length >= 5}
                      className="input-keyboard-safe"
                    />
                    <Button
                      onClick={handleAddTag}
                      disabled={!tagInput.trim() || tags.length >= 5}
                      size="sm"
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>
                )}

                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {/* eslint-disable react/jsx-no-bind, react-perf/jsx-no-new-function-as-prop */}
                    {tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="flex items-center space-x-1 px-2 py-1"
                      >
                        <span>#{tag}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveTag(tag)}
                          className="h-auto p-1 hover:bg-transparent touch-extended ml-1"
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </Badge>
                    ))}
                    {/* eslint-enable react/jsx-no-bind, react-perf/jsx-no-new-function-as-prop */}
                  </div>
                )}

                <div className="text-xs text-muted-foreground">
                  태그는 최대 5개까지 추가할 수 있습니다.
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 현자의 종 호출 */}
          {postType === "question" && (
            <Card className="border-amber-200/50 bg-amber-500/5">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-amber-500/10 rounded-full">
                    <Bell className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">현자의 종 호출</p>
                    <p className="text-[10px] text-muted-foreground leading-tight">
                      이 분야의 길잡이들에게 지혜를 요청합니다. (유료)
                    </p>
                  </div>
                </div>
                <Switch 
                  checked={useSagesBell} 
                  onCheckedChange={setUseSagesBell}
                  disabled={isProcessingPayment}
                />
              </CardContent>
            </Card>
          )}

        </div>
      </main>

      {/* 키보드 완료 버튼 */}
      <KeyboardDismissButton />

      {/* 나가기 확인 다이얼로그 */}
      <AlertDialogSimple
        open={showExitConfirm}
        onOpenChange={setShowExitConfirm}
        title="작성을 취소하시겠습니까?"
        description={exitDescription}   // ← 문자열 대신 변수 사용
        confirmText="나가기"
        onConfirm={handleConfirmExit}
      />
    </div>
  );
}