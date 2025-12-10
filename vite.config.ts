import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    extensions: ['.js', '.jsx', '.ts', '.tsx', '.json'],
    alias: {
      'figma:asset/c33b5ffb86c8f42db8f0cdf6145f21abd5c6153f.png': path.resolve(__dirname, './src/assets/c33b5ffb86c8f42db8f0cdf6145f21abd5c6153f.png'),
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'esnext',
    outDir: 'build',

    // 🎯 청크 크기 경고 설정 (300KB 이상이면 경고)
    chunkSizeWarningLimit: 300,

    // 📦 완벽한 코드 분리 설정!
    rollupOptions: {
      output: {
        manualChunks: {
          // 1️⃣ React 코어 (필수, 항상 로드됨)
          'vendor-react': [
            'react',
            'react-dom',
            'react-dom/client',
          ],

          // 2️⃣ Radix UI - 자주 사용하는 컴포넌트들
          'vendor-radix-common': [
            '@radix-ui/react-dialog',
            '@radix-ui/react-dropdown-menu',
            '@radix-ui/react-popover',
            '@radix-ui/react-tooltip',
            '@radix-ui/react-alert-dialog',
            '@radix-ui/react-label',
            '@radix-ui/react-slot',
          ],

          // 3️⃣ Radix UI - 나머지 컴포넌트들
          'vendor-radix-extra': [
            '@radix-ui/react-accordion',
            '@radix-ui/react-aspect-ratio',
            '@radix-ui/react-avatar',
            '@radix-ui/react-checkbox',
            '@radix-ui/react-collapsible',
            '@radix-ui/react-context-menu',
            '@radix-ui/react-hover-card',
            '@radix-ui/react-menubar',
            '@radix-ui/react-navigation-menu',
            '@radix-ui/react-progress',
            '@radix-ui/react-radio-group',
            '@radix-ui/react-scroll-area',
            '@radix-ui/react-select',
            '@radix-ui/react-separator',
            '@radix-ui/react-slider',
            '@radix-ui/react-switch',
            '@radix-ui/react-tabs',
            '@radix-ui/react-toggle',
            '@radix-ui/react-toggle-group',
          ],

          // 4️⃣ 아이콘 (lucide-react는 큰 라이브러리)
          'vendor-icons': [
            'lucide-react',
          ],

          // 5️⃣ 차트 라이브러리 (큰 라이브러리)
          'vendor-charts': [
            'recharts',
          ],

          // 6️⃣ 애니메이션
          'vendor-animation': [
            'motion',
            'embla-carousel-react',
          ],

          // 7️⃣ 기타 유틸리티들
          'vendor-utils': [
            'class-variance-authority',
            'clsx',
            'cmdk',
            'date-fns',
            'input-otp',
            'react-day-picker',
            'react-hook-form',
            'react-resizable-panels',
            'sonner',
            'tailwind-merge',
            'vaul',
          ],
        },
      },
    },
  },
  server: {
    port: 3000,
    open: true,
  },
});