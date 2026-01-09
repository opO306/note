export type UiLoginError = {
  title: string;
  code?: string;
  message: string;
  raw?: string; // JSON string
};

function safeStringify(obj: unknown): string {
  try {
    const seen = new WeakSet();
    return JSON.stringify(
      obj,
      (k, v) => {
        // 토큰류는 노출 방지
        if (typeof k === "string" && /token|idToken|accessToken/i.test(k)) return "***";
        if (typeof v === "string" && v.length > 2000) return v.slice(0, 2000) + "...";
        if (typeof v === "object" && v !== null) {
          if (seen.has(v as object)) return "[Circular]";
          seen.add(v as object);
        }
        return v;
      },
      2
    );
  } catch {
    return String(obj);
  }
}

export function normalizeLoginError(err: unknown): UiLoginError {
  // 기본값
  const base: UiLoginError = {
    title: "Google 로그인 실패",
    message: "알 수 없는 오류",
  };

  if (!err) return base;

  // Error 인스턴스
  if (err instanceof Error) {
    // ts-expect-error - 라이브러리별 확장 필드
    const code = (err as any).code ?? (err as any).error ?? (err as any).status;
    return {
      title: base.title,
      code: code ? String(code) : undefined,
      message: err.message || base.message,
      raw: safeStringify(err),
    };
  }

  // 플러그인에서 object/string 형태로 떨어지는 케이스
  if (typeof err === "object") {
    const e = err as any;
    const code = e.code ?? e.error ?? e.status;
    const message =
      e.message ??
      e.errorMessage ??
      e.localizedMessage ??
      (typeof e === "string" ? e : undefined) ??
      base.message;

    return {
      title: base.title,
      code: code ? String(code) : undefined,
      message: String(message),
      raw: safeStringify(err),
    };
  }

  // string / number
  return {
    title: base.title,
    code: typeof err === "number" ? String(err) : undefined,
    message: String(err),
    raw: safeStringify(err),
  };
}
