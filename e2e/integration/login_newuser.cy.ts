// e2e/integration/login_newuser.cy.ts
describe("New user onboarding", () => {
  before(() => {
    cy.task("clearFirestore"); // rules-unit-testing helper
  });

  it("should go nickname → guidelines → main", () => {
    cy.visit("/");

    cy.signInGoogle("test-user@example.com"); // 커스텀 커맨드

    cy.contains("닉네임을 입력").type("비유왕{enter}");
    cy.contains("커뮤니티 가이드라인").should("be.visible");
    cy.contains("동의하고 시작").click();

    cy.contains("메인 피드").should("be.visible");

    // Firestore 검증
    cy.task("getDoc", "users/testUid").then((doc) => {
      expect(doc.nickname).to.eq("비유왕");
      expect(doc.communityGuidelinesAgreed).to.be.true;
      expect(doc.onboardingComplete).to.be.true;
    });
  });
});