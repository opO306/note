const admin = require("firebase-admin");
const { initializeTestEnvironment, RulesTestEnvironment } = require("@firebase/rules-unit-testing");

let testEnv;

async function setupTestEnvironment() {
  if (!testEnv) {
    testEnv = await initializeTestEnvironment({
      projectId: "test", // Cypress 테스트에서 사용할 Firebase 프로젝트 ID
      firestore: {
        rules: require("../firestore.rules"), // Firestore 보안 규칙 파일 경로
        host: "localhost",
        port: 8080, // Firestore 에뮬레이터 기본 포트
      },
      auth: {
        host: "localhost",
        port: 9099, // Auth 에뮬레이터 기본 포트
      },
    });
  }
}

module.exports = {
  async clearFirestore() {
    await setupTestEnvironment();
    await testEnv.clearFirestore();
    console.log("Firestore cleared.");
  },

  async getDoc(path) {
    await setupTestEnvironment();
    const firestore = testEnv.authenticatedContext("testUid").firestore();
    const docSnap = await firestore.doc(path).get();
    return docSnap.exists ? docSnap.data() : null;
  },

  async setDoc(path, data) {
    await setupTestEnvironment();
    const firestore = testEnv.authenticatedContext("testUid").firestore();
    await firestore.doc(path).set(data, { merge: true });
    console.log(`Document ${path} set.`);
  },

  async createAuthUser(uid, email) {
    await setupTestEnvironment();
    await testEnv.auth.importUsers([{
        uid: uid,
        email: email,
        passwordHash: Buffer.from('password', 'utf8').toString('base64'),
        passwordSalt: Buffer.from('salt', 'utf8').toString('base64'),
    }]);
    console.log(`Auth user ${email} (${uid}) created.`);
  },
};
