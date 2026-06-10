import { cn } from "../../lib/utils/cn";
import veloraIconUrl from "../../assets/velora-icon.png";

export function VeloraLogo({ className }: { className?: string }) {
  return (
    <img
      src={veloraIconUrl}
      alt="Velora PDF"
      className={cn("block rounded-2xl object-cover shadow-[0_12px_30px_rgba(91,77,255,.26)]", className)}
      draggable={false}
    />
  );
}
