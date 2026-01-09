import React from "react";
import { readLoginDebugEvents, clearLoginDebugEvents } from "@/auth/loginDebug";

function fmtTime(t: number) {
  const d = new Date(t);
  return d.toLocaleString();
}

export function LoginDebugPanel() {
  const [events, setEvents] = React.useState(readLoginDebugEvents());

  const refresh = () => setEvents(readLoginDebugEvents());
  const clear = () => {
    clearLoginDebugEvents();
    setEvents([]);
  };

  const last = events[events.length - 1];

  // 흔한 원인 힌트("확정"이 아니라 "로그 기반 분류")
  const hint = (() => {
    const lastErr = [...events].reverse().find((e) => e.step === "error");
    const code = lastErr?.data?.code as string | undefined;

    if (code === "auth/account-exists-with-different-credential") {
      return "Firebase: 기존 제공자로 먼저 로그인 후 계정 연결(link) 흐름이 필요합니다.";
      // 공식 문서에서 별도 처리 흐름을 안내 :contentReference[oaicite:3]{index=3}
    }
    // Codetrix 플러그인에서 code 10은 설정(sha1/client id) 미스로 자주 보고됨 :contentReference[oaicite:4]{index=4}
    if (typeof code === "string" && code === "10") {
      return "GoogleAuth: code 10은 보통 SHA-1/클라이언트ID 설정 미스(Developer Error)로 보고됩니다. Android OAuth Client와 SHA-1을 점검하세요.";
    }
    // 크래시 추정(마지막이 google.signIn.start에서 멈췄으면)
    if (last?.step === "google.signIn.start") {
      return "직전 실행이 GoogleAuth.signIn 시작 단계에서 종료되었습니다. 플러그인 초기화/버전(rc.4 등) 또는 네이티브 설정 반영(sync)을 우선 점검하세요.";
    }
    return null;
  })();

  return (
    <div style={{ padding: 16 }}>
      <h3>로그인 디버그</h3>

      {hint && (
        <div style={{ padding: 12, border: "1px solid #ccc", marginBottom: 12 }}>
          <div style={{ fontWeight: 700 }}>힌트</div>
          <div>{hint}</div>
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <button onClick={refresh}>새로고침</button>
        <button onClick={clear}>로그 지우기</button>
      </div>

      <div style={{ fontSize: 12, whiteSpace: "pre-wrap" }}>
        {events.length === 0 ? (
          "로그 없음"
        ) : (
          events
            .map((e) => {
              const data = e.data ? JSON.stringify(e.data) : "";
              return `[${fmtTime(e.t)}] ${e.step} ${data}`;
            })
            .join("\n")
        )}
      </div>
    </div>
  );
}
