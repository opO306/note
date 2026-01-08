import { defineConfig } from "cypress";

export default defineConfig({
  e2e: {
    setupNodeEvents(on, config) {
      const admin = require("firebase-admin");
      const { initializeApp, cert } = require("firebase-admin/app");
      const { getFirestore } = require("firebase-admin/firestore");

      // Firebase Admin SDK 초기화 (에뮬레이터 전용)
      // Firebase Admin SDK가 이미 초기화되어 있지 않은 경우에만 초기화
      try {
        if (!admin.apps.length) {
          admin.initializeApp({
            projectId: "test", // Cypress 테스트에서 사용할 Firebase 프로젝트 ID
          });
          // 에뮬레이터에 연결하도록 환경 변수 설정 (cypress run 명령 전에 설정되어야 함)
          // process.env.FIRESTORE_EMULATOR_HOST = "localhost:8080";
          // process.env.FIREBASE_AUTH_EMULATOR_HOST = "localhost:9099";
        }
      } catch (error) {
        console.error("Firebase Admin SDK initialization failed.", error);
      }

      const firebaseTest = require("./e2e/firebase-test"); // 이전에 생성한 firebase-test.js 파일을 불러옵니다.

      on("task", {
        async clearFirestore() {
          await firebaseTest.clearFirestore();
          return null;
        },
        async getDoc(path) {
          const docData = await firebaseTest.getDoc(path);
          return docData;
        },
        async setDoc({ path, data }) {
          await firebaseTest.setDoc(path, data);
          return null;
        },
        async createAuthUser({ uid, email }) {
          await firebaseTest.createAuthUser(uid, email);
          return null;
        },
      });

      return config;
    }, // React 개발 서버 기본 포트
    specPattern: "./e2e/integration/**/*.cy.{js,jsx,ts,tsx}",
  },
});