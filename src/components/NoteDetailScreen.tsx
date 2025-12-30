// src/components/NoteDetailScreen.tsx
import React from "react";
import { doc, onSnapshot, deleteDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "@/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ArrowLeft, MoreHorizontal, Edit, Trash2, FileText } from "lucide-react";

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

    // 본문을 섹션별로 파싱하는 함수
    const parseBodySections = React.useMemo(() => {
        if (!note?.body) return [];
        
        const lines = note.body.split('\n');
        const sections: Array<{ title: string; content: string }> = [];
        let currentSection: { title: string; content: string } | null = null;

        for (const line of lines) {
            const trimmedLine = line.trim();
            
            // "- " 또는 "### "로 시작하는 줄은 새 섹션
            if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('### ')) {
                // 이전 섹션 저장
                if (currentSection) {
                    sections.push({
                        ...currentSection,
                        content: currentSection.content.trim()
                    });
                }
                // 새 섹션 시작
                const title = trimmedLine.replace(/^(?:- |### )/, '').trim();
                currentSection = {
                    title,
                    content: ''
                };
            } else if (currentSection) {
                // 현재 섹션에 내용 추가
                if (currentSection.content) {
                    currentSection.content += '\n' + line;
                } else {
                    currentSection.content = line;
                }
            }
        }

        // 마지막 섹션 저장
        if (currentSection) {
            sections.push({
                ...currentSection,
                content: currentSection.content.trim()
            });
        }

        return sections;
    }, [note?.body]);

    return (
        <div className="h-full flex flex-col">
            {/* 헤더 */}
            <div className="bg-card/95 border-b border-border px-4 pb-4 flex-shrink-0 safe-top" style={{ paddingTop: 'calc(var(--safe-area-inset-top) + 1rem)' }}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <Button variant="ghost" size="icon" onClick={onBack}>
                            <ArrowLeft className="w-5 h-5" />
                        </Button>
                        <h2 className="font-medium">노트 상세</h2>
                    </div>
                    {!isEditing && (
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button variant="ghost" size="icon" className="touch-target">
                                    <MoreHorizontal className="w-4 h-4" />
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-48 p-2" align="end">
                                <div className="space-y-1">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full justify-start"
                                        onClick={() => {
                                            if (!note) return;
                                            setIsEditing(true);
                                            setEditTitle(note.title ?? "");
                                            setEditBody(note.body ?? "");
                                        }}
                                    >
                                        <Edit className="w-4 h-4 mr-2" />
                                        수정하기
                                    </Button>
                                    {sourcePostId && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="w-full justify-start"
                                            onClick={() => onOpenSourcePost?.(sourcePostId)}
                                        >
                                            <FileText className="w-4 h-4 mr-2" />
                                            원문 보기
                                        </Button>
                                    )}
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full justify-start"
                                        onClick={() => {
                                            if (!note) return;
                                            onGoWrite({ title: note.title || "", body: note.body || "" });
                                        }}
                                    >
                                        <FileText className="w-4 h-4 mr-2" />
                                        글쓰기 이어서
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="w-full justify-start text-red-500"
                                        onClick={handleDelete}
                                    >
                                        <Trash2 className="w-4 h-4 mr-2" />
                                        삭제하기
                                    </Button>
                                </div>
                            </PopoverContent>
                        </Popover>
                    )}
                    {isEditing && (
                        <div className="flex items-center space-x-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setIsEditing(false);
                                    setEditTitle(note?.title ?? "");
                                    setEditBody(note?.body ?? "");
                                }}
                            >
                                취소
                            </Button>
                            <Button
                                variant="default"
                                size="sm"
                                onClick={handleSave}
                            >
                                저장
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* 노트 내용 */}
            <div className="flex-1 scroll-container">
                <div className="px-4 py-3 pb-4 space-y-4">
                    {loading && (
                        <Card className="border-border/60 shadow-sm bg-card/80 backdrop-blur-sm">
                            <CardContent className="p-6">
                                <div className="text-sm text-muted-foreground">불러오는 중...</div>
                            </CardContent>
                        </Card>
                    )}
                    {!loading && error && (
                        <Card className="border-border/60 shadow-sm bg-card/80 backdrop-blur-sm">
                            <CardContent className="p-6">
                                <div className="text-sm text-red-500">{error}</div>
                            </CardContent>
                        </Card>
                    )}

                    {!loading && !error && note && (
                        <>
                            {/* 제목 카드 */}
                            <Card className="border-border/60 shadow-sm bg-card/80 backdrop-blur-sm">
                                <CardContent className="p-6">
                                    {!isEditing ? (
                                        <h1 className="text-xl font-medium">{note.title || "(제목 없음)"}</h1>
                                    ) : (
                                        <input
                                            value={editTitle}
                                            onChange={(e) => setEditTitle(e.target.value)}
                                            className="w-full px-3 py-3 rounded-2xl bg-card border border-border outline-none focus:ring-2 focus:ring-primary/30"
                                            placeholder="제목"
                                        />
                                    )}
                                </CardContent>
                            </Card>

                            {/* 본문 카드 (모든 섹션 포함) */}
                            <Card className="border-border/60 shadow-sm bg-card/80 backdrop-blur-sm">
                                <CardContent className="p-6">
                                    {!isEditing ? (
                                        (() => {
                                            // 파싱된 섹션이 있고, 실제로 섹션이 있는 경우
                                            if (parseBodySections.length > 0) {
                                                return (
                                                    <div className="space-y-6">
                                                        {parseBodySections.map((section, index) => (
                                                            <div key={index} className="space-y-3">
                                                                <h3 className="text-base font-semibold text-foreground">
                                                                    {section.title}
                                                                </h3>
                                                                <div className="text-base text-foreground/90 leading-7 break-words whitespace-pre-wrap">
                                                                    {section.content || "-"}
                                                                </div>
                                                                {index < parseBodySections.length - 1 && (
                                                                    <div className="border-t border-border/60 pt-6 -mb-3"></div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            }
                                            // 파싱된 섹션이 없으면 기존 형식으로 표시
                                            return (
                                                <div className="text-base text-foreground/90 leading-7 break-words whitespace-pre-wrap">
                                                    {note.body || ""}
                                                </div>
                                            );
                                        })()
                                    ) : (
                                        <textarea
                                            value={editBody}
                                            onChange={(e) => setEditBody(e.target.value)}
                                            rows={12}
                                            className="w-full px-3 py-3 rounded-2xl bg-card border border-border outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                                            placeholder="내용"
                                        />
                                    )}
                                </CardContent>
                            </Card>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
