import { useState, useEffect } from "react";

interface KeyboardState {
  isVisible: boolean;
  height: number;
}

/**
 * Hook to detect virtual keyboard visibility and height
 * Works on both iOS and Android devices
 */
export function useKeyboard(): KeyboardState {
  const [keyboardState, setKeyboardState] = useState<KeyboardState>({
    isVisible: false,
    height: 0,
  });

  useEffect(() => {
    // Only run on client side
    if (typeof window === "undefined") return;

    let initialViewportHeight = window.visualViewport?.height || window.innerHeight;

    const handleResize = () => {
      // Visual Viewport API (better for mobile keyboards)
      if (window.visualViewport) {
        const currentHeight = window.visualViewport.height;
        const viewportHeight = window.innerHeight;
        const keyboardHeight = viewportHeight - currentHeight;

        // Keyboard is visible if viewport shrinks significantly
        const isKeyboardVisible = keyboardHeight > 150; // 150px threshold

        setKeyboardState({
          isVisible: isKeyboardVisible,
          height: isKeyboardVisible ? keyboardHeight : 0,
        });

      } else {
        // Fallback for browsers without Visual Viewport API
        const currentHeight = window.innerHeight;
        const heightDifference = initialViewportHeight - currentHeight;
        const isKeyboardVisible = heightDifference > 150;

        setKeyboardState({
          isVisible: isKeyboardVisible,
          height: isKeyboardVisible ? heightDifference : 0,
        });
      }
    };

    const handleFocusIn = () => {
      // Give browser time to show keyboard
      setTimeout(handleResize, 300);
    };

    const handleFocusOut = () => {
      // Reset state when keyboard is hidden
      setTimeout(() => {
        setKeyboardState({
          isVisible: false,
          height: 0,
        });
      }, 100);
    };

    // Listen to various events
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleResize);
    } else {
      window.addEventListener("resize", handleResize);
    }

    // Focus events for better detection
    window.addEventListener("focusin", handleFocusIn);
    window.addEventListener("focusout", handleFocusOut);

    return () => {
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleResize);
      } else {
        window.removeEventListener("resize", handleResize);
      }
      window.removeEventListener("focusin", handleFocusIn);
      window.removeEventListener("focusout", handleFocusOut);
    };
  }, []);

  return keyboardState;
}

/**
 * Hook to get keyboard-aware padding for bottom elements
 */
export function useKeyboardPadding(basepadding: number = 0): number {
  const { isVisible, height } = useKeyboard();
  return isVisible ? height + basepadding : basepadding;
}
