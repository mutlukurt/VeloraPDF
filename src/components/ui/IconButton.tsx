import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "../../lib/utils/cn";

type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  label: string;
  children: ReactNode;
};

export function IconButton({ active, label, children, className, ...props }: IconButtonProps) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cn(
        "grid h-10 w-10 place-items-center rounded-xl border border-transparent text-secondary transition hover:border-border hover:bg-elevated hover:text-primary",
        active && "border-accent/30 bg-soft-purple text-accent shadow-[0_10px_24px_rgba(91,77,255,.22)]",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}
