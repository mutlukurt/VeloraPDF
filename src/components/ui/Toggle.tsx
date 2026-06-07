import { cn } from "../../lib/utils/cn";

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <button className="flex w-full items-center justify-between gap-4 rounded-xl px-1 py-2 text-sm text-primary" onClick={() => onChange(!checked)}>
      <span>{label}</span>
      <span className={cn("relative h-6 w-11 rounded-full border border-border transition", checked ? "bg-accent" : "bg-elevated")}>
        <span className={cn("absolute top-1 h-4 w-4 rounded-full bg-white transition", checked ? "left-6" : "left-1")} />
      </span>
    </button>
  );
}
