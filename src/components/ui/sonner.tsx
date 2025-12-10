"use client";

import { Toaster as Sonner, ToasterProps } from "sonner";

interface CustomToasterProps extends ToasterProps {
  isDarkMode?: boolean;
}

const Toaster = ({ isDarkMode = false, ...props }: CustomToasterProps) => {
  return (
    <Sonner
      theme={isDarkMode ? "dark" : "light"}
      className="toaster group"
      closeButton={false}
      richColors={true}
      position="top-center"
      duration={2000}              // ← 이 줄 추가됨
      {...props}
    />
  );
};

export { Toaster };
