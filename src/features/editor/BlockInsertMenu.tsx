import type { Editor } from '@tiptap/react'
import { AnimatePresence, motion } from 'framer-motion'
import { Search } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '../../lib/utils/cn'
import { filterCommands, type CommandHelpers, type InsertContext } from './editorCommands'

type BlockInsertMenuProps = {
  editor: Editor | null
  open: boolean
  query: string
  position: { left: number; top: number }
  context: InsertContext | null
  helpers?: CommandHelpers
  onQueryChange: (query: string) => void
  onClose: () => void
}

const categoryOrder = ['Suggested', 'Basic blocks', 'Media', 'Advanced'] as const

export function BlockInsertMenu({ editor, open, query, position, context, helpers = {}, onQueryChange, onClose }: BlockInsertMenuProps) {
  const [selectedIndex, setSelectedIndex] = useState(0)
  const searchRef = useRef<HTMLInputElement | null>(null)
  const commands = useMemo(() => filterCommands(query), [query])
  const visibleCommands = useMemo(() => {
    if (query.trim()) return commands
    const suggested = commands.filter((command) => command.suggested).map((command) => ({ ...command, category: 'Suggested' as const }))
    const rest = commands.filter((command) => command.category !== 'Suggested')
    return [...suggested, ...rest]
  }, [commands, query])

  useEffect(() => {
    if (!open) return
    if (context?.source === 'plus') window.setTimeout(() => searchRef.current?.focus(), 0)
  }, [context?.source, open])

  useEffect(() => {
    if (!open || !editor || !context) return
    const onKeyDown = async (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose()
        return
      }
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        setSelectedIndex((index) => Math.min(index + 1, Math.max(visibleCommands.length - 1, 0)))
        return
      }
      if (event.key === 'ArrowUp') {
        event.preventDefault()
        setSelectedIndex((index) => Math.max(index - 1, 0))
        return
      }
      const activeIndex = Math.min(selectedIndex, Math.max(visibleCommands.length - 1, 0))
      if (event.key === 'Enter' && visibleCommands[activeIndex]) {
        event.preventDefault()
        await visibleCommands[activeIndex].action(editor, context, helpers)
        onClose()
      }
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [context, editor, helpers, onClose, open, selectedIndex, visibleCommands])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('[data-block-insert-menu]') && !target.closest('[data-block-plus]')) onClose()
    }
    window.addEventListener('pointerdown', onPointerDown)
    return () => window.removeEventListener('pointerdown', onPointerDown)
  }, [onClose, open])

  if (!editor || !context) return null

  let runningIndex = -1

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          data-block-insert-menu
          className="fixed z-50 w-[360px] overflow-hidden rounded-2xl border border-[var(--border)] bg-[var(--surface)] shadow-calm"
          style={{ left: position.left, top: position.top }}
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.98 }}
          transition={{ duration: 0.13 }}
        >
          <div className="flex items-center gap-2 border-b border-[var(--border)] px-3 py-2.5">
            <Search size={15} className="text-[var(--text-faint)]" />
            <input
              ref={searchRef}
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              onInput={() => setSelectedIndex(0)}
              placeholder="Search blocks..."
              className="h-8 flex-1 bg-transparent text-sm outline-none placeholder:text-[var(--text-faint)]"
            />
            <kbd className="rounded-md border border-[var(--border)] px-1.5 py-1 text-[10px] text-[var(--text-faint)]">Esc</kbd>
          </div>
          <div className="max-h-[430px] overflow-y-auto p-1.5">
            {categoryOrder.map((category) => {
              const group = visibleCommands.filter((command) => command.category === category)
              if (group.length === 0) return null
              return (
                <section key={category} className="py-1">
                  <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--text-faint)]">{category}</div>
                  {group.map((command) => {
                    const commandIndex = ++runningIndex
                    const Icon = command.icon
                    const selected = commandIndex === Math.min(selectedIndex, Math.max(visibleCommands.length - 1, 0))
                    return (
                      <button
                        key={`${category}-${command.id}`}
                        className={cn(
                          'flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition',
                          selected ? 'bg-[var(--accent-soft)] text-[var(--text)]' : 'hover:bg-[var(--surface-muted)]',
                        )}
                        onMouseEnter={() => setSelectedIndex(commandIndex)}
                        onMouseDown={async (event) => {
                          event.preventDefault()
                          await command.action(editor, context, helpers)
                          onClose()
                        }}
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[var(--surface-muted)] text-[var(--text-muted)]">
                          <Icon size={17} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium">{command.title}</span>
                          <span className="block truncate text-xs text-[var(--text-muted)]">{command.description}</span>
                        </span>
                        {command.hint ? <span className="text-[11px] text-[var(--text-faint)]">{command.hint}</span> : null}
                      </button>
                    )
                  })}
                </section>
              )
            })}
            {visibleCommands.length === 0 ? <div className="px-3 py-8 text-center text-sm text-[var(--text-muted)]">No matching block</div> : null}
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  )
}
