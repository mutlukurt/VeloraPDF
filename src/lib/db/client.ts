import { invoke } from '@tauri-apps/api/core'
import type { Page, SearchResult, TiptapDoc } from '../../types'
import { localFallback } from './localFallback'

const isTauri = () => typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window

async function call<T>(command: string, args?: Record<string, unknown>, fallback?: () => Promise<T>): Promise<T> {
  if (isTauri()) return invoke<T>(command, args)
  if (!fallback) throw new Error(`No browser fallback for ${command}`)
  return fallback()
}

export const db = {
  getDataLocation: () => call<string>('get_data_location', undefined, localFallback.getDataLocation),
  listPages: () => call<Page[]>('list_pages', undefined, localFallback.listPages),
  getPage: (pageId: string) => call<Page | null>('get_page', { pageId }, () => localFallback.getPage(pageId)),
  createPage: (title?: string, parentId?: string | null) =>
    call<Page>('create_page', { title, parentId }, () => localFallback.createPage(title, parentId)),
  updatePageMetadata: (page: Page) => call<Page>('update_page_metadata', { page }, () => localFallback.updatePageMetadata(page)),
  archivePage: (pageId: string) => call<void>('archive_page', { pageId }, () => localFallback.archivePage(pageId)),
  loadPageContent: (pageId: string) => call<TiptapDoc>('load_page_content', { pageId }, () => localFallback.loadPageContent(pageId)),
  savePageContent: (pageId: string, docJson: TiptapDoc) =>
    call<Page>('save_page_content', { pageId, docJson }, () => localFallback.savePageContent(pageId, docJson)),
  searchWorkspace: (query: string) => call<SearchResult[]>('search_workspace', { query }, () => localFallback.searchWorkspace(query)),
  exportWorkspaceBackup: () => call<unknown>('export_workspace_backup', undefined, localFallback.exportWorkspaceBackup),
  importWorkspaceBackup: (backup: unknown) => call<void>('import_workspace_backup', { backup }, () => localFallback.importWorkspaceBackup(backup)),
}
