import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bivunote.app',
  appName: '비유노트',
  webDir: 'build',
  plugins: {
    SplashScreen: {
      launchShowDuration: 1000, // 1초로 단축 (성능 최적화)
      launchAutoHide: true,
      backgroundColor: "#000000",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
  },
  server: {
    androidScheme: 'https',
    hostname: 'com.bivunote.app', // 👈 이 줄을 추가해주세요! (고유 도메인 처리)
  }
};

export default config;
