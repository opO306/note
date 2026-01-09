import * as admin from "firebase-admin";
admin.initializeApp();

/* ---------- v1 (Auth Trigger) ---------- */
import * as functionsV1 from "firebase-functions/v1";

export const createUserDoc = functionsV1
  .region("asia-northeast3")
  .auth.user()
  .onCreate(async (user) => {
    const ref = admin.firestore().doc(`users/${user.uid}`);
    if ((await ref.get()).exists) return;            // idempotent

    await ref.set({
      nickname: "",
      email: user.email ?? "",
      profileImage: "",
      role: "user",
      trustScore: 0,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      onboardingComplete: false,
    });
  });

/* ---------- v2 Functions (Explicit Imports) ---------- */
// aiAutoReply.ts
export { aiAutoReply } from "./aiAutoReply";

// aiModeration.ts
export { aiModerationReview } from "./aiModeration";

// weeklyQuiz.ts
export { generateWeeklyQuiz } from "./weeklyQuiz";

// triggers.ts
export { onPostCreated, onPostUpdated, onReportCreated, onReportStatusChanged, onFollowCreated, onFollowDeleted, onNotificationCreated, onLanternCreated } from "./triggers";

// callable.ts
export { finalizeOnboarding, deleteAccount, verifyLogin, toggleLantern, toggleReplyLantern, awardLumens, purchaseTitle, selectGuide, callSagesBell, verifyThemePurchase, mergeUserData } from "./callable";

// dailyRecommendations.ts
export { sendMorningRecommendations } from "./dailyRecommendations";

// ai.ts
export { generatePoem } from "./ai";

// weeklyStats.ts
export { calcWeeklyStats } from "./weeklyStats";

// lanternTriggers.ts
export { lanternCreatedV2, lanternDeletedV2, replyLanternCreatedV2, replyLanternDeletedV2 } from "./lanternTriggers";
