// vite.config.ts
import { defineConfig } from 'vite';
// 👇 여기가 핵심! 설치된 패키지 이름(swc)과 똑같이 맞춰야 합니다.
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  base: './', // 상대 경로 (Capacitor 앱에서 필수)
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
  build: {
    target: 'esnext', // 최신 자바스크립트 문법 지원
    outDir: 'build',

    // 🔹 minification 활성화 (용량 최적화)
    minify: 'esbuild',

    // 경고 무시 설정
    chunkSizeWarningLimit: 1000,

    // 복잡한 manualChunks 설정 삭제됨 -> 에러 해결!
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-[hash].js`,
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: `assets/[name]-[hash].[ext]`,
        // 필요하면 나중에 다시 설정하더라도, 지금은 비워두는 게 안전합니다.
      },
    },
  },
  // 콘솔 로그 제거 (선택 사항)
  esbuild: {
    drop: ['console', 'debugger'],
  },
  server: {
    port: 3000,
    open: true,
  },
});