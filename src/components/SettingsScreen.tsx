import { useState, useCallback, useEffect } from "react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Switch } from "./ui/switch";
import { Label } from "./ui/label";
import { LoadingOverlay } from "./ui/loading-animations";
import { Separator } from "./ui/separator";
import { toast, isToastEnabled, setToastEnabled } from "../toastHelper";
import {
  ArrowLeft,
  Bell,
  Moon,
  Sun,
  Shield,
  Palette,
  Download,
  Trash2,
  AlertTriangle,
  MessageSquare
} from "lucide-react";
import { app, auth, db } from "../firebase";
import { getFunctions, httpsCallable } from "firebase/functions";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import {
  getAuth,
  reauthenticateWithCredential,
  reauthenticateWithPopup,
  EmailAuthProvider,
  GoogleAuthProvider,
} from "firebase/auth";

interface SettingsScreenProps {
  onBack: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
  onShowPrivacy?: () => void;
  onShowTerms?: () => void;
  onShowGuidelines?: () => void;
  onLogout: () => void;  // 🔹 추가: 로그아웃 실행 함수
  onShowOpenSourceLicenses?: () => void; // 오픈소스 라이선스 화면 열기
  onShowAttributions?: () => void;       // 이미지/아이콘 출처 화면 열기
}

const SETTINGS_STORAGE_KEY = "userSettings";

type UserSettings = {
  notificationsEnabled: boolean;
  newPostNotifications: boolean;
  replyNotifications: boolean;
  lanternNotifications: boolean;
  autoSave: boolean;
};

// 🔹 Cloud Functions - deleteAccount 호출 타입 정의
interface DeleteAccountResponse {
  success: boolean;
}

// 🔹 Cloud Functions 인스턴스 & callable 함수 준비
const functions = getFunctions(app, "asia-northeast3");
const deleteAccountFn = httpsCallable<{}, DeleteAccountResponse>(
  functions,
  "deleteAccount",
);

export function SettingsScreen({
  onBack,
  isDarkMode,
  onToggleDarkMode,
  onShowPrivacy,
  onShowTerms,
  onShowGuidelines,
  onLogout,
  onShowOpenSourceLicenses,
  onShowAttributions,
}: SettingsScreenProps) {
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [newPostNotifications, setNewPostNotifications] = useState(true);
  const [replyNotifications, setReplyNotifications] = useState(true);
  const [lanternNotifications, setLanternNotifications] = useState(true);
  const [autoSave, setAutoSave] = useState(true);
  const [aiAutoReplyEnabled, setAiAutoReplyEnabled] = useState(false);
  const [personalizedDigestEnabled, setPersonalizedDigestEnabled] = useState(false);
  const [consentsLoading, setConsentsLoading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (!raw) {
        return; // 저장된 설정이 없으면 기본값 그대로 사용
      }

      const saved = JSON.parse(raw) as Partial<UserSettings>;

      if (typeof saved.notificationsEnabled === "boolean") {
        setNotificationsEnabled(saved.notificationsEnabled);
      }
      if (typeof saved.newPostNotifications === "boolean") {
        setNewPostNotifications(saved.newPostNotifications);
      }
      if (typeof saved.replyNotifications === "boolean") {
        setReplyNotifications(saved.replyNotifications);
      }
      if (typeof saved.lanternNotifications === "boolean") {
        setLanternNotifications(saved.lanternNotifications);
      }
      if (typeof saved.autoSave === "boolean") {
        setAutoSave(saved.autoSave);
      }
    } catch (error) {
      console.error("Failed to load user settings", error);
    }
  }, []);

  // Firestore 동의 상태 로드
  useEffect(() => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    const userRef = doc(db, "users", uid);
    setConsentsLoading(true);

    getDoc(userRef)
      .then((snap) => {
        if (!snap.exists()) return;
        const data = snap.data() as any;
        const consents = data?.consents ?? {};

        if (typeof consents.aiAutoReply === "boolean") {
          setAiAutoReplyEnabled(consents.aiAutoReply);
        }
        if (typeof consents.personalizedDigest === "boolean") {
          setPersonalizedDigestEnabled(consents.personalizedDigest);
        }
      })
      .catch((error) => {
        console.error("[settings] 동의 상태 조회 실패", error);
      })
      .finally(() => setConsentsLoading(false));
  }, []);

  const saveSettings = useCallback(
    (partial: Partial<UserSettings>) => {
      // 현재 상태 + 변경된 값(partial)을 합쳐서 하나의 설정 객체로 만들기
      const next: UserSettings = {
        notificationsEnabled,
        newPostNotifications,
        replyNotifications,
        lanternNotifications,
        autoSave,
        ...partial,
      };

      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
      } catch (error) {
        console.error("Failed to save user settings", error);
      }
    },
    [notificationsEnabled, newPostNotifications, replyNotifications, lanternNotifications, autoSave]
  );

  const persistConsents = useCallback(
    async (patch: Partial<{ aiAutoReply: boolean; personalizedDigest: boolean }>) => {
      const uid = auth.currentUser?.uid;
      if (!uid) {
        toast.error("로그인이 필요합니다");
        return false;
      }

      const payload: any = {};
      const timestampPayload: any = {};

      if (patch.aiAutoReply !== undefined) {
        payload.aiAutoReply = patch.aiAutoReply;
        timestampPayload.aiAutoReply = serverTimestamp();
      }

      if (patch.personalizedDigest !== undefined) {
        payload.personalizedDigest = patch.personalizedDigest;
        timestampPayload.personalizedDigest = serverTimestamp();
      }

      try {
        await setDoc(
          doc(db, "users", uid),
          {
            consents: payload,
            consentUpdatedAt: timestampPayload,
          },
          { merge: true },
        );
        return true;
      } catch (error) {
        console.error("[settings] 동의 저장 실패", error);
        toast.error("동의 저장에 실패했습니다. 잠시 후 다시 시도해주세요.");
        return false;
      }
    },
    [],
  );

  const handleNotificationsEnabledChange = useCallback(
    (value: boolean) => {
      setNotificationsEnabled(value);
      saveSettings({ notificationsEnabled: value });
    },
    [saveSettings]
  );

  const handleNewPostNotificationsChange = useCallback(
    (value: boolean) => {
      setNewPostNotifications(value);
      saveSettings({ newPostNotifications: value });
    },
    [saveSettings]
  );

  const handleReplyNotificationsChange = useCallback(
    (value: boolean) => {
      setReplyNotifications(value);
      saveSettings({ replyNotifications: value });
    },
    [saveSettings]
  );

  const handleLanternNotificationsChange = useCallback(
    (value: boolean) => {
      setLanternNotifications(value);
      saveSettings({ lanternNotifications: value });
    },
    [saveSettings]
  );

  const handleAutoSaveChange = useCallback(
    (value: boolean) => {
      setAutoSave(value);
      saveSettings({ autoSave: value });
    },
    [saveSettings]
  );

  const handleAiAutoReplyChange = useCallback(
    async (value: boolean) => {
      setAiAutoReplyEnabled(value);
      const ok = await persistConsents({ aiAutoReply: value });
      if (ok) {
        toast.success(
          value
            ? "AI 자동응답이 활성화되었습니다"
            : "AI 자동응답이 비활성화되었습니다",
        );
      }
    },
    [persistConsents],
  );

  const handlePersonalizedDigestChange = useCallback(
    async (value: boolean) => {
      setPersonalizedDigestEnabled(value);
      const ok = await persistConsents({ personalizedDigest: value });
      if (ok) {
        toast.success(
          value
            ? "맞춤 아침 추천이 켜졌습니다"
            : "맞춤 아침 추천이 꺼졌습니다",
        );
      }
    },
    [persistConsents],
  );

  const handleClearCache = useCallback(() => {
    toast.success("캐시가 삭제되었습니다");
  }, []);

  const handleAccountDelete = useCallback(async () => {
    if (!window.confirm("정말로 계정을 탈퇴하시겠습니까? 모든 데이터가 영구적으로 삭제되며, 이 작업은 되돌릴 수 없습니다.")) {
      return;
    }

    const auth = getAuth();
    const user = auth.currentUser;

    if (!user) {
      toast.error("로그인이 필요합니다.");
      return;
    }

    setIsDeleting(true); // 로딩 시작

    try {
      // --- 1. 본인 재인증 단계 ---
      // 현재 사용자의 로그인 방식을 자동으로 확인합니다.
      const providerId = user.providerData[0]?.providerId;

      // CASE 1: 이메일/비밀번호 로그인 사용자
      if (providerId === 'password') {
        const password = prompt("본인 확인을 위해 비밀번호를 다시 입력해주세요.");
        if (password === null) { // 사용자가 취소 버튼을 누른 경우
          setIsDeleting(false);
          return;
        }
        if (!user.email) throw new Error("계정의 이메일 정보를 확인할 수 없습니다.");
        const credential = EmailAuthProvider.credential(user.email, password);
        await reauthenticateWithCredential(user, credential);
      }
      // CASE 2: 구글 로그인 사용자
      else if (providerId === 'google.com') {
        const provider = new GoogleAuthProvider();
        await reauthenticateWithPopup(user, provider);
      }
      // 다른 소셜 로그인을 사용한다면 여기에 else if (...)를 추가하면 됩니다.
      else {
        throw new Error("지원하지 않는 로그인 방식입니다. 관리자에게 문의해주세요.");
      }

      // --- 2. 재인증 성공 시, 백엔드에 최종 삭제 요청 ---
      // 이제 Firebase는 이 사용자가 본인임을 신뢰하므로 Cloud Function 호출을 허용합니다.
      await deleteAccountFn({});

      // --- 3. 성공 후처리 ---
      toast.success("계정 탈퇴가 완료되었습니다. 이용해주셔서 감사합니다.");
      onLogout(); // 로그아웃 처리 및 로그인 화면으로 이동

    } catch (error: any) {
      console.error("[settings] deleteAccount 과정 실패", error);

      // 사용자에게 친절한 오류 메시지 표시
      if (error.code === 'auth/wrong-password') {
        toast.error("비밀번호가 일치하지 않습니다.");
      } else if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
        toast.info("계정 탈퇴가 취소되었습니다.");
      } else if (error.code === 'auth/too-many-requests') {
        toast.error("요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.");
      } else {
        toast.error("계정 삭제 중 문제가 발생했습니다. 잠시 후 다시 시도해 주세요.");
      }
      setIsDeleting(false); // 오류 발생 시 로딩 종료
    }
  }, [onLogout]);
  // localStorage에서 화면 알림 설정 불러오기
  const [toastEnabled, setToastEnabledState] = useState(isToastEnabled());

  // 화면 알림 토글 변경 시 localStorage에 저장
  const handleToastToggle = useCallback((enabled: boolean) => {
    setToastEnabledState(enabled);
    setToastEnabled(enabled);
    toast.success(enabled ? "화면 알림이 활성화되었습니다" : "화면 알림이 비활성화되었습니다");
  }, []);

  return (
    <div className="w-full h-full bg-background text-foreground overflow-y-auto scrollbar-hide">
      {/* 👇 로딩 오버레이 추가 (최상단에 배치) */}
      <LoadingOverlay
        isLoading={isDeleting}
        message="계정을 정리하고 있습니다..."
        variant="blur"
      />
      {/* Header */}
      <header className="bg-card/95 backdrop-blur-xl border-b border-border flex-shrink-0 safe-top">
        <div className="px-4 py-3">
          <div className="flex items-center space-x-3">
            <Button variant="ghost" size="icon" onClick={onBack} className="hover:bg-accent">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="font-medium">설정</h1>
          </div>
        </div>
      </header>

      <div className="p-4 space-y-6">
        {/* 화면 설정 */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Palette className="w-5 h-5" />
              <span>화면 설정</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                {isDarkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                <Label className="text-foreground">다크 모드</Label>
              </div>
              <div className="-m-2 p-2 inline-flex items-center">
                <Switch
                  className="!min-w-0 !min-h-0 h-4 w-8 md:h-6 md:w-11
                  [&>span]:h-3.5 [&>span]:w-3.5 md:[&>span]:h-5 md:[&>span]:w-5
                  [&[data-state=checked]>span]:translate-x-3.5 md:[&[data-state=checked]>span]:translate-x-5"
                  checked={isDarkMode}
                  onCheckedChange={onToggleDarkMode}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 알림 설정 */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Bell className="w-5 h-5" />
              <span>알림 설정</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-foreground">전체 알림</Label>
              <Switch
                className="!min-w-0 !min-h-0 h-4 w-8 md:h-6 md:w-11
                [&>span]:h-3.5 [&>span]:w-3.5 md:[&>span]:h-5 md:[&>span]:w-5
                [&[data-state=checked]>span]:translate-x-3.5 md:[&[data-state=checked]>span]:translate-x-5"
                checked={notificationsEnabled}
                onCheckedChange={handleNotificationsEnabledChange}
              />
            </div>

            {/* 화면 알림 표시 (toast) */}
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4 text-gray-700" />
                  <Label className="text-gray-900">화면 알림 표시</Label>
                </div>
                <p className="text-xs text-gray-600 mt-1">
                  "글이 작성되었습니다" 같은 성공 메시지 표시
                </p>
              </div>
              <Switch
                checked={toastEnabled}
                onCheckedChange={handleToastToggle}
              />
            </div>

            {notificationsEnabled && (
              <>
                <Separator />

                <div className="flex items-center justify-between">
                  <Label className="text-foreground">새 글 알림</Label>
                  <Switch
                    className="!min-w-0 !min-h-0 h-4 w-8 md:h-6 md:w-11
                    [&>span]:h-3.5 [&>span]:w-3.5 md:[&>span]:h-5 md:[&>span]:w-5
                    [&[data-state=checked]>span]:translate-x-3.5 md:[&[data-state=checked]>span]:translate-x-5"
                    checked={newPostNotifications}
                    onCheckedChange={handleNewPostNotificationsChange}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-foreground">답글 알림</Label>
                  <Switch
                    className="!min-w-0 !min-h-0 h-4 w-8 md:h-6 md:w-11
                    [&>span]:h-3.5 [&>span]:w-3.5 md:[&>span]:h-5 md:[&>span]:w-5
                    [&[data-state=checked]>span]:translate-x-3.5 md:[&[data-state=checked]>span]:translate-x-5"
                    checked={replyNotifications}
                    onCheckedChange={handleReplyNotificationsChange}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label className="text-foreground">등불 알림</Label>
                  <Switch
                    className="!min-w-0 !min-h-0 h-4 w-8 md:h-6 md:w-11
                    [&>span]:h-3.5 [&>span]:w-3.5 md:[&>span]:h-5 md:[&>span]:w-5
                    [&[data-state=checked]>span]:translate-x-3.5 md:[&[data-state=checked]>span]:translate-x-5"
                    checked={lanternNotifications}
                    onCheckedChange={handleLanternNotificationsChange}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* AI / 맞춤 기능 */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <MessageSquare className="w-5 h-5" />
              <span>AI / 맞춤 설정</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground">AI 자동응답 허용</Label>
                <p className="text-xs text-muted-foreground">
                  1시간 이상 미응답 글·댓글에 AI가 대신 답변합니다.
                </p>
              </div>
              <Switch
                disabled={consentsLoading}
                checked={aiAutoReplyEnabled}
                onCheckedChange={handleAiAutoReplyChange}
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground">맞춤 아침 추천 수신</Label>
                <p className="text-xs text-muted-foreground">
                  오전 9시 관심사 기반 추천 푸시·고정카드를 받습니다.
                </p>
              </div>
              <Switch
                disabled={consentsLoading}
                checked={personalizedDigestEnabled}
                onCheckedChange={handlePersonalizedDigestChange}
              />
            </div>
          </CardContent>
        </Card>

        {/* 개인정보 보호 */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Shield className="w-5 h-5" />
              <span>개인정보 보호</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-foreground">자동 저장</Label>
                <p className="text-xs text-muted-foreground">
                  작성 중인 글을 자동으로 저장
                </p>
              </div>
              <Switch
                className="!min-w-0 !min-h-0 h-4 w-8 md:h-6 md:w-11
                [&>span]:h-3.5 [&>span]:w-3.5 md:[&>span]:h-5 md:[&>span]:w-5
                [&[data-state=checked]>span]:translate-x-3.5 md:[&[data-state=checked]>span]:translate-x-5"
                checked={autoSave}
                onCheckedChange={handleAutoSaveChange}
              />
            </div>
          </CardContent>
        </Card>

        {/* 데이터 관리 */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2 text-gray-900">
              <Download className="w-5 h-5 text-gray-700" />
              <span>데이터 관리</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={handleClearCache}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              캐시 삭제
            </Button>

            <Button
              variant="destructive"
              className="w-full justify-start bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleAccountDelete}
            >
              <AlertTriangle className="w-4 h-4 mr-3" />
              <div className="text-left">
                <p className="font-medium">계정 탈퇴</p>
              </div>
            </Button>
          </CardContent>
        </Card>

        {/* 법적 문서 */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle>법적 문서</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {onShowTerms && (
              <Button
                variant="outline"
                className="w-full justify-start bg-white border-gray-300 text-gray-900 hover:bg-gray-50"
                onClick={onShowTerms}
              >
                이용약관
              </Button>
            )}
            {onShowPrivacy && (
              <Button
                variant="outline"
                className="w-full justify-start bg-white border-gray-300 text-gray-900 hover:bg-gray-50"
                onClick={onShowPrivacy}
              >
                개인정보 처리방침
              </Button>
            )}
            {onShowGuidelines && (
              <Button
                variant="outline"
                className="w-full justify-start bg-white border-gray-300 text-gray-900 hover:bg-gray-50"
                onClick={onShowGuidelines}
              >
                커뮤니티 가이드라인
              </Button>
            )}
            {onShowOpenSourceLicenses && (
              <Button
                variant="outline"
                className="w-full justify-start bg-white border-gray-300 text-gray-900 hover:bg-gray-50"
                onClick={onShowOpenSourceLicenses}
              >
                오픈소스 라이선스
              </Button>
            )}
            {onShowAttributions && (
              <Button
                variant="outline"
                className="w-full justify-start bg-white border-gray-300 text-gray-900 hover:bg-gray-50"
                onClick={onShowAttributions}
              >
                이미지·아이콘 출처
              </Button>
            )}
          </CardContent>
        </Card>

        {/* 앱 정보 */}
        <Card className="bg-card border-border">
          <CardHeader>
            <CardTitle className="text-gray-900">앱 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">버전</span>
              <span className="">1.0.0</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">빌드</span>
              <span className="">2025.01.01</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">개발자</span>
              <span className="">비유노트 팀</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}