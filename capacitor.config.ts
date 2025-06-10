import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.timinggames.app',
  appName: 'Timing Games',
  webDir: 'dist',
  server: {
    androidScheme: 'https'
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: "#000000", // 검은색 배경
      showSpinner: false
    },
    StatusBar: {
      style: "dark",
      backgroundColor: "#000000", // 검은색으로 변경
      overlaysWebView: true // 웹뷰 위에 오버레이
    },
    Haptics: {},
    LocalNotifications: {
      smallIcon: "ic_stat_icon_config_sample",
      iconColor: "#000000"
    }
  },
  android: {
    allowMixedContent: true,
    captureInput: true,
    webContentsDebuggingEnabled: false
  }
};

export default config;