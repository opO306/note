# 콘텐츠 모더레이션 시스템 개선 계획

## 현재 시스템 분석

### ✅ 이미 구현된 기능
1. **욕설 필터링**
   - 클라이언트/서버 양측 검사
   - 게시물 생성 시 자동 숨김
   - 닉네임에도 적용

2. **신고 시스템**
   - 신고 횟수 기반 자동 숨김 (5회 이상)
   - 관리자 검토 시스템 (3회 이상)
   - 신뢰도 차감/보상

3. **기본 검증**
   - 최소 글자수 검증
   - 중복 방지 (클라이언트 측)
   - Rate limiting (일부 기능)

4. **AI 모더레이션**
   - 관리자용 수동 검토 도구 존재

### ✅ 새로 구현된 기능 (Phase 1 & 2 완료)
1. **서버 측 Rate Limiting** - 게시물/답글 작성에 적용 ✅
2. **개인정보 유출 감지** - 전화번호, 이메일, 주소 등 ✅
3. **신뢰도 기반 제재** - 낮은 신뢰도 사용자 제한 ✅
4. **스팸 감지** - 반복 게시, 유사 콘텐츠, 광고성 콘텐츠 감지 ✅
5. **통합 모더레이션 함수** - 모든 검사 통합 ✅

### ⏳ 향후 구현 예정
1. **자동 AI 모더레이션** - 게시물 작성 시 자동 검사 (비용 고려)

---

## 개선 방안

### 1. 자동 AI 모더레이션 시스템

**목표**: 게시물/답글 작성 시 자동으로 AI 검사 후 위험도에 따라 처리

**구현 계획**:
```typescript
// functions/src/triggers.ts에 추가
export const onPostCreated = onDocumentCreated(async (event) => {
  // 기존 욕설 필터링...
  
  // ✅ AI 모더레이션 추가
  const aiResult = await checkContentWithAI(post.title, post.content);
  
  if (aiResult.riskScore > 0.8) {
    // 높은 위험도 → 즉시 숨김
    await snapshot.ref.update({ hidden: true, ... });
  } else if (aiResult.riskScore > 0.5) {
    // 중간 위험도 → 검토 필요 플래그
    await snapshot.ref.update({ needsReview: true, ... });
  }
});
```

**검사 항목**:
- 욕설/혐오 표현
- 스팸/광고성 콘텐츠
- 개인정보 유출
- 성적/폭력적 콘텐츠
- 허위 정보

### 2. 스팸 감지 시스템

**목표**: 반복 게시, 광고성 콘텐츠 자동 감지

**구현 계획**:
```typescript
// functions/src/core.ts에 추가
export async function detectSpam(
  userId: string,
  content: string,
  type: "post" | "reply"
): Promise<{ isSpam: boolean; reason?: string }> {
  // 1. 최근 작성 이력 확인 (시간당 게시물 수)
  const recentPosts = await getRecentUserContent(userId, type, 3600000); // 1시간
  if (recentPosts.length > 10) {
    return { isSpam: true, reason: "too_frequent" };
  }
  
  // 2. 유사 콘텐츠 감지 (최근 5개와 비교)
  const similarity = checkSimilarity(content, recentPosts);
  if (similarity > 0.8) {
    return { isSpam: true, reason: "duplicate_content" };
  }
  
  // 3. 광고 키워드 감지
  const adKeywords = ["구매", "할인", "무료", "광고", "홍보", "링크", "클릭"];
  if (adKeywords.some(keyword => content.includes(keyword))) {
    // AI로 광고 여부 재확인
    const aiCheck = await checkContentWithAI(content);
    if (aiCheck.flags?.includes("spam")) {
      return { isSpam: true, reason: "advertisement" };
    }
  }
  
  return { isSpam: false };
}
```

### 3. 개인정보 유출 감지

**목표**: 전화번호, 이메일, 주소 등 개인정보 자동 감지

**구현 계획**:
```typescript
// functions/src/core.ts에 추가
export function detectPersonalInfo(text: string): {
  hasPersonalInfo: boolean;
  detectedTypes: string[];
} {
  const detected: string[] = [];
  
  // 전화번호 패턴 (010-1234-5678, 01012345678 등)
  const phoneRegex = /(01[0-9])[-.\s]?(\d{3,4})[-.\s]?(\d{4})/g;
  if (phoneRegex.test(text)) detected.push("phone");
  
  // 이메일 패턴
  const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
  if (emailRegex.test(text)) detected.push("email");
  
  // 주소 패턴 (도로명 주소, 지번 주소)
  const addressRegex = /(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주).*(시|도|군|구|동|로|길)/g;
  if (addressRegex.test(text)) detected.push("address");
  
  // 주민등록번호 패턴 (민감)
  const ssnRegex = /\d{6}[-.\s]?\d{7}/g;
  if (ssnRegex.test(text)) detected.push("ssn");
  
  return {
    hasPersonalInfo: detected.length > 0,
    detectedTypes: detected
  };
}
```

### 4. 신뢰도 기반 제재 시스템

**목표**: 낮은 신뢰도 사용자에게 제한 적용

**구현 계획**:
```typescript
// functions/src/core.ts에 추가
export async function checkUserRestrictions(uid: string): Promise<{
  canPost: boolean;
  canReply: boolean;
  restrictions: string[];
}> {
  const userSnap = await db.collection("users").doc(uid).get();
  const userData = userSnap.data();
  const trustScore = userData?.trustScore || 30;
  
  const restrictions: string[] = [];
  
  // 신뢰도 0 이하: 모든 활동 제한
  if (trustScore <= 0) {
    return {
      canPost: false,
      canReply: false,
      restrictions: ["trust_score_too_low"]
    };
  }
  
  // 신뢰도 10 이하: 게시물 작성 제한
  if (trustScore <= 10) {
    restrictions.push("post_restricted");
  }
  
  // 신뢰도 20 이하: 답글 작성 제한
  if (trustScore <= 20) {
    restrictions.push("reply_restricted");
  }
  
  return {
    canPost: trustScore > 10,
    canReply: trustScore > 20,
    restrictions
  };
}
```

### 5. 서버 측 Rate Limiting 강화

**목표**: 게시물/답글 작성에 Rate Limiting 적용

**구현 계획**:
```typescript
// functions/src/triggers.ts에 추가
export const onPostCreated = onDocumentCreated(async (event) => {
  const userId = post.authorUid;
  
  // ✅ Rate Limiting 체크
  try {
    await checkRateLimit(userId, "createPost");
  } catch (error) {
    // Rate limit 초과 시 게시물 삭제
    await snapshot.ref.delete();
    logger.warn(`[Rate Limit] 게시물 삭제: ${postId}, 사용자: ${userId}`);
    return;
  }
  
  // 기존 로직...
});
```

### 6. 통합 모더레이션 함수

**목표**: 모든 검사를 통합한 모더레이션 함수

**구현 계획**:
```typescript
// functions/src/core.ts에 추가
export async function moderateContent(
  userId: string,
  title: string,
  content: string,
  type: "post" | "reply"
): Promise<ModerationResult> {
  const results: ModerationResult = {
    allowed: true,
    hidden: false,
    needsReview: false,
    reasons: []
  };
  
  // 1. 신뢰도 기반 제재 확인
  const restrictions = await checkUserRestrictions(userId);
  if (!restrictions.canPost && type === "post") {
    results.allowed = false;
    results.reasons.push("trust_score_too_low");
    return results;
  }
  
  // 2. Rate Limiting 확인
  try {
    await checkRateLimit(userId, type === "post" ? "createPost" : "createReply");
  } catch {
    results.allowed = false;
    results.reasons.push("rate_limit_exceeded");
    return results;
  }
  
  // 3. 욕설 필터링
  const profanity = await findProfanity(title) || await findProfanity(content);
  if (profanity) {
    results.hidden = true;
    results.reasons.push(`profanity: ${profanity}`);
  }
  
  // 4. 개인정보 유출 감지
  const personalInfo = detectPersonalInfo(title + " " + content);
  if (personalInfo.hasPersonalInfo) {
    results.hidden = true;
    results.reasons.push(`personal_info: ${personalInfo.detectedTypes.join(",")}`);
  }
  
  // 5. 스팸 감지
  const spamCheck = await detectSpam(userId, content, type);
  if (spamCheck.isSpam) {
    results.hidden = true;
    results.reasons.push(`spam: ${spamCheck.reason}`);
  }
  
  // 6. AI 모더레이션 (위험도가 높은 경우만)
  if (!results.hidden) {
    const aiResult = await checkContentWithAI(title, content);
    if (aiResult.riskScore > 0.8) {
      results.hidden = true;
      results.reasons.push(`ai_high_risk: ${aiResult.riskScore}`);
    } else if (aiResult.riskScore > 0.5) {
      results.needsReview = true;
      results.reasons.push(`ai_medium_risk: ${aiResult.riskScore}`);
    }
  }
  
  return results;
}
```

---

## 구현 우선순위

### Phase 1: 즉시 구현 (필수) ✅ 완료
1. ✅ 서버 측 Rate Limiting (게시물/답글) - **구현 완료**
2. ✅ 개인정보 유출 감지 - **구현 완료** (클라이언트 + 서버)
3. ✅ 신뢰도 기반 제재 - **구현 완료** (클라이언트 + 서버)

### Phase 2: 단기 구현 (1-2주) ✅ 완료
4. ✅ 스팸 감지 시스템 (반복 게시, 유사 콘텐츠) - **구현 완료**
5. ✅ 통합 모더레이션 함수 (모든 검사 통합) - **구현 완료**

### Phase 3: 중기 구현 (1개월)
6. ⏳ 자동 AI 모더레이션 (비용 고려, 위험도 높은 경우만)

---

## ✅ 구현 완료 내역

### 1. 서버 측 Rate Limiting
- **위치**: `functions/src/triggers.ts`
- **적용**: 게시물 생성 시 `checkRateLimit(userId, "createPost")`
- **적용**: 답글 생성 시 `checkRateLimit(userId, "createReply")`
- **동작**: Rate limit 초과 시 게시물/답글 자동 삭제

### 2. 개인정보 유출 감지
- **서버**: `functions/src/core.ts` - `detectPersonalInfo()` 함수
- **클라이언트**: `src/components/utils/personalInfoDetector.ts`
- **감지 항목**:
  - 전화번호 (010-1234-5678 등)
  - 이메일 주소
  - 주소 (도로명/지번)
  - 주민등록번호
  - 계좌번호
- **적용 위치**:
  - 게시물 생성/수정 시
  - 답글 생성 시
  - 클라이언트 측 사전 검사

### 3. 신뢰도 기반 제재
- **서버**: `functions/src/core.ts` - `checkUserRestrictions()` 함수
- **클라이언트**: `usePostManagement.ts`, `useReplyActions.tsx`
- **제재 기준**:
  - 신뢰도 0 이하: 모든 활동 제한
  - 신뢰도 10 이하: 게시물 작성 제한
  - 신뢰도 20 이하: 답글 작성 제한
- **적용 위치**:
  - 게시물 생성 전 (서버 + 클라이언트)
  - 답글 생성 전 (서버 + 클라이언트)

### 4. 스팸 감지 시스템 ✅ 완료
- **서버**: `functions/src/core.ts` - `detectSpam()` 함수
- **감지 항목**:
  - 시간당 게시물 수 체크 (게시물: 10개/시간, 답글: 20개/시간)
  - 유사 콘텐츠 감지 (Jaccard 유사도 80% 이상)
  - 광고성 키워드 감지 (3개 이상 또는 URL 2개 이상)
  - 짧은 반복 콘텐츠 감지 (10자 이하 반복)
- **적용 위치**:
  - 게시물 생성/수정 시
  - 답글 생성 시

### 5. 통합 모더레이션 함수 ✅ 완료
- **서버**: `functions/src/core.ts` - `moderateContent()` 함수
- **기능**: 모든 모더레이션 검사를 통합하여 일관된 결과 반환
- **검사 순서**:
  1. 신뢰도 기반 제재
  2. 욕설 필터링
  3. 개인정보 유출 감지
  4. 스팸 감지
  5. (향후) AI 모더레이션

---

## 비용 고려사항

- **AI 모더레이션**: Vertex AI 사용 시 요청당 비용 발생
  - 해결책: 위험도가 높은 경우만 AI 검사 (욕설/스팸 감지 후)
  - 또는 배치 처리로 비용 절감

---

## 모니터링 및 개선

1. **로그 수집**: 모더레이션 결과 로깅
2. **통계 대시보드**: 차단된 콘텐츠 유형별 통계
3. **A/B 테스트**: 임계값 조정으로 오탐률 최소화
4. **사용자 피드백**: 잘못 차단된 경우 신고 기능

