import * as Sentry from "@sentry/react";

export function loginLog(step: string, data?: any) {
  console.log("[LOGIN]", step, data ?? "");

  Sentry.addBreadcrumb({
    category: "login",
    message: step,
    data,
    level: "info",
  });
}

export function loginError(error: unknown, step: string) {
  console.error("[LOGIN_ERROR]", step, error);

  Sentry.captureException(error, {
    tags: {
      scope: "login",
      step,
    },
  });
}