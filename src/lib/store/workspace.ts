import { create } from 'zustand'
import type { Page, ThemeMode, TiptapDoc } from '../../types'
import { db } from '../db/client'

type SaveState = 'idle' | 'saving' | 'saved' | 'error'

type WorkspaceStore = {
  pages: Page[]
  activePageId?: string
  activePage?: Page
  activeDoc?: TiptapDoc
  theme: ThemeMode
  saveState: SaveState
  sidebarCollapsed: boolean
  commandPaletteOpen: boolean
  settingsOpen: boolean
  dataLocation?: string
  initialize: () => Promise<void>
  openPage: (pageId: string) => Promise<void>
  createPage: (parentId?: string | null) => Promise<Page>
  updatePage: (page: Page) => Promise<void>
  movePage: (pageId: string, targetId: string, placement: 'before' | 'after' | 'inside') => Promise<void>
  archiveActivePage: () => Promise<void>
  saveActiveDoc: (doc: TiptapDoc) => Promise<void>
  refreshPages: () => Promise<void>
  setTheme: (theme: ThemeMode) => void
  toggleSidebar: () => void
  setCommandPaletteOpen: (open: boolean) => void
  setSettingsOpen: (open: boolean) => void
}

const savedTheme = () => (localStorage.getItem('kairnly.theme') === 'dark' ? 'dark' : 'light') as ThemeMode

function applyTheme(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme
  localStorage.setItem('kairnly.theme', theme)
}

export const useWorkspaceStore = create<WorkspaceStore>((set, get) => ({
  pages: [],
  theme: savedTheme(),
  saveState: 'idle',
  sidebarCollapsed: false,
  commandPaletteOpen: false,
  settingsOpen: false,

  initialize: async () => {
    applyTheme(get().theme)
    const [pages, dataLocation] = await Promise.all([db.listPages(), db.getDataLocation()])
    const first = pages.find((page) => page.isFavorite) ?? pages[0]
    set({ pages, dataLocation })
    if (first) await get().openPage(first.id)
  },

  refreshPages: async () => {
    set({ pages: await db.listPages() })
  },

  openPage: async (pageId: string) => {
    const [page, doc] = await Promise.all([db.getPage(pageId), db.loadPageContent(pageId)])
    if (!page) return
    set((state) => ({
      activePageId: pageId,
      activePage: page,
      activeDoc: doc,
      pages: state.pages.map((item) => (item.id === page.id ? page : item)),
      saveState: 'saved',
    }))
  },

  createPage: async (parentId?: string | null) => {
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
    const target = pages.find((page) => page.id === targetId)
    if (!moving || !target || moving.id === target.id) return

    let cursor: Page | undefined = target
    while (cursor?.parentId) {
      if (cursor.parentId === moving.id) return
      cursor = pages.find((page) => page.id === cursor?.parentId)
    }

    const nextParentId = placement === 'inside' ? target.id : target.parentId ?? null
    const siblings = pages
      .filter((page) => page.id !== moving.id && (page.parentId ?? null) === nextParentId)
      .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title))

    let insertIndex = siblings.length
    if (placement !== 'inside') {
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
    await db.archivePage(activePageId)
    const pages = await db.listPages()
    const next = pages[0]
    set({ pages, activePageId: undefined, activePage: undefined, activeDoc: undefined })
    if (next) await get().openPage(next.id)
  },

  saveActiveDoc: async (doc: TiptapDoc) => {
    const pageId = get().activePageId
    if (!pageId) return
    set({ saveState: 'saving', activeDoc: doc })
    try {
      const page = await db.savePageContent(pageId, doc)
      set((state) => ({
        saveState: 'saved',
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
