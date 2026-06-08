import type { ReactNode } from 'react'

export function Tooltip({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span className="group relative inline-flex">
      {children}
      <span className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[var(--text)] px-2 py-1 text-[11px] font-medium text-[var(--background)] opacity-0 shadow-lift transition group-hover:opacity-100">
        {label}
      </span>
    </span>
  )
}
