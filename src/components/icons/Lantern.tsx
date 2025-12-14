import { SVGProps } from "react";

export function LanternIcon(props: SVGProps<SVGSVGElement>) {
  const { className, ...restProps } = props;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      {...restProps}
    >
      {/* Lantern body - filled */}
      <path d="M8 6h8l1 2v8c0 1.1-0.9 2-2 2H9c-1.1 0-2-0.9-2-2V8l1-2z" />
      {/* Top cap */}
      <path d="M7 6c0-1.1 0.9-2 2-2h6c1.1 0 2 0.9 2 2v0.5H7V6z" />
      {/* Handle */}
      <rect x="10" y="2" width="4" height="2" rx="0.5" />
      {/* Light center glow */}
      <circle cx="12" cy="12" r="2.5" />
      {/* Cross light rays */}
      <rect x="11.5" y="9.5" width="1" height="5" rx="0.5" />
      <rect x="9.5" y="11.5" width="5" height="1" rx="0.5" />
      {/* Hanging chain */}
      <rect x="11.5" y="18" width="1" height="2" rx="0.5" />
    </svg>
  );
}

export function LanternFilledIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="currentColor"
      {...props}
    >
      {/* Lantern body - filled */}
      <path d="M8 6h8l1 2v8c0 1-1 2-2 2H9c-1 0-2-1-2-2V8l1-2z" fillOpacity={0.8} />
      {/* Top cap */}
      <path d="M7 6c0-1 1-2 2-2h6c1 0 2 1 2 2z" />
      {/* Handle */}
      <rect x="10" y="2" width="4" height="2" />
      {/* Light glow effect */}
      <circle cx="12" cy="12" r="3" fill="currentColor" fillOpacity={0.3} />
      {/* Hanging chain */}
      <rect x="11.5" y="18" width="1" height="2" />
    </svg>
  );
}