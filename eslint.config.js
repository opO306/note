// eslint.config.js — ESLint v9 Flat Config (React + TS + 성능 규칙)
import parser from "@typescript-eslint/parser";
import tseslint from "@typescript-eslint/eslint-plugin";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import reactPerf from "eslint-plugin-react-perf";

export default [
    // 전역 ESLint 동작 옵션
    {
        linterOptions: {
            // 사용되지 않는 eslint-disable 경고는 지금은 무시 (필요 시 true로 되돌리세요)
            reportUnusedDisableDirectives: false,
        },
    },

    // ⛔ 린트 제외 (옛 .eslintignore 대체)
    {
        ignores: ["node_modules/**", "dist/**", "build/**", "android/**", "coverage/**", ".vite/**", ".eslintcache"],
    },

    // ✅ 앱 코드(스크린/로직) — 강력 규칙 유지
    {
        files: ["src/**/*.{ts,tsx}"],
        ignores: ["src/components/ui/**", "src/components/figma/**"], // UI 폴더는 아래 override에서 처리
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            parser,
            parserOptions: { ecmaFeatures: { jsx: true } },
        },
        plugins: { "@typescript-eslint": tseslint, react, "react-hooks": reactHooks, "react-perf": reactPerf },
        settings: { react: { version: "detect" } },
        rules: {
            /* 인라인 함수 금지 — 지금은 워닝 수준 */
            "react/jsx-no-bind": ["warn", { allowArrowFunctions: true, allowFunctions: false, allowBind: false }],
            /* 성능 규칙은 경고가 너무 많아 일단 off (필요한 곳만 개별 최적화 권장) */
            "react-perf/jsx-no-new-object-as-prop": "off",
            "react-perf/jsx-no-new-array-as-prop": "off",
            "react-perf/jsx-no-new-function-as-prop": "off",
            /* DOM 요소 style prop 금지 */
            "react/forbid-dom-props": ["error", { forbid: ["style"] }],
            /* Hooks 규칙 강화 */
            "react-hooks/rules-of-hooks": "error",
            "react-hooks/exhaustive-deps": "error",
            /* TS 품질 */
            "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
            /* 프로젝트 스타일 */
            "react/prop-types": "off",
            "react/react-in-jsx-scope": "off",
        },
    },

    // 🎨 디자인 컴포넌트(Shadcn/커스텀 UI) — 규칙 완화(실사용 성능 이슈 적음)
    {
        files: ["src/components/ui/**", "src/components/figma/**"],
        languageOptions: {
            ecmaVersion: "latest",
            sourceType: "module",
            parser,
            parserOptions: { ecmaFeatures: { jsx: true } },
        },
        plugins: { "@typescript-eslint": tseslint, react, "react-hooks": reactHooks, "react-perf": reactPerf },
        settings: { react: { version: "detect" } },
        rules: {
            // UI 레벨에선 스타일/객체/함수 인라인 허용(필요시 최적화 대상 아님)
            "react/forbid-dom-props": "off",
            "react-perf/jsx-no-new-object-as-prop": "off",
            "react-perf/jsx-no-new-array-as-prop": "off",
            "react-perf/jsx-no-new-function-as-prop": "off",
            "react/jsx-no-bind": "off",

            // 나머지 기본 위생 규칙은 유지
            "react-hooks/rules-of-hooks": "error",
            "react-hooks/exhaustive-deps": "warn",
            "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
            "react/prop-types": "off",
            "react/react-in-jsx-scope": "off",
        },
    },
];