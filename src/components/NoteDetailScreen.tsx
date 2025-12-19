// src/components/NoteDetailScreen.tsx
import React from "react";
import { doc, onSnapshot, deleteDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/firebase";

type Props = {
    noteId: string;
    onBack: () => void;
    onGoWrite: (draft: { title: string; body: string }) => void; // ✅ 추가
    onOpenSourcePost?: (postId: string) => void; // ✅ 추가: 원문 보기
};

type NoteDoc = {
    uid: string;
    title: string;
    body: string;
    source?: string; // ✅ 추가 (예: "post:abc123")
    updatedAt?: any;
    createdAt?: any;
};

export default function NoteDetailScreen({ noteId, onBack, onGoWrite, onOpenSourcePost }: Props) {
    const [note, setNote] = React.useState<NoteDoc | null>(null);
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [isEditing, setIsEditing] = React.useState(false);
    const [editTitle, setEditTitle] = React.useState("");
    const [editBody, setEditBody] = React.useState("");

    React.useEffect(() => {
        const ref = doc(db, "notes", noteId);
        const unsub = onSnapshot(
            ref,
            (snap) => {
                if (!snap.exists()) {
                    setError("노트를 찾을 수 없어요.");
                    setLoading(false);
                    return;
                }
                const data = snap.data() as any;
                setNote(data);

                // ✅ 편집 상태 값 동기화
                setEditTitle(data.title ?? "");
                setEditBody(data.body ?? "");

                setLoading(false);
                setError(null);

            },
            () => {
                setError("노트를 불러오지 못했어요.");
                setLoading(false);
            }
        );
        return () => unsub();
    }, [noteId]);

    const handleDelete = async () => {
        const uid = auth.currentUser?.uid;
        if (!uid) return;

        if (!note || note.uid !== uid) {
            setError("삭제 권한이 없어요.");
            return;
        }

        await deleteDoc(doc(db, "notes", noteId));
        onBack();
    };

    const sourcePostId = React.useMemo(() => {
        const source = note?.source;
        if (typeof source !== "string") return null;
        if (!source.startsWith("post:")) return null;
        const postId = source.slice("post:".length).trim();
        return postId.length > 0 ? postId : null;
    }, [note?.source]);

    const handleSave = async () => {
        const uid = auth.currentUser?.uid;
        if (!uid) return;

        if (!note || note.uid !== uid) {
            setError("수정 권한이 없어요.");
            return;
        }

        try {
            await updateDoc(doc(db, "notes", noteId), {
                title: editTitle.trim(),
                body: editBody,
                updatedAt: serverTimestamp(),
            });
            setIsEditing(false);
        } catch {
            setError("저장에 실패했어요.");
        }
    };

    return (
        <div className="w-full h-full bg-background text-foreground flex flex-col">
            {/* 상단바 */}
            <div className="flex items-center gap-2 px-4 py-3 border-b border-border">
                <button
                    type="button"
                    onClick={onBack}
                    className="px-3 py-2 rounded-xl text-sm bg-accent/50 hover:bg-accent"
                >
                    뒤로
                </button>

                <div className="flex-1">
                    <div className="text-base font-semibold leading-tight">노트</div>
                    <div className="text-xs text-muted-foreground">저장된 내용</div>
                </div>

                {!isEditing ? (
                    <>
                        <button
                            type="button"
                            onClick={() => {
                                if (!note) return;
                                setIsEditing(true);
                                setEditTitle(note.title ?? "");
                                setEditBody(note.body ?? "");
                            }}
                            className="px-3 py-2 rounded-xl text-sm bg-accent/50 hover:bg-accent"
                        >
                            수정
                        </button>

                        <button
                            type="button"
                            onClick={handleDelete}
                            className="px-3 py-2 rounded-xl text-sm bg-destructive text-destructive-foreground hover:opacity-90"
                        >
                            삭제
                        </button>

                        {sourcePostId && (
                            <button
                                type="button"
                                onClick={() => onOpenSourcePost?.(sourcePostId)}
                                className="px-3 py-2 rounded-xl text-sm bg-accent/50 hover:bg-accent"
                            >
                                원문 보기
                            </button>
                        )}

                        <button
                            type="button"
                            onClick={() => {
                                if (!note) return;
                                onGoWrite({ title: note.title || "", body: note.body || "" });
                            }}
                            className="px-3 py-2 rounded-xl text-sm bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            글쓰기 이어서
                        </button>

                    </>
                ) : (
                    <>
                        <button
                            type="button"
                            onClick={() => {
                                setIsEditing(false);
                                setEditTitle(note?.title ?? "");
                                setEditBody(note?.body ?? "");
                            }}
                            className="px-3 py-2 rounded-xl text-sm bg-accent/50 hover:bg-accent"
                        >
                            취소
                        </button>

                        <button
                            type="button"
                            onClick={handleSave}
                            className="px-3 py-2 rounded-xl text-sm bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            저장
                        </button>
                    </>
                )}
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
                {loading && <div className="text-sm text-muted-foreground">불러오는 중...</div>}
                {!loading && error && <div className="text-sm text-red-500">{error}</div>}

                {!loading && !error && note && (
                    <div className="space-y-3">
                        {!isEditing ? (
                            <>
                                <div className="text-lg font-bold">{note.title || "(제목 없음)"}</div>
                                <pre className="whitespace-pre-wrap text-sm leading-6 bg-card/60 border border-border rounded-2xl p-4">
                                    {note.body || ""}
                                </pre>
                            </>
                        ) : (
                            <>
                                <input
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    className="w-full px-3 py-3 rounded-2xl bg-card border border-border outline-none focus:ring-2 focus:ring-primary/30"
                                    placeholder="제목"
                                />
                                <textarea
                                    value={editBody}
                                    onChange={(e) => setEditBody(e.target.value)}
                                    rows={12}
                                    className="w-full px-3 py-3 rounded-2xl bg-card border border-border outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                                    placeholder="내용"
                                />
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
