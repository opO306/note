// functions/src/firebaseAdmin.ts
import * as admin from "firebase-admin";

// 이미 초기화되었는지 확인 후 초기화 (중복 방지)
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// 💡 [꿀팁] TypeScript에서 옵셔널 필드가 undefined로 넘어와도 
// Firestore가 에러를 뱉지 않고 해당 필드를 무시하도록 설정합니다.
db.settings({ ignoreUndefinedProperties: true });

const auth = admin.auth();

export { admin, db, auth };