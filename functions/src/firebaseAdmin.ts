// functions/src/firebaseAdmin.ts
import * as admin from "firebase-admin";

// 이미 초기화된 앱이 없으면 초기화
if (!admin.apps.length) {
  admin.initializeApp();
}

// 공통으로 쓸 Firestore 인스턴스
const db = admin.firestore();

export { admin, db };
