export type LoginStep =
  | "init.start"
  | "init.done"
  | "google.signIn.start"
  | "google.signIn.done"
  | "firebase.credential.created"
  | "firebase.signIn.start"
  | "firebase.signIn.done"
  | "error";

export type LoginDebugEvent = {
  t: number; // epoch ms
  step: LoginStep;
  data?: Record<string, unknown>;
};

const KEY = "login_debug_events_v1";
const MAX = 80;

function safeParse<T>(s: string | null, fallback: T): T {
  try {
    return s ? (JSON.parse(s) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function readLoginDebugEvents(): LoginDebugEvent[] {
  return safeParse<LoginDebugEvent[]>(localStorage.getItem(KEY), []);
}

export function clearLoginDebugEvents() {
  localStorage.removeItem(KEY);
}

export function pushLoginDebug(step: LoginStep, data?: Record<string, unknown>) {
  const events = readLoginDebugEvents();
  const next: LoginDebugEvent = { t: Date.now(), step, data };
  const trimmed = [...events, next].slice(-MAX);
  localStorage.setItem(KEY, JSON.stringify(trimmed));
}