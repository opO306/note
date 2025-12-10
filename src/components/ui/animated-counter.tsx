import { useState, useEffect } from "react";

interface AnimatedCounterProps {
  from: number;
  to: number;
  duration?: number;
  className?: string;
}

export function AnimatedCounter({ from, to, duration = 1000, className }: AnimatedCounterProps) {
  const [count, setCount] = useState(from);

  useEffect(() => {
    if (from === to) return;
    
    const startTime = Date.now();
    const difference = to - from;
    
    const updateCount = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function for smooth animation
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      
      setCount(Math.round(from + difference * easeOutQuart));
      
      if (progress < 1) {
        requestAnimationFrame(updateCount);
      }
    };
    
    requestAnimationFrame(updateCount);
  }, [from, to, duration]);

  return <span className={className}>{count}</span>;
}