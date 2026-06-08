const LUCIDE_PREFIX = 'lucide:'

export function labelFromLucideName(name: string) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .trim()
}

export function getPageIconText(value?: string | null) {
  if (!value) return 'Page'
  if (!value.startsWith(LUCIDE_PREFIX)) return value
  return labelFromLucideName(value.slice(LUCIDE_PREFIX.length))
}

export function toLucidePageIconValue(name: string) {
  return `${LUCIDE_PREFIX}${name}`
}

export function getLucidePageIconName(value?: string | null) {
  return value?.startsWith(LUCIDE_PREFIX) ? value.slice(LUCIDE_PREFIX.length) : null
}
