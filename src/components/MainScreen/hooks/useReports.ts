// src/components/MainScreen/hooks/useReports.ts
import { useEffect, useState } from "react";
import { db } from "../../../firebase";
import {
    collection,
    onSnapshot,
    orderBy,
    query,
    where,
    doc,
    getDoc,
    updateDoc,
} from "firebase/firestore";

export type ReportStatus = "pending" | "needs_review" | "confirmed" | "rejected";

export interface ReportItem {
    id: string;
    targetType: "post" | "reply";
    targetId: string;
    targetAuthorUid: string | null;
    reporterUid: string | null;
    reasons: string[];
    details: string;
    status: ReportStatus;
    priority: "normal" | "high";
    createdAt: Date;
    lastUpdatedAt: Date | null;
    reportCount: number; // 현재 대상 글/댓글의 신고 누적
    targetSnippet: string; // 대상 내용 일부
}

export function useReports() {
    const [pendingReports, setPendingReports] = useState<ReportItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const reportsRef = collection(db, "reports");

        // status 가 pending 또는 needs_review 인 것만 운영자 리스트에 보여주기
        const q = query(
            reportsRef,
            where("status", "in", ["pending", "needs_review"]),
            orderBy("createdAt", "desc"),
        );

        const unsub = onSnapshot(
            q,
            async (snap) => {
                const items: ReportItem[] = [];

                for (const docSnap of snap.docs) {
                    const data: any = docSnap.data();

                    const createdAt: Date =
                        data.createdAt?.toDate?.() ??
                        (data.createdAt instanceof Date ? data.createdAt : new Date());

                    const lastUpdatedAt: Date | null = data.lastUpdatedAt
                        ? data.lastUpdatedAt.toDate?.() ??
                        (data.lastUpdatedAt instanceof Date ? data.lastUpdatedAt : null)
                        : null;

                    const targetType: "post" | "reply" =
                        data.targetType === "reply" ? "reply" : "post";

                    const targetId: string = String(data.targetId ?? "");

                    // 대상 글/댓글 내용 일부 가져오기
                    let targetSnippet = "";
                    let reportCount = 0;

                    try {
                        const colName = targetType === "post" ? "posts" : "replies";
                        const targetRef = doc(db, colName, targetId);
                        const targetSnap = await getDoc(targetRef);

                        if (targetSnap.exists()) {
                            const tData: any = targetSnap.data();
                            const rawContent =
                                typeof tData.content === "string"
                                    ? tData.content
                                    : typeof tData.title === "string"
                                        ? tData.title
                                        : "";

                            targetSnippet =
                                rawContent.length > 50
                                    ? rawContent.slice(0, 50) + "..."
                                    : rawContent;

                            reportCount =
                                typeof tData.reportCount === "number" ? tData.reportCount : 0;
                        }
                    } catch (err) {
                        console.error("[useReports] 대상 문서 조회 실패:", err);
                    }

                    items.push({
                        id: docSnap.id,
                        targetType,
                        targetId,
                        targetAuthorUid:
                            typeof data.targetAuthorUid === "string"
                                ? data.targetAuthorUid
                                : null,
                        reporterUid:
                            typeof data.reporterUid === "string" ? data.reporterUid : null,
                        reasons: Array.isArray(data.reasons) ? data.reasons : [],
                        details: typeof data.details === "string" ? data.details : "",
                        status:
                            data.status === "needs_review" ||
                                data.status === "confirmed" ||
                                data.status === "rejected"
                                ? data.status
                                : "pending",
                        priority:
                            data.priority === "high" ? "high" : ("normal" as const),
                        createdAt,
                        lastUpdatedAt,
                        reportCount,
                        targetSnippet,
                    });
                }

                setPendingReports(items);
                setLoading(false);
            },
            (error) => {
                console.error("[useReports] onSnapshot 에러:", error);
                setLoading(false);
            },
        );

        return () => unsub();
    }, []);

    const updateStatus = async (reportId: string, status: ReportStatus) => {
        const ref = doc(db, "reports", reportId);
        await updateDoc(ref, {
            status,
            lastUpdatedAt: new Date(),
        });
    };

    return {
        pendingReports,
        loading,
        updateStatus,
    } as const;
}
