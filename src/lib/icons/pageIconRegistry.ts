import * as LucideIcons from 'lucide-react'
import type { ComponentType, SVGProps } from 'react'
import { labelFromLucideName, toLucidePageIconValue } from './pageIconText'

export type PageIconComponent = ComponentType<SVGProps<SVGSVGElement> & {
  size?: number | string
  strokeWidth?: number | string
}>

export type PageIconOption = {
  name: string
  label: string
  value: string
  Icon: PageIconComponent
}

function isLucideComponent(value: unknown): value is PageIconComponent {
  return (typeof value === 'object' || typeof value === 'function') && value !== null
}

export const pageIconOptions: PageIconOption[] = Object.entries(LucideIcons)
  .filter(([name, value]) => /^[A-Z]/.test(name) && name !== 'Icon' && !name.endsWith('Icon') && isLucideComponent(value))
  .map(([name, Icon]) => ({
    name,
    label: labelFromLucideName(name),
    value: toLucidePageIconValue(name),
    Icon: Icon as PageIconComponent,
  }))
  .sort((a, b) => a.label.localeCompare(b.label))
