import { Archive, FilePlus2, Moon, Search, Settings, Star, Sun, Download } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Modal } from '../../components/ui/Modal'
import { db } from '../../lib/db/client'
import { useWorkspaceStore } from '../../lib/store/workspace'
import { downloadBlob } from '../../lib/utils/files'
import { formatRelativeTime } from '../../lib/utils/text'
import type { SearchResult } from '../../types'

export function CommandPalette() {
  const {
    commandPaletteOpen,
    setCommandPaletteOpen,
    setSettingsOpen,
    createPage,
    openPage,
    activePage,
    updatePage,
    archiveActivePage,
    theme,
    setTheme,
  } = useWorkspaceStore()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])

  useEffect(() => {
    if (!commandPaletteOpen) return
    db.searchWorkspace(query).then(setResults)
  }, [query, commandPaletteOpen])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setCommandPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [setCommandPaletteOpen])

  const commands = useMemo(
    () =>
      [
        {
          label: 'Create new page',
          detail: 'Add a private page',
          icon: FilePlus2,
          run: () => createPage(),
        },
        {
          label: 'Go to settings',
          detail: 'Theme, backups, privacy',
          icon: Settings,
          run: () => setSettingsOpen(true),
        },
        {
          label: theme === 'dark' ? 'Use light theme' : 'Use dark theme',
          detail: 'Switch writing atmosphere',
          icon: theme === 'dark' ? Sun : Moon,
          run: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
        },
        {
          label: activePage?.isFavorite ? 'Unfavorite current page' : 'Favorite current page',
          detail: activePage?.title ?? 'No page selected',
          icon: Star,
          run: () => activePage && updatePage({ ...activePage, isFavorite: !activePage.isFavorite }),
        },
        {
          label: 'Export workspace backup',
          detail: 'Download local JSON backup',
          icon: Download,
          run: async () => {
            const backup = await db.exportWorkspaceBackup()
            const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
            await downloadBlob(blob, `velora-notes-backup-${new Date().toISOString().slice(0, 10)}.json`)
          },
        },
        {
          label: 'Archive current page',
          detail: activePage?.title ?? 'No page selected',
          icon: Archive,
          run: archiveActivePage,
        },
      ].filter((command) => command.label.toLowerCase().includes(query.toLowerCase()) || command.detail.toLowerCase().includes(query.toLowerCase())),
    [activePage, archiveActivePage, createPage, query, setSettingsOpen, setTheme, theme, updatePage],
  )

  const close = () => {
    setCommandPaletteOpen(false)
    setQuery('')
  }

  return (
    <Modal open={commandPaletteOpen} onClose={close}>
      <div className="flex items-center gap-3 border-b border-[var(--border)] px-4 py-3">
        <Search size={18} className="text-[var(--text-faint)]" />
        <input
          autoFocus
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search pages or run a command..."
          className="h-9 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--text-faint)]"
        />
        <kbd className="rounded-md border border-[var(--border)] px-1.5 py-1 text-[11px] text-[var(--text-faint)]">Esc</kbd>
      </div>
      <div className="max-h-[520px] overflow-y-auto p-2">
        {commands.length > 0 ? (
          <div className="mb-2">
            <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]">Commands</div>
            {commands.map((command) => {
              const Icon = command.icon
              return (
                <button
                  key={command.label}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-[var(--surface-muted)]"
                  onClick={async () => {
                    await command.run()
                    close()
                  }}
                >
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--surface-muted)] text-[var(--text-muted)]">
                    <Icon size={17} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-[var(--text)]">{command.label}</span>
                    <span className="block truncate text-xs text-[var(--text-muted)]">{command.detail}</span>
                  </span>
                </button>
              )
            })}
          </div>
        ) : null}

        <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]">Pages</div>
        {results.map((result) => (
          <button
            key={`${result.kind}-${result.id}`}
            className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-[var(--surface-muted)]"
            onClick={() => {
              openPage(result.pageId)
              close()
            }}
          >
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
              {result.kind === 'page' ? '□' : '¶'}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-[var(--text)]">{result.title}</span>
              <span className="block truncate text-xs text-[var(--text-muted)]">{result.snippet}</span>
            </span>
            <span className="text-[11px] text-[var(--text-faint)]">{formatRelativeTime(result.updatedAt)}</span>
          </button>
        ))}
        {results.length === 0 && commands.length === 0 ? (
          <div className="px-4 py-12 text-center">
            <p className="text-sm font-medium text-[var(--text)]">No matching pages yet.</p>
            <button className="mt-3 rounded-lg bg-[var(--accent)] px-3 py-2 text-sm font-medium text-white" onClick={() => createPage()}>
              Create a new page
            </button>
          </div>
        ) : null}
      </div>
    </Modal>
  )
}
