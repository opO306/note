Cypress.Commands.add("signInGoogle", (email) => {
  cy.log(`Signing in as ${email}`);
  // Firebase 인증 에뮬레이터와 연동하거나, 테스트용 토큰을 사용하는 로직 구현
  // 실제 Google OAuth는 E2E 테스트에서 직접 처리하기 어려움 (팝업/리디렉션)
  // 여기서는 단순히 성공적으로 로그인되었다고 가정하고, 필요한 사용자 데이터를 Firestore에 직접 심는 방식이 일반적
  // 또는 Firebase Test SDK를 사용하여 테스트용 인증 상태를 주입

  // 예시: Firebase 에뮬레이터에 사용자 생성 및 로그인 상태 주입 (Backend)
  // cy.exec('firebase emulators:exec "create-test-user"');
  // cy.visit('/?testUser=true&email=${email}')

  // For simplicity in this E2E setup, we'll assume a successful login
  // and set a flag or mock the auth state if needed in the frontend.
  // For rules-unit-testing, you'd directly interact with the Firestore emulator.

  // Since we're using rules-unit-testing, this command will be more about
  // setting up the Firebase authentication state for the test rather than
  // actually interacting with a UI login flow for Google.
  // This would typically involve directly setting a test user in the emulator.

  // Placeholder for Firebase Test SDK or direct emulator interaction
  // For now, we'll just proceed as if authenticated with the provided email.
  localStorage.setItem('cypress-test-uid', 'testUid');
  localStorage.setItem('cypress-test-email', email);
  cy.window().then((win) => {
    win.dispatchEvent(new Event('cypress:auth-mock-login'));
  });

});

// TypeScript를 위해 커맨드 정의
declare global {
  namespace Cypress {
    interface Chainable {
      signInGoogle(email: string): Chainable<AUTWindow>;
    }
  }
}