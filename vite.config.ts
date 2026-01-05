// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc'; // 또는 @vitejs/plugin-react
import path from 'node:path';

export default defineConfig({
  base: './',          // 핵심!
  plugins: [react()],
  resolve: {
    alias: {
      // React와 React-DOM이 항상 프로젝트 루트의 node_modules를 바라보게 강제
      react: path.resolve(__dirname, 'node_modules/react'),
      'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      "@": path.resolve(__dirname, "./src"),
    },
    // 중복 번들 방지 (심볼릭 링크나 모노레포 환경에서도 안전)
    dedupe: ['react', 'react-dom'],
  },
  optimizeDeps: {
    /* dev 서버 프리-번들 시에도 중복 생성 방지 */
    include: ['react', 'react-dom'],
  },
  build: {
    target: 'esnext',
    outDir: 'build',
    minify: 'esbuild',
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        entryFileNames: `assets/[name]-[hash].js`,
        chunkFileNames: `assets/[name]-[hash].js`,
        assetFileNames: `assets/[name]-[hash].[ext]`,
        manualChunks: {
          /* vendor-react 청크는 그대로 둬도 문제 없습니다.
             이제 ‘한 벌’만 들어갑니다. */
          'vendor-react': ['react', 'react-dom'],
          'vendor-firebase': [
            'firebase/app',
            'firebase/auth',
            'firebase/firestore',
            'firebase/functions',
          ],
          'vendor-capacitor': ['@capacitor/core', '@capacitor/app'],
        },
      },
    },
  },
  esbuild: {
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : [],
  },
  server: {
    host: 'localhost',
    port: 3000,
    strictPort: true,
    hmr: { protocol: 'ws', host: 'localhost', port: 3000 },
    open: true,
  },
});
