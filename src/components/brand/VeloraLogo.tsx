import { cn } from "../../lib/utils/cn";

export function VeloraLogo({ className }: { className?: string }) {
  return (
    <img
      src="/velora-icon.png"
      alt="Velora PDF"
      className={cn("block rounded-2xl object-cover shadow-[0_12px_30px_rgba(91,77,255,.26)]", className)}
      draggable={false}
    />
  );
}
