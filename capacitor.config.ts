import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.bivunote.app',
  appName: '비유노트',
  webDir: 'build',
  plugins: {
    GoogleAuth: {
      scopes: ["profile", "email"],
      clientId: "852428184810-eh4ojd3kj5ssvia7o54iteamk2sub31o.apps.googleusercontent.com",
      serverClientId: "852428184810-eh4ojd3kj5ssvia7o54iteamk2sub31o.apps.googleusercontent.com",
      forceCodeForRefreshToken: true,
    },
    SplashScreen: {
      launchShowDuration: 1000, // 1초로 단축 (성능 최적화)
      launchAutoHide: true,
      backgroundColor: "#000000",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    },
  },
};

export default config;
