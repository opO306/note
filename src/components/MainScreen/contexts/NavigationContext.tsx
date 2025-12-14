// NavigationContext 호환 래퍼 (NavigationStore 단일 사용)
// 기존 import 경로를 유지하면서 단일 스토어(useNavigationStore)만 노출합니다.

import React from "react";
import { NavigationStoreProvider, useNavigationStore } from "./NavigationStore";

export interface NavigationProviderProps {
  children: React.ReactNode;
  onRequestExit?: () => void; // 호환용, 현재 미사용
  shouldOpenMyPageOnMain?: boolean; // 호환용, 현재 미사용
  onMainScreenReady?: () => void; // 호환용, 현재 미사용
}

export function NavigationProvider({ children }: NavigationProviderProps) {
  return <NavigationStoreProvider>{children}</NavigationStoreProvider>;
}

export function useNavigation() {
  return useNavigationStore();
}
