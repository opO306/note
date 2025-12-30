/**
 * 조회 로그 배치 처리 유틸리티
 * 비용 절감을 위해 조회 로그를 모아서 배치로 저장합니다.
 */

import { collection, writeBatch, serverTimestamp, doc } from "firebase/firestore";
import { db } from "../../firebase";
import { auth } from "../../firebase";

interface ViewLogEntry {
    postId: string;
    category: string | null;
    subCategory: string | null;
}

// 전역 버퍼
const viewLogBuffer: ViewLogEntry[] = [];
const BATCH_SIZE = 10; // 10개 모이면 저장
const FLUSH_INTERVAL = 30000; // 30초마다 자동 저장
let flushTimer: NodeJS.Timeout | null = null;
let isFlushing = false;

/**
 * 조회 로그를 버퍼에 추가합니다.
 * 버퍼가 가득 차거나 일정 시간이 지나면 자동으로 저장됩니다.
 */
export function addViewLog(entry: ViewLogEntry) {
    const uid = auth.currentUser?.uid;
    if (!uid) return;

    viewLogBuffer.push(entry);

    // 버퍼가 가득 찼으면 즉시 저장
    if (viewLogBuffer.length >= BATCH_SIZE) {
        flushViewLogs();
    } else {
        // 타이머가 없으면 시작
        if (!flushTimer) {
            flushTimer = setInterval(() => {
                flushViewLogs();
            }, FLUSH_INTERVAL);
        }
    }
}

/**
 * 버퍼에 있는 조회 로그를 Firestore에 배치로 저장합니다.
 */
async function flushViewLogs() {
    if (isFlushing || viewLogBuffer.length === 0) return;

    const uid = auth.currentUser?.uid;
    if (!uid) {
        viewLogBuffer.length = 0; // 버퍼 비우기
        return;
    }

    isFlushing = true;

    try {
        // 현재 버퍼의 모든 항목을 가져옴
        const logsToSave = viewLogBuffer.splice(0, BATCH_SIZE);
        
        if (logsToSave.length === 0) {
            isFlushing = false;
            return;
        }

        const batch = writeBatch(db);

        logsToSave.forEach((log) => {
            const logRef = doc(collection(db, "user_activity", uid, "viewLogs"));
            batch.set(logRef, {
                postId: log.postId,
                category: log.category,
                subCategory: log.subCategory,
                createdAt: serverTimestamp(),
            });
        });

        await batch.commit();
    } catch (error) {
        console.warn("[viewLogBatcher] 배치 저장 실패", error);
        // 실패한 로그는 버퍼에 다시 추가하지 않음 (중복 방지)
    } finally {
        isFlushing = false;
    }
}

/**
 * 앱 종료 시 남은 로그를 저장합니다.
 * 페이지 언로드 이벤트에서 호출해야 합니다.
 */
export function flushViewLogsOnUnload() {
    if (viewLogBuffer.length > 0) {
        // 동기적으로 저장 (navigator.sendBeacon 사용 고려)
        flushViewLogs();
    }
}

// 페이지 언로드 시 자동 저장
if (typeof window !== "undefined") {
    window.addEventListener("beforeunload", flushViewLogsOnUnload);
    window.addEventListener("pagehide", flushViewLogsOnUnload);
}

