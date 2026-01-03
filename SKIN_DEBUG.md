# 스킨 디버깅 가이드

## 문제 진단

콘솔에서 다음을 실행하여 확인:

```javascript
// 1. data-skin 속성 확인
document.documentElement.getAttribute('data-skin');

// 2. dark 클래스 확인
document.documentElement.classList.contains('dark');

// 3. 실제 카드 요소 확인
const card = document.querySelector('[data-slot="card"]');
console.log('Card:', card);
console.log('Classes:', card.className);

// 4. ::after 가상 요소 스타일 확인
const after = window.getComputedStyle(card, '::after');
console.log('After opacity:', after.opacity);
console.log('After background-image:', after.backgroundImage);
console.log('After content:', after.content);
console.log('After position:', after.position);
console.log('After display:', after.display);

// 5. 부모 요소 확인
console.log('Parent:', card.parentElement);
console.log('HTML classes:', document.documentElement.className);
console.log('HTML attributes:', Array.from(document.documentElement.attributes).map(a => `${a.name}="${a.value}"`));
```

## 예상 문제

1. **선택자 매칭 실패**: `.dark[data-skin='paper']`가 `html.dark[data-skin='paper']`와 매칭되지 않을 수 있음
2. **CSS 우선순위**: Tailwind CSS가 나중에 로드되어 덮어쓸 수 있음
3. **::after 생성 실패**: `content: ""`가 제대로 적용되지 않을 수 있음

## 해결 방법

1. 더 구체적인 선택자 사용
2. `!important` 추가 (이미 있음)
3. CSS 로드 순서 확인

