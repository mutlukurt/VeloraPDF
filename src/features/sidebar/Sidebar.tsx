import { motion } from 'framer-motion'
import {
  Archive,
  Command,
  FileText,
  FilePlus2,
  MoreHorizontal,
  PanelLeftClose,
  X,
  Search,
  Settings,
  Star,
  ChevronRight,
  ChevronDown,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { Tooltip } from '../../components/ui/Tooltip'
import { PageIcon } from '../../lib/icons/pageIcons'
import { useWorkspaceStore } from '../../lib/store/workspace'
import { cn } from '../../lib/utils/cn'
import { formatRelativeTime } from '../../lib/utils/text'
import { usePdfStore } from '../../stores/usePdfStore'
import type { RecentFile } from '../../stores/usePdfStore'
import { useUiStore } from '../../stores/useUiStore'
import type { Page } from '../../types'
import veloraIconUrl from '../../assets/velora-icon.png'
import { buildPageTree, type PageNode } from './pageTree'

type PageDropPlacement = 'before' | 'after' | 'inside' | 'root'
const ROOT_DROP_ID = '__root__'

const flattenNodes = (nodes: PageNode[]): PageNode[] => nodes.flatMap((node) => [node, ...flattenNodes(node.children)])

function PageRow({
  page,
  childCount,
  depth,
  isExpanded,
  onToggleExpand,
  draggedPageId,
  dropTarget,
  onPointerDownPage,
  suppressClick,
}: {
  page: PageNode
  childCount: number
  depth: number
  isExpanded: boolean
  onToggleExpand: (id: string) => void
  draggedPageId: string | null
  dropTarget: { id: string; placement: PageDropPlacement } | null
  onPointerDownPage: (event: React.PointerEvent<HTMLDivElement>, page: PageNode) => void
  suppressClick: boolean
}) {
  const { activePageId, openPage, createPage, updatePage } = useWorkspaceStore()
  const isActive = activePageId === page.id
  const isDragging = draggedPageId === page.id
  const placement = dropTarget?.id === page.id ? dropTarget.placement : null

  return (
    <div
      data-page-id={page.id}
      data-page-parent-id={page.parentId ?? ''}
      onPointerDown={(event) => onPointerDownPage(event, page)}
      onClick={() => {
        if (!suppressClick) openPage(page.id)
      }}
      className={cn(
        'group relative flex min-h-9 cursor-grab select-none items-center gap-1 rounded-lg py-1 pr-1.5 text-sm transition active:cursor-grabbing',
        isActive ? 'bg-[var(--accent-soft)] text-[var(--text)]' : 'text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]',
        isDragging ? 'touch-none opacity-40' : 'touch-pan-y',
        placement === 'inside' && 'bg-[var(--accent-soft)]/70 ring-2 ring-[var(--accent)]/30',
      )}
      style={{ paddingLeft: `${depth * 14 + 6}px` }}
    >
      {placement === 'before' ? <span className="absolute right-2 top-0 h-0.5 rounded-full bg-[var(--accent)]" style={{ left: `${depth * 14 + 6}px` }} /> : null}
      {placement === 'after' ? <span className="absolute bottom-0 right-2 h-0.5 rounded-full bg-[var(--accent)]" style={{ left: `${depth * 14 + 6}px` }} /> : null}
      
      {childCount > 0 ? (
        <button
          type="button"
          onPointerDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation()
            onToggleExpand(page.id)
          }}
          className="grid h-5 w-5 shrink-0 place-items-center rounded hover:bg-[var(--accent-soft)] text-[var(--text-muted)] transition"
        >
          {isExpanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
        </button>
      ) : (
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded">
          <span className="h-1 w-1 rounded-full bg-current opacity-40" />
        </span>
      )}
      
      <div className="flex min-w-0 flex-1 items-center gap-2 text-left">
        <PageIcon value={page.icon} size={16} className="shrink-0" />
        <div className="min-w-0 flex-1">
          <span className="block truncate">{page.title || 'Untitled'}</span>
        </div>
      </div>
      <div className="flex shrink-0 opacity-0 transition group-hover:opacity-100 group-focus-within:opacity-100">
        <Tooltip label="Add child page">
          <Button
            size="icon"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation()
              createPage(page.id)
            }}
            icon={<FilePlus2 size={14} />}
          />
        </Tooltip>
        <Tooltip label={page.isFavorite ? 'Unfavorite' : 'Favorite'}>
          <Button
            size="icon"
            onPointerDown={(event) => event.stopPropagation()}
            onClick={(event) => {
              event.stopPropagation()
              updatePage({ ...page, isFavorite: !page.isFavorite })
            }}
            icon={<Star size={14} fill={page.isFavorite ? 'currentColor' : 'none'} />}
          />
        </Tooltip>
      </div>
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

export function Sidebar({
  onOpenRecentPdf,
  mobileOpen = false,
  onMobileClose,
}: {
  onOpenRecentPdf: (file: RecentFile) => void
  mobileOpen?: boolean
  onMobileClose?: () => void
}) {
  const {
    pages,
    activePageId,
    activePage,
    sidebarCollapsed,
    toggleSidebar,
    createPage,
    setCommandPaletteOpen,
    setSettingsOpen,
    draggedPageId,
    dropTarget,
    setDraggedPageId,
    setDropTarget,
  } = useWorkspaceStore()
  const activeFile = usePdfStore((state) => state.activeFile)
  const pdf = usePdfStore((state) => state.pdf)
  const recentFiles = usePdfStore((state) => state.recentFiles)
  const setActiveView = useUiStore((state) => state.setActiveView)
  const setPdfSidebarMode = useUiStore((state) => state.setSidebarMode)
  const tree = useMemo(() => buildPageTree(pages), [pages])
  const flatNodes = useMemo(() => flattenNodes(tree), [tree])
  const nodeById = useMemo(() => new Map(flatNodes.map((node) => [node.id, node])), [flatNodes])

  const [expandedIds, setExpandedIds] = useState<Record<string, boolean>>({})

  // Auto-expand ancestors when active page changes
  useEffect(() => {
    if (activePageId) {
      const ancestors: string[] = []
      let currentId = activePageId
      while (currentId) {
        const page = pages.find((p) => p.id === currentId)
        if (page && page.parentId) {
          ancestors.push(page.parentId)
          currentId = page.parentId
        } else {
          break
        }
      }
      if (ancestors.length > 0) {
        setExpandedIds((prev) => {
          const next = { ...prev }
          let changed = false
          for (const id of ancestors) {
            if (!next[id]) {
              next[id] = true
              changed = true
            }
          }
          return changed ? next : prev
        })
      }
    }
  }, [activePageId, pages])

  const handleToggleExpand = (id: string) => {
    setExpandedIds((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  const getVisibleNodes = (nodes: PageNode[], expanded: Record<string, boolean>, depth = 0): (PageNode & { depth: number })[] => {
    return nodes.flatMap((node) => {
      const isExpanded = !!expanded[node.id]
      const nodeWithDepth = { ...node, depth }
      if (isExpanded && node.children && node.children.length > 0) {
        return [nodeWithDepth, ...getVisibleNodes(node.children, expanded, depth + 1)]
      }
      return [nodeWithDepth]
    })
  }

  const visibleNodes = useMemo(() => getVisibleNodes(tree, expandedIds), [tree, expandedIds])

  const pageDragRef = useRef<{ sourceId: string; startX: number; startY: number; dragging: boolean } | null>(null)
  const longPressTimerRef = useRef<number | null>(null)
  const suppressPageClickRef = useRef(false)
  const favorites = pages.filter((page) => page.isFavorite)
  const recent = pages
    .slice()
    .sort((a, b) => (b.lastOpenedAt ?? b.updatedAt).localeCompare(a.lastOpenedAt ?? a.updatedAt))
    .slice(0, 4)
  const lastPdf = activeFile
    ? { name: activeFile.name, path: activeFile.path, browserId: activeFile.browserId, pageCount: pdf?.numPages, lastOpened: activeFile.openedAt }
    : recentFiles[0]

  const openLastPdf = () => {
    if (!lastPdf) return
    if (activeFile && pdf) {
      setActiveView('pdf')
      setPdfSidebarMode('thumbnails')
      onMobileClose?.()
      return
    }
    onOpenRecentPdf(lastPdf)
    onMobileClose?.()
  }

  const openCommandPalette = () => {
    onMobileClose?.()
    setCommandPaletteOpen(true)
  }

  const isDescendant = (node: PageNode, candidateId: string): boolean =>
    node.children.some((child) => child.id === candidateId || isDescendant(child, candidateId))

  const pageDropPlacement = (row: HTMLElement, clientY: number): PageDropPlacement => {
    const rect = row.getBoundingClientRect()
    const offset = clientY - rect.top
    if (offset < rect.height * 0.28) return 'before'
    if (offset > rect.height * 0.72) return 'after'
    return 'inside'
  }

  const handlePagePointerDown = (event: React.PointerEvent<HTMLDivElement>, node: PageNode) => {
    if (event.button !== 0) return
    if (longPressTimerRef.current) {
      window.clearTimeout(longPressTimerRef.current)
    }
    pageDragRef.current = { sourceId: node.id, startX: event.clientX, startY: event.clientY, dragging: false }
    suppressPageClickRef.current = false

    longPressTimerRef.current = window.setTimeout(() => {
      if (pageDragRef.current && pageDragRef.current.sourceId === node.id) {
        pageDragRef.current.dragging = true
        suppressPageClickRef.current = true
        setDraggedPageId(node.id)
      }
    }, 2000)
  }

  useEffect(() => {
    const handleMove = (event: PointerEvent) => {
      const drag = pageDragRef.current
      if (!drag) return
      const distance = Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY)
      
      if (!drag.dragging) {
        // If they move too far (> 10px) before the 2 seconds, cancel long press
        if (distance > 10) {
          if (longPressTimerRef.current) {
            window.clearTimeout(longPressTimerRef.current)
            longPressTimerRef.current = null
          }
          pageDragRef.current = null
        }
        return
      }

      suppressPageClickRef.current = true
      
      const element = document.elementFromPoint(event.clientX, event.clientY) as HTMLElement | null
      
      // Check for dropping on the active page's editor area
      const editorDrop = element?.closest<HTMLElement>('[data-editor-drop-zone]')
      if (editorDrop) {
        const activeId = useWorkspaceStore.getState().activePageId
        if (activeId && activeId !== drag.sourceId) {
          const sourceNode = nodeById.get(drag.sourceId)
          const isActiveDescendant = sourceNode ? isDescendant(sourceNode, activeId) : false
          if (!isActiveDescendant) {
            setDropTarget({ id: activeId, placement: 'inside' })
            return
          }
        }
      }

      const rootDrop = element?.closest<HTMLElement>('[data-page-root-drop]')
      if (rootDrop) {
        setDropTarget({ id: ROOT_DROP_ID, placement: 'root' })
        return
      }
      const row = element?.closest<HTMLElement>('[data-page-id]')
      if (!row) {
        setDropTarget(null)
        return
      }
      const targetId = row.dataset.pageId
      const targetNode = targetId ? nodeById.get(targetId) : undefined
      if (!targetNode || targetNode.id === drag.sourceId || isDescendant(targetNode, drag.sourceId)) {
        setDropTarget(null)
        return
      }
      setDropTarget({ id: targetNode.id, placement: pageDropPlacement(row, event.clientY) })
    }

    const handleUp = async () => {
      if (longPressTimerRef.current) {
        window.clearTimeout(longPressTimerRef.current)
        longPressTimerRef.current = null
      }
      const drag = pageDragRef.current
      pageDragRef.current = null
      const target = useWorkspaceStore.getState().dropTarget
      setDraggedPageId(null)
      setDropTarget(null)
      window.setTimeout(() => {
        suppressPageClickRef.current = false
      }, 0)
      if (!drag?.dragging || !target) return
      await useWorkspaceStore.getState().movePage(drag.sourceId, target.id, target.placement)
    }

    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
    window.addEventListener('pointercancel', handleUp)
    return () => {
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
      window.removeEventListener('pointercancel', handleUp)
    }
  }, [nodeById])

  if (sidebarCollapsed && !mobileOpen) {
    return (
      <aside className="hidden w-[58px] flex-col items-center border-r border-[var(--border)] bg-[var(--sidebar)] pb-3 pt-12 md:flex">
        <Button size="icon" onClick={toggleSidebar} icon={<PanelLeftClose size={17} />} />
        <div className="mt-4 flex flex-col gap-2">
          <Button size="icon" onClick={() => createPage()} icon={<FilePlus2 size={17} />} />
          <Button size="icon" onClick={openLastPdf} disabled={!lastPdf} title={lastPdf ? `Open last PDF: ${lastPdf.name}` : 'No recent PDF'} icon={<FileText size={17} />} />
          <Button size="icon" onClick={openCommandPalette} icon={<Command size={17} />} />
          <Button size="icon" onClick={() => setSettingsOpen(true)} icon={<Settings size={17} />} />
        </div>
      </aside>
    )
  }

  return (
    <motion.aside
      className={cn(
        'fixed bottom-0 left-0 top-0 z-[70] flex w-[min(320px,100vw)] shrink-0 flex-col border-r border-[var(--border)] bg-[var(--sidebar)] shadow-lift transition-transform duration-200 md:static md:z-auto md:w-[292px] md:shadow-none',
        mobileOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
      )}
      initial={false}
      animate={{ width: 292 }}
    >
      <div className="flex items-center gap-3 px-4 pt-12 pb-4">
        <img src={veloraIconUrl} alt="Velora Notes" className="h-9 w-9 rounded-xl object-cover shadow-lift" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold tracking-wide text-[var(--text)]">Velora Notes</h1>
          <p className="truncate text-xs text-[var(--text-faint)]">Private local workspace</p>
        </div>
        <Button className="hidden md:inline-flex" size="icon" onClick={toggleSidebar} icon={<PanelLeftClose size={16} />} />
        <Button className="md:hidden" size="icon" onClick={onMobileClose} icon={<X size={16} />} />
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
          <Button variant="soft" onClick={openCommandPalette} icon={<Search size={15} />}>
            Search
          </Button>
          <Button variant="soft" onClick={openCommandPalette} icon={<Command size={15} />}>
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
            <div
              data-page-root-drop
              className={cn(
                'mb-1 hidden rounded-full border border-dashed border-[var(--accent)]/40 px-3 py-1.5 text-center text-[11px] font-semibold text-[var(--accent)] transition',
                draggedPageId && 'block',
                dropTarget?.id === ROOT_DROP_ID && 'border-[var(--accent)] bg-[var(--accent-soft)] shadow-sm',
              )}
            >
              Drop here for top level
            </div>
            {visibleNodes.map((node) => (
              <PageRow
                key={node.id}
                page={node}
                childCount={node.children.length}
                depth={node.depth}
                isExpanded={!!expandedIds[node.id]}
                onToggleExpand={handleToggleExpand}
                draggedPageId={draggedPageId}
                dropTarget={dropTarget}
                onPointerDownPage={handlePagePointerDown}
                suppressClick={suppressPageClickRef.current}
              />
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
