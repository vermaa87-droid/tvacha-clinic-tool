"use client";

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface BadgeProps {
  children: ReactNode;
  variant?: "default" | "success" | "warning" | "error" | "info";
  className?: string;
}

export function Badge({
  children,
  variant = "default",
  className,
}: BadgeProps) {
  const variants = {
    default: "bg-primary-100 text-primary-700",
    success: "bg-success-bg text-success-text",
    warning: "bg-yellow-100 text-yellow-800",
    error: "bg-red-100 text-red-800",
    info: "bg-blue-100 text-blue-800",
  };

  return (
    <span
      className={cn(
        "inline-block px-3 py-1 text-xs font-medium rounded-full",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}
