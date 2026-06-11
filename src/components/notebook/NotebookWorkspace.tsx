import { ArrowLeft, Download, Edit3, Folder, FolderPlus, MoreVertical, NotebookTabs, Plus, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '../ui/Button'
import { NotebookPaper, emptyPaperState, notebookPaperStorageKey, writeNotebookPaper } from '../../features/editor/NotebookPaper'
import { exportNotebookPdf } from '../../features/editor/notebookExport'

type NotebookFolder = {
  id: string
  name: string
  createdAt: number
}

type NotebookItem = {
  id: string
  title: string
  folderId: string | null
  createdAt: number
  updatedAt: number
}

type NotebookLibrary = {
  folders: NotebookFolder[]
  notebooks: NotebookItem[]
}

const LIBRARY_KEY = 'velora.notebook-library.v1'
const rootFolderId = 'all'

function now() {
  return Date.now()
}

function createId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function defaultLibrary(): NotebookLibrary {
  const timestamp = now()
  const id = createId('notebook')
  writeNotebookPaper(id, emptyPaperState())
  return {
    folders: [
      { id: createId('folder'), name: 'School', createdAt: timestamp },
      { id: createId('folder'), name: 'Projects', createdAt: timestamp },
    ],
    notebooks: [{ id, title: 'Velora Notebook', folderId: null, createdAt: timestamp, updatedAt: timestamp }],
  }
}

function readLibrary(): NotebookLibrary {
  try {
    const raw = localStorage.getItem(LIBRARY_KEY)
    if (!raw) {
      const seeded = defaultLibrary()
      localStorage.setItem(LIBRARY_KEY, JSON.stringify(seeded))
      return seeded
    }
    const parsed = JSON.parse(raw) as Partial<NotebookLibrary>
    return {
      folders: Array.isArray(parsed.folders) ? parsed.folders : [],
      notebooks: Array.isArray(parsed.notebooks) ? parsed.notebooks : [],
    }
  } catch {
    return { folders: [], notebooks: [] }
  }
}

function writeLibrary(library: NotebookLibrary) {
  localStorage.setItem(LIBRARY_KEY, JSON.stringify(library))
}

function formatDate(value: number) {
  return new Date(value).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

export function NotebookWorkspace() {
  const [library, setLibrary] = useState<NotebookLibrary>(() => readLibrary())
  const [activeFolderId, setActiveFolderId] = useState(rootFolderId)
  const [activeNotebookId, setActiveNotebookId] = useState<string | null>(null)
  const [busyExportId, setBusyExportId] = useState('')
  const activeNotebook = library.notebooks.find((notebook) => notebook.id === activeNotebookId) ?? null
  const activeFolder = activeFolderId === rootFolderId ? null : library.folders.find((folder) => folder.id === activeFolderId) ?? null

  useEffect(() => {
    writeLibrary(library)
  }, [library])

  const visibleNotebooks = useMemo(() => {
    return library.notebooks
      .filter((notebook) => (activeFolderId === rootFolderId ? true : notebook.folderId === activeFolderId))
      .sort((left, right) => right.updatedAt - left.updatedAt)
  }, [activeFolderId, library.notebooks])

  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    library.notebooks.forEach((notebook) => {
      const key = notebook.folderId ?? rootFolderId
      counts[key] = (counts[key] ?? 0) + 1
    })
    return counts
  }, [library.notebooks])

  function createNotebook() {
    const title = window.prompt('Notebook name', 'Untitled notebook')?.trim()
    if (!title) return
    const timestamp = now()
    const notebook: NotebookItem = {
      id: createId('notebook'),
      title,
      folderId: activeFolderId === rootFolderId ? null : activeFolderId,
      createdAt: timestamp,
      updatedAt: timestamp,
    }
    writeNotebookPaper(notebook.id, emptyPaperState())
    setLibrary((current) => ({ ...current, notebooks: [notebook, ...current.notebooks] }))
    setActiveNotebookId(notebook.id)
  }

  function createFolder() {
    const name = window.prompt('Folder name', 'New folder')?.trim()
    if (!name) return
    setLibrary((current) => ({ ...current, folders: [...current.folders, { id: createId('folder'), name, createdAt: now() }] }))
  }

  function renameNotebook(notebook: NotebookItem) {
    const title = window.prompt('Notebook name', notebook.title)?.trim()
    if (!title) return
    setLibrary((current) => ({
      ...current,
      notebooks: current.notebooks.map((item) => (item.id === notebook.id ? { ...item, title, updatedAt: now() } : item)),
    }))
  }

  function renameFolder(folder: NotebookFolder) {
    const name = window.prompt('Folder name', folder.name)?.trim()
    if (!name) return
    setLibrary((current) => ({ ...current, folders: current.folders.map((item) => (item.id === folder.id ? { ...item, name } : item)) }))
  }

  function deleteNotebook(notebook: NotebookItem) {
    if (!window.confirm(`Delete "${notebook.title}"?`)) return
    localStorage.removeItem(notebookPaperStorageKey(notebook.id))
    setLibrary((current) => ({ ...current, notebooks: current.notebooks.filter((item) => item.id !== notebook.id) }))
    if (activeNotebookId === notebook.id) setActiveNotebookId(null)
  }

  function deleteFolder(folder: NotebookFolder) {
    if (!window.confirm(`Delete folder "${folder.name}"? Notebooks inside will move to All.`)) return
    setLibrary((current) => ({
      folders: current.folders.filter((item) => item.id !== folder.id),
      notebooks: current.notebooks.map((notebook) => (notebook.folderId === folder.id ? { ...notebook, folderId: null, updatedAt: now() } : notebook)),
    }))
    if (activeFolderId === folder.id) setActiveFolderId(rootFolderId)
  }

  function moveNotebook(notebook: NotebookItem) {
    const options = ['All', ...library.folders.map((folder) => folder.name)]
    const selected = window.prompt(`Move to folder:\n${options.join('\n')}`, activeFolderId === rootFolderId ? 'All' : activeFolder?.name ?? 'All')?.trim()
    if (!selected) return
    const folder = library.folders.find((item) => item.name.toLowerCase() === selected.toLowerCase())
    if (selected.toLowerCase() !== 'all' && !folder) {
      window.alert('Folder not found.')
      return
    }
    setLibrary((current) => ({
      ...current,
      notebooks: current.notebooks.map((item) => (item.id === notebook.id ? { ...item, folderId: folder?.id ?? null, updatedAt: now() } : item)),
    }))
  }

  async function handleExport(notebook: NotebookItem) {
    try {
      setBusyExportId(notebook.id)
      await exportNotebookPdf(notebook)
    } catch (error) {
      window.alert(error instanceof Error ? error.message : 'Notebook PDF export failed.')
    } finally {
      setBusyExportId('')
    }
  }

  if (activeNotebook) {
    return (
      <main className="flex min-w-0 flex-1 flex-col overflow-hidden bg-[var(--workspace)] text-[var(--text)]">
        <header className="kairnly-editor-header flex min-h-14 items-center gap-3 border-b border-[var(--border-subtle)] bg-[var(--background-translucent)] px-4 py-2 pl-16 backdrop-blur-xl md:h-14 md:px-6">
          <Button size="icon" variant="secondary" onClick={() => setActiveNotebookId(null)} icon={<ArrowLeft size={17} />} aria-label="Back to notebooks" />
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)]">
            <NotebookTabs size={18} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-black text-[var(--text)]">{activeNotebook.title}</div>
            <div className="truncate text-xs font-semibold text-[var(--text-faint)]">{activeFolder?.name ?? 'All notebooks'}</div>
          </div>
          <Button size="sm" variant="secondary" onClick={() => handleExport(activeNotebook)} icon={<Download size={15} />} disabled={busyExportId === activeNotebook.id}>
            PDF
          </Button>
        </header>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 pb-20 pt-3 md:px-8 md:pb-8 md:pt-6">
          <NotebookPaper
            pageId={activeNotebook.id}
            pageTitle={activeNotebook.title}
            standalone
            onChange={() => {
              setLibrary((current) => ({
                ...current,
                notebooks: current.notebooks.map((item) => (item.id === activeNotebook.id ? { ...item, updatedAt: now() } : item)),
              }))
            }}
          />
        </div>
      </main>
    )
  }

  return (
    <main className="flex min-w-0 flex-1 overflow-hidden bg-[var(--workspace)] text-[var(--text)]">
      <aside className="hidden w-64 shrink-0 border-r border-[var(--border)] bg-[var(--surface)] p-4 md:block">
        <div className="mb-4 flex items-center justify-between">
          <div className="text-xs font-black uppercase tracking-[0.14em] text-[var(--text-faint)]">Folders</div>
          <button className="grid h-8 w-8 place-items-center rounded-lg bg-[var(--surface-muted)] text-[var(--text)]" onClick={createFolder} aria-label="New folder">
            <FolderPlus size={16} />
          </button>
        </div>
        <button className={`mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-bold ${activeFolderId === rootFolderId ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--text-muted)] hover:bg-[var(--surface-muted)]'}`} onClick={() => setActiveFolderId(rootFolderId)}>
          <span>All notebooks</span>
          <span>{library.notebooks.length}</span>
        </button>
        {library.folders.map((folder) => (
          <div key={folder.id} className={`group mb-1 flex items-center gap-1 rounded-lg ${activeFolderId === folder.id ? 'bg-[var(--accent-soft)] text-[var(--accent)]' : 'text-[var(--text-muted)] hover:bg-[var(--surface-muted)]'}`}>
            <button className="flex min-w-0 flex-1 items-center gap-2 px-3 py-2 text-left text-sm font-bold" onClick={() => setActiveFolderId(folder.id)}>
              <Folder size={15} />
              <span className="truncate">{folder.name}</span>
              <span className="ml-auto">{folderCounts[folder.id] ?? 0}</span>
            </button>
            <button className="mr-1 grid h-7 w-7 place-items-center rounded-md opacity-70 hover:bg-[var(--surface)]" onClick={() => renameFolder(folder)} aria-label="Rename folder">
              <Edit3 size={13} />
            </button>
            <button className="mr-1 grid h-7 w-7 place-items-center rounded-md opacity-70 hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]" onClick={() => deleteFolder(folder)} aria-label="Delete folder">
              <Trash2 size={13} />
            </button>
          </div>
        ))}
      </aside>
      <section className="min-w-0 flex-1 overflow-auto px-4 pb-24 pt-6 md:px-8">
        <header className="mb-6 flex flex-wrap items-center gap-3">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-[var(--accent-soft)] text-[var(--accent)]">
            <NotebookTabs size={22} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-2xl font-black text-[var(--text)]">{activeFolder?.name ?? 'Notebook Library'}</h1>
            <p className="text-sm font-semibold text-[var(--text-faint)]">Create, organize, export, and open handwritten notebooks.</p>
          </div>
          <Button variant="secondary" onClick={createFolder} icon={<FolderPlus size={16} />}>
            Folder
          </Button>
          <Button variant="primary" onClick={createNotebook} icon={<Plus size={16} />}>
            Notebook
          </Button>
        </header>
        {visibleNotebooks.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface)] p-8 text-center text-sm font-semibold text-[var(--text-muted)]">
            No notebooks here yet.
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visibleNotebooks.map((notebook) => {
              const folder = library.folders.find((item) => item.id === notebook.folderId)
              return (
                <article key={notebook.id} className="rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4 shadow-[0_12px_34px_rgba(31,31,28,0.06)]">
                  <button className="mb-4 aspect-[1/1.2] w-full overflow-hidden rounded-lg border border-[var(--border)] bg-[#fffef9] text-left shadow-inner" onClick={() => setActiveNotebookId(notebook.id)}>
                    <div className="flex h-full flex-col justify-between p-4">
                      <div className="space-y-3 pt-8">
                        {Array.from({ length: 8 }, (_, index) => (
                          <div key={index} className="h-px bg-[#dfe3ee]" />
                        ))}
                      </div>
                      <div>
                        <div className="truncate text-base font-black text-[#16161b]">{notebook.title}</div>
                        <div className="mt-1 text-xs font-bold text-[#777a82]">{folder?.name ?? 'All notebooks'}</div>
                      </div>
                    </div>
                  </button>
                  <div className="flex items-start gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-black text-[var(--text)]">{notebook.title}</div>
                      <div className="text-xs font-semibold text-[var(--text-faint)]">Edited {formatDate(notebook.updatedAt)}</div>
                    </div>
                    <button className="paper-tool" onClick={() => renameNotebook(notebook)} aria-label="Rename notebook">
                      <Edit3 size={15} />
                    </button>
                    <button className="paper-tool" onClick={() => moveNotebook(notebook)} aria-label="Move notebook">
                      <MoreVertical size={15} />
                    </button>
                    <button className="paper-tool" onClick={() => handleExport(notebook)} disabled={busyExportId === notebook.id} aria-label="Export notebook PDF">
                      <Download size={15} />
                    </button>
                    <button className="paper-tool" onClick={() => deleteNotebook(notebook)} aria-label="Delete notebook">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </section>
    </main>
  )
}
