// v2 Functions API (스케줄 + Firestore 트리거 + HTTPS callable)
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { onCall, HttpsError } from "firebase-functions/v2/https";
import * as logger from "firebase-functions/logger";
export { onReportCreated, onReportStatusChanged } from "./reportTriggers";

// Firebase Admin (서버에서 Firestore 접근) - 공통 초기화 모듈 사용
import { admin, db } from "./firebaseAdmin";

/**
 * 게시물이 생성될 때마다 실행되는 Firestore 트리거
 * - 나중에 여기서 "업적 달성 여부"를 서버에서 검사하게 만들 예정
 */
export const onPostCreated = onDocumentCreated(
    "posts/{postId}",
    async (event) => {
        const snapshot = event.data;
        if (!snapshot) {
            logger.warn("[achievements] onPostCreated: snapshot이 없습니다", {
                params: event.params,
            });
            return;
        }

        const post = snapshot.data() as any;
        const authorId: string | undefined = post.authorId;

        logger.info("[achievements] 게시물 생성 감지", {
            postId: event.params.postId,
            authorId,
        });

        // TODO:
        // 1) 여기에서 업적 조건을 검사하고
        // 2) 조건을 만족하면 users/{uid}/achievements/{achievementId} 문서를
        //    서버에서 직접 생성하는 로직을 추가할 예정입니다.
        //    (지금은 아직 "로그만 찍고 끝"이라 DB에 변화는 없습니다.)
    },
);

// 루멘 지급 요청에 사용하는 데이터 타입
interface AwardLumensRequest {
    reason: string;
    amount: number;
    achievementId?: string;
}

// 클라이언트에 돌려줄 응답 타입
interface AwardLumensResponse {
    success: boolean;
}

/**
 * HTTPS callable 함수: 루멘 지급
 * - 클라이언트는 httpsCallable('awardLumens') 로 호출
 * - 서버에서 Firestore 트랜잭션으로 루멘 증가 + 거래 기록까지 처리
 */
export const awardLumens = onCall(
    {
        region: "asia-northeast3",
    },
    async (request): Promise<AwardLumensResponse> => {
        const { auth, data } = request;

        // 1) 로그인 안 한 사용자는 바로 거절
        if (!auth) {
            throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
        }

        const { reason, amount, achievementId } = data as AwardLumensRequest;

        // 2) amount 검증 (0 이하, 너무 큰 값, 숫자 아님 → 거절)
        if (typeof amount !== "number" || !Number.isFinite(amount) || amount <= 0) {
            throw new HttpsError(
                "invalid-argument",
                "amount는 0보다 큰 숫자여야 합니다.",
            );
        }

        // 너무 큰 값은 서버에서도 막아두자 (예: 100만 루멘 이상 같은 말도 안 되는 값)
        if (amount > 1000000) {
            throw new HttpsError(
                "invalid-argument",
                "amount가 너무 큽니다.",
            );
        }

        if (typeof reason !== "string" || reason.trim().length === 0) {
            throw new HttpsError(
                "invalid-argument",
                "reason은 빈 문자열일 수 없습니다.",
            );
        }

        logger.info("[lumens] 루멘 지급 요청 수신", {
            uid: auth.uid,
            reason,
            amount,
            achievementId,
        });

        try {
            await db.runTransaction(async (transaction) => {
                const userRef = db.collection("users").doc(auth.uid);
                const userSnap = await transaction.get(userRef);

                if (!userSnap.exists) {
                    throw new HttpsError(
                        "failed-precondition",
                        "User document does not exist.",
                    );
                }

                const userData = userSnap.data() as any;

                // 3) 기존 거래 내역 확인 (업적 보상 중복 지급 방지)
                const existingTransactions =
                    Array.isArray(userData.lumenTransactions)
                        ? userData.lumenTransactions
                        : [];

                if (achievementId) {
                    const alreadyRewarded = existingTransactions.some(
                        (t: any) =>
                            t &&
                            t.achievementId === achievementId &&
                            typeof t.amount === "number" &&
                            t.amount > 0,
                    );

                    if (alreadyRewarded) {
                        throw new HttpsError(
                            "already-exists",
                            "이미 이 업적에 대한 보상을 받았습니다.",
                        );
                    }
                }

                // 4) 새 거래 객체 만들기 (useLumens.ts에서 쓰는 형태와 최대한 비슷하게)
                const transactionId =
                    Date.now().toString() +
                    Math.random().toString(36).substring(2, 9);

                const now = Date.now();

                const lumenTxn = {
                    id: transactionId,
                    amount,
                    reason,
                    timestamp: now,
                    achievementId: achievementId ?? null,
                };

                // 5) 유저 문서 업데이트
                transaction.set(
                    userRef,
                    {
                        // 잔액 / 총 획득 루멘은 increment로 증가
                        lumenBalance: admin.firestore.FieldValue.increment(amount),
                        lumenTotalEarned: admin.firestore.FieldValue.increment(amount),
                        // 거래 내역 배열에 추가
                        lumenTransactions: admin.firestore.FieldValue.arrayUnion(
                            lumenTxn,
                        ),
                    },
                    { merge: true },
                );
            });

            logger.info("[lumens] awardLumens 성공", {
                uid: auth.uid,
                reason,
                amount,
                achievementId,
            });

            return { success: true };
        } catch (error: any) {
            if (error instanceof HttpsError) {
                // 우리가 위에서 던진 HttpsError는 그대로 클라이언트로 전달
                throw error;
            }

            logger.error("[lumens] awardLumens 실패", {
                uid: auth.uid,
                reason,
                amount,
                achievementId,
                error: (error as Error).message,
            });

            throw new HttpsError(
                "internal",
                "루멘 지급 처리 중 오류가 발생했습니다.",
            );
        }
    },
);

// 칭호 구매 요청에 사용하는 데이터 타입
interface PurchaseTitleRequest {
    titleId: string;
}

// 칭호 구매 응답 타입
interface PurchaseTitleResponse {
    success: boolean;
}

/**
 * HTTPS callable 함수: 칭호 구매
 * - 클라이언트는 httpsCallable('purchaseTitle') 로 호출
 * - 실제 가격 검증, 잔액 차감, 구매 기록은 전부 서버에서 처리
 */
export const purchaseTitle = onCall(
    {
        region: "asia-northeast3",
    },
    async (request): Promise<PurchaseTitleResponse> => {
        const { auth, data } = request;

        // 1) 로그인 여부 확인
        if (!auth) {
            throw new HttpsError("unauthenticated", "로그인이 필요합니다.");
        }

        const { titleId } = data as PurchaseTitleRequest;

        // 2) titleId 기본 검증
        if (typeof titleId !== "string" || titleId.length === 0) {
            throw new HttpsError(
                "invalid-argument",
                "titleId가 필요합니다.",
            );
        }

        logger.info("[titles] 칭호 구매 요청 수신", {
            uid: auth.uid,
            titleId,
        });

        try {
            // 3) 트랜잭션으로 한 번에 처리
            await db.runTransaction(async (transaction) => {
                const userRef = db.collection("users").doc(auth.uid);
                const titleRef = db.collection("titles").doc(titleId);

                // 3-1) 유저 / 칭호 문서 읽기
                const [userSnap, titleSnap] = await Promise.all([
                    transaction.get(userRef),
                    transaction.get(titleRef),
                ]);

                if (!titleSnap.exists) {
                    throw new HttpsError("not-found", "Title not found");
                }

                if (!userSnap.exists) {
                    throw new HttpsError(
                        "failed-precondition",
                        "User document does not exist.",
                    );
                }

                const userData = userSnap.data() as any;
                const titleData = titleSnap.data() as any;

                // 3-2) 가격 결정
                const rawPrice = titleData?.price;
                const titlePrice =
                    typeof rawPrice === "number" && rawPrice > 0 ? rawPrice : 0;

                // 3-3) 현재 루멘 읽기
                const rawLumens = userData?.lumens ?? userData?.lumenBalance ?? 0;
                const currentLumens =
                    typeof rawLumens === "number" && rawLumens > 0 ? rawLumens : 0;

                // 3-4) 루멘 충분성 확인
                if (currentLumens < titlePrice) {
                    throw new HttpsError(
                        "failed-precondition",
                        `Insufficient lumens. Required: ${titlePrice}, Available: ${currentLumens}`,
                    );
                }

                // 3-5) 이미 구매한 칭호인지 확인
                const purchasedTitleRef = userRef
                    .collection("purchasedTitles")
                    .doc(titleId);
                const purchasedSnap = await transaction.get(purchasedTitleRef);

                if (purchasedSnap.exists) {
                    logger.info(
                        "[titles] 이미 구매한 칭호, 추가 차감 없이 통과",
                        { uid: auth.uid, titleId },
                    );
                    return;
                }

                const newLumens = currentLumens - titlePrice;

                // 3-6) 유저 루멘 업데이트 (서버 기준으로 잔액/총 사용량 관리)
                const userUpdates: Record<string, unknown> = {
                    lumens: newLumens,
                    lumenBalance: newLumens,
                    // 🔹 총 사용 루멘도 서버에서 함께 관리 (useLumens.ts의 totalSpent와 일치)
                    lumenTotalSpent: admin.firestore.FieldValue.increment(titlePrice),
                };
                transaction.update(userRef, userUpdates);

                // 3-7) 칭호 소유권 기록
                transaction.set(purchasedTitleRef, {
                    titleId,
                    purchasedAt: admin.firestore.FieldValue.serverTimestamp(),
                    price: titlePrice,
                    equipped: false,
                });

                // 3-8) 🔥 루멘 거래 기록 (users/{uid}.lumenTransactions 배열에 추가)
                const now = Date.now();

                const lumenTxn = {
                    id: `title_${now}_${titleId}`,
                    amount: -titlePrice,
                    reason: `칭호 구매: ${titleId}`,  // 프론트에서 그대로 보여줄 설명
                    timestamp: now,
                    achievementId: null,
                    titleId,
                };

                transaction.set(
                    userRef,
                    {
                        lumenTransactions: admin.firestore.FieldValue.arrayUnion(lumenTxn),
                    },
                    { merge: true },
                );

            });

            logger.info("[titles] purchaseTitle 성공", {
                uid: auth.uid,
                titleId,
            });

            return { success: true };
        } catch (error: any) {
            // 이미 HttpsError 라면 그대로 던짐
            if (error instanceof HttpsError) {
                throw error;
            }

            logger.error("[titles] purchaseTitle 실패", {
                uid: auth.uid,
                titleId,
                error: (error as Error).message,
            });

            throw new HttpsError(
                "internal",
                "칭호 구매 처리 중 오류가 발생했습니다.",
            );
        }
    },
);
export { calcWeeklyStats } from "./weeklyStats";