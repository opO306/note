// src/components/MainScreen/NotesScreen.tsx
import React from "react";
import {
    collection,
    getDocs,
    orderBy,
    query,
    where,
    limit,
    Timestamp,
} from "firebase/firestore";
import { auth, db } from "@/firebase";
import { EmptyStatePanel } from "@/components/ui/empty-state";
import { NotebookText } from "lucide-react";
import { AppHeader } from "@/components/ui/AppHeader";

type NoteDoc = {
    id: string;
    uid: string;
    title: string;
    body: string;
    updatedAt?: Timestamp;
    createdAt?: Timestamp;
    source?: string;
};

type Props = {
    onBack: () => void;
    onOpenNote: (noteId: string) => void; // ✅ 추가
};

export default function NotesScreen({ onBack, onOpenNote }: Props) {
    const [notes, setNotes] = React.useState<NoteDoc[]>([]);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = React.useState(false);

    const loadNotes = React.useCallback(async () => {
        const uid = auth.currentUser?.uid;
        if (!uid) {
            setNotes([]);
            setError("로그인 후 사용할 수 있어요.");
            setLoading(false);
            setIsRefreshing(false);
            return;
        }

        try {
            const q = query(
                collection(db, "notes"),
                where("uid", "==", uid),
                orderBy("updatedAt", "desc"),
                limit(50)
            );
            const snap = await getDocs(q);
            const list = snap.docs.map((d) => ({
                id: d.id,
                ...(d.data() as any),
            }));
            setNotes(list);
            setError(null);
        } catch (err: any) {
            console.error("[NotesScreen] getDocs error:", err);
            setError(err?.message || "노트를 불러오지 못했어요.");
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    React.useEffect(() => {
        void loadNotes();
    }, [loadNotes]);

    const handleRefresh = React.useCallback(() => {
        setIsRefreshing(true);
        setLoading(false); // 기존 로딩 스피너는 유지하지 않고 상단 상태만 갱신
        void loadNotes();
    }, [loadNotes]);

    return (
        <div className="w-full h-full bg-background text-foreground flex flex-col">
            <AppHeader
                title="내 노트"
                subtitle="질문 정리/학습 내용을 저장해둔 곳"
                onBack={onBack}
            />

            {/* 내용 */}
            <div className="flex-1 overflow-y-auto px-4 py-4 pb-24 safe-bottom">
                {/* 상단 상태/새로고침 */}
                <div className="flex items-center justify-between mb-3 text-xs text-muted-foreground">
                    <span>
                        {loading
                            ? "노트를 불러오는 중이에요..."
                            : error
                                ? "노트를 불러오지 못했어요."
                                : `${notes.length}개의 노트`}
                    </span>
                    {!loading && (
                        <button
                            type="button"
                            onClick={handleRefresh}
                            disabled={isRefreshing}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-border text-[11px] hover:bg-accent/60 disabled:opacity-60"
                        >
                            {isRefreshing ? "새로고침 중..." : "새로고침"}
                        </button>
                    )}
                </div>
                {loading && (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-sm text-muted-foreground">불러오는 중...</div>
                    </div>
                )}

                {!loading && error && (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-sm text-red-500">{error}</div>
                    </div>
                )}

                {!loading && !error && notes.length === 0 && (
                    <div className="h-full flex items-center justify-center">
                        <EmptyStatePanel
                            icon={<NotebookText className="w-16 h-16 text-primary" />}
                            title="저장된 노트가 없어요"
                            description="질문 정리 화면에서 “노트로 저장”을 눌러두면, 여기에서 언제든 다시 볼 수 있어요."
                            glowClassName="bg-primary/25 dark:bg-primary/30"
                            circleClassName="bg-primary/10 dark:bg-primary/20 border-4 border-primary/40"
                        />
                    </div>
                )}

                {!loading && !error && notes.length > 0 && (
                    <div className="space-y-3 pb-4">
                        {notes.map((n) => (
                            <NoteCard key={n.id} note={n} onClick={() => onOpenNote(n.id)} />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

function NoteCard({ note, onClick }: { note: NoteDoc; onClick: () => void }) {
    const snippet = (note.body || "").replace(/\s+/g, " ").slice(0, 120);
    const time = note.updatedAt?.toDate?.();

    return (
        <button
            type="button"
            onClick={onClick}
            className="w-full text-left rounded-2xl border border-border bg-card/90 px-4 py-3"
        >
            <div className="text-sm font-semibold truncate">{note.title || "(제목 없음)"}</div>
            <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {snippet || "내용이 비어있어요."}
            </div>
            <div className="text-[11px] text-muted-foreground mt-2">
                {time ? `수정: ${time.toLocaleString()}` : ""}
            </div>
        </button>
    );
}
