import { useEffect, useRef, RefObject } from "react";

interface ScrollIntoViewOptions {
  /** Whether to enable auto scroll on focus */
  enabled?: boolean;
  /** Delay before scrolling (ms) to wait for keyboard */
  delay?: number;
  /** Offset from top when scrolling (px) */
  offset?: number;
  /** Behavior of scrolling */
  behavior?: ScrollBehavior;
  /** Block alignment */
  block?: ScrollLogicalPosition;
}

/**
 * Hook to automatically scroll element into view when focused
 * Particularly useful for input fields when keyboard appears
 */
export function useScrollIntoView<T extends HTMLElement = HTMLElement>(
  options: ScrollIntoViewOptions = {}
): RefObject<T | null> {
  const {
    enabled = true,
    delay = 300,
    offset = 20,
    behavior = "smooth",
    block = "center",
  } = options;

  const elementRef = useRef<T>(null);

  useEffect(() => {
    if (!enabled) return;

    const element = elementRef.current;
    if (!element) return;

    const handleFocus = () => {
      // Wait for keyboard to appear
      setTimeout(() => {
        if (!element) return;

        // Get element position
        const rect = element.getBoundingClientRect();
        const elementTop = rect.top + window.scrollY;
        const elementHeight = rect.height;

        // Calculate viewport considering keyboard
        const viewportHeight = window.visualViewport?.height || window.innerHeight;

        // Check if element is hidden by keyboard
        const elementBottom = rect.bottom;
        const isHiddenByKeyboard = elementBottom > viewportHeight - offset;

        if (isHiddenByKeyboard) {
          // Scroll to position element in visible area
          const targetScroll = elementTop - (viewportHeight / 2) + (elementHeight / 2);

          window.scrollTo({
            top: Math.max(0, targetScroll),
            behavior,
          });
        } else {
          // Use standard scrollIntoView
          element.scrollIntoView({
            behavior,
            block,
            inline: "nearest",
          });
        }
      }, delay);
    };

    element.addEventListener("focus", handleFocus);

    return () => {
      element.removeEventListener("focus", handleFocus);
    };
  }, [enabled, delay, offset, behavior, block]);

  return elementRef;
}

/**
 * Scroll element into view programmatically
 */
export function scrollIntoView(
  element: HTMLElement | null,
  options: {
    offset?: number;
    behavior?: ScrollBehavior;
    delay?: number;
  } = {}
): void {
  if (!element) return;

  const { offset = 20, behavior = "smooth", delay = 0 } = options;

  const scroll = () => {
    const rect = element.getBoundingClientRect();
    const elementTop = rect.top + window.scrollY;
    const elementHeight = rect.height;
    const viewportHeight = window.visualViewport?.height || window.innerHeight;

    const targetScroll = elementTop - (viewportHeight / 2) + (elementHeight / 2);

    window.scrollTo({
      top: Math.max(0, targetScroll - offset),
      behavior,
    });
  };

  if (delay > 0) {
    setTimeout(scroll, delay);
  } else {
    scroll();
  }
}
