// src/components/OnboardingFlow.tsx
import React, {
    memo,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { createPortal } from "react-dom";
import { Button } from "./ui/button";

// 이미 만들어 둔 화면들 (그대로 재사용)
import { TermsOfServiceScreen } from "./TermsOfServiceScreen";
import { PrivacyPolicyScreen } from "./PrivacyPolicyScreen";
import { CommunityGuidelinesScreen } from "./CommunityGuidelinesScreen";
import { NicknameScreen } from "./NicknameScreen";

// 아이콘
import {
    FileText,
    ShieldCheck,
    BookOpenCheck,
    User2,
    Check,
    Info,
    X,
    CheckCircle2,
} from "lucide-react";

// 🔹 Firestore / Auth 추가
import { auth, db } from "../firebase";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

/* ====================================
   requestIdleCallback 폴리필 + storage
   ==================================== */
const ric: typeof window.requestIdleCallback =
    typeof window !== "undefined" && "requestIdleCallback" in window
        ? window.requestIdleCallback.bind(window)
        : (cb: any) =>
            setTimeout(
                () => cb({ didTimeout: false, timeRemaining: () => 16 }),
                1,
            ) as any;

const storage = {
    get(key: string) {
        try {
            return localStorage.getItem(key);
        } catch {
            return null;
        }
    },
    set(key: string, val: string) {
        ric(() => {
            try {
                localStorage.setItem(key, val);
            } catch { }
        });
    },
};

const KEY_TOS = "tosAccepted";
const KEY_PRIVACY = "privacyAccepted";
const KEY_GUIDE = "guidelinesAccepted";
const KEY_NICK = "nickname";

/* ====================================
   타입/스텝 메타
   ==================================== */
type Step = "terms" | "privacy" | "guidelines" | "nickname" | "done";

type StepMeta = {
    id: Exclude<Step, "done">;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
};

// 🔹 Firestore에 저장할 온보딩 상태 타입
interface OnboardingStatus {
    tosAccepted: boolean;
    privacyAccepted: boolean;
    guidelinesAccepted: boolean;
    nickname: string | null;
}

// OnboardingFlow.tsx (수정본)
const STEPS: StepMeta[] = [
    { id: "terms", label: "약관 동의", icon: FileText },
    { id: "privacy", label: "개인정보 안내", icon: ShieldCheck },
    { id: "guidelines", label: "커뮤니티 규칙", icon: BookOpenCheck },
    { id: "nickname", label: "내 이름 정하기", icon: User2 },
];

/* ====================================
   사운드/진동(선택) 유틸
   ==================================== */
function playBeep(freq = 880, duration = 0.06) {
    try {
        const Ctx =
            (window as any).AudioContext || (window as any).webkitAudioContext;
        if (!Ctx) return;
        const ctx = new Ctx();
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "sine";
        o.frequency.value = freq;
        o.connect(g);
        g.connect(ctx.destination);
        // 짧은 페이드 인/아웃
        const now = ctx.currentTime;
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.04, now + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, now + duration);
        o.start(now);
        o.stop(now + duration + 0.02);
        // 자동 종료
        setTimeout(() => ctx.close(), (duration + 0.05) * 1000);
    } catch { }
}
function tryVibrate(pattern: number | number[] = 12) {
    try {
        (navigator as any).vibrate?.(pattern);
    } catch { }
}

/* ====================================
   초경량 Toast 시스템 (위치/피드백 옵션 추가)
   ==================================== */
type ToastAction = {
    label: string;
    onClick: () => void;
    variant?: "default" | "outline";
};
type ToastItem = {
    id: number;
    title?: string;
    description?: string;
    actions?: ToastAction[];
    tone?: "info" | "success" | "neutral";
    duration?: number; // ms
};

type ToastPosition = "bottom-right" | "bottom-left" | "top-right" | "top-left";
type ToastFeedback = { sound?: boolean; vibrate?: boolean };

function useToasts(opts?: { feedback?: ToastFeedback }) {
    const [toasts, setToasts] = useState<ToastItem[]>([]);
    const idRef = useRef(1);

    const show = useCallback(
        (t: Omit<ToastItem, "id">) => {
            const id = idRef.current++;
            const item: ToastItem = { id, duration: 3800, tone: "neutral", ...t };
            setToasts((prev) => [...prev, item]);
            // 피드백
            if (opts?.feedback?.sound) playBeep(920, 0.05);
            if (opts?.feedback?.vibrate) tryVibrate(14);

            return id;
        },
        [opts?.feedback?.sound, opts?.feedback?.vibrate],
    );

    const dismiss = useCallback((id: number) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    const api = useMemo(() => ({ show, dismiss }), [show, dismiss]);
    return { toasts, api };
}

const ToastHost = memo(function ToastHost({
    toasts,
    onDismiss,
    position = "bottom-right",
}: {
    toasts: ToastItem[];
    onDismiss: (id: number) => void;
    position?: ToastPosition;
}) {
    const createDismissHandler = useCallback(
        (toastId: number) => {
            return () => onDismiss(toastId);
        },
        [onDismiss],
    );

    if (typeof document === "undefined") return null;

    const posCls =
        position === "bottom-right"
            ? "bottom-4 right-4"
            : position === "bottom-left"
                ? "bottom-4 left-4"
                : position === "top-right"
                    ? "top-4 right-4"
                    : "top-4 left-4";

    return createPortal(
        <div
            className={`fixed ${posCls} z-[100] space-y-2 w-[min(96vw,360px)]`}
        >
            {toasts.map((t) => (
                <ToastCard key={t.id} item={t} onDismiss={createDismissHandler(t.id)} />
            ))}
        </div>,
        document.body,
    );
});

const ToastCard = memo(function ToastCard({
    item,
    onDismiss,
}: {
    item: ToastItem;
    onDismiss: () => void;
}) {
    const [hover, setHover] = useState(false);
    const startedAt = useRef<number>(Date.now());
    const [remain, setRemain] = useState(item.duration ?? 3800);
    const timerRef = useRef<number | null>(null);

    // 자동 닫기 타이머 (호버/포커스 시 일시정지)
    useEffect(() => {
        const tick = () => {
            if (hover) return;
            const elapsed = Date.now() - startedAt.current;
            const left = (item.duration ?? 3800) - elapsed;
            setRemain(left);
            if (left <= 0) onDismiss();
            else timerRef.current = window.setTimeout(tick, 200);
        };
        timerRef.current = window.setTimeout(tick, 200);
        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [hover, item.duration, onDismiss]);

    // ESC로 닫기
    useEffect(() => {
        const onKey = (e: KeyboardEvent) =>
            e.key === "Escape" && onDismiss();
        document.addEventListener("keydown", onKey);
        return () => document.removeEventListener("keydown", onKey);
    }, [onDismiss]);

    const toneRing =
        item.tone === "success"
            ? "ring-1 ring-emerald-500/40"
            : item.tone === "info"
                ? "ring-1 ring-sky-500/40"
                : "ring-1 ring-border/60 dark:ring-white/10";

    const handleMouseEnter = useCallback(() => {
        setHover(true);
    }, []);

    const handleMouseLeave = useCallback(() => {
        setHover(false);
    }, []);

    const createActionClickHandler = useCallback(
        (action: ToastAction) => {
            return () => {
                action.onClick();
                onDismiss();
            };
        },
        [onDismiss],
    );

    const progressWidth = useMemo(() => {
        return Math.max(
            0,
            Math.min(
                100,
                (((item.duration ?? 3800) - remain) / (item.duration ?? 3800)) *
                100,
            ),
        );
    }, [item.duration, remain]);

    const progressBarRef = useCallback(
        (el: HTMLDivElement | null) => {
            if (el) {
                el.style.width = `${progressWidth}%`;
            }
        },
        [progressWidth],
    );

    return (
        <div
            role="status"
            aria-live="polite"
            className={`
        bg-card/95 backdrop-blur-md border border-border/70
        shadow-lg shadow-black/10 dark:shadow-black/40
        rounded-xl p-3 ${toneRing}
      `}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
        >
            <div className="flex items-start gap-2">
                <div className="mt-0.5">
                    {item.tone === "success" ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    ) : item.tone === "info" ? (
                        <Info className="w-4 h-4 text-sky-600" />
                    ) : (
                        <Info className="w-4 h-4 text-muted-foreground" />
                    )}
                </div>
                <div className="flex-1">
                    {item.title && (
                        <div className="text-sm font-medium">{item.title}</div>
                    )}
                    {item.description && (
                        <div className="text-xs text-muted-foreground">
                            {item.description}
                        </div>
                    )}
                    {!!item.actions?.length && (
                        <div className="mt-2 flex flex-wrap gap-2">
                            {item.actions.map((a, i) => (
                                <Button
                                    key={i}
                                    size="sm"
                                    variant={a.variant ?? "outline"}
                                    onClick={createActionClickHandler(a)}
                                >
                                    {a.label}
                                </Button>
                            ))}
                        </div>
                    )}
                </div>
                <button
                    aria-label="닫기"
                    className="p-1 rounded hover:bg-muted -m-1"
                    onClick={onDismiss}
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {/* 진행 바 (남은 시간) */}
            <div className="mt-2 h-1 rounded-full bg-muted overflow-hidden">
                <div
                    ref={progressBarRef}
                    className="h-full bg-primary transition-[width] duration-150"
                />
            </div>
        </div>
    );
});

/* ====================================
   업그레이드 스텝퍼
   ==================================== */
const Stepper = memo(function Stepper({
    current,
    steps,
    onJumpBackRequest,
}: {
    current: StepMeta["id"];
    steps: (StepMeta & { done: boolean })[];
    onJumpBackRequest: (meta: StepMeta) => void;
}) {
    const total = steps.length;
    const idx = useMemo(
        () => steps.findIndex((s) => s.id === current),
        [current, steps],
    );
    const percent = useMemo(
        () => Math.round(((idx + 1) / total) * 100),
        [idx, total],
    );

    const createStepClickHandler = useCallback(
        (step: StepMeta & { done: boolean }, stepIndex: number) => {
            return () => {
                if (stepIndex < idx) {
                    onJumpBackRequest(step);
                }
            };
        },
        [idx, onJumpBackRequest],
    );

    const percentBarRef = useCallback(
        (el: HTMLDivElement | null) => {
            if (el) {
                el.style.width = `${percent}%`;
            }
        },
        [percent],
    );

    return (
        // OnboardingFlow.tsx, Stepper 컴포넌트 안 (수정본)
        <div
            className="
                fixed top-2 left-1/2 -translate-x-1/2 z-50
                w-[min(720px,92vw)]
                bg-card/90 backdrop-blur-md border border-border
                rounded-2xl px-3 py-2 shadow-sm
              "
            role="group"
            aria-label="처음 설정 진행도"
        >
            <div className="flex items-center justify-between mb-1">
                <div className="text-xs font-medium">처음 설정 중</div>
                <div
                    className="text-[11px] text-muted-foreground"
                    aria-live="polite"
                    aria-atomic="true"
                >
                    {percent}% 진행 중
                </div>
            </div>

            <div
                role="progressbar"
                aria-valuenow={percent}
                aria-label={`진행률 ${percent}%`}
            >
                <div
                    ref={percentBarRef}
                    className="absolute left-0 top-0 h-full bg-primary transition-all"
                />
            </div>

            <div className="mt-2 grid grid-cols-4 gap-1">
                {steps.map((s, i) => {
                    const done = s.done;
                    const active = s.id === current;
                    return (
                        <button
                            key={s.id}
                            type="button"
                            className={`
                group flex items-center gap-2 px-2 py-1 rounded-xl transition
                ${active
                                    ? "bg-primary/10 text-primary"
                                    : done
                                        ? "text-foreground hover:bg-muted/60"
                                        : "text-muted-foreground"
                                }
              `}
                            onClick={createStepClickHandler(s, i)}
                            aria-current={active ? "step" : undefined}
                            aria-label={`${s.label} 단계${active ? " (현재)" : done ? " (완료)" : ""
                                }`}
                        >
                            <span
                                className={`
                  inline-flex items-center justify-center w-5 h-5 rounded-full border
                  ${active ? "border-primary" : done ? "border-emerald-500" : "border-border"}
                  ${done ? "bg-emerald-500 text-white" : ""}
                `}
                            >
                                {done ? <Check className="w-3.5 h-3.5" /> : i + 1}
                            </span>
                            <div className="text-[11px] leading-none">{s.label}</div>
                        </button>
                    );
                })}
            </div>
        </div>
    );
});

/* ====================================
   메인 OnboardingFlow
   ==================================== */
export interface OnboardingFlowProps {
    /** 온보딩 완주 시 호출(메인으로 복귀 등) */
    onFinish: () => void;
    /** 닉네임 추천에 쓰일 이메일(선택) */
    userEmail?: string;
    /** (선택) 토스트 위치 */
    toastPosition?: ToastPosition;
    /** (선택) 토스트 피드백: 사운드/진동 */
    toastFeedback?: ToastFeedback;
}

export const OnboardingFlow = memo(function OnboardingFlow({
    onFinish,
    userEmail,
    toastPosition = "bottom-right",
    toastFeedback = { sound: false, vibrate: true },
}: OnboardingFlowProps) {
    // 🔹 온보딩 상태: 초기값은 localStorage 기반
    const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus>(
        () => ({
            tosAccepted: storage.get(KEY_TOS) === "true",
            privacyAccepted: storage.get(KEY_PRIVACY) === "true",
            guidelinesAccepted: storage.get(KEY_GUIDE) === "true",
            nickname: storage.get(KEY_NICK),
        }),
    );

    // Firestore 초기 로드 완료 여부
    const [serverInitialized, setServerInitialized] = useState(false);
    const firstSyncRef = useRef(false);

    // 어디부터 시작할지
    const [step, setStep] = useState<Step>("terms");
    const initialStepSetRef = useRef(false);

    // Toasts (피드백 옵션 주입)
    const { toasts, api: toast } = useToasts({ feedback: toastFeedback });

    // 🔹 현재 온보딩 상태를 기반으로 각 스텝의 done 여부 계산
    const stepsWithDone = useMemo(
        () =>
            STEPS.map((meta) => {
                let done = false;
                if (meta.id === "terms") done = onboardingStatus.tosAccepted;
                else if (meta.id === "privacy")
                    done = onboardingStatus.privacyAccepted;
                else if (meta.id === "guidelines")
                    done = onboardingStatus.guidelinesAccepted;
                else if (meta.id === "nickname")
                    done = !!onboardingStatus.nickname;
                return { ...meta, done };
            }),
        [onboardingStatus],
    );

    // 🔹 Firestore에서 온보딩 상태 로드 + localStorage → Firestore 마이그레이션
    useEffect(() => {
        const uid = auth.currentUser?.uid;
        if (!uid) {
            setServerInitialized(true);
            return;
        }

        let cancelled = false;
        const userRef = doc(db, "users", uid);

        (async () => {
            try {
                const snap = await getDoc(userRef);
                if (snap.exists()) {
                    const data = snap.data() as any;
                    const remote = data.onboarding;

                    if (remote && typeof remote === "object") {
                        const merged: OnboardingStatus = {
                            tosAccepted:
                                typeof remote.tosAccepted === "boolean"
                                    ? remote.tosAccepted
                                    : onboardingStatus.tosAccepted,
                            privacyAccepted:
                                typeof remote.privacyAccepted === "boolean"
                                    ? remote.privacyAccepted
                                    : onboardingStatus.privacyAccepted,
                            guidelinesAccepted:
                                typeof remote.guidelinesAccepted === "boolean"
                                    ? remote.guidelinesAccepted
                                    : onboardingStatus.guidelinesAccepted,
                            nickname:
                                typeof remote.nickname === "string" &&
                                    remote.nickname.trim().length > 0
                                    ? remote.nickname.trim()
                                    : onboardingStatus.nickname,
                        };

                        if (!cancelled) {
                            setOnboardingStatus(merged);
                            // localStorage에도 미러링 (게스트/로그아웃 대비)
                            if (merged.tosAccepted) storage.set(KEY_TOS, "true");
                            if (merged.privacyAccepted) storage.set(KEY_PRIVACY, "true");
                            if (merged.guidelinesAccepted) storage.set(KEY_GUIDE, "true");
                            if (merged.nickname)
                                storage.set(KEY_NICK, merged.nickname.trim());
                        }
                    } else {
                        // onboarding 필드가 없는 경우 → 현재 상태로 필드 생성
                        await updateDoc(userRef, {
                            onboarding: onboardingStatus,
                        });
                    }
                } else {
                    // user 문서 자체가 없는 경우 → 현재 온보딩 상태로 문서 생성
                    await setDoc(
                        userRef,
                        {
                            onboarding: onboardingStatus,
                        },
                        { merge: true },
                    );
                }
            } catch (error) {
                console.error("온보딩 상태 Firestore 로드 실패:", error);
            } finally {
                if (!cancelled) setServerInitialized(true);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [onboardingStatus]); // 초기 localStorage 기반 상태(onboardingStatus)를 seed로 사용

    // 🔹 온보딩 상태 변경 시 Firestore에 동기화
    useEffect(() => {
        if (!serverInitialized) return;

        const uid = auth.currentUser?.uid;
        if (!uid) return;

        // Firestore에서 첫 로드 직후 발생하는 변경은 스킵
        if (!firstSyncRef.current) {
            firstSyncRef.current = true;
            return;
        }

        const userRef = doc(db, "users", uid);
        updateDoc(userRef, {
            onboarding: onboardingStatus,
        }).catch((error) => {
            console.error("온보딩 상태 Firestore 동기화 실패:", error);
        });
    }, [onboardingStatus, serverInitialized]);

    // 🔹 초기 스텝 결정 (서버 상태가 로드된 뒤 한 번만)
    useEffect(() => {
        if (!serverInitialized) return;
        if (initialStepSetRef.current) return;

        const firstUnfinished = stepsWithDone.find((s) => !s.done);
        setStep((firstUnfinished?.id ?? "done") as Step);
        initialStepSetRef.current = true;
    }, [serverInitialized, stepsWithDone]);

    // done이면 즉시 종료
    useEffect(() => {
        if (step === "done") onFinish();
    }, [step, onFinish]);

    // ===== 저장 + 다음 단계 이동 =====
    const goTermsAgree = useCallback(() => {
        storage.set(KEY_TOS, "true");
        setOnboardingStatus((prev) => ({ ...prev, tosAccepted: true }));
        setStep("privacy");
        toast.show({
            tone: "success",
            title: "약관 동의 완료",
            description: "다음 단계로 이동합니다.",
        });
    }, [toast]);

    const goPrivacyNext = useCallback(() => {
        storage.set(KEY_PRIVACY, "true");
        setOnboardingStatus((prev) => ({ ...prev, privacyAccepted: true }));
        setStep("guidelines");
        toast.show({
            tone: "success",
            title: "개인정보 안내 확인",
            description: "가이드라인 단계로 이동합니다.",
        });
    }, [toast]);

    const goGuidelinesNext = useCallback(() => {
        storage.set(KEY_GUIDE, "true");
        setOnboardingStatus((prev) => ({ ...prev, guidelinesAccepted: true }));
        setStep("nickname");
        toast.show({
            tone: "success",
            title: "가이드라인 확인 완료",
            description: "닉네임 설정 단계로 이동합니다.",
        });
    }, [toast]);

    const completeNickname = useCallback(
        (nickname: string) => {
            const trimmed = nickname.trim();
            if (trimmed) {
                storage.set(KEY_NICK, trimmed);
                setOnboardingStatus((prev) => ({ ...prev, nickname: trimmed }));
            }
            toast.show({
                tone: "success",
                title: "닉네임 설정 완료",
                description: `환영합니다, ${trimmed || nickname.trim()}!`,
            });
            setStep("done");
        },
        [toast],
    );

    // ===== 뒤로가기 =====
    const goBack = useCallback(() => {
        setStep((s) =>
            s === "privacy"
                ? "terms"
                : s === "guidelines"
                    ? "privacy"
                    : s === "nickname"
                        ? "guidelines"
                        : "terms",
        );
    }, []);

    // ===== 스텝퍼 클릭 → 토스트로 "이 단계로 이동 / 유지" =====
    const requestJumpBack = useCallback(
        (meta: StepMeta) => {
            toast.show({
                tone: "info",
                title: `${meta.label} 화면으로 다시 갈까요?`,
                description: "앞에서 본 내용을 다시 천천히 볼 수 있어요.",
                actions: [
                    {
                        label: "다시 보기",
                        variant: "default",
                        onClick: () => setStep(meta.id),
                    },
                    {
                        label: "괜찮아요",
                        variant: "outline",
                        onClick: () => { },
                    },
                ],
                duration: 6000,
            });
        },
        [toast],
    );

    const handleToastDismiss = useCallback(
        (id: number) => {
            toast.dismiss(id);
        },
        [toast],
    );

    if (step === "done") return null;

    return (
        <div className="w-full h-full relative">
            <Stepper
                current={step as StepMeta["id"]}
                steps={stepsWithDone}
                onJumpBackRequest={requestJumpBack}
            />

            {/* 화면들 */}
            {step === "terms" && (
                <div className="w-full h-full relative">
                    <TermsOfServiceScreen onBack={onFinish} />
                    <div className="fixed bottom-20 right-4 z-40">
                        <Button onClick={goTermsAgree}>동의하고 계속하기</Button>
                    </div>
                </div>
            )}


            {step === "privacy" && (
                <div className="w-full h-full relative">
                    <PrivacyPolicyScreen onBack={goBack} />
                    <div className="fixed bottom-20 right-4 z-40">
                        <Button onClick={goPrivacyNext}>확인했어요</Button>
                    </div>
                </div>
            )}


            {step === "guidelines" && (
                <div className="w-full h-full relative">
                    <CommunityGuidelinesScreen
                        onBack={goBack}
                        onContinue={goGuidelinesNext}
                        // 🔹 이제 Firestore/상태 기반
                        isAlreadyAgreed={onboardingStatus.guidelinesAccepted}
                    />
                </div>
            )}

            {step === "nickname" && (
                <NicknameScreen
                    onBack={goBack}
                    onComplete={completeNickname}
                    userEmail={userEmail}
                />
            )}

            {/* 토스트 호스트 (위치 지정 가능) */}
            <ToastHost
                toasts={toasts}
                onDismiss={handleToastDismiss}
                position={toastPosition}
            />
        </div>
    );
});
