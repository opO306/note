# 스킨 노이즈 질감 적용 가이드

## 파일 위치
- `src/styles/skin-noise.css` - 스킨 노이즈 질감 CSS 파일

## 적용 방법

### 1. 활성화
이미 `src/index.css`에 import되어 있습니다:
```css
@import "./styles/skin-noise.css";
```

### 2. 스킨 적용
HTML 루트 요소에 `data-skin` 속성을 추가:

```html
<html data-skin="paper">
```

또는 JavaScript로:
```javascript
document.documentElement.setAttribute('data-skin', 'paper');
```

### 3. 사용 가능한 스킨
- `paper` - 종이 느낌 (opacity: 0.05)
- `matte` - 매트 플라스틱 (opacity: 0.03)
- `metal` - 메탈 (opacity: 0.025)
- 없음 (기본값) - 노이즈 없음 (opacity: 0)

## 제거 방법

### 완전히 제거하려면:
1. `src/index.css`에서 이 줄 삭제:
   ```css
   @import "./styles/skin-noise.css";
   ```
2. `src/styles/skin-noise.css` 파일 삭제

**레이아웃/기능 영향 0** - 제거해도 아무 문제 없습니다.

## 테스트 방법

1. 스킨 ON/OFF 스위치 만들기
2. 3초 쳐다보기
3. 질문: "지금 뭐가 바뀌었지?"
   - 바로 보이면 ❌ 실패 (opacity 값 낮추기)
   - 설명 들어야 이해되면 ✅ 성공

## 원칙
- 이미지 텍스처 ❌ 절대 사용 안 함
- CSS 노이즈만 사용 ✅
- opacity 값만 조절 ✅
- 레이아웃/기능 영향 0 ✅

