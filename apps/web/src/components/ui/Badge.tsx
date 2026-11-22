import React from "react";
import { cn } from "@/lib/utils";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  tone?: "neutral" | "success" | "warning" | "danger" | "info" | "saffron" | "emerald" | string;
  size?: "sm" | "md";
}

export function Badge({
  children,
  className = "",
  tone = "neutral",
  size = "md",
  ...props
}: BadgeProps) {
  const toneClasses: Record<string, string> = {
    neutral:
      "bg-cream/80 text-[#1a1a2e] border-[#1a1a2e]/10 shadow-xs",
    success:
      "bg-[#a04100]/12 text-[#a04100] border-[#a04100]/25 shadow-xs",
    emerald:
      "bg-[#a04100]/12 text-[#a04100] border-[#a04100]/25 shadow-xs",
    warning:
      "bg-[#a04100]/15 text-[#823400] border-[#a04100]/30 shadow-xs",
    saffron:
      "bg-[#a04100]/15 text-[#823400] border-[#a04100]/30 shadow-xs",
    gold:
      "bg-[#a04100]/15 text-[#823400] border-[#a04100]/30 shadow-xs",
    danger:
      "bg-rose-100/90 text-rose-950 border-rose-300/80 shadow-xs",
    info:
      "bg-[#3d3d5c]/10 text-[#3d3d5c] border-[#3d3d5c]/25 shadow-xs",
    cyan:
      "bg-[#3d3d5c]/10 text-[#3d3d5c] border-[#3d3d5c]/25 shadow-xs",
  };

  const sizeClasses = {
    sm: "px-2.5 py-0.5 text-[11px] gap-1",
    md: "px-3 py-1 text-xs gap-1.5",
  };

  const selectedTone = toneClasses[tone] ?? toneClasses.neutral;

  return (
    <span
      className={cn(
        "inline-flex items-center font-semibold rounded-full border backdrop-blur-md transition-colors leading-relaxed",
        sizeClasses[size],
        selectedTone,
        className,
      )}
      {...props}
    >
      {children}
    </span>
  );
}
