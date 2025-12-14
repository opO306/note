# Copilot Instructions for This Codebase

## Overview
This project is a Vite-based React application implementing Android-style app login and related screens. It is structured for modularity and rapid UI prototyping, with a focus on component reuse and accessibility.

## Key Architecture & Patterns
- **Component Structure:**
  - All major UI screens are in `src/components/`, each as a separate file (e.g., `LoginScreen.tsx`, `MainScreen.tsx`).
  - Shared UI primitives and utilities are in `src/components/ui/` (e.g., `button.tsx`, `dialog.tsx`).
  - Custom hooks are in `src/components/hooks/` and follow the `useXxx` naming convention.
- **Styling:**
  - Uses Tailwind CSS (see `src/styles/globals.css`).
  - Prefer utility classes and component-level styles over global CSS.
- **Assets:**
  - Images and static assets are in `src/assets/`.
- **Figma Integration:**
  - Some components reference Figma assets or design tokens (see `vite.config.ts` for asset aliasing).

## Developer Workflows
- **Install dependencies:** `npm install`
- **Start dev server:** `npm run dev`
- **Build for production:** `npm run build`
- **No test scripts are defined by default.**

## Project-Specific Conventions
- **Radix UI:**
  - Uses Radix UI primitives for accessibility and consistent UI (see dependencies in `package.json`).
  - Compose UI using Radix components and extend via `src/components/ui/`.
- **Alias Imports:**
  - Aliases for dependencies and assets are defined in `vite.config.ts`.
  - Example: `import { Dialog } from '@radix-ui/react-dialog'` or `import img from 'figma:asset/...'`.
- **Component Naming:**
  - Screen components: `*Screen.tsx`
  - Dialogs: `*Dialog.tsx`
  - Hooks: `useXxx.ts`

## Integration & Data Flow
- **No backend integration by default.**
- **State is managed locally within components or via hooks.**
- **No global state management library is used.**

## References
- `README.md`: Basic setup and run instructions.
- `vite.config.ts`: Aliases and build config.
- `src/components/`: Main UI and logic.
- `src/components/ui/`: Shared UI primitives.
- `src/components/hooks/`: Custom hooks.
- `src/styles/globals.css`: Tailwind CSS config.

## Example Patterns
- To add a new screen, create `src/components/NewScreen.tsx` and add to navigation.
- To use a shared button: `import { Button } from './ui/button'`.
- To preload images: use `useImagePreloader` from hooks.

---

For questions or unclear conventions, check the referenced files or ask for clarification.
