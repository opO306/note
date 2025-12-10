import { useKeyboard } from "../hooks/useKeyboard";
import { Button } from "./button";
import { ChevronDown, Keyboard } from "lucide-react";
import { cn } from "./utils";

interface KeyboardDismissButtonProps {
  className?: string;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  showIcon?: boolean;
  text?: string;
}

/**
 * Button that appears when keyboard is visible and dismisses it when clicked
 */
export function KeyboardDismissButton({
  className,
  variant = "outline",
  size = "sm",
  showIcon = true,
  text = "완료",
}: KeyboardDismissButtonProps) {
  const { isVisible } = useKeyboard();

  const handleDismiss = () => {
    // Blur any focused input to hide keyboard
    if (document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
  };

  if (!isVisible) return null;

  return (
    <Button
      type="button"
      variant={variant}
      size={size}
      onClick={handleDismiss}
      className={cn(
        "fixed bottom-4 right-4 z-50 shadow-lg",
        "safe-nav-bottom",
        "transition-all duration-200",
        "animate-in slide-in-from-bottom-2",
        className
      )}
    >
      {showIcon && <ChevronDown className="w-4 h-4" />}
      {text && <span className="ml-1">{text}</span>}
    </Button>
  );
}

/**
 * Floating keyboard indicator that shows keyboard height
 * Useful for debugging
 */
export function KeyboardIndicator() {
  const { isVisible, height } = useKeyboard();

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-primary text-primary-foreground px-3 py-2 rounded-md shadow-lg text-xs font-mono">
      <div className="flex items-center gap-2">
        <Keyboard className="w-3 h-3" />
        <span>키보드: {height}px</span>
      </div>
    </div>
  );
}
