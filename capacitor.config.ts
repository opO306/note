/// <reference types="@capacitor-firebase/authentication" />
import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bivunote.app',
  appName: '비유노트',
  webDir: 'build',
  plugins: {
    FirebaseAuthentication: {
      skipNativeAuth: true,
      providers: ['google.com'],
    },
  },
  server: {
    androidScheme: 'https',
    hostname: 'com.bivunote.app', // 👈 이 줄을 추가해주세요! (고유 도메인 처리)
  }
};

export default config;
