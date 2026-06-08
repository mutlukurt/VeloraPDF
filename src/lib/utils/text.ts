import type { TiptapDoc, TiptapNode } from '../../types'

export function plainTextFromNode(node?: TiptapNode | TiptapDoc | null): string {
  if (!node) return ''
  const parts: string[] = []
  const visit = (item: TiptapNode | TiptapDoc) => {
    if ('text' in item && item.text) parts.push(item.text)
    item.content?.forEach(visit)
  }
  visit(node)
  return parts.join(' ').replace(/\s+/g, ' ').trim()
}

export function formatRelativeTime(value?: string | null) {
  if (!value) return 'Not opened yet'
  const date = new Date(value)
  const diff = Date.now() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}
