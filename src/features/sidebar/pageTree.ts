import type { Page } from '../../types'

export type PageNode = Page & { children: PageNode[] }

export function buildPageTree(pages: Page[]) {
  const nodes = new Map<string, PageNode>()
  const roots: PageNode[] = []
  pages
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title))
    .forEach((page) => nodes.set(page.id, { ...page, children: [] }))

  nodes.forEach((node) => {
    if (node.parentId && nodes.has(node.parentId)) {
      nodes.get(node.parentId)?.children.push(node)
    } else {
      roots.push(node)
    }
  })
  return roots
}
