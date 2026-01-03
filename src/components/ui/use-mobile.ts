import * as React from "react";

const MOBILE_BREAKPOINT = 768;

export function useIsMobile() {
  // ✅ 초기값을 안전하게 설정: 클라이언트 사이드에서만 window 접근
  const [isMobile, setIsMobile] = React.useState<boolean>(() => {
    // 서버 사이드 렌더링이나 초기 렌더링 시 안전한 기본값 반환
    if (typeof window === "undefined") return false;
    return window.innerWidth < MOBILE_BREAKPOINT;
  });

  React.useEffect(() => {
    // 클라이언트 사이드에서만 실행
    if (typeof window === "undefined") return;

    const checkSize = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    // 초기 체크
    checkSize();

    // MediaQueryList를 사용하여 리사이즈 이벤트 최적화
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    
    // change 이벤트 리스너 등록
    mql.addEventListener("change", checkSize);

    // 리사이즈 이벤트도 함께 감지 (MediaQuery가 모든 경우를 커버하지 못할 수 있음)
    window.addEventListener("resize", checkSize);

    return () => {
      mql.removeEventListener("change", checkSize);
      window.removeEventListener("resize", checkSize);
    };
  }, []);

  return isMobile;
}
