export type AuthFailReason =
  | "APPCHECK_BLOCKED"
  | "NETWORK_ERROR"
  | "AUTH_DISABLED"
  | "TIMEOUT"
  | "UNKNOWN"
  | "APPCHECK_RESTRICTED";

export class AuthError extends Error {
  reason: AuthFailReason;
  constructor(reason: AuthFailReason, message?: string) {
    super(message);
    this.reason = reason;
    Object.setPrototypeOf(this, AuthError.prototype);
  }
}