"use client";
import React from "react";
import { cn } from "@/lib/utils";

const variants = {
  default: "bg-primary text-on-primary hover:bg-primary/90 shadow-sm",
  destructive: "bg-error text-on-error hover:bg-error/90 shadow-sm",
  outline: "border border-outline-variant bg-transparent text-on-surface hover:bg-surface-container",
  secondary: "bg-secondary text-on-secondary hover:bg-secondary/90",
  ghost: "hover:bg-surface-container text-on-surface",
  link: "text-primary underline-offset-4 hover:underline",
  success: "bg-emerald-600 text-white hover:bg-emerald-700",
};

const sizes = {
  default: "h-10 px-4 py-2",
  sm: "h-9 rounded-lg px-3",
  lg: "h-11 rounded-xl px-8",
  icon: "h-10 w-10",
};

export const Button = React.forwardRef(
  ({ className, variant = "default", size = "default", ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 disabled:pointer-events-none disabled:opacity-50 active:scale-95",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    />
  )
);
Button.displayName = "Button";
