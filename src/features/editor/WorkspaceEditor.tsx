import { DndContext, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { Extension, type JSONContent } from '@tiptap/core'
import Color from '@tiptap/extension-color'
import Highlight from '@tiptap/extension-highlight'
import ImageExtension from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import { Table } from '@tiptap/extension-table'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TableRow from '@tiptap/extension-table-row'
import { TextStyle } from '@tiptap/extension-text-style'
import TaskItem from '@tiptap/extension-task-item'
import TaskList from '@tiptap/extension-task-list'
import Underline from '@tiptap/extension-underline'
import { EditorContent, useEditor } from '@tiptap/react'
import { BubbleMenu } from '@tiptap/react/menus'
import StarterKit from '@tiptap/starter-kit'
import { motion } from 'framer-motion'
import { Bold, Check, Code2, Download, GripVertical, Highlighter, Italic, Link2, Plus, Search, Strikethrough, Trash2, Underline as UnderlineIcon } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Button } from '../../components/ui/Button'
import { db } from '../../lib/db/client'
import { exportPageHtml, exportPageMarkdown } from '../../lib/export/document'
import { collectPageFamily, exportPagePdf, exportPagesAsPdfZip } from '../../lib/export/pdf'
import { PageIcon } from '../../lib/icons/pageIcons'
import { pageIconOptions } from '../../lib/icons/pageIconRegistry'
import { useWorkspaceStore } from '../../lib/store/workspace'
import { downloadText } from '../../lib/utils/files'
import { plainTextFromNode } from '../../lib/utils/text'
import type { TiptapDoc } from '../../types'
import { BlockInsertMenu } from './BlockInsertMenu'
import { MediaBlock } from './MediaBlock'
import type { InsertContext } from './editorCommands'

const textColors = [
  ['Default', ''],
  ['Gray', '#6F6A60'],
  ['Brown', '#8B6F47'],
  ['Orange', '#B8753A'],
  ['Yellow', '#B8942E'],
  ['Green', '#6E8B68'],
  ['Blue', '#4F6F8F'],
  ['Purple', '#7664A8'],
  ['Pink', '#A85D86'],
  ['Red', '#B45A4D'],
] as const
const backgroundColors = [
  ['Default', ''],
  ['Gray background', '#EEE7DA'],
  ['Brown background', '#E8D6BD'],
  ['Orange background', '#F1D2B8'],
  ['Yellow background', '#EFE1AD'],
  ['Green background', '#DCE8D4'],
  ['Blue background', '#D9E5EC'],
  ['Purple background', '#E2DDF0'],
  ['Pink background', '#EBD8E1'],
  ['Red background', '#EBCDC7'],
] as const

const blockControlsOffset = 126

function isInsideNode(editor: { state: { selection: { $from: { depth: number; node: (depth: number) => { type: { name: string }; textContent: string } } } } }, nodeName: string) {
  const { $from } = editor.state.selection
  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth)
    if (node.type.name === nodeName) return node
  }
  return null
}

const KairnlyListKeys = Extension.create({
  name: 'kairnlyListKeys',
  priority: 1000,
  addKeyboardShortcuts() {
    return {
      Enter: () => {
        const taskItem = isInsideNode(this.editor, 'taskItem')
        if (taskItem) {
          if (taskItem.textContent.trim().length === 0) return this.editor.commands.liftListItem('taskItem')
          return this.editor.commands.splitListItem('taskItem')
        }

        const listItem = isInsideNode(this.editor, 'listItem')
        if (listItem) {
          if (listItem.textContent.trim().length === 0) return this.editor.commands.liftListItem('listItem')
          return this.editor.commands.splitListItem('listItem')
        }

        return false
      },
    }
  },
})

export function WorkspaceEditor() {
  const { activePage, activeDoc, pages, updatePage, saveActiveDoc, createPage, refreshPages } = useWorkspaceStore()
  const [titleDrafts, setTitleDrafts] = useState<Record<string, string>>({})
  const [insertMenu, setInsertMenu] = useState<{
    open: boolean
    query: string
    position: { left: number; top: number }
    context: InsertContext | null
  }>({ open: false, query: '', position: { left: 0, top: 0 }, context: null })
  const [blockControls, setBlockControls] = useState<{
    visible: boolean
    position: { left: number; top: number }
    insertAt: number
    deleteFrom: number
    deleteTo: number
    targetBlockId?: string
  }>({ visible: false, position: { left: 0, top: 0 }, insertAt: 0, deleteFrom: 0, deleteTo: 0 })
  const [iconPickerOpen, setIconPickerOpen] = useState(false)
  const [iconQuery, setIconQuery] = useState('')
  const pendingFilePicker = useRef<{
    kind: 'image' | 'video' | 'file'
    resolve: (content: JSONContent | null) => void
  } | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const iconPickerRef = useRef<HTMLDivElement | null>(null)
  const saveTimer = useRef<number | null>(null)
  const titleTimer = useRef<number | null>(null)
  const blockControlsHideTimer = useRef<number | null>(null)
  const loadedPageId = useRef<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  const extensions = useMemo(
    () => [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
        link: false,
        underline: false,
      }),
      Placeholder.configure({
        placeholder: ({ node }) => (node.type.name === 'heading' ? 'Heading' : "Type '/' for commands, or just start writing…"),
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      KairnlyListKeys,
      Underline,
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      ImageExtension.configure({ inline: false, allowBase64: true }),
      MediaBlock,
      Link.configure({ openOnClick: false, autolink: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    [],
  )

  const editor = useEditor({
    extensions,
    content: activeDoc,
    editorProps: {
      attributes: {
        class: 'kairnly-editor prose prose-stone max-w-none focus:outline-none',
      },
    },
    onUpdate: ({ editor }) => {
      const doc = editor.getJSON() as TiptapDoc
      if (saveTimer.current) window.clearTimeout(saveTimer.current)
      saveTimer.current = window.setTimeout(() => saveActiveDoc(doc), 650)

      const { state, view } = editor
      const { selection } = state
      const from = selection.$from.start()
      const text = state.doc.textBetween(from, selection.from, '\n', '\0')
      const match = /(?:^|\s)\/([^\s/]*)$/.exec(text)
      if (match) {
        const query = match[1] ?? ''
        const slashFrom = selection.from - query.length - 1
        const coords = view.coordsAtPos(selection.from)
        setInsertMenu({
          open: true,
          query,
          position: { left: Math.min(coords.left, window.innerWidth - 380), top: coords.bottom + 8 },
          context: { source: 'slash', range: { from: slashFrom, to: selection.from } },
        })
      } else {
        setInsertMenu((menu) => (menu.context?.source === 'slash' ? { ...menu, open: false } : menu))
      }
    },
  })

  const filteredIconOptions = useMemo(() => {
    const query = iconQuery.trim().toLowerCase()
    if (!query) return pageIconOptions
    return pageIconOptions.filter((option) => option.label.toLowerCase().includes(query) || option.name.toLowerCase().includes(query))
  }, [iconQuery])

  useEffect(() => {
    if (!iconPickerOpen) return

    function handlePointerDown(event: PointerEvent) {
      if (!iconPickerRef.current?.contains(event.target as Node)) setIconPickerOpen(false)
    }

    document.addEventListener('pointerdown', handlePointerDown)
    return () => document.removeEventListener('pointerdown', handlePointerDown)
  }, [iconPickerOpen])

  useEffect(() => {
    if (!editor || !activeDoc || !activePage?.id) return
    if (loadedPageId.current === activePage.id) return
    editor.commands.setContent(activeDoc)
    loadedPageId.current = activePage.id
  }, [activeDoc, activePage?.id, editor])

  const saveTitle = useCallback(
    (nextTitle: string) => {
      if (!activePage) return
      if (titleTimer.current) window.clearTimeout(titleTimer.current)
      titleTimer.current = window.setTimeout(() => updatePage({ ...activePage, title: nextTitle || 'Untitled' }), 420)
    },
    [activePage, updatePage],
  )

  const closeInsertMenu = useCallback(() => {
    setInsertMenu((menu) => ({ ...menu, open: false, query: '', context: null }))
  }, [])

  const createSubpageLink = useCallback(async () => {
    if (!activePage) return
    await db.createPage('Untitled', activePage.id)
    await refreshPages()
  }, [activePage, refreshPages])

  const pickLocalFile = useCallback((kind: 'image' | 'video' | 'file') => {
    return new Promise<JSONContent | null>((resolve) => {
      pendingFilePicker.current = { kind, resolve }
      if (fileInputRef.current) {
        fileInputRef.current.accept = kind === 'image' ? 'image/*' : kind === 'video' ? 'video/*' : '*/*'
        fileInputRef.current.click()
        window.setTimeout(() => {
          const onFocus = () => {
            window.setTimeout(() => {
              if (pendingFilePicker.current?.resolve === resolve) {
                pendingFilePicker.current = null
                resolve(null)
              }
            }, 350)
            window.removeEventListener('focus', onFocus)
          }
          window.addEventListener('focus', onFocus)
        }, 0)
      } else {
        resolve(null)
      }
    })
  }, [])

  const handlePickedFile = useCallback((file?: File) => {
    const pending = pendingFilePicker.current
    pendingFilePicker.current = null
    if (!pending || !file) {
      pending?.resolve(null)
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      const src = String(reader.result ?? '')
      if (!src) {
        pending.resolve(null)
        return
      }
      if (pending.kind === 'image') {
        pending.resolve({ type: 'image', attrs: { src, alt: file.name, title: file.name } })
        return
      }
      pending.resolve({
        type: 'mediaBlock',
        attrs: {
          kind: pending.kind,
          src,
          name: file.name,
          label: file.name,
          mime: file.type || 'Local file',
        },
      })
    }
    reader.onerror = () => pending.resolve(null)
    reader.readAsDataURL(file)
  }, [])

  const updateHoveredBlock = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      if (!editor || insertMenu.open) return
      if (blockControlsHideTimer.current) {
        window.clearTimeout(blockControlsHideTimer.current)
        blockControlsHideTimer.current = null
      }
      const editorRoot = editor.view.dom
      const target = event.target as HTMLElement
      if (!editorRoot.contains(target) || target.closest('[data-block-plus]')) return

      let block: HTMLElement | null = target
      while (block && block.parentElement !== editorRoot) {
        block = block.parentElement
      }
      if (!block || block === editorRoot) {
        setBlockControls((controls) => ({ ...controls, visible: false }))
        return
      }

      const rect = block.getBoundingClientRect()
      let domPos = editor.view.posAtDOM(block, 0)
      const resolved = editor.state.doc.resolve(Math.min(Math.max(domPos, 0), editor.state.doc.content.size))
      if (resolved.depth > 0) domPos = resolved.before(resolved.depth)
      const node = editor.state.doc.nodeAt(domPos)
      if (!node) return

      setBlockControls({
        visible: true,
        position: { left: Math.max(12, rect.left - blockControlsOffset), top: rect.top + 2 },
        insertAt: domPos + node.nodeSize,
        deleteFrom: domPos,
        deleteTo: domPos + node.nodeSize,
        targetBlockId: `${domPos}`,
      })
    },
    [editor, insertMenu.open],
  )

  const scheduleBlockControlsHide = useCallback(() => {
    if (insertMenu.open) return
    if (blockControlsHideTimer.current) window.clearTimeout(blockControlsHideTimer.current)
    blockControlsHideTimer.current = window.setTimeout(() => {
      setBlockControls((controls) => ({ ...controls, visible: false }))
    }, 220)
  }, [insertMenu.open])

  if (!activePage) {
    return (
      <motion.div className="grid h-full place-items-center px-8" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="max-w-md text-center">
          <h2 className="font-serif text-4xl text-[var(--text)]">Build your private workspace.</h2>
          <p className="mt-3 text-[var(--text-muted)]">Write notes, collect ideas, and organize your thinking locally.</p>
          <Button className="mt-6" variant="primary" onClick={() => createPage()}>
            Create your first page
          </Button>
        </div>
      </motion.div>
    )
  }

  const title = titleDrafts[activePage.id] ?? activePage.title ?? ''

  return (
    <motion.main key={activePage.id} className="h-full overflow-y-auto" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.18 }}>
      {activePage.cover ? <div className="h-40 border-b border-[var(--border)] bg-[linear-gradient(135deg,var(--surface-muted),var(--accent-soft))]" /> : null}
      <DndContext sensors={sensors}>
        <div className="mx-auto max-w-[var(--editor-max-width)] px-8 pb-28 pt-12">
          <div className="mb-6 flex items-start gap-4">
            <div ref={iconPickerRef} className="relative shrink-0">
              <button
                className="grid h-14 w-14 place-items-center rounded-2xl bg-[var(--surface-muted)] text-[var(--text)] transition hover:bg-[var(--accent-soft)]"
                onClick={() => setIconPickerOpen((open) => !open)}
                aria-expanded={iconPickerOpen}
                aria-label="Change page icon"
              >
                <PageIcon value={activePage.icon} size={30} />
              </button>
              {iconPickerOpen ? (
                <div className="absolute left-0 top-16 z-40 w-[336px] overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-lift">
                  <div className="border-b border-[var(--border)] p-2">
                    <label className="flex h-9 items-center gap-2 rounded-lg bg-[var(--surface-muted)] px-2 text-sm text-[var(--text-muted)]">
                      <Search size={15} />
                      <input
                        value={iconQuery}
                        onChange={(event) => setIconQuery(event.target.value)}
                        className="min-w-0 flex-1 bg-transparent text-[var(--text)] outline-none placeholder:text-[var(--text-faint)]"
                        placeholder="Search lucide icons"
                        autoFocus
                      />
                    </label>
                  </div>
                  <div className="max-h-[360px] overflow-y-auto p-2">
                    {filteredIconOptions.length > 0 ? (
                      <div className="grid grid-cols-6 gap-1">
                        {filteredIconOptions.map((option) => {
                          const selected = activePage.icon === option.value
                          return (
                            <button
                              key={option.name}
                              className={`group relative grid h-10 place-items-center rounded-lg transition ${selected ? 'bg-[var(--accent-soft)] text-[var(--text)]' : 'text-[var(--text-muted)] hover:bg-[var(--surface-muted)] hover:text-[var(--text)]'}`}
                              onClick={() => {
                                updatePage({ ...activePage, icon: option.value })
                                setIconPickerOpen(false)
                                setIconQuery('')
                              }}
                              title={option.label}
                              aria-label={`Use ${option.label} icon`}
                            >
                              <option.Icon size={19} strokeWidth={1.9} />
                              {selected ? <Check size={11} className="absolute right-1 top-1" /> : null}
                            </button>
                          )
                        })}
                      </div>
                    ) : (
                      <div className="px-3 py-8 text-center text-sm text-[var(--text-faint)]">No icons found.</div>
                    )}
                  </div>
                  <div className="border-t border-[var(--border)] px-3 py-2 text-[11px] text-[var(--text-faint)]">
                    {filteredIconOptions.length} local lucide icons
                  </div>
                </div>
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <input
                value={title}
                onChange={(event) => {
                  setTitleDrafts((drafts) => ({ ...drafts, [activePage.id]: event.target.value }))
                  saveTitle(event.target.value)
                }}
                className="w-full bg-transparent text-5xl font-semibold leading-tight tracking-normal text-[var(--text)] outline-none placeholder:text-[var(--text-faint)]"
                placeholder="Untitled"
              />
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-[var(--text-faint)]">
                <span>Private page</span>
                <span>·</span>
                <span className="editor-word-count">{plainTextFromNode(activeDoc).split(/\s+/).filter(Boolean).length} words</span>
                <span className="editor-word-count">·</span>
                <button className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 hover:bg-[var(--surface-muted)]" onClick={() => createPage(activePage.id)}>
                  <Plus size={13} /> Subpage
                </button>
                <button
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 hover:bg-[var(--surface-muted)]"
                  onClick={() => downloadText(`${activePage.title || 'kairnly-page'}.html`, exportPageHtml(activePage, editor?.getJSON() as TiptapDoc), 'text/html').catch((error) => alert(error instanceof Error ? error.message : 'HTML export failed.'))}
                >
                  <Download size={13} /> HTML
                </button>
                <button
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 hover:bg-[var(--surface-muted)]"
                  onClick={() => downloadText(`${activePage.title || 'kairnly-page'}.md`, exportPageMarkdown(activePage, editor?.getJSON() as TiptapDoc), 'text/markdown').catch((error) => alert(error instanceof Error ? error.message : 'Markdown export failed.'))}
                >
                  <Download size={13} /> Markdown
                </button>
                <button
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 hover:bg-[var(--surface-muted)]"
                  onClick={() => exportPagePdf(activePage, editor?.getJSON() as TiptapDoc).catch((error) => alert(error instanceof Error ? error.message : 'PDF export failed.'))}
                >
                  <Download size={13} /> PDF
                </button>
                <button
                  className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 hover:bg-[var(--surface-muted)]"
                  onClick={() => exportPagesAsPdfZip(collectPageFamily(activePage.id, pages), `${activePage.title || 'kairnly-page'}-pdfs.zip`).catch((error) => alert(error instanceof Error ? error.message : 'PDF ZIP export failed.'))}
                >
                  <Download size={13} /> Page + subpages
                </button>
              </div>
            </div>
          </div>

          <div className="relative" onMouseMove={updateHoveredBlock} onMouseLeave={scheduleBlockControlsHide}>
            {blockControls.visible ? (
              <div
                data-block-controls
                className="fixed z-30 flex items-center gap-1 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-0.5 opacity-95 shadow-lift"
                style={{ left: blockControls.position.left, top: blockControls.position.top }}
                onMouseEnter={() => {
                  if (blockControlsHideTimer.current) {
                    window.clearTimeout(blockControlsHideTimer.current)
                    blockControlsHideTimer.current = null
                  }
                }}
                onMouseLeave={scheduleBlockControlsHide}
              >
                <button
                  data-block-plus
                  aria-label="Add block"
                  className="grid h-7 w-7 place-items-center rounded-md text-[var(--text-faint)] transition hover:bg-[var(--surface-muted)] hover:text-[var(--text)]"
                  onMouseDown={(event) => {
                    event.preventDefault()
                    const rect = event.currentTarget.getBoundingClientRect()
                    setInsertMenu({
                      open: true,
                      query: '',
                      position: { left: Math.min(rect.right + 8, window.innerWidth - 380), top: Math.min(rect.top, window.innerHeight - 480) },
                      context: {
                        source: 'plus',
                        insertAt: blockControls.insertAt,
                        targetBlockId: blockControls.targetBlockId,
                        pageId: activePage.id,
                        parentBlockId: null,
                      },
                    })
                  }}
                >
                  <Plus size={16} />
                </button>
                <span className="grid h-7 w-7 place-items-center rounded-md text-[var(--text-faint)]">
                  <GripVertical size={17} />
                </span>
                <button
                  data-block-plus
                  aria-label="Delete block"
                  className="grid h-7 w-7 place-items-center rounded-md text-[var(--text-faint)] transition hover:bg-[var(--danger-soft)] hover:text-[var(--danger)]"
                  onMouseDown={(event) => {
                    event.preventDefault()
                    if (!editor) return
                    const { deleteFrom, deleteTo } = blockControls
                    const fallbackParagraph = editor.state.doc.childCount <= 1
                    editor.chain().focus().deleteRange({ from: deleteFrom, to: deleteTo }).run()
                    if (fallbackParagraph && editor.state.doc.childCount === 0) {
                      editor.chain().focus().insertContent({ type: 'paragraph' }).run()
                    }
                    setBlockControls((controls) => ({ ...controls, visible: false }))
                  }}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            ) : null}
            {editor ? (
              <BubbleMenu editor={editor}>
                <div className="flex flex-wrap items-center gap-1 rounded-xl border border-[var(--border)] bg-[var(--surface)] p-1 shadow-lift">
                  <Button size="icon" onClick={() => editor.chain().focus().toggleBold().run()} icon={<Bold size={15} />} />
                  <Button size="icon" onClick={() => editor.chain().focus().toggleItalic().run()} icon={<Italic size={15} />} />
                  <Button size="icon" onClick={() => editor.chain().focus().toggleUnderline().run()} icon={<UnderlineIcon size={15} />} />
                  <Button size="icon" onClick={() => editor.chain().focus().toggleStrike().run()} icon={<Strikethrough size={15} />} />
                  <Button size="icon" onClick={() => editor.chain().focus().toggleCode().run()} icon={<Code2 size={15} />} />
                  <Button size="icon" onClick={() => editor.chain().focus().toggleHighlight().run()} icon={<Highlighter size={15} />} />
                  <Button
                    size="icon"
                    onClick={() => {
                      const url = window.prompt('Link URL')
                      if (url) editor.chain().focus().setLink({ href: url }).run()
                    }}
                    icon={<Link2 size={15} />}
                  />
                  <select
                    aria-label="Text color"
                    className="h-8 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-xs text-[var(--text-muted)] outline-none"
                    defaultValue=""
                    onChange={(event) => {
                      const value = event.target.value
                      if (value) editor.chain().focus().setColor(value).run()
                      else editor.chain().focus().unsetColor().run()
                    }}
                  >
                    {textColors.map(([label, value]) => (
                      <option key={label} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                  <select
                    aria-label="Background color"
                    className="h-8 rounded-md border border-[var(--border)] bg-[var(--surface)] px-2 text-xs text-[var(--text-muted)] outline-none"
                    defaultValue=""
                    onChange={(event) => {
                      const value = event.target.value
                      if (value) editor.chain().focus().toggleHighlight({ color: value }).run()
                      else editor.chain().focus().unsetHighlight().run()
                    }}
                  >
                    {backgroundColors.map(([label, value]) => (
                      <option key={label} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>
              </BubbleMenu>
            ) : null}
            <EditorContent editor={editor} />
          </div>
        </div>
      </DndContext>
      <BlockInsertMenu
        editor={editor}
        open={insertMenu.open}
        query={insertMenu.query}
        position={insertMenu.position}
        context={insertMenu.context}
        helpers={{ createSubpage: createSubpageLink, pickLocalFile }}
        onQueryChange={(query) => setInsertMenu((menu) => ({ ...menu, query }))}
        onClose={closeInsertMenu}
      />
      <input
        ref={fileInputRef}
        type="file"
        className="hidden"
        onChange={(event) => {
          handlePickedFile(event.target.files?.[0])
          event.currentTarget.value = ''
        }}
      />
    </motion.main>
  )
}
