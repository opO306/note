/**
 * 모바일 터치 버그 수정
 * 
 * 문제: 모바일에서 버튼을 터치하고 손을 떼도 hover/active 상태가 남아있음
 * 해결: 터치가 끝나면 자동으로 blur()를 호출하여 모든 상태 제거
 */

export function initMobileTouchFix(): () => void {
    // 터치 기기인지 확인
    const isTouchDevice =
        'ontouchstart' in window ||
        navigator.maxTouchPoints > 0;

    // 터치 기기가 아니면 아무것도 하지 않음
    if (!isTouchDevice) {
        return () => { }; // 빈 cleanup 함수 반환
    }

    // 터치 가능한 모든 요소 선택
    const touchableSelectors = [
        'button',
        'a',
        '[role="button"]',
        '[role="link"]',
        'input[type="button"]',
        'input[type="submit"]',
        'input[type="reset"]',
    ].join(', ');

    /**
     * 터치 종료 시 blur 처리
     */
    const handleTouchEnd = (event: TouchEvent) => {
        const target = event.target as HTMLElement;

        // 터치된 요소가 클릭 가능한 요소인지 확인
        if (target && (
            target.matches(touchableSelectors) ||
            target.closest(touchableSelectors)
        )) {
            // 짧은 지연 후 blur 호출 (클릭 이벤트 처리 후)
            setTimeout(() => {
                const elementToBlur = target.matches(touchableSelectors)
                    ? target
                    : target.closest(touchableSelectors);

                if (elementToBlur instanceof HTMLElement) {
                    elementToBlur.blur();
                }
            }, 10);
        }
    };

    /**
     * 클릭 후에도 blur 처리 (추가 안전장치)
     */
    const handleClick = (event: MouseEvent) => {
        const target = event.target as HTMLElement;

        if (target && target.matches(touchableSelectors)) {
            setTimeout(() => {
                target.blur();
            }, 10);
        }
    };

    // 이벤트 리스너 등록 (캡처 단계에서)
    document.addEventListener('touchend', handleTouchEnd, true);
    document.addEventListener('click', handleClick, true);

    // Cleanup 함수 반환
    return () => {
        document.removeEventListener('touchend', handleTouchEnd, true);
        document.removeEventListener('click', handleClick, true);
    };
}

/**
 * 특정 요소에만 터치 수정 적용
 */
export function applyTouchFixToElement(element: HTMLElement): () => void {
    const handleTouchEnd = () => {
        setTimeout(() => {
            element.blur();
        }, 10);
    };

    element.addEventListener('touchend', handleTouchEnd);

    return () => {
        element.removeEventListener('touchend', handleTouchEnd);
    };
}