import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";
import { cn } from "./utils";

interface SimpleDropdownOption {
  value: string;
  label: string;
}

interface SimpleDropdownProps {
  value: string;
  options: SimpleDropdownOption[];
  onChange: (value: string) => void;
  className?: string;
  triggerClassName?: string;
}

export function SimpleDropdown({
  value,
  options,
  onChange,
  className,
  triggerClassName,
}: SimpleDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside as any);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside as any);
    };
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className={cn("relative inline-block", className)}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "inline-flex items-center justify-between gap-2 rounded-lg border border-border/60 bg-background/50 px-3 py-1.5 text-xs transition-colors hover:bg-accent/50",
          triggerClassName
        )}
      >
        <span>{selectedOption?.label}</span>
        <ChevronDown
          size={14}
          style={{
            stroke: "currentColor",
            fill: "none",
            display: "block",
            width: "14px",
            height: "14px",
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 200ms ease",
          }}
        />
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-1 z-[9999] min-w-[6rem] rounded-md border border-border bg-popover shadow-lg animate-in fade-in-0 zoom-in-95 slide-in-from-top-2">
          <div className="p-1">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => handleSelect(option.value)}
                className={cn(
                  "relative w-full flex items-center justify-between gap-2 rounded-sm px-2 py-1.5 text-sm outline-none transition-colors cursor-pointer",
                  "hover:bg-accent hover:text-accent-foreground",
                  option.value === value
                    ? "bg-accent/50 text-accent-foreground"
                    : "text-popover-foreground"
                )}
              >
                <span>{option.label}</span>
                {option.value === value && (
                  <Check
                    size={16}
                    style={{
                      stroke: "currentColor",
                      fill: "none",
                      display: "block",
                      width: "16px",
                      height: "16px",
                    }}
                  />
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
