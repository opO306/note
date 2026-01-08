import { AuthError } from "./authErrors";

export function withTimeout<T>(
  promise: Promise<T>,
  ms = 8000
): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new AuthError("TIMEOUT", "Auth request timed out"));
    }, ms);

    promise
      .then((v) => {
        clearTimeout(timer);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(timer);
        reject(e);
      });
  });
}