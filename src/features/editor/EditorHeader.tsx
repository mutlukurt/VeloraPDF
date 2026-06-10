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
    <header className="kairnly-editor-header sticky top-0 z-20 flex min-h-14 items-center gap-2 border-b border-[var(--border-subtle)] bg-[var(--background-translucent)] py-2 pl-16 pr-3 backdrop-blur-xl md:h-14 md:gap-3 md:px-6">
      <div className="flex min-w-0 flex-1 items-center gap-2 text-xs text-[var(--text-muted)] md:text-sm">
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
      <div className="flex shrink-0 items-center gap-1">
        <Button className="h-9 w-9 md:h-8 md:w-8" size="icon" onClick={() => updatePage({ ...activePage, isFavorite: !activePage.isFavorite })} icon={<Star size={15} fill={activePage.isFavorite ? 'currentColor' : 'none'} />} />
        <Button className="h-9 w-9 md:h-8 md:w-8" size="icon" onClick={() => createPage(activePage.id)} icon={<FilePlus2 size={15} />} />
        <Button className="hidden sm:inline-flex" size="icon" onClick={() => updatePage({ ...activePage, cover: activePage.cover ? null : 'stone' })} icon={<PanelTop size={16} />} />
        <Button className="h-9 w-9 md:h-8 md:w-8" size="icon" variant="danger" onClick={archiveActivePage} icon={<Archive size={15} />} />
      </div>
    </header>
  )
}
