import { Archive, FilePlus2, PanelTop, Star } from 'lucide-react'
import { Button } from '../../components/ui/Button'
import { useWorkspaceStore } from '../../lib/store/workspace'
import { formatRelativeTime } from '../../lib/utils/text'

export function EditorHeader() {
  const { activePage, pages, updatePage, archiveActivePage, createPage, saveState } = useWorkspaceStore()
  if (!activePage) return null

  const breadcrumbs = []
  let current = activePage
  while (current.parentId) {
    const parent = pages.find((page) => page.id === current.parentId)
    if (!parent) break
    breadcrumbs.unshift(parent)
    current = parent
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-[var(--border-subtle)] bg-[var(--background-translucent)] px-6 backdrop-blur-xl">
      <div className="flex min-w-0 flex-1 items-center gap-2 text-sm text-[var(--text-muted)]">
        {breadcrumbs.map((page) => (
          <span key={page.id} className="flex items-center gap-2">
            <span className="max-w-[120px] truncate">{page.title}</span>
            <span>/</span>
          </span>
        ))}
        <span className="truncate font-medium text-[var(--text)]">{activePage.title || 'Untitled'}</span>
      </div>
      <span className="hidden text-xs text-[var(--text-faint)] md:inline">
        {saveState === 'saving' ? 'Saving…' : saveState === 'error' ? 'Save issue' : `Saved locally · Edited ${formatRelativeTime(activePage.updatedAt)}`}
      </span>
      <Button size="icon" onClick={() => updatePage({ ...activePage, isFavorite: !activePage.isFavorite })} icon={<Star size={16} fill={activePage.isFavorite ? 'currentColor' : 'none'} />} />
      <Button size="icon" onClick={() => createPage(activePage.id)} icon={<FilePlus2 size={16} />} />
      <Button size="icon" onClick={() => updatePage({ ...activePage, cover: activePage.cover ? null : 'stone' })} icon={<PanelTop size={16} />} />
      <Button size="icon" variant="danger" onClick={archiveActivePage} icon={<Archive size={16} />} />
    </header>
  )
}
