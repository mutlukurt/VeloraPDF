import type { Page, SearchResult, TiptapDoc, TiptapNode } from '../../types'
import { plainTextFromNode } from '../utils/text'

type LocalDb = {
  pages: Page[]
  docs: Record<string, TiptapDoc>
}

const KEY = 'kairnly.local.sqlite-fallback.v1'

const now = () => new Date().toISOString()

const welcomeDoc: TiptapDoc = {
  type: 'doc',
  content: [
    { type: 'heading', attrs: { level: 1 }, content: [{ type: 'text', text: 'Build your private workspace' }] },
    {
      type: 'paragraph',
      content: [
        {
          type: 'text',
          text: 'Kairnly keeps notes, drafts, tasks, and references close to you. In the desktop build, this content is stored in local SQLite.',
        },
      ],
    },
    {
      type: 'taskList',
      content: [
        {
          type: 'taskItem',
          attrs: { checked: true },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Create a page' }] }],
        },
        {
          type: 'taskItem',
          attrs: { checked: false },
          content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Capture a thought with slash commands' }] }],
        },
      ],
    },
    {
      type: 'blockquote',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'A cairn is a marker. Kairnly is a trail of markers for your future self.' }] }],
    },
    {
      type: 'codeBlock',
      attrs: { language: 'ts' },
      content: [{ type: 'text', text: 'const workspace = "local-first";' }],
    },
    { type: 'horizontalRule' },
    { type: 'paragraph', content: [{ type: 'text', text: 'Create nested pages from the sidebar when an idea wants its own room.' }] },
  ],
}

function seed(): LocalDb {
  const timestamp = now()
  const id = crypto.randomUUID()
  const childId = crypto.randomUUID()
  return {
    pages: [
      {
        id,
        title: 'Welcome to Kairnly',
        icon: '🪨',
        cover: null,
        parentId: null,
        sortOrder: 0,
        isFavorite: true,
        isArchived: false,
        createdAt: timestamp,
        updatedAt: timestamp,
        lastOpenedAt: timestamp,
      },
      {
        id: childId,
        title: 'First private project',
        icon: '✦',
        cover: null,
        parentId: id,
        sortOrder: 0,
        isFavorite: false,
        isArchived: false,
        createdAt: timestamp,
        updatedAt: timestamp,
        lastOpenedAt: null,
      },
    ],
    docs: {
      [id]: welcomeDoc,
      [childId]: { type: 'doc', content: [{ type: 'paragraph' }] },
    },
  }
}

function read(): LocalDb {
  const existing = localStorage.getItem(KEY)
  if (!existing) {
    const db = seed()
    write(db)
    return db
  }
  return JSON.parse(existing) as LocalDb
}

function write(db: LocalDb) {
  localStorage.setItem(KEY, JSON.stringify(db))
}

export const localFallback = {
  async getDataLocation() {
    return 'Browser preview storage. Desktop build uses SQLite in the app data directory.'
  },
  async listPages() {
    return read().pages.filter((page) => !page.isArchived)
  },
  async getPage(pageId: string) {
    const db = read()
    const page = db.pages.find((item) => item.id === pageId)
    if (!page) return null
    page.lastOpenedAt = now()
    write(db)
    return page
  },
  async createPage(title = 'Untitled', parentId?: string | null) {
    const db = read()
    const timestamp = now()
    const page: Page = {
      id: crypto.randomUUID(),
      title,
      icon: '□',
      cover: null,
      parentId: parentId ?? null,
      sortOrder: db.pages.filter((item) => item.parentId === (parentId ?? null)).length,
      isFavorite: false,
      isArchived: false,
      createdAt: timestamp,
      updatedAt: timestamp,
      lastOpenedAt: timestamp,
    }
    db.pages.push(page)
    db.docs[page.id] = { type: 'doc', content: [{ type: 'paragraph' }] }
    write(db)
    return page
  },
  async updatePageMetadata(page: Page) {
    const db = read()
    const index = db.pages.findIndex((item) => item.id === page.id)
    const updated = { ...page, updatedAt: now() }
    if (index >= 0) db.pages[index] = updated
    write(db)
    return updated
  },
  async archivePage(pageId: string) {
    const db = read()
    db.pages = db.pages.map((page) => (page.id === pageId ? { ...page, isArchived: true, updatedAt: now() } : page))
    write(db)
  },
  async loadPageContent(pageId: string) {
    return read().docs[pageId] ?? { type: 'doc', content: [{ type: 'paragraph' }] }
  },
  async savePageContent(pageId: string, docJson: TiptapDoc) {
    const db = read()
    db.docs[pageId] = docJson
    const page = db.pages.find((item) => item.id === pageId)
    if (!page) throw new Error('Page not found')
    page.updatedAt = now()
    write(db)
    return page
  },
  async searchWorkspace(query: string): Promise<SearchResult[]> {
    const db = read()
    const q = query.trim().toLowerCase()
    const pages = db.pages.filter((page) => !page.isArchived)
    if (!q) {
      return pages
        .sort((a, b) => (b.lastOpenedAt ?? b.updatedAt).localeCompare(a.lastOpenedAt ?? a.updatedAt))
        .slice(0, 12)
        .map((page) => ({ id: page.id, pageId: page.id, title: page.title, kind: 'page', snippet: page.title, updatedAt: page.updatedAt }))
    }
    return pages
      .flatMap((page) => {
        const body = plainTextFromNode(db.docs[page.id])
        const titleMatch = page.title.toLowerCase().includes(q)
        const bodyMatch = body.toLowerCase().includes(q)
        if (!titleMatch && !bodyMatch) return []
        return [
          {
            id: page.id,
            pageId: page.id,
            title: page.title,
            kind: titleMatch ? 'page' : 'block',
            snippet: bodyMatch ? body.slice(0, 160) : page.title,
            updatedAt: page.updatedAt,
          } satisfies SearchResult,
        ]
      })
      .slice(0, 24)
  },
  async exportWorkspaceBackup() {
    return read()
  },
  async importWorkspaceBackup(backup: unknown) {
    if (!backup || typeof backup !== 'object') throw new Error('Invalid backup file')
    const candidate = backup as Partial<LocalDb> & { version?: number; pages?: Page[]; docs?: Record<string, TiptapDoc>; blocks?: unknown[] }
    if (candidate.pages && candidate.docs) {
      write({ pages: candidate.pages, docs: candidate.docs })
      return
    }
    if (candidate.pages && candidate.blocks) {
      const docs: Record<string, TiptapDoc> = {}
      candidate.pages.forEach((page) => {
        docs[page.id] = { type: 'doc', content: [] }
      })
      candidate.blocks.forEach((block) => {
        const item = block as { pageId?: string; content?: unknown }
        if (item.pageId && docs[item.pageId] && item.content) {
          docs[item.pageId].content = [...(docs[item.pageId].content ?? []), item.content as TiptapNode]
        }
      })
      write({ pages: candidate.pages, docs })
      return
    }
    throw new Error('Backup does not contain Kairnly workspace data')
  },
}
