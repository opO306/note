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
    
    // 🔹 소스맵 비활성화 (용량 절감)
    sourcemap: false,

    // 경고 무시 설정
    chunkSizeWarningLimit: 1000,

    // ✅ 번들 분할 최적화: 주요 라이브러리를 별도 청크로 분리하여 캐시 활용
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-[hash].js`,
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: `assets/[name]-[hash].[ext]`,
        manualChunks: {
          'vendor-react': ['react', 'react-dom'],
          'vendor-firebase': ['firebase/app', 'firebase/auth', 'firebase/firestore', 'firebase/functions'],
          'vendor-capacitor': ['@capacitor/core', '@capacitor/app'],
        },
      },
    },
  },
  // 프로덕션 빌드에서만 콘솔 로그 제거 (개발 환경에서는 유지)
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },
  server: {
    port: 3000,
    open: true,
  },
});