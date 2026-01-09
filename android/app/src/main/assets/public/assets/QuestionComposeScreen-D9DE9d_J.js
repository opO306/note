import{r as a,j as e,a as $,d as k}from"./index-nq_z7WhA.js";import{U as w,I as S,A as j}from"./vendor-firebase-D1NEqzdz.js";import{t as f}from"./toastHelper-BQ6M3Cc4.js";import{A}from"./MainScreenRefactored-BRHyWOom.js";import{B}from"./App-COUbzzsB.js";import{C as l,a as i}from"./card-DIbA5A_d.js";import"./vendor-capacitor-rvH5hiNU.js";import"./vendor-react-1wgkHQEd.js";import"./index-Bjta6Ul0.js";import"./index-C-WI9JZT.js";import"./checkbox-CFUi8qYh.js";import"./check-FzTHNnAz.js";import"./avatar-CGdV8c0F.js";import"./alert-dialog-simple-C5oUXbYo.js";import"./sparkles-7iSHoCyd.js";import"./firebaseCache-C_csZa1c.js";import"./profanityFilter-CmEWjjlv.js";import"./arrow-left-Lp9IH1tN.js";import"./users-CgQI8rwE.js";import"./sun-BhpYpMxp.js";function _({onBack:o,onGoWrite:s,onNavigateToNotes:r}){const[t,m]=a.useState(""),[u,g]=a.useState(""),[x,y]=a.useState(""),[p,N]=a.useState(""),[h,v]=a.useState(""),n=a.useMemo(()=>t.trim().length>=1,[t]),b=(c=!0)=>c?`
- 어떤 상황인가요?
${u}

- 무엇을 시도했나요?
${x||"-"}

- 어떤 결과를 기대했나요?
${p||"-"}

- 실제로 어떤 결과가 나왔나요?
${h||"-"}

- 무엇이 궁금한가요?
${t}
            `.trim():`
${u}

${x||"-"}

${p||"-"}

${h||"-"}

${t}
            `.trim(),C=async()=>{if(!n)return;const c=$.currentUser?.uid;if(!c){f.error("로그인 후 사용할 수 있어요.");return}try{await w(S(k,"notes"),{uid:c,title:t.trim(),body:b(),createdAt:j(),updatedAt:j(),source:"questionCompose"}),f.success("노트로 저장했어요."),r&&r()}catch{f.error("저장 중 문제가 생겼어요. 잠시 후 다시 시도해주세요.")}};return e.jsxs("div",{className:"w-full h-full bg-background text-foreground flex flex-col",children:[e.jsx(A,{title:"질문 정리",onBack:o,rightSlot:e.jsx(B,{type:"button",size:"sm",className:"rounded-xl text-sm",onClick:()=>{s({title:t,body:b(!1)})},children:"그냥 글쓰기"})}),e.jsxs("div",{className:"flex-1 overflow-y-auto p-4 space-y-4",children:[e.jsx(l,{children:e.jsx(i,{className:"p-4",children:e.jsxs("div",{className:"space-y-3",children:[e.jsx("label",{className:"text-sm font-medium",children:"제목 (필수)"}),e.jsx(E,{placeholder:"예) [심리] 번아웃이 마치 '기름 없는 자동차를 계속 밟는 것' 같아요",value:t,onChange:m})]})})}),e.jsx(l,{children:e.jsx(i,{className:"p-4",children:e.jsxs("div",{className:"space-y-3",children:[e.jsx("label",{className:"text-sm font-medium",children:"상황 설명 (필수)"}),e.jsx(d,{placeholder:"예) 교과서에서는 의지력이 근육처럼 단련된다고 하는데, 제 경험은 아침엔 쌩쌩하다가 저녁엔 방전되는 스마트폰 배터리 같아요. 이 두 관점 사이의 괴리감이 왜 발생하는 걸까요? 나만의 비유를 섞어서 설명해주세요.",value:u,onChange:g,rows:5})]})})}),e.jsx(l,{children:e.jsx(i,{className:"p-4",children:e.jsxs("div",{className:"space-y-3",children:[e.jsx("label",{className:"text-sm font-medium",children:"내가 해본 것"}),e.jsx(d,{placeholder:"예) 이 현상을 '도서관의 책 정리 방식'에 비유해서 이해해 보려고 했어요. 그런데 결정을 내릴 때마다 에너지가 소모된다는 '결정 피로' 개념과 어떻게 연결되는지 논리가 막히더라고요.",value:x,onChange:y,rows:4})]})})}),e.jsx(l,{children:e.jsx(i,{className:"p-4",children:e.jsxs("div",{className:"space-y-3",children:[e.jsx("label",{className:"text-sm font-medium",children:"기대 결과"}),e.jsx(d,{placeholder:"예) 정답을 맞히는 공부가 아니라, 이 현상의 '원리'를 누군가에게 비유로 설명해 줄 수 있을 만큼 명확해지고 싶어요.",value:p,onChange:N,rows:3})]})})}),e.jsx(l,{children:e.jsx(i,{className:"p-4",children:e.jsxs("div",{className:"space-y-3",children:[e.jsx("label",{className:"text-sm font-medium",children:"실제 결과"}),e.jsx(d,{placeholder:"예) 지금은 단순히 '의지력이 부족하다'는 결론만 나오는데, 왜 그런지 원리를 이해하지 못하고 있어요.",value:h,onChange:v,rows:3})]})})}),e.jsxs("div",{className:"text-xs text-muted-foreground px-1 space-y-1",children:[e.jsx("p",{children:"정답을 묻기보다, 당신이 세상을 이해하는 '방식'을 들려주세요."}),e.jsx("p",{children:"비유가 구체적일수록 더 깊은 통찰을 나눌 수 있습니다."})]})]}),e.jsx("div",{className:"px-4 py-3 border-t border-border bg-background/95 backdrop-blur-xl safe-nav-bottom flex-shrink-0",children:e.jsxs("div",{className:"flex gap-2",children:[e.jsx("button",{type:"button",disabled:!n,onClick:C,className:`flex-1 py-3 rounded-2xl text-sm font-semibold transition
        ${n?"bg-accent text-foreground hover:bg-accent/80":"bg-muted text-muted-foreground"}
      `,children:"노트로 저장"}),e.jsx("button",{type:"button",disabled:!n,onClick:()=>s({title:t,body:b(!1)}),className:`flex-[1.4] py-3 rounded-2xl text-sm font-semibold transition
        ${n?"bg-primary text-primary-foreground hover:bg-primary/90":"bg-muted text-muted-foreground"}
      `,children:"정리 완료 → 글쓰기"})]})})]})}function E({value:o,onChange:s,placeholder:r}){return e.jsx("input",{value:o,onChange:t=>s(t.target.value),placeholder:r,className:"w-full px-3 py-3 rounded-xl bg-input-background dark:bg-input/30 border border-input outline-none focus:ring-2 focus:ring-primary/30"})}function d({value:o,onChange:s,placeholder:r,rows:t=4}){return e.jsx("textarea",{value:o,onChange:m=>s(m.target.value),placeholder:r,rows:t,className:"w-full px-3 py-3 rounded-xl bg-input-background dark:bg-input/30 border border-input outline-none focus:ring-2 focus:ring-primary/30 resize-none"})}export{_ as QuestionComposeScreen};
