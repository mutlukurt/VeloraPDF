import { create } from 'zustand'
import type { Page, ThemeMode, TiptapDoc } from '../../types'
import { db } from '../db/client'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

type PageDropPlacement = 'before' | 'after' | 'inside' | 'root'

type WorkspaceStore = {
  pages: Page[]
  activePageId?: string
  activePage?: Page
  activeDoc?: TiptapDoc
  theme: ThemeMode
  saveState: SaveState
  docDirty: boolean
  workspaceReady: boolean
  sidebarCollapsed: boolean
  commandPaletteOpen: boolean
  settingsOpen: boolean
  dataLocation?: string
  draggedPageId: string | null
  dropTarget: { id: string; placement: PageDropPlacement } | null
  pageHistory: string[]
  pageHistoryIndex: number
  initialize: () => Promise<void>
  ensureActivePage: () => Promise<void>
  openPage: (pageId: string, pushToHistory?: boolean) => Promise<void>
  createPage: (parentId?: string | null) => Promise<Page>
  updatePage: (page: Page) => Promise<void>
  movePage: (pageId: string, targetId: string | null, placement: PageDropPlacement) => Promise<void>
  archiveActivePage: () => Promise<void>
  setActiveDocDraft: (doc: TiptapDoc) => void
  flushActiveDoc: () => Promise<void>
  saveActiveDoc: (doc: TiptapDoc) => Promise<void>
  refreshPages: () => Promise<void>
  setTheme: (theme: ThemeMode) => void
  toggleSidebar: () => void
  setCommandPaletteOpen: (open: boolean) => void
  setSettingsOpen: (open: boolean) => void
  setDraggedPageId: (id: string | null) => void
  setDropTarget: (target: { id: string; placement: PageDropPlacement } | null) => void
  historyNavigate: (direction: 'back' | 'forward') => Promise<void>
}

const WORKSPACE_THEME_KEY = 'kairnly.theme'
const APP_THEME_KEY = 'velora:theme'

const savedTheme = () => {
  const saved = localStorage.getItem(APP_THEME_KEY) ?? localStorage.getItem(WORKSPACE_THEME_KEY)
  return (saved === 'dark' ? 'dark' : 'light') as ThemeMode
}

function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme
  document.documentElement.classList.toggle('dark', theme === 'dark')
  localStorage.setItem(WORKSPACE_THEME_KEY, theme)
  localStorage.setItem(APP_THEME_KEY, theme)
}

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  pages: [],
  theme: savedTheme(),
  saveState: 'idle',
  docDirty: false,
  workspaceReady: false,
  sidebarCollapsed: false,
  commandPaletteOpen: false,
  settingsOpen: false,
  draggedPageId: null,
  dropTarget: null,
  pageHistory: [],
  pageHistoryIndex: -1,
  setDraggedPageId: (draggedPageId) => set({ draggedPageId }),
  setDropTarget: (dropTarget) => set({ dropTarget }),

  initialize: async () => {
    if (get().workspaceReady) return
    applyTheme(get().theme)
    const [pages, dataLocation] = await Promise.all([db.listPages(), db.getDataLocation()])
    set({ pages, dataLocation, workspaceReady: true })
  },

  ensureActivePage: async () => {
    const { activePageId, pages } = get()
    if (activePageId && pages.some((page) => page.id === activePageId)) return
    const first = pages.find((page) => page.isFavorite) ?? pages[0]
    if (first) await get().openPage(first.id)
  },

  refreshPages: async () => {
    set({ pages: await db.listPages() })
  },

  openPage: async (pageId: string, pushToHistory = true) => {
    await get().flushActiveDoc()
    const [page, doc] = await Promise.all([db.getPage(pageId), db.loadPageContent(pageId)])
    if (!page) return

    set((state) => {
      let nextHistory = [...state.pageHistory]
      let nextIndex = state.pageHistoryIndex

      if (pushToHistory) {
        nextHistory = nextHistory.slice(0, nextIndex + 1)
        if (nextHistory[nextIndex] !== pageId) {
          nextHistory.push(pageId)
          nextIndex = nextHistory.length - 1
        }
      }

      return {
        activePageId: pageId,
        activePage: page,
        activeDoc: doc,
        pages: state.pages.map((item) => (item.id === page.id ? page : item)),
        saveState: 'saved',
        docDirty: false,
        pageHistory: nextHistory,
        pageHistoryIndex: nextIndex,
      }
    })
  },

  historyNavigate: async (direction: 'back' | 'forward') => {
    const { pageHistory, pageHistoryIndex, openPage } = get()
    if (direction === 'back' && pageHistoryIndex > 0) {
      const nextIndex = pageHistoryIndex - 1
      const pageId = pageHistory[nextIndex]
      await openPage(pageId, false)
      set({ pageHistoryIndex: nextIndex })
    } else if (direction === 'forward' && pageHistoryIndex < pageHistory.length - 1) {
      const nextIndex = pageHistoryIndex + 1
      const pageId = pageHistory[nextIndex]
      await openPage(pageId, false)
      set({ pageHistoryIndex: nextIndex })
    }
  },

  createPage: async (parentId?: string | null) => {
    await get().flushActiveDoc()
    const page = await db.createPage('Untitled', parentId)
    const pages = await db.listPages()
    set({ pages })
    await get().openPage(page.id)
    return page
  },

  updatePage: async (page: Page) => {
    const updated = await db.updatePageMetadata(page)
    set((state) => ({
      activePage: state.activePageId === updated.id ? updated : state.activePage,
      pages: state.pages.map((item) => (item.id === updated.id ? updated : item)),
    }))
  },

  movePage: async (pageId, targetId, placement) => {
    const pages = get().pages
    const moving = pages.find((page) => page.id === pageId)
    const target = targetId ? pages.find((page) => page.id === targetId) : undefined
    if (!moving) return

    if (placement !== 'root' && (!target || moving.id === target.id)) return

    if (target) {
      let cursor: Page | undefined = target
      while (cursor?.parentId) {
        if (cursor.parentId === moving.id) return
        cursor = pages.find((page) => page.id === cursor?.parentId)
      }
    }

    const nextParentId = placement === 'root' ? null : placement === 'inside' && target ? target.id : target?.parentId ?? null
    const siblings = pages
      .filter((page) => page.id !== moving.id && (page.parentId ?? null) === nextParentId)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title))

    let insertIndex = siblings.length
    if (placement !== 'inside' && placement !== 'root' && target) {
      const targetIndex = siblings.findIndex((page) => page.id === target.id)
      if (targetIndex >= 0) insertIndex = placement === 'before' ? targetIndex : targetIndex + 1
    }

    const ordered = [...siblings]
    ordered.splice(insertIndex, 0, { ...moving, parentId: nextParentId })

    const changed = ordered
      .map((page, index) => ({ ...page, parentId: nextParentId, sortOrder: index }))
      .filter((page) => {
        const original = pages.find((item) => item.id === page.id)
        return original && ((original.parentId ?? null) !== (page.parentId ?? null) || original.sortOrder !== page.sortOrder)
      })

    for (const page of changed) {
      await db.updatePageMetadata(page)
    }

    const refreshed = await db.listPages()
    const active = get().activePageId ? refreshed.find((page) => page.id === get().activePageId) : undefined
    set({ pages: refreshed, activePage: active ?? get().activePage })
  },

  archiveActivePage: async () => {
    const activePageId = get().activePageId
    if (!activePageId) return
    await get().flushActiveDoc()
    await db.archivePage(activePageId)
    const pages = await db.listPages()
    const next = pages[0]
    set({ pages, activePageId: undefined, activePage: undefined, activeDoc: undefined, docDirty: false })
    if (next) await get().openPage(next.id)
  },

  setActiveDocDraft: (doc: TiptapDoc) => {
    set({ activeDoc: doc, docDirty: true, saveState: 'idle' })
  },

  flushActiveDoc: async () => {
    const { activePageId, activeDoc, docDirty } = get()
    if (!activePageId || !activeDoc || !docDirty) return
    await get().saveActiveDoc(activeDoc)
  },

  saveActiveDoc: async (doc: TiptapDoc) => {
    const pageId = get().activePageId
    if (!pageId) return
    set({ saveState: 'saving', activeDoc: doc })
    try {
      const page = await db.savePageContent(pageId, doc)
      set((state) => ({
        saveState: 'saved',
        docDirty: false,
        activePage: page,
        pages: state.pages.map((item) => (item.id === page.id ? page : item)),
      }))
    } catch (error) {
      console.error(error)
      set({ saveState: 'error' })
    }
  },

  setTheme: (theme: ThemeMode) => {
    applyTheme(theme)
    set({ theme })
  },
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setCommandPaletteOpen: (commandPaletteOpen: boolean) => set({ commandPaletteOpen }),
  setSettingsOpen: (settingsOpen: boolean) => set({ settingsOpen }),
}))
