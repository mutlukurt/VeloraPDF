import { AnimatePresence, motion } from 'framer-motion'
import {
  Archive,
  ChevronsLeft,
  ChevronsRight,
  Command,
  FileText,
  FilePlus2,
  MoreHorizontal,
  PanelLeftClose,
  Search,
  Settings,
  Star,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Tooltip } from '../../components/ui/Tooltip'
import { PageIcon } from '../../lib/icons/pageIcons'
import { useWorkspaceStore } from '../../lib/store/workspace'
import { cn } from '../../lib/utils/cn'
import { formatRelativeTime } from '../../lib/utils/text'
import { usePdfStore } from '../../stores/usePdfStore'
import { useUiStore } from '../../stores/useUiStore'
import type { Page } from '../../types'
import { buildPageTree, type PageNode } from './pageTree'

function PageRow({ node, depth = 0 }: { node: PageNode; depth?: number }) {
  const [open, setOpen] = useState(true)
  const { activePageId, openPage, createPage, updatePage } = useWorkspaceStore()
  const isActive = activePageId === node.id
  const hasChildren = node.children.length > 0

  return (
    <div>
      <div
        className={cn(
          'group flex h-8 items-center gap-1 rounded-lg px-1.5 text-sm transition',
          isActive ? 'bg-[var(--accent-soft)] text-[var(--text)]' : 'text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]',
        )}
        style={{ paddingLeft: 6 + depth * 14 }}
      >
        <button className="grid h-5 w-5 place-items-center rounded hover:bg-black/5" onClick={() => setOpen((value) => !value)} aria-label="Toggle page">
          {hasChildren ? open ? <ChevronsLeft size={12} className="-rotate-90" /> : <ChevronsRight size={12} /> : <span className="h-1 w-1 rounded-full bg-current opacity-40" />}
        </button>
        <button className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => openPage(node.id)}>
          <PageIcon value={node.icon} size={16} className="shrink-0" />
          <span className="truncate">{node.title || 'Untitled'}</span>
        </button>
        <div className="flex opacity-0 transition group-hover:opacity-100">
          <Tooltip label="Add child page">
            <Button size="icon" onClick={() => createPage(node.id)} icon={<FilePlus2 size={14} />} />
          </Tooltip>
          <Tooltip label={node.isFavorite ? 'Unfavorite' : 'Favorite'}>
            <Button size="icon" onClick={() => updatePage({ ...node, isFavorite: !node.isFavorite })} icon={<Star size={14} fill={node.isFavorite ? 'currentColor' : 'none'} />} />
          </Tooltip>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {open && hasChildren ? (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            {node.children.map((child) => (
              <PageRow key={child.id} node={child} depth={depth + 1} />
            ))}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  )
}

function MiniPage({ page }: { page: Page }) {
  const openPage = useWorkspaceStore((state) => state.openPage)
  return (
    <button onClick={() => openPage(page.id)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-[var(--text-muted)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text)]">
      <PageIcon value={page.icon} size={15} className="shrink-0" />
      <span className="min-w-0 flex-1 truncate">{page.title || 'Untitled'}</span>
      <span className="text-[11px] text-[var(--text-faint)]">{formatRelativeTime(page.lastOpenedAt ?? page.updatedAt)}</span>
    </button>
  )
}

export function Sidebar({ onOpenRecentPdf }: { onOpenRecentPdf: (path?: string) => void }) {
  const {
    pages,
    activePage,
    sidebarCollapsed,
    toggleSidebar,
    createPage,
    setCommandPaletteOpen,
    setSettingsOpen,
  } = useWorkspaceStore()
  const activeFile = usePdfStore((state) => state.activeFile)
  const pdf = usePdfStore((state) => state.pdf)
  const recentFiles = usePdfStore((state) => state.recentFiles)
  const setActiveView = useUiStore((state) => state.setActiveView)
  const setPdfSidebarMode = useUiStore((state) => state.setSidebarMode)
  const tree = useMemo(() => buildPageTree(pages), [pages])
  const favorites = pages.filter((page) => page.isFavorite)
  const recent = pages
    .slice()
    .sort((a, b) => (b.lastOpenedAt ?? b.updatedAt).localeCompare(a.lastOpenedAt ?? a.updatedAt))
    .slice(0, 4)
  const lastPdf = activeFile
    ? { name: activeFile.name, path: activeFile.path, pageCount: pdf?.numPages, lastOpened: activeFile.openedAt }
    : recentFiles[0]

  const openLastPdf = () => {
    if (!lastPdf) return
    if (activeFile && pdf) {
      setActiveView('pdf')
      setPdfSidebarMode('thumbnails')
      return
    }
    onOpenRecentPdf(lastPdf.path)
  }

  if (sidebarCollapsed) {
    return (
      <aside className="flex w-[58px] flex-col items-center border-r border-[var(--border)] bg-[var(--sidebar)] pt-12 pb-3">
        <Button size="icon" onClick={toggleSidebar} icon={<PanelLeftClose size={17} />} />
        <div className="mt-4 flex flex-col gap-2">
          <Button size="icon" onClick={() => createPage()} icon={<FilePlus2 size={17} />} />
          <Button size="icon" onClick={openLastPdf} disabled={!lastPdf} title={lastPdf ? `Open last PDF: ${lastPdf.name}` : 'No recent PDF'} icon={<FileText size={17} />} />
          <Button size="icon" onClick={() => setCommandPaletteOpen(true)} icon={<Command size={17} />} />
          <Button size="icon" onClick={() => setSettingsOpen(true)} icon={<Settings size={17} />} />
        </div>
      </aside>
    )
  }

  return (
    <motion.aside className="flex w-[292px] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--sidebar)]" initial={false} animate={{ width: 292 }}>
      <div className="flex items-center gap-3 px-4 pt-12 pb-4">
        <img src="/velora-icon.png" alt="Velora Notes" className="h-9 w-9 rounded-xl object-cover shadow-lift" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold tracking-wide text-[var(--text)]">Velora Notes</h1>
          <p className="truncate text-xs text-[var(--text-faint)]">Private local workspace</p>
        </div>
        <Button size="icon" onClick={toggleSidebar} icon={<PanelLeftClose size={16} />} />
      </div>

      <div className="grid gap-2 px-3">
        <Button variant="primary" className="w-full justify-start" onClick={() => createPage()} icon={<FilePlus2 size={16} />}>
          New Page
        </Button>
        <Button
          variant="secondary"
          className="w-full justify-start"
          onClick={openLastPdf}
          disabled={!lastPdf}
          title={lastPdf ? `Open last PDF: ${lastPdf.name}` : 'Open a PDF first'}
          icon={<FileText size={16} />}
        >
          <span className="min-w-0 flex-1 truncate text-left">Last PDF</span>
          {lastPdf?.pageCount ? <span className="text-[11px] font-medium text-[var(--text-faint)]">{lastPdf.pageCount}p</span> : null}
        </Button>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="soft" onClick={() => setCommandPaletteOpen(true)} icon={<Search size={15} />}>
            Search
          </Button>
          <Button variant="soft" onClick={() => setCommandPaletteOpen(true)} icon={<Command size={15} />}>
            Quick
          </Button>
        </div>
      </div>

      <div className="flex-1 space-y-5 overflow-y-auto px-3 py-5">
        {favorites.length > 0 ? (
          <section>
            <h2 className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]">Favorites</h2>
            {favorites.map((page) => (
              <MiniPage key={page.id} page={page} />
            ))}
          </section>
        ) : null}

        <section>
          <h2 className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]">Recent</h2>
          {recent.map((page) => (
            <MiniPage key={page.id} page={page} />
          ))}
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between px-2">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]">All pages</h2>
            <Button size="icon" onClick={() => createPage()} icon={<FilePlus2 size={14} />} />
          </div>
          <div className="space-y-0.5">
            {tree.map((node) => (
              <PageRow key={node.id} node={node} />
            ))}
          </div>
        </section>
      </div>

      <div className="border-t border-[var(--border)] p-3">
        {activePage ? (
          <div className="mb-2 flex items-center gap-2 rounded-xl bg-[var(--surface)] px-3 py-2 text-xs text-[var(--text-muted)] shadow-sm">
            <Archive size={14} />
            <span className="min-w-0 flex-1 truncate">Saved in local SQLite</span>
            <MoreHorizontal size={14} />
          </div>
        ) : null}
        <Button className="w-full justify-start" onClick={() => setSettingsOpen(true)} icon={<Settings size={15} />}>
          Settings
        </Button>
      </div>
    </motion.aside>
  )
}
