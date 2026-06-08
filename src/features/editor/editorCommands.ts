import type { JSONContent } from '@tiptap/core'
import type { Editor } from '@tiptap/react'
import {
  Bookmark,
  CalendarDays,
  Code2,
  Columns3,
  File,
  FilePlus2,
  Film,
  Heading1,
  Heading2,
  Heading3,
  Image,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Minus,
  PanelTop,
  Pilcrow,
  Quote,
  Table,
  TextQuote,
  ToggleLeft,
} from 'lucide-react'
import type { ComponentType } from 'react'

export type CommandCategory = 'Suggested' | 'Basic blocks' | 'Media' | 'Advanced'

export type InsertContext =
  | { source: 'slash'; range: { from: number; to: number } }
  | { source: 'plus'; insertAt: number; targetBlockId?: string; parentBlockId?: string | null; pageId?: string }

export type EditorCommand = {
  id: string
  title: string
  description: string
  category: CommandCategory
  aliases: string[]
  icon: any
  hint?: string
  suggested?: boolean
  action: (editor: Editor, context: InsertContext, helpers: CommandHelpers) => Promise<void> | void
}

export type CommandHelpers = {
  createSubpage?: () => Promise<void> | void
  pickLocalFile?: (kind: 'image' | 'video' | 'file') => Promise<JSONContent | null>
}

const paragraph = (text = ''): JSONContent => ({
  type: 'paragraph',
  content: text ? [{ type: 'text', text }] : undefined,
})

const heading = (level: 1 | 2 | 3): JSONContent => ({
  type: 'heading',
  attrs: { level },
})

const blockquote = (text = ''): JSONContent => ({
  type: 'blockquote',
  content: [paragraph(text)],
})

const codeBlock = (): JSONContent => ({
  type: 'codeBlock',
  attrs: { language: null },
})

const table = (): JSONContent => ({
  type: 'table',
  content: Array.from({ length: 3 }, (_, row) => ({
    type: 'tableRow',
    content: Array.from({ length: 3 }, () => ({
      type: row === 0 ? 'tableHeader' : 'tableCell',
      content: [paragraph()],
    })),
  })),
})

const focusPos = (insertAt: number, offset = 1) => insertAt + offset

function getSlashRange(editor: Editor, context: Extract<InsertContext, { source: 'slash' }>) {
  const { state } = editor
  const { selection } = state
  const blockStart = selection.$from.start()
  const parent = selection.$from.parent
  const parentText = parent.textBetween(0, parent.content.size, '\n', '\0')
  const match = /(?:^|\s)\/([^\s/]*)$/.exec(parentText)
  if (!match) {
    const textBeforeCursor = state.doc.textBetween(blockStart, selection.from, '\n', '\0')
    const cursorMatch = /(?:^|\s)\/([^\s/]*)$/.exec(textBeforeCursor)
    if (!cursorMatch) return context.range

    const query = cursorMatch[1] ?? ''
    return {
      from: selection.from - query.length - 1,
      to: selection.from,
    }
  }

  const query = match[1] ?? ''
  const slashOffset = parentText.lastIndexOf(`/${query}`)
  return {
    from: blockStart + slashOffset,
    to: blockStart + parentText.length,
  }
}

const getInsertStart = (editor: Editor, context: InsertContext) => (context.source === 'slash' ? getSlashRange(editor, context).from : context.insertAt)

function focusInsertedContent(editor: Editor, position: number) {
  window.requestAnimationFrame(() => {
    if (editor.isDestroyed) return
    try {
      editor.chain().focus().setTextSelection(position).run()
    } catch {
      editor.chain().focus().run()
    }
  })
}

function insertContent(editor: Editor, context: InsertContext, content: JSONContent | JSONContent[], focusOffset: number | null = 1) {
  const insertStart = getInsertStart(editor, context)
  if (context.source === 'slash') {
    editor.chain().focus().deleteRange(getSlashRange(editor, context)).insertContent(content).run()
  } else {
    editor.chain().focus().insertContentAt(context.insertAt, content).run()
  }
  if (focusOffset !== null) focusInsertedContent(editor, focusPos(insertStart, focusOffset))
}

function insertList(editor: Editor, context: InsertContext, listName: 'bulletList' | 'orderedList' | 'taskList') {
  if (context.source === 'slash') {
    editor.chain().focus().deleteRange(getSlashRange(editor, context)).run()
  } else {
    editor.chain().focus().insertContentAt(context.insertAt, paragraph()).setTextSelection(context.insertAt + 1).run()
  }

  const chain = editor.chain().focus()
  if (listName === 'taskList') chain.toggleTaskList().run()
  if (listName === 'bulletList') chain.toggleBulletList().run()
  if (listName === 'orderedList') chain.toggleOrderedList().run()

  window.requestAnimationFrame(() => {
    if (!editor.isDestroyed) editor.view.focus()
  })
}

function insertTextPrompt(editor: Editor, context: InsertContext, label: string, promptText: string) {
  insertContent(editor, context, blockquote(`${label}: ${promptText}`), 3)
}

async function insertUrlBlock(editor: Editor, context: InsertContext, label: string) {
  const url = window.prompt(`${label} URL`)
  if (url) {
    insertContent(editor, context, {
      type: 'mediaBlock',
      attrs: {
        kind: label.toLowerCase().includes('bookmark') ? 'bookmark' : 'embed',
        src: url,
        label: url,
      },
    })
    return
  }
  insertContent(editor, context, blockquote(`${label}: Paste a URL`), 3)
}

export const editorCommands: EditorCommand[] = [
  {
    id: 'text',
    title: 'Text',
    description: 'Start writing with plain text',
    category: 'Basic blocks',
    aliases: ['paragraph', 'plain text'],
    icon: Pilcrow,
    hint: 'Enter',
    suggested: true,
    action: (editor, context) => insertContent(editor, context, paragraph()),
  },
  {
    id: 'page',
    title: 'Page',
    description: 'Create a nested page',
    category: 'Suggested',
    aliases: ['subpage', 'child page'],
    icon: FilePlus2,
    suggested: true,
    action: async (editor, context, helpers) => {
      await helpers.createSubpage?.()
      insertContent(editor, context, blockquote('Page link: New subpage'), 3)
    },
  },
  {
    id: 'todo',
    title: 'Todo list',
    description: 'Track a task',
    category: 'Basic blocks',
    aliases: ['checkbox', 'task'],
    icon: ListChecks,
    suggested: true,
    action: (editor, context) => insertList(editor, context, 'taskList'),
  },
  {
    id: 'heading1',
    title: 'Heading 1',
    description: 'Large section heading',
    category: 'Basic blocks',
    aliases: ['h1', 'title'],
    icon: Heading1,
    suggested: true,
    action: (editor, context) => insertContent(editor, context, heading(1)),
  },
  {
    id: 'heading2',
    title: 'Heading 2',
    description: 'Medium section heading',
    category: 'Basic blocks',
    aliases: ['h2', 'subtitle'],
    icon: Heading2,
    suggested: true,
    action: (editor, context) => insertContent(editor, context, heading(2)),
  },
  {
    id: 'heading3',
    title: 'Heading 3',
    description: 'Small section heading',
    category: 'Basic blocks',
    aliases: ['h3'],
    icon: Heading3,
    suggested: true,
    action: (editor, context) => insertContent(editor, context, heading(3)),
  },
  {
    id: 'divider',
    title: 'Divider',
    description: 'Visually separate sections',
    category: 'Basic blocks',
    aliases: ['line', 'separator', 'hr'],
    icon: Minus,
    suggested: true,
    action: (editor, context) => insertContent(editor, context, [{ type: 'horizontalRule' }, paragraph()], 2),
  },
  {
    id: 'image',
    title: 'Image',
    description: 'Upload or paste image URL',
    category: 'Media',
    aliases: ['photo', 'picture'],
    icon: Image,
    suggested: true,
    action: async (editor, context, helpers) => {
      const local = await helpers.pickLocalFile?.('image')
      if (local) {
        insertContent(editor, context, local)
        return
      }
      const src = window.prompt('Image URL')
      if (src) insertContent(editor, context, { type: 'image', attrs: { src, alt: '' } })
      else insertTextPrompt(editor, context, 'Image', 'Upload or paste image URL')
    },
  },
  {
    id: 'file',
    title: 'File',
    description: 'Attach a local file reference',
    category: 'Media',
    aliases: ['attachment', 'document'],
    icon: File,
    suggested: true,
    action: async (editor, context, helpers) => {
      const local = await helpers.pickLocalFile?.('file')
      if (local) insertContent(editor, context, local)
      else insertTextPrompt(editor, context, 'File', 'Choose a local file path')
    },
  },
  {
    id: 'callout',
    title: 'Callout',
    description: 'Highlight an important idea',
    category: 'Basic blocks',
    aliases: ['note', 'alert'],
    icon: PanelTop,
    suggested: true,
    action: (editor, context) => insertContent(editor, context, blockquote('Note: '), 3),
  },
  {
    id: 'bullet',
    title: 'Bulleted list',
    description: 'Simple unordered list',
    category: 'Basic blocks',
    aliases: ['ul', 'list'],
    icon: List,
    action: (editor, context) => insertList(editor, context, 'bulletList'),
  },
  {
    id: 'numbered',
    title: 'Numbered list',
    description: 'Ordered steps',
    category: 'Basic blocks',
    aliases: ['ol', 'steps'],
    icon: ListOrdered,
    action: (editor, context) => insertList(editor, context, 'orderedList'),
  },
  {
    id: 'toggle',
    title: 'Toggle list',
    description: 'Collapsible-style detail block',
    category: 'Basic blocks',
    aliases: ['details', 'collapse'],
    icon: ToggleLeft,
    action: (editor, context) => insertContent(editor, context, blockquote('Toggle: '), 3),
  },
  {
    id: 'quote',
    title: 'Quote',
    description: 'Capture a quote or aside',
    category: 'Basic blocks',
    aliases: ['blockquote'],
    icon: Quote,
    action: (editor, context) => insertContent(editor, context, blockquote()),
  },
  {
    id: 'video',
    title: 'Video',
    description: 'Add a local video or URL card',
    category: 'Media',
    aliases: ['movie', 'youtube'],
    icon: Film,
    action: async (editor, context, helpers) => {
      const local = await helpers.pickLocalFile?.('video')
      if (local) insertContent(editor, context, local)
      else insertUrlBlock(editor, context, 'Video')
    },
  },
  {
    id: 'embed',
    title: 'Embed',
    description: 'Embed a URL as a local card',
    category: 'Media',
    aliases: ['iframe', 'url'],
    icon: Link2,
    action: (editor, context) => insertUrlBlock(editor, context, 'Embed'),
  },
  {
    id: 'bookmark',
    title: 'Web bookmark',
    description: 'Save a URL preview card',
    category: 'Media',
    aliases: ['link preview', 'bookmark', 'url preview'],
    icon: Bookmark,
    action: (editor, context) => insertUrlBlock(editor, context, 'Bookmark'),
  },
  {
    id: 'code',
    title: 'Code block',
    description: 'Write code or commands',
    category: 'Advanced',
    aliases: ['snippet', 'pre'],
    icon: Code2,
    action: (editor, context) => insertContent(editor, context, codeBlock()),
  },
  {
    id: 'table',
    title: 'Table',
    description: 'Simple structured grid',
    category: 'Advanced',
    aliases: ['grid', 'cells'],
    icon: Table,
    action: (editor, context) => insertContent(editor, context, table(), 4),
  },
  {
    id: 'subpage',
    title: 'Subpage',
    description: 'Create and link a child page',
    category: 'Advanced',
    aliases: ['child page', 'nested page'],
    icon: FilePlus2,
    action: async (editor, context, helpers) => {
      await helpers.createSubpage?.()
      insertContent(editor, context, blockquote('Page link: New subpage'), 3)
    },
  },
  {
    id: 'page-mention',
    title: 'Page mention',
    description: 'Mention another page',
    category: 'Advanced',
    aliases: ['@page', 'mention'],
    icon: TextQuote,
    action: (editor, context) => insertContent(editor, context, paragraph('@Page')),
  },
  {
    id: 'date',
    title: 'Date mention',
    description: 'Insert today’s date',
    category: 'Advanced',
    aliases: ['today', 'calendar'],
    icon: CalendarDays,
    action: (editor, context) => insertContent(editor, context, paragraph(new Date().toLocaleDateString())),
  },
  {
    id: 'columns',
    title: 'Columns',
    description: 'Column placeholder',
    category: 'Advanced',
    aliases: ['layout'],
    icon: Columns3,
    action: (editor, context) => insertContent(editor, context, blockquote('Columns: two-column layout placeholder'), 3),
  },
  {
    id: 'toc',
    title: 'Table of contents',
    description: 'Outline placeholder',
    category: 'Advanced',
    aliases: ['outline', 'contents'],
    icon: List,
    action: (editor, context) => insertContent(editor, context, blockquote('Table of contents'), 3),
  },
]

export function filterCommands(query: string) {
  const q = query.trim().toLowerCase()
  if (!q) return editorCommands
  return editorCommands.filter((command) =>
    [command.title, command.description, command.category, ...command.aliases].some((value) => value.toLowerCase().includes(q)),
  )
}
