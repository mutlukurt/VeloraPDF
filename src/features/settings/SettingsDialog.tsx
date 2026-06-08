import { BookOpen, Check, Database, Download, FileJson, Info, Moon, RotateCcw, Shield, SlidersHorizontal, Sun, Upload } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { Button } from '../../components/ui/Button'
import { Modal } from '../../components/ui/Modal'
import { db } from '../../lib/db/client'
import { exportPagesAsPdfZip } from '../../lib/export/pdf'
import { useWorkspaceStore } from '../../lib/store/workspace'
import { cn } from '../../lib/utils/cn'
import { downloadBlob } from '../../lib/utils/files'

type SettingsTab = 'appearance' | 'data' | 'editor' | 'about'

type EditorPreferences = {
  fontSize: number
  lineHeight: number
  editorWidth: number
  focusMode: boolean
  showWordCount: boolean
}

const defaultPreferences: EditorPreferences = {
  fontSize: 17,
  lineHeight: 1.78,
  editorWidth: 860,
  focusMode: false,
  showWordCount: true,
}

const PREF_KEY = 'kairnly.editor-preferences'

function readPreferences(): EditorPreferences {
  try {
    const raw = localStorage.getItem(PREF_KEY)
    return raw ? { ...defaultPreferences, ...JSON.parse(raw) } : defaultPreferences
  } catch {
    return defaultPreferences
  }
}

function applyPreferences(preferences: EditorPreferences) {
  document.documentElement.style.setProperty('--editor-font-size', `${preferences.fontSize}px`)
  document.documentElement.style.setProperty('--editor-line-height', String(preferences.lineHeight))
  document.documentElement.style.setProperty('--editor-max-width', `${preferences.editorWidth}px`)
  document.documentElement.dataset.focusMode = preferences.focusMode ? 'true' : 'false'
  document.documentElement.dataset.showWordCount = preferences.showWordCount ? 'true' : 'false'
  localStorage.setItem(PREF_KEY, JSON.stringify(preferences))
}

function SettingRow({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-[var(--border)] p-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-[var(--text)]">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-[var(--text-muted)]">{description}</p>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

export function SettingsDialog() {
  const { settingsOpen, setSettingsOpen, theme, setTheme, dataLocation, refreshPages, pages, activePageId, openPage } = useWorkspaceStore()
  const [activeTab, setActiveTab] = useState<SettingsTab>('appearance')
  const [preferences, setPreferences] = useState(readPreferences)
  const [status, setStatus] = useState('')
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  useEffect(() => {
    applyPreferences(preferences)
  }, [preferences])

  const exportBackup = async () => {
    const backup = await db.exportWorkspaceBackup()
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' })
    await downloadBlob(blob, `velora-notes-backup-${new Date().toISOString().slice(0, 10)}.json`)
    setStatus('Backup exported.')
  }

  const importBackup = async (file?: File) => {
    if (!file) return
    const text = await file.text()
    const backup = JSON.parse(text) as unknown
    await db.importWorkspaceBackup(backup)
    await refreshPages()
    const nextPages = await db.listPages()
    const nextPage = nextPages.find((page) => page.id === activePageId) ?? nextPages[0]
    if (nextPage) await openPage(nextPage.id)
    setStatus('Backup imported.')
  }

  const navItems: Array<{ id: SettingsTab; label: string; icon: typeof Sun }> = [
    { id: 'appearance', label: 'Appearance', icon: Sun },
    { id: 'data', label: 'Data', icon: Database },
    { id: 'editor', label: 'Editor', icon: SlidersHorizontal },
    { id: 'about', label: 'About', icon: Info },
  ]

  return (
    <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} className="max-w-4xl">
      <div className="border-b border-[var(--border)] px-6 py-5">
        <h2 className="text-lg font-semibold text-[var(--text)]">Settings</h2>
        <p className="mt-1 text-sm text-[var(--text-muted)]">Your workspace is stored locally on this device.</p>
      </div>
      <div className="grid max-h-[72vh] gap-6 overflow-hidden p-6 md:grid-cols-[220px_1fr]">
        <nav className="space-y-1 text-sm text-[var(--text-muted)]">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                className={cn(
                  'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left transition',
                  activeTab === item.id ? 'bg-[var(--surface-muted)] font-medium text-[var(--text)]' : 'hover:bg-[var(--surface-muted)] hover:text-[var(--text)]',
                )}
                onClick={() => setActiveTab(item.id)}
              >
                <Icon size={15} />
                {item.label}
              </button>
            )
          })}
        </nav>

        <div className="min-h-0 overflow-y-auto pr-1">
          {activeTab === 'appearance' ? (
            <div className="space-y-6">
              <section>
                <h3 className="text-sm font-semibold text-[var(--text)]">Theme</h3>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <button className={`rounded-xl border p-4 text-left transition ${theme === 'light' ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--border)] hover:bg-[var(--surface-muted)]'}`} onClick={() => setTheme('light')}>
                    <Sun size={18} />
                    <span className="mt-3 block text-sm font-medium">Light</span>
                    <span className="mt-1 block text-xs text-[var(--text-muted)]">Warm paper and stone</span>
                  </button>
                  <button className={`rounded-xl border p-4 text-left transition ${theme === 'dark' ? 'border-[var(--accent)] bg-[var(--accent-soft)]' : 'border-[var(--border)] hover:bg-[var(--surface-muted)]'}`} onClick={() => setTheme('dark')}>
                    <Moon size={18} />
                    <span className="mt-3 block text-sm font-medium">Dark</span>
                    <span className="mt-1 block text-xs text-[var(--text-muted)]">Deep graphite for focus</span>
                  </button>
                </div>
              </section>
            </div>
          ) : null}

          {activeTab === 'data' ? (
            <div className="space-y-5">
              <section className="rounded-2xl border border-[var(--border)] p-4">
                <div className="flex items-start gap-3">
                  <Shield size={18} className="mt-0.5 text-[var(--success)]" />
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold text-[var(--text)]">Local data location</h3>
                    <p className="mt-1 break-all text-xs text-[var(--text-muted)]">{dataLocation}</p>
                  </div>
                </div>
              </section>
              <SettingRow title="Workspace backup" description="Export every page and stored block into a portable JSON file. Import replaces the current local workspace.">
                <div className="flex flex-wrap gap-2">
                  <Button variant="soft" onClick={() => exportBackup().catch((error) => setStatus(error instanceof Error ? error.message : 'Export failed.'))} icon={<Download size={15} />}>
                    Export
                  </Button>
                  <Button variant="soft" onClick={() => fileInputRef.current?.click()} icon={<Upload size={15} />}>
                    Import
                  </Button>
                </div>
              </SettingRow>
              <SettingRow title="All notes as PDFs" description="Download every page, including nested subpages, as separate PDF files inside one ZIP archive.">
                <Button variant="soft" onClick={() => exportPagesAsPdfZip(pages, `velora-all-notes-${new Date().toISOString().slice(0, 10)}.zip`).then(() => setStatus('PDF archive exported.')).catch((error) => setStatus(error instanceof Error ? error.message : 'PDF export failed.'))} icon={<Download size={15} />}>
                  Download PDFs
                </Button>
              </SettingRow>
              <SettingRow title="Workspace stats" description="A quick local-only snapshot of what is currently indexed in Velora Notes.">
                <div className="text-right text-xs text-[var(--text-muted)]">
                  <div>{pages.length} pages</div>
                  <div>{pages.filter((page) => page.isFavorite).length} favorites</div>
                </div>
              </SettingRow>
              <input
                ref={fileInputRef}
                type="file"
                accept="application/json,.json"
                className="hidden"
                onChange={(event) => {
                  importBackup(event.target.files?.[0]).catch((error) => setStatus(error instanceof Error ? error.message : 'Import failed.'))
                  event.currentTarget.value = ''
                }}
              />
            </div>
          ) : null}

          {activeTab === 'editor' ? (
            <div className="space-y-4">
              <SettingRow title="Editor font size" description="Adjust the writing canvas type size.">
                <div className="flex items-center gap-3">
                  <input type="range" min={15} max={21} value={preferences.fontSize} onChange={(event) => setPreferences((value) => ({ ...value, fontSize: Number(event.target.value) }))} />
                  <span className="w-10 text-right text-xs text-[var(--text-muted)]">{preferences.fontSize}px</span>
                </div>
              </SettingRow>
              <SettingRow title="Line height" description="Tune reading density for long notes and drafts.">
                <div className="flex items-center gap-3">
                  <input type="range" min={1.5} max={2} step={0.02} value={preferences.lineHeight} onChange={(event) => setPreferences((value) => ({ ...value, lineHeight: Number(event.target.value) }))} />
                  <span className="w-10 text-right text-xs text-[var(--text-muted)]">{preferences.lineHeight.toFixed(2)}</span>
                </div>
              </SettingRow>
              <SettingRow title="Page width" description="Choose a narrow journal feel or a wider document workspace.">
                <div className="flex items-center gap-3">
                  <input type="range" min={720} max={980} step={20} value={preferences.editorWidth} onChange={(event) => setPreferences((value) => ({ ...value, editorWidth: Number(event.target.value) }))} />
                  <span className="w-12 text-right text-xs text-[var(--text-muted)]">{preferences.editorWidth}px</span>
                </div>
              </SettingRow>
              <SettingRow title="Word count" description="Show document word count near the page title.">
                <button className={cn('inline-flex h-8 items-center gap-2 rounded-lg px-3 text-sm transition', preferences.showWordCount ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface-muted)] text-[var(--text-muted)]')} onClick={() => setPreferences((value) => ({ ...value, showWordCount: !value.showWordCount }))}>
                  {preferences.showWordCount ? <Check size={14} /> : null}
                  {preferences.showWordCount ? 'On' : 'Off'}
                </button>
              </SettingRow>
              <SettingRow title="Focus mode" description="Softly quiets secondary editor metadata while writing.">
                <button className={cn('inline-flex h-8 items-center gap-2 rounded-lg px-3 text-sm transition', preferences.focusMode ? 'bg-[var(--accent)] text-white' : 'bg-[var(--surface-muted)] text-[var(--text-muted)]')} onClick={() => setPreferences((value) => ({ ...value, focusMode: !value.focusMode }))}>
                  {preferences.focusMode ? <Check size={14} /> : null}
                  {preferences.focusMode ? 'On' : 'Off'}
                </button>
              </SettingRow>
              <Button variant="soft" onClick={() => setPreferences(defaultPreferences)} icon={<RotateCcw size={15} />}>
                Reset editor preferences
              </Button>
            </div>
          ) : null}

          {activeTab === 'about' ? (
            <div className="space-y-5">
              <section className="rounded-2xl bg-[var(--surface-muted)] p-5">
                <div className="flex items-center gap-3">
                  <img src="/velora-icon.png" alt="Velora Notes" className="h-12 w-12 rounded-xl object-cover shadow-lift" />
                  <div>
                    <h3 className="text-base font-semibold text-[var(--text)]">Velora Notes</h3>
                    <p className="text-xs text-[var(--text-muted)]">Version 1.0.2 · Local-first desktop workspace</p>
                  </div>
                </div>
                <p className="mt-4 text-sm leading-6 text-[var(--text-muted)]">
                  Velora Notes is a private workspace for notes, pages, tasks, ideas, and structured writing. It is built around local SQLite storage and offline-first personal use.
                </p>
              </section>
              <SettingRow title="Privacy" description="No cloud sync, accounts, billing, or team collaboration are built into this workspace.">
                <Shield size={18} className="text-[var(--success)]" />
              </SettingRow>
              <SettingRow title="Editor engine" description="Rich writing is powered by a Tiptap / ProseMirror block editing architecture.">
                <BookOpen size={18} className="text-[var(--accent)]" />
              </SettingRow>
              <SettingRow title="Backup format" description="JSON backups are designed for local portability and future import/export improvements.">
                <FileJson size={18} className="text-[var(--accent)]" />
              </SettingRow>
            </div>
          ) : null}

          {status ? <p className="mt-5 rounded-xl bg-[var(--surface-muted)] px-4 py-3 text-sm text-[var(--text-muted)]">{status}</p> : null}
        </div>
      </div>
    </Modal>
  )
}
