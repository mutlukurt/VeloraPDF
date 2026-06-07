import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils/cn";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  children: ReactNode;
};

export function Button({ variant = "secondary", className, children, ...props }: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50",
        variant === "primary" && "bg-accent-gradient text-white shadow-[0_16px_34px_rgba(91,77,255,.32)] hover:brightness-110",
        variant === "secondary" && "border border-border bg-surface text-primary hover:bg-elevated",
        variant === "ghost" && "text-secondary hover:bg-elevated hover:text-primary",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
