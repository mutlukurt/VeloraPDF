export type ThemeMode = 'light' | 'dark'

export type BlockType =
  | 'paragraph'
  | 'heading'
  | 'bulletList'
  | 'orderedList'
  | 'taskList'
  | 'blockquote'
  | 'details'
  | 'horizontalRule'
  | 'codeBlock'
  | 'table'
  | 'image'
  | 'callout'

export interface Page {
  id: string
  title: string
  icon?: string | null
  cover?: string | null
  parentId?: string | null
  sortOrder: number
  isFavorite: boolean
  isArchived: boolean
  createdAt: string
  updatedAt: string
  lastOpenedAt?: string | null
}

export interface Block {
  id: string
  pageId: string
  parentBlockId?: string | null
  type: BlockType
  contentJson: unknown
  propertiesJson: Record<string, unknown>
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export interface SearchResult {
  id: string
  pageId: string
  title: string
  kind: 'page' | 'block'
  snippet: string
  updatedAt: string
}

export interface WorkspaceState {
  pages: Page[]
  activePageId?: string
  activePage?: Page
  activeDoc?: TiptapDoc
  theme: ThemeMode
  isSaving: boolean
  saveState: 'idle' | 'saving' | 'saved' | 'error'
}

export interface TiptapDoc {
  type: 'doc'
  content?: TiptapNode[]
}

export interface TiptapNode {
  type: string
  attrs?: Record<string, unknown>
  content?: TiptapNode[]
  text?: string
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>
}
