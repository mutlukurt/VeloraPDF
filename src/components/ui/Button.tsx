import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils/cn";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost" | "soft" | "danger";
  size?: "sm" | "md" | "lg" | "icon";
  icon?: ReactNode;
  children?: ReactNode;
};

export function Button({ variant = "secondary", size = "md", icon, className, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        // Variants
        variant === "primary" && "bg-accent-gradient text-white shadow-[0_16px_34px_rgba(91,77,255,.32)] hover:brightness-110",
        variant === "secondary" && "border border-border bg-surface text-primary hover:bg-elevated",
        variant === "ghost" && "text-secondary hover:bg-elevated hover:text-primary",
        variant === "soft" && "bg-soft-purple text-accent hover:brightness-95",
        variant === "danger" && "bg-red-500/10 text-red-500 hover:bg-red-500/20",
        
        // Sizes
        size === "icon" ? "h-8 w-8 p-0" : size === "sm" ? "h-8 px-3 text-xs" : size === "lg" ? "h-12 px-5 text-base" : "h-11 px-4",
        className,
      )}
      {...props}
    >
      {icon && <span className="flex shrink-0">{icon}</span>}
      {children}
    </button>
  );
}
