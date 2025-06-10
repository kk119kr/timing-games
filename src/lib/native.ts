import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { StatusBar, Style } from '@capacitor/status-bar';
import { SplashScreen } from '@capacitor/splash-screen';
import { Capacitor } from '@capacitor/core';

// 네이티브 환경인지 확인
export const isNative = () => Capacitor.isNativePlatform();

// 진동 기능
export const vibrate = {
  // 가벼운 진동 (버튼 터치)
  light: async () => {
    if (isNative()) {
      await Haptics.impact({ style: ImpactStyle.Light });
    } else {
      // 웹에서는 기본 진동 API 사용
      navigator.vibrate?.(50);
    }
  },
  
  // 강한 진동 (게임 폭발)
  heavy: async () => {
    if (isNative()) {
      await Haptics.impact({ style: ImpactStyle.Heavy });
    } else {
      navigator.vibrate?.(200);
    }
  },
  
  // 연속 진동 (승리)
  success: async () => {
    if (isNative()) {
      await Haptics.impact({ style: ImpactStyle.Medium });
      setTimeout(() => Haptics.impact({ style: ImpactStyle.Light }), 100);
      setTimeout(() => Haptics.impact({ style: ImpactStyle.Medium }), 200);
    } else {
      navigator.vibrate?.([100, 50, 200]);
    }
  }
};

// 상태바 설정
export const setupStatusBar = async () => {
  if (isNative()) {
    await StatusBar.setStyle({ style: Style.Dark });
    await StatusBar.setBackgroundColor({ color: '#ffffff' });
  }
};

// 스플래시 스크린 숨기기
export const hideSplash = async () => {
  if (isNative()) {
    await SplashScreen.hide();
  }
};

// 앱 초기화
export const initializeApp = async () => {
  try {
    await setupStatusBar();
    // 2초 후 스플래시 숨기기
    setTimeout(async () => {
      await hideSplash();
    }, 2000);
  } catch (error) {
    console.error('앱 초기화 실패:', error);
  }
};