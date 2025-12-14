// src/components/AdminReportScreen.tsx
// 운영자용 신고 관리 화면

import React, {
    useEffect,
    useMemo,
    useState,
    useCallback,
} from "react";
import { db } from "@/firebase";
import {
    collection,
    doc,
    getDoc,
    limit,
    onSnapshot,
    orderBy,
    query,
    updateDoc,
    where,
} from "firebase/firestore";
import { httpsCallable } from "firebase/functions";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertDialogSimple } from "./ui/alert-dialog-simple";
import { AppHeader } from "./layout/AppHeader";

import type { Post, Reply } from "./MainScreen/types";
import { functions } from "@/firebase";

type ReportStatus = "pending" | "needs_review" | "confirmed" | "rejected";

interface ReportDoc {
    id: string;
    targetType: "post" | "reply";
    targetId: string;
    targetAuthorUid?: string | null;
    reporterUid?: string | null;
    reasons: string[];
    details?: string | null;
    createdAt?: any; // Firestore Timestamp | null
    status: ReportStatus;
    priority?: "normal" | "high";
    postId?: string | null; // 댓글 신고일 때 어떤 게시글의 댓글인지
}

interface AdminReportScreenProps {
    onBack: () => void;
}

export function AdminReportScreen({ onBack }: AdminReportScreenProps) {
    // 신고 리스트
    const [reports, setReports] = useState<ReportDoc[]>([]);
    const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
    const [targetAuthorTrustScore] = useState<number | null>(null);
    const [reporterTrustScore] = useState<number | null>(null);
    const [aiLoading, setAiLoading] = useState(false);
    const [aiError, setAiError] = useState<string | null>(null);
    const [aiResult, setAiResult] = useState<{
        summary: string;
        recommendation: "reject" | "needs_review" | "action_needed";
        riskScore: number;
        rationale: string;
        flags?: string[];
    } | null>(null);

    // 상세 조회용: 대상 글/댓글, 작성자 닉네임
    const [targetPost, setTargetPost] = useState<Post | null>(null);
    const [targetReply, setTargetReply] = useState<Reply | null>(null);
    const [targetAuthorNickname, setTargetAuthorNickname] =
        useState<string>("");

    // 상태 변경 중 여부
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    // 확인 다이얼로그용 상태
    const [pendingStatusUpdate, setPendingStatusUpdate] = useState<{
        reportId: string;
        nextStatus: ReportStatus;
    } | null>(null);

    // 선택된 신고
    const selectedReport = useMemo(
        () => reports.find((r) => r.id === selectedReportId) ?? null,
        [reports, selectedReportId]
    );

    // 🔹 신고 리스트 실시간 구독
    useEffect(() => {
        const reportsRef = collection(db, "reports");

        const q = query(
            reportsRef,
            where("status", "in", ["pending", "needs_review"]),
            orderBy("priority", "desc"),
            orderBy("createdAt", "desc"),
            limit(50)
        );

        const unsubscribe = onSnapshot(
            q,
            (snap) => {
                const list: ReportDoc[] = snap.docs.map((docSnap) => {
                    const data = docSnap.data() as any;
                    return {
                        id: docSnap.id,
                        targetType: data.targetType === "reply" ? "reply" : "post",
                        targetId: String(data.targetId ?? ""),
                        targetAuthorUid:
                            typeof data.targetAuthorUid === "string"
                                ? data.targetAuthorUid
                                : null,
                        reporterUid:
                            typeof data.reporterUid === "string" ? data.reporterUid : null,
                        reasons: Array.isArray(data.reasons) ? data.reasons : [],
                        details:
                            typeof data.details === "string" && data.details.length > 0
                                ? data.details
                                : null,
                        createdAt: data.createdAt ?? null,
                        status:
                            data.status === "needs_review" ||
                                data.status === "confirmed" ||
                                data.status === "rejected"
                                ? data.status
                                : "pending",
                        priority: data.priority === "high" ? "high" : "normal",
                        postId:
                            typeof data.postId === "string" && data.postId.length > 0
                                ? data.postId
                                : null,
                    };
                });

                setReports(list);

                // 선택된 신고가 사라졌으면 선택 해제
                setSelectedReportId((curr) =>
                    curr && !list.some((r) => r.id === curr) ? null : curr
                );
            },
            (error) => {
                console.error("[AdminReportScreen] reports 구독 에러:", error);
            }
        );

        return () => {
            unsubscribe();
        };
    }, []);

    // 🔹 신고 선택 시 대상 글/댓글 + 작성자 닉네임 로드
    useEffect(() => {
        let cancelled = false;

        const loadTarget = async () => {
            if (!selectedReport) {
                if (cancelled) return;
                setTargetPost(null);
                setTargetReply(null);
                setTargetAuthorNickname("");
                return;
            }

            try {
                if (selectedReport.targetType === "post") {
                    // ----- 게시글 신고 -----
                    const postRef = doc(db, "posts", selectedReport.targetId);
                    const postSnap = await getDoc(postRef);

                    if (cancelled) return;

                    if (!postSnap.exists()) {
                        setTargetPost(null);
                        setTargetReply(null);
                        setTargetAuthorNickname("");
                        return;
                    }

                    const data = postSnap.data() as any;
                    const createdAt =
                        data.createdAt && typeof data.createdAt.toDate === "function"
                            ? data.createdAt.toDate()
                            : new Date();

                    const post: Post = {
                        id: postSnap.id,
                        title: data.title ?? "",
                        content: data.content ?? "",
                        category: data.category ?? "기타",
                        subCategory: data.subCategory ?? "전체",
                        type: data.type ?? "question",
                        tags: Array.isArray(data.tags) ? data.tags : [],
                        author: data.author ?? "알 수 없음",
                        authorUid:
                            typeof data.authorUid === "string" ? data.authorUid : null,
                        authorAvatar: data.authorAvatar ?? "",
                        createdAt,
                        lanterns: typeof data.lanterns === "number" ? data.lanterns : 0,
                        replies: Array.isArray(data.replies) ? data.replies : [],
                        replyCount:
                            typeof data.replyCount === "number"
                                ? data.replyCount
                                : Array.isArray(data.replies)
                                    ? data.replies.length
                                    : 0,
                        comments:
                            typeof data.comments === "number"
                                ? data.comments
                                : Array.isArray(data.replies)
                                    ? data.replies.length
                                    : 0,
                        views: typeof data.views === "number" ? data.views : 0,
                        isBookmarked: false,
                        isOwner: false,
                        authorTitleId: data.authorTitleId ?? null,
                        authorTitleName: data.authorTitleName ?? null,
                        hidden: data.hidden === true,
                        reportCount:
                            typeof data.reportCount === "number"
                                ? data.reportCount
                                : undefined,
                    };

                    if (cancelled) return;
                    setTargetPost(post);
                    setTargetReply(null);
                    setTargetAuthorNickname(post.author);
                } else {
                    // ----- 댓글 신고 -----
                    // 댓글은 posts 컬렉션의 replies 배열 안에 들어있고,
                    // report.postId 로 어떤 글의 댓글인지 알 수 있음.
                    if (!selectedReport.postId) {
                        if (cancelled) return;
                        setTargetPost(null);
                        setTargetReply(null);
                        setTargetAuthorNickname("");
                        return;
                    }

                    const postRef = doc(db, "posts", selectedReport.postId);
                    const postSnap = await getDoc(postRef);

                    if (cancelled) return;

                    if (!postSnap.exists()) {
                        setTargetPost(null);
                        setTargetReply(null);
                        setTargetAuthorNickname("");
                        return;
                    }

                    const postData = postSnap.data() as any;
                    const replies: any[] = Array.isArray(postData.replies)
                        ? postData.replies
                        : [];

                    const rawReply =
                        replies.find(
                            (r) => String(r.id ?? "") === selectedReport.targetId
                        ) ?? null;

                    if (cancelled) return;

                    const createdAtPost =
                        postData.createdAt &&
                            typeof postData.createdAt.toDate === "function"
                            ? postData.createdAt.toDate()
                            : new Date();

                    const basePost: Post = {
                        id: postSnap.id,
                        title: postData.title ?? "",
                        content: postData.content ?? "",
                        category: postData.category ?? "기타",
                        subCategory: postData.subCategory ?? "전체",
                        type: postData.type ?? "question",
                        tags: Array.isArray(postData.tags) ? postData.tags : [],
                        author: postData.author ?? "알 수 없음",
                        authorUid:
                            typeof postData.authorUid === "string"
                                ? postData.authorUid
                                : null,
                        authorAvatar: postData.authorAvatar ?? "",
                        createdAt: createdAtPost,
                        lanterns:
                            typeof postData.lanterns === "number" ? postData.lanterns : 0,
                        replies,
                        replyCount:
                            typeof postData.replyCount === "number"
                                ? postData.replyCount
                                : replies.length,
                        comments:
                            typeof postData.comments === "number"
                                ? postData.comments
                                : replies.length,
                        views: typeof postData.views === "number" ? postData.views : 0,
                        isBookmarked: false,
                        isOwner: false,
                        authorTitleId: postData.authorTitleId ?? null,
                        authorTitleName: postData.authorTitleName ?? null,
                        hidden: postData.hidden === true,
                        reportCount:
                            typeof postData.reportCount === "number"
                                ? postData.reportCount
                                : undefined,
                    };

                    if (cancelled) return;
                    setTargetPost(basePost);

                    if (!rawReply) {
                        setTargetReply(null);
                        setTargetAuthorNickname("");
                        return;
                    }

                    let replyCreatedAt: Date;
                    if (
                        rawReply.createdAt &&
                        typeof rawReply.createdAt.toDate === "function"
                    ) {
                        replyCreatedAt = rawReply.createdAt.toDate();
                    } else if (rawReply.createdAt instanceof Date) {
                        replyCreatedAt = rawReply.createdAt;
                    } else if (
                        typeof rawReply.createdAt === "string" ||
                        typeof rawReply.createdAt === "number"
                    ) {
                        const parsed = new Date(rawReply.createdAt);
                        replyCreatedAt = Number.isNaN(parsed.getTime())
                            ? new Date()
                            : parsed;
                    } else {
                        replyCreatedAt = new Date();
                    }

                    const reply: Reply = {
                        id:
                            typeof rawReply.id === "number" ||
                                typeof rawReply.id === "string"
                                ? rawReply.id
                                : selectedReport.targetId,
                        content: rawReply.content ?? "",
                        author: rawReply.author ?? "알 수 없음",
                        authorUid:
                            typeof rawReply.authorUid === "string"
                                ? rawReply.authorUid
                                : null,
                        authorAvatar:
                            typeof rawReply.authorAvatar === "string"
                                ? rawReply.authorAvatar
                                : "",
                        timeAgo: rawReply.timeAgo ?? "",
                        lanterns:
                            typeof rawReply.lanterns === "number" ? rawReply.lanterns : 0,
                        isGuide: !!rawReply.isGuide,
                        createdAt: replyCreatedAt,
                        authorTitleId: rawReply.authorTitleId ?? null,
                    };

                    if (cancelled) return;
                    setTargetReply(reply);
                    setTargetAuthorNickname(reply.author);
                }
            } catch (error) {
                if (cancelled) return;
                console.error("[AdminReportScreen] 대상 로드 에러:", error);
                setTargetPost(null);
                setTargetReply(null);
                setTargetAuthorNickname("");
            }
        };

        void loadTarget();

        return () => { cancelled = true; };
    }, [selectedReport]);

    // 🔹 신고 상태 변경 요청 (확정 / 거절 버튼에서 호출)
    const requestStatusUpdate = useCallback(
        (reportId: string, nextStatus: ReportStatus) => {
            setPendingStatusUpdate({ reportId, nextStatus });
        },
        []
    );

    // 🔹 실제 Firestore 업데이트
    //    - 이제는 "status만 바꾸고"
    //    - 글/댓글 숨김 + trustScore 조정은 Cloud Function(onReportStatusChanged)에서 담당
    const confirmStatusUpdate = useCallback(async () => {
        if (!pendingStatusUpdate) return;

        const { reportId, nextStatus } = pendingStatusUpdate;
        setIsUpdatingStatus(true);

        try {
            const reportRef = doc(db, "reports", reportId);
            await updateDoc(reportRef, {
                status: nextStatus,
            });
            // 여기서 별도로 posts/replies를 수정하지 않습니다.
            // status가 confirmed로 바뀌는 순간,
            // 서버의 onReportStatusChanged 트리거가 실행되어
            // 대상 글/댓글 hidden 처리와 trustScore 변경을 수행합니다.
        } catch (error) {
            console.error("[AdminReportScreen] status 업데이트 실패:", error);
        } finally {
            setIsUpdatingStatus(false);
            setPendingStatusUpdate(null);
        }
    }, [pendingStatusUpdate]);

    const runAiReview = useCallback(async () => {
        if (!selectedReport) return;
        const isPost = selectedReport.targetType === "post";
        const content = isPost
            ? targetPost?.content ?? ""
            : targetReply?.content ?? "";
        if (!content) {
            setAiError("검수할 본문이 없습니다.");
            return;
        }
        setAiLoading(true);
        setAiError(null);
        try {
            const callable = httpsCallable(functions, "aiModerationReview");
            const { data } = await callable({
                targetType: selectedReport.targetType,
                title: isPost ? targetPost?.title ?? "" : "",
                content,
                reasons: selectedReport.reasons,
                details: selectedReport.details,
                reporterUid: selectedReport.reporterUid ?? null,
                targetAuthorUid: selectedReport.targetAuthorUid ?? null,
            });
            setAiResult(data as any);
        } catch (error: any) {
            console.error("[AdminReportScreen] AI 검수 실패:", error);
            setAiError(error?.message ?? "AI 검수 요청에 실패했습니다.");
        } finally {
            setAiLoading(false);
        }
    }, [selectedReport, targetPost, targetReply]);

    // 🔹 createdAt 표시용 헬퍼 (간단 버전)
    const formatCreatedAt = (ts: any) => {
        if (!ts || typeof ts.toDate !== "function") return "";
        const d = ts.toDate() as Date;
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        const hh = String(d.getHours()).padStart(2, "0");
        const mi = String(d.getMinutes()).padStart(2, "0");
        return `${yyyy}-${mm}-${dd} ${hh}:${mi}`;
    };
    return (
        // 🔹 앱 영역 전체를 채우는 루트 컨테이너
        <div className="w-full flex-1 min-h-0 bg-background text-foreground flex flex-col">
            <AppHeader title="신고 관리" onBack={onBack} />

            <div className="flex-1 min-h-0 flex flex-col md:flex-row border-t border-border">
                {/* 좌측 리스트 */}
                <div className="flex-1 min-h-0 md:w-1/2 border-b md:border-b-0 md:border-r border-border overflow-y-auto">
                    {reports.length === 0 ? (
                        <div className="p-4 text-sm text-muted-foreground">
                            처리할 신고가 없습니다.
                        </div>
                    ) : (
                        reports.map((report) => (
                            <button
                                key={report.id}
                                type="button"
                                onClick={() => setSelectedReportId(report.id)}
                                // ⬇⬇ 이 className 안은 네 원래 코드 그대로 사용해
                                className={`w-full text-left px-4 py-3 border-b border-border hover:bg-accent/20 ${selectedReportId === report.id ? "bg-accent/30" : "bg-background"
                                    }`}
                            >
                                <div className="flex items-center justify-between mb-1">
                                    <div className="text-xs text-muted-foreground">
                                        {report.targetType === "post" ? "게시글" : "댓글"} 신고
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        {report.priority === "high" && (
                                            <Badge variant="destructive" className="text-[10px]">
                                                우선 검토
                                            </Badge>
                                        )}
                                        <Badge
                                            variant={
                                                report.status === "pending"
                                                    ? "outline"
                                                    : report.status === "needs_review"
                                                        ? "secondary"
                                                        : report.status === "confirmed"
                                                            ? "default"
                                                            : "outline"
                                            }
                                            className="text-[10px]"
                                        >
                                            {report.status === "pending" && "대기"}
                                            {report.status === "needs_review" && "검토 필요"}
                                            {report.status === "confirmed" && "확정"}
                                            {report.status === "rejected" && "거절"}
                                        </Badge>
                                    </div>
                                </div>
                                <div className="text-xs text-muted-foreground mb-1">
                                    {formatCreatedAt(report.createdAt)}
                                </div>
                                <div className="text-sm font-medium truncate">
                                    {report.reasons && report.reasons.length > 0
                                        ? report.reasons[0]
                                        : "사유 없음"}
                                </div>
                                {report.details && (
                                    <div className="text-xs text-muted-foreground line-clamp-2 mt-1">
                                        {report.details}
                                    </div>
                                )}
                            </button>
                        ))
                    )}
                </div>

                {/* 🔹 신고 상세 컬럼 (우측 / 모바일에서는 아래쪽) */}
                <div className="flex-1 min-h-0 md:w-1/2 overflow-y-auto">
                    {selectedReport ? (
                        <div className="p-4 space-y-4">
                            {/* 신고 정보 카드 */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm">신고 정보</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2 text-sm">
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">대상</span>
                                        <span>
                                            {selectedReport.targetType === "post" ? "게시글" : "댓글"}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">신고 상태</span>
                                        <span>{selectedReport.status}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">우선순위</span>
                                        <span>
                                            {selectedReport.priority === "high" ? "높음" : "보통"}
                                        </span>
                                    </div>
                                    <div>
                                        <div className="text-muted-foreground mb-1">신고 사유</div>
                                        <ul className="list-disc list-inside space-y-1">
                                            {selectedReport.reasons &&
                                                selectedReport.reasons.length > 0 ? (
                                                selectedReport.reasons.map((reason, idx) => (
                                                    <li key={idx}>{reason}</li>
                                                ))
                                            ) : (
                                                <li className="text-muted-foreground">
                                                    사유가 없습니다.
                                                </li>
                                            )}
                                        </ul>
                                    </div>
                                    {selectedReport.details && (
                                        <div>
                                            <div className="text-muted-foreground mb-1">
                                                상세 설명
                                            </div>
                                            <div className="whitespace-pre-wrap">
                                                {selectedReport.details}
                                            </div>
                                        </div>
                                    )}
                                    <div className="text-xs text-muted-foreground mt-2">
                                        생성일시: {formatCreatedAt(selectedReport.createdAt)}
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">작성자 신뢰도</span>
                                        <span>{targetAuthorTrustScore ?? "알 수 없음"}</span>
                                    </div>
                                    <div className="flex items-center justify-between">
                                        <span className="text-muted-foreground">신고자 신뢰도</span>
                                        <span>{reporterTrustScore ?? "알 수 없음"}</span>
                                    </div>
                                </CardContent>
                            </Card>

                            {/* 대상 콘텐츠 카드 */}
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-sm">대상 콘텐츠</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-2 text-sm">
                                    {selectedReport.targetType === "post" && targetPost && (
                                        <>
                                            <div className="font-semibold">{targetPost.title}</div>
                                            <div className="text-xs text-muted-foreground">
                                                작성자: {targetAuthorNickname || targetPost.author}
                                            </div>
                                            <div className="mt-2 whitespace-pre-wrap">
                                                {String(targetPost.content ?? "")}
                                            </div>
                                        </>
                                    )}

                                    {selectedReport.targetType === "reply" && targetReply && (
                                        <>
                                            <div className="text-xs text-muted-foreground">
                                                댓글 작성자:{" "}
                                                {targetAuthorNickname || targetReply.author}
                                            </div>
                                            <div className="mt-2 whitespace-pre-wrap">
                                                {String(targetReply.content ?? "")}
                                            </div>
                                            {targetPost && (
                                                <div className="mt-4 p-3 rounded-md bg-muted/40 text-xs">
                                                    <div className="font-semibold mb-1">원문 게시글</div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {targetPost.title}
                                                    </div>
                                                </div>
                                            )}
                                        </>
                                    )}

                                    {!targetPost && !targetReply && (
                                        <div className="text-xs text-muted-foreground">
                                            대상 글/댓글을 찾을 수 없습니다.
                                            (이미 삭제되었을 수 있습니다)
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* AI 검수 보조 */}
                            <Card>
                                <CardHeader className="flex flex-row items-center justify-between">
                                    <div>
                                        <CardTitle className="text-sm">AI 검수 보조</CardTitle>
                                        <div className="text-xs text-muted-foreground mt-1">
                                            운영자 전용 · Vertex AI Gemini 사용
                                        </div>
                                    </div>
                                    <Button
                                        size="sm"
                                        onClick={runAiReview}
                                        disabled={aiLoading || !selectedReport}
                                    >
                                        {aiLoading ? "검수 중..." : "AI 요약/권고"}
                                    </Button>
                                </CardHeader>
                                <CardContent className="space-y-3 text-sm">
                                    {aiError && (
                                        <div className="text-destructive text-xs">{aiError}</div>
                                    )}
                                    {aiResult ? (
                                        <div className="space-y-2">
                                            <div>
                                                <div className="text-muted-foreground text-xs">요약</div>
                                                <div className="mt-1 whitespace-pre-wrap">{aiResult.summary}</div>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-muted-foreground text-xs">권고</span>
                                                <Badge variant={
                                                    aiResult.recommendation === "reject"
                                                        ? "secondary"
                                                        : aiResult.recommendation === "action_needed"
                                                            ? "destructive"
                                                            : "outline"
                                                }>
                                                    {aiResult.recommendation === "reject" && "무효/거절 권고"}
                                                    {aiResult.recommendation === "needs_review" && "추가 검토 필요"}
                                                    {aiResult.recommendation === "action_needed" && "조치 필요"}
                                                </Badge>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-muted-foreground text-xs">위험 점수</span>
                                                <span>{(aiResult.riskScore * 100).toFixed(0)}%</span>
                                            </div>
                                            <div>
                                                <div className="text-muted-foreground text-xs">근거</div>
                                                <div className="mt-1 whitespace-pre-wrap">{aiResult.rationale}</div>
                                            </div>
                                            {aiResult.flags && aiResult.flags.length > 0 && (
                                                <div>
                                                    <div className="text-muted-foreground text-xs">감지 플래그</div>
                                                    <div className="flex flex-wrap gap-2 mt-1">
                                                        {aiResult.flags.map((flag, idx) => (
                                                            <Badge key={idx} variant="outline">{flag}</Badge>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    ) : (
                                        <div className="text-muted-foreground text-xs">
                                            신고된 본문을 바탕으로 요약과 조치 권고를 받아볼 수 있습니다.
                                        </div>
                                    )}
                                </CardContent>
                            </Card>

                            {/* 하단 버튼 */}
                            <div className="flex items-center justify-end space-x-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    disabled={isUpdatingStatus}
                                    onClick={() =>
                                        requestStatusUpdate(selectedReport.id, "rejected")
                                    }
                                >
                                    문제 없음
                                </Button>
                                <Button
                                    variant="default"
                                    size="sm"
                                    disabled={isUpdatingStatus}
                                    onClick={() =>
                                        requestStatusUpdate(selectedReport.id, "confirmed")
                                    }
                                >
                                    문제 있음
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="p-4 text-sm text-muted-foreground">
                            왼쪽에서 신고를 선택하면 상세 내용이 표시됩니다.
                        </div>
                    )}
                </div>
            </div>

            {/* 상태 변경 확인 다이얼로그 */}
            <AlertDialogSimple
                open={!!pendingStatusUpdate}
                onOpenChange={(open) => {
                    if (!open) setPendingStatusUpdate(null);
                }}
                title="신고 처리"
                description={
                    pendingStatusUpdate?.nextStatus === "confirmed"
                        ? "이 신고를 '문제 있음'으로 처리할까요? 해당 글(또는 댓글)은 사용자 화면에서 숨겨집니다."
                        : "이 신고를 '문제 없음'으로 처리할까요?"
                }
                confirmText="확인"
                onConfirm={confirmStatusUpdate}
            />
        </div>
    );

}
