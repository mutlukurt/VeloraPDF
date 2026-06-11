import { Eraser, FastForward, Hand, Highlighter, Minus, Pause, PenLine, Play, Plus, Redo2, Rewind, Trash2, Undo2, Volume2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AudioRecorder, type AudioRecording } from './AudioRecorder'

export type PaperTool = 'pen' | 'highlight' | 'eraser'
export type PaperPoint = { x: number; y: number }
export type PaperStroke = {
  id: string
  page: number
  tool: 'pen' | 'highlight'
  points: PaperPoint[]
  color: string
  width: number
  opacity: number
}
export type PaperRecording = {
  id: string
  page: number
  src: string
  name: string
  mime: string
  duration: number
  path?: string
  x: number
  y: number
  createdAt: number
}
export type PaperState = {
  version: 1
  pageCount: number
  strokes: PaperStroke[]
  recordings: PaperRecording[]
}
export const MIN_PAGE_COUNT = 10
const colors = ['#15151a', '#5b4dff', '#b45a4d', '#2f6f8f', '#d8aa22', '#5f8f62', '#a85d86']

export function notebookPaperStorageKey(pageId: string) {
  return `velora.paper-notes.v1.${pageId}`
}

export function emptyPaperState(): PaperState {
  return { version: 1, pageCount: MIN_PAGE_COUNT, strokes: [], recordings: [] }
}

export function readNotebookPaper(pageId: string): PaperState {
  try {
    const raw = localStorage.getItem(notebookPaperStorageKey(pageId))
    if (!raw) return emptyPaperState()
    const parsed = JSON.parse(raw) as Partial<PaperState>
    return {
      version: 1,
      pageCount: Math.max(MIN_PAGE_COUNT, parsed.pageCount || MIN_PAGE_COUNT),
      strokes: Array.isArray(parsed.strokes) ? parsed.strokes : [],
      recordings: Array.isArray(parsed.recordings) ? parsed.recordings : [],
    }
  } catch {
    return emptyPaperState()
  }
}

export function writeNotebookPaper(pageId: string, state: PaperState) {
  localStorage.setItem(notebookPaperStorageKey(pageId), JSON.stringify({ ...state, pageCount: Math.max(MIN_PAGE_COUNT, state.pageCount) }))
}

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return '0:00'
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`
}

function clampZoom(value: number) {
  return Math.max(0.7, Math.min(2.4, value))
}

function dataUrlToBlobUrl(dataUrl: string) {
  const [header = '', data = ''] = dataUrl.split(',')
  const mime = header.match(/data:([^;]+)/)?.[1] || 'audio/mp4'
  const binary = atob(data)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index)
  return URL.createObjectURL(new Blob([bytes], { type: mime }))
}

function playbackSourceForRecording(item: PaperRecording) {
  if (!item.src.startsWith('data:')) return { url: item.src, revoke: false }
  return { url: dataUrlToBlobUrl(item.src), revoke: true }
}

function pathForStroke(stroke: Pick<PaperStroke, 'points'>) {
  return stroke.points.map((point) => `${point.x * 794},${point.y * 1123}`).join(' ')
}

function nearestStroke(strokes: PaperStroke[], point: PaperPoint) {
  let nearest: { stroke: PaperStroke; distance: number } | null = null
  for (const stroke of strokes) {
    const distance = stroke.points.reduce((best, item) => Math.min(best, Math.hypot(point.x - item.x, point.y - item.y)), Number.POSITIVE_INFINITY)
    if (!nearest || distance < nearest.distance) nearest = { stroke, distance }
  }
  return nearest && nearest.distance < 0.045 ? nearest.stroke : null
}

export function NotebookPaper({ pageId, pageTitle, standalone = false, onChange }: { pageId: string; pageTitle: string; standalone?: boolean; onChange?: () => void }) {
  const [state, setState] = useState<PaperState>(() => readNotebookPaper(pageId))
  const [currentPage, setCurrentPage] = useState(1)
  const [tool, setTool] = useState<PaperTool>('pen')
  const [color, setColor] = useState(colors[0])
  const [palmRejection, setPalmRejection] = useState(true)
  const [draft, setDraft] = useState<{ page: number; points: PaperPoint[] } | null>(null)
  const [undone, setUndone] = useState<PaperStroke[]>([])
  const [zoom, setZoom] = useState(1)
  const [playingId, setPlayingId] = useState('')
  const [playerTimes, setPlayerTimes] = useState<Record<string, number>>({})
  const [playerDurations, setPlayerDurations] = useState<Record<string, number>>({})
  const [playbackErrors, setPlaybackErrors] = useState<Record<string, string>>({})
  const [isPanning, setIsPanning] = useState(false)
  const activePointerRef = useRef<number | null>(null)
  const activePageRef = useRef(1)
  const pointerAllowedRef = useRef(false)
  const lastPointRef = useRef<{ page: number; point: PaperPoint }>({ page: 1, point: { x: 0.5, y: 0.12 } })
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioUrlRef = useRef<string | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const touchPointersRef = useRef(new Map<number, { x: number; y: number }>())
  const pinchRef = useRef<{ distance: number; zoom: number; centerX: number; centerY: number; scrollLeft: number; scrollTop: number } | null>(null)
  const pinchingRef = useRef(false)
  const pagePanRef = useRef<{ pointerId: number; x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null)
  const pageCount = Math.max(MIN_PAGE_COUNT, state.pageCount)
  const pages = useMemo(() => Array.from({ length: pageCount }, (_, index) => index + 1), [pageCount])
  const currentStrokes = useMemo(() => state.strokes.filter((stroke) => stroke.page === currentPage), [currentPage, state.strokes])
  const sortedRecordings = useMemo(() => [...state.recordings].sort((left, right) => right.createdAt - left.createdAt), [state.recordings])

  useEffect(() => {
    const next = readNotebookPaper(pageId)
    setState(next)
    setCurrentPage(1)
    activePageRef.current = 1
    setDraft(null)
    setUndone([])
  }, [pageId])

  useEffect(() => {
    writeNotebookPaper(pageId, state)
  }, [pageId, state])

  useEffect(() => {
    return () => {
      audioRef.current?.pause()
      if (audioUrlRef.current) URL.revokeObjectURL(audioUrlRef.current)
    }
  }, [])

  const commitState = useCallback((updater: (current: PaperState) => PaperState) => {
    setState((current) => {
      const next = updater(current)
      return { ...next, pageCount: Math.max(MIN_PAGE_COUNT, next.pageCount) }
    })
    onChange?.()
  }, [onChange])

  const setActivePage = useCallback((page: number) => {
    activePageRef.current = page
    setCurrentPage(page)
  }, [])

  const pointFromEvent = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect()
    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
    }
  }, [])

  const acceptsPointer = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (pinchingRef.current) return false
      if (!palmRejection) {
        pointerAllowedRef.current = true
        return true
      }
      const precisionPointer = event.pointerType === 'pen' || event.pointerType === 'mouse'
      pointerAllowedRef.current = precisionPointer
      return precisionPointer
    },
    [palmRejection],
  )

  const finishStroke = useCallback(() => {
    if (!draft || tool === 'eraser' || draft.points.length < 2) {
      setDraft(null)
      return
    }
    const stroke: PaperStroke = {
      id: crypto.randomUUID(),
      page: draft.page,
      tool: tool === 'highlight' ? 'highlight' : 'pen',
      points: draft.points,
      color,
      width: tool === 'highlight' ? 18 : 3.2,
      opacity: tool === 'highlight' ? 0.28 : 1,
    }
    setUndone([])
    commitState((current) => ({ ...current, strokes: [...current.strokes, stroke] }))
    setDraft(null)
  }, [color, commitState, draft, tool])

  const eraseAt = useCallback(
    (page: number, point: PaperPoint) => {
      const pageStrokes = state.strokes.filter((stroke) => stroke.page === page)
      const target = nearestStroke(pageStrokes, point)
      if (!target) return
      setUndone([])
      commitState((current) => ({ ...current, strokes: current.strokes.filter((stroke) => stroke.id !== target.id) }))
    },
    [commitState, state.strokes],
  )

  const updatePinch = useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'touch') return
    const touches = touchPointersRef.current
    touches.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (touches.size < 2) return
    const scrollEl = scrollRef.current
    const [first, second] = Array.from(touches.values())
    const distance = Math.hypot(first.x - second.x, first.y - second.y)
    const centerX = (first.x + second.x) / 2
    const centerY = (first.y + second.y) / 2
    if (!pinchRef.current) {
      pinchRef.current = { distance, zoom, centerX, centerY, scrollLeft: scrollEl?.scrollLeft ?? 0, scrollTop: scrollEl?.scrollTop ?? 0 }
      pinchingRef.current = true
      pagePanRef.current = null
      setDraft(null)
      return
    }
    event.preventDefault()
    const nextZoom = clampZoom(pinchRef.current.zoom * (distance / Math.max(1, pinchRef.current.distance)))
    const ratio = nextZoom / Math.max(0.01, pinchRef.current.zoom)
    setZoom(nextZoom)
    if (scrollEl) {
      const rect = scrollEl.getBoundingClientRect()
      const localX = pinchRef.current.centerX - rect.left
      const localY = pinchRef.current.centerY - rect.top
      window.requestAnimationFrame(() => {
        scrollEl.scrollLeft = (pinchRef.current?.scrollLeft ?? 0) * ratio + localX * (ratio - 1)
        scrollEl.scrollTop = (pinchRef.current?.scrollTop ?? 0) * ratio + localY * (ratio - 1)
      })
    }
  }, [zoom])

  const releaseTouch = useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (event.pointerType !== 'touch') return
    touchPointersRef.current.delete(event.pointerId)
    if (pagePanRef.current?.pointerId === event.pointerId) {
      pagePanRef.current = null
      setIsPanning(false)
    }
    if (touchPointersRef.current.size < 2) {
      pinchRef.current = null
      window.setTimeout(() => {
        pinchingRef.current = false
      }, 80)
    }
  }, [])

  const addRecording = useCallback(
    (recordingItem: AudioRecording) => {
      const anchor = lastPointRef.current
      const next: PaperRecording = {
        id: crypto.randomUUID(),
        page: anchor.page,
        x: Math.max(0.06, Math.min(0.94, anchor.point.x)),
        y: Math.max(0.06, Math.min(0.94, anchor.point.y)),
        createdAt: Date.now(),
        ...recordingItem,
      }
      commitState((current) => ({ ...current, recordings: [...current.recordings, next] }))
    },
    [commitState],
  )

  const playRecording = async (item: PaperRecording) => {
    if (playingId === item.id) {
      audioRef.current?.pause()
      setPlayingId('')
      return
    }
    audioRef.current?.pause()
    if (audioUrlRef.current) {
      URL.revokeObjectURL(audioUrlRef.current)
      audioUrlRef.current = null
    }
    setPlaybackErrors((errors) => {
      const next = { ...errors }
      delete next[item.id]
      return next
    })
    try {
      const source = playbackSourceForRecording(item)
      if (source.revoke) audioUrlRef.current = source.url
      const audio = new Audio(source.url)
      audio.preload = 'metadata'
      audio.volume = 1
      audioRef.current = audio
      setPlayerTimes((times) => ({ ...times, [item.id]: 0 }))
      setPlayerDurations((durations) => ({ ...durations, [item.id]: item.duration || 0 }))
      setPlayingId(item.id)
      audio.ontimeupdate = () => setPlayerTimes((times) => ({ ...times, [item.id]: audio.currentTime || 0 }))
      audio.onloadedmetadata = () => setPlayerDurations((durations) => ({ ...durations, [item.id]: audio.duration || item.duration || 0 }))
      audio.onended = () => {
        setPlayingId('')
        setPlayerTimes((times) => ({ ...times, [item.id]: 0 }))
      }
      audio.onerror = () => {
        setPlayingId('')
        setPlaybackErrors((errors) => ({ ...errors, [item.id]: 'This recording could not be played.' }))
      }
      await audio.play()
    } catch {
      setPlayingId('')
      setPlaybackErrors((errors) => ({ ...errors, [item.id]: 'Tap play again or check device volume.' }))
    }
  }

  const seekPlayer = (item: PaperRecording, time: number) => {
    const audio = audioRef.current
    const max = playerDurations[item.id] || item.duration || 0
    const next = Math.max(0, Math.min(max, time))
    if (audio && playingId === item.id) {
      audio.currentTime = next
    }
    setPlayerTimes((times) => ({ ...times, [item.id]: next }))
  }

  const jumpPlayer = (item: PaperRecording, amount: number) => {
    seekPlayer(item, (playerTimes[item.id] ?? 0) + amount)
  }

  const handleNotebookWheel = useCallback((event: React.WheelEvent<HTMLDivElement>) => {
    const scrollEl = scrollRef.current
    if (!scrollEl) return
    event.preventDefault()
    if (event.ctrlKey || event.metaKey) {
      setZoom((value) => clampZoom(value + (event.deltaY < 0 ? 0.08 : -0.08)))
      return
    }
    scrollEl.scrollTop += event.deltaY
    scrollEl.scrollLeft += event.shiftKey ? event.deltaY : event.deltaX
  }, [])

  const deleteRecording = (item: PaperRecording) => {
    if (!window.confirm('Delete this voice recording?')) return
    if (playingId === item.id) {
      audioRef.current?.pause()
      setPlayingId('')
    }
    commitState((current) => ({ ...current, recordings: current.recordings.filter((recording) => recording.id !== item.id) }))
    setPlayerTimes((times) => {
      const next = { ...times }
      delete next[item.id]
      return next
    })
    setPlayerDurations((durations) => {
      const next = { ...durations }
      delete next[item.id]
      return next
    })
    setPlaybackErrors((errors) => {
      const next = { ...errors }
      delete next[item.id]
      return next
    })
  }

  const beginPagePan = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (!palmRejection || pinchingRef.current) return false
    const wantsTouchPan = event.pointerType === 'touch' && touchPointersRef.current.size <= 1
    const wantsMousePan = event.pointerType === 'mouse' && event.button === 0
    if (!wantsTouchPan && !wantsMousePan) return false
    const scrollEl = scrollRef.current
    if (!scrollEl) return false
    pagePanRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, scrollLeft: scrollEl.scrollLeft, scrollTop: scrollEl.scrollTop }
    event.currentTarget.setPointerCapture(event.pointerId)
    event.preventDefault()
    setDraft(null)
    setIsPanning(true)
    return true
  }, [palmRejection])

  const movePagePan = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    const pan = pagePanRef.current
    const scrollEl = scrollRef.current
    if (!pan || !scrollEl || pan.pointerId !== event.pointerId || pinchingRef.current) return false
    event.preventDefault()
    scrollEl.scrollLeft = pan.scrollLeft - (event.clientX - pan.x)
    scrollEl.scrollTop = pan.scrollTop - (event.clientY - pan.y)
    return true
  }, [])

  return (
    <section
      className={`notebook-paper ${standalone ? 'notebook-paper-standalone' : 'mt-6'} flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_18px_44px_rgba(31,31,28,0.06)]`}
      onPointerDownCapture={updatePinch}
      onPointerMoveCapture={updatePinch}
      onPointerUpCapture={releaseTouch}
      onPointerCancelCapture={releaseTouch}
    >
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-[var(--border)] p-3">
        <button className={`paper-tool ${palmRejection ? 'active' : ''}`} type="button" onClick={() => setPalmRejection((value) => !value)} aria-label="Palm rejection">
          <Hand size={17} />
        </button>
        <button className={`paper-tool ${tool === 'pen' ? 'active' : ''}`} type="button" onClick={() => setTool('pen')} aria-label="Pen">
          <PenLine size={17} />
        </button>
        <button className={`paper-tool ${tool === 'highlight' ? 'active' : ''}`} type="button" onClick={() => setTool('highlight')} aria-label="Highlighter">
          <Highlighter size={17} />
        </button>
        <button className={`paper-tool ${tool === 'eraser' ? 'active' : ''}`} type="button" onClick={() => setTool('eraser')} aria-label="Eraser">
          <Eraser size={17} />
        </button>
        <span className="mx-1 h-7 w-px bg-[var(--border)]" />
        {colors.map((item) => (
          <button key={item} className={`paper-swatch ${color === item ? 'active' : ''}`} style={{ background: item }} type="button" onClick={() => setColor(item)} aria-label={`Use ${item}`} />
        ))}
        <span className="mx-1 h-7 w-px bg-[var(--border)]" />
        <button className="paper-tool" type="button" disabled={currentStrokes.length === 0} onClick={() => {
          const target = currentStrokes[currentStrokes.length - 1]
          if (!target) return
          setUndone((items) => [...items, target])
          commitState((current) => ({ ...current, strokes: current.strokes.filter((stroke) => stroke.id !== target.id) }))
        }} aria-label="Undo">
          <Undo2 size={17} />
        </button>
        <button className="paper-tool" type="button" disabled={undone.length === 0} onClick={() => {
          const target = undone[undone.length - 1]
          if (!target) return
          setUndone((items) => items.slice(0, -1))
          commitState((current) => ({ ...current, strokes: [...current.strokes, target] }))
        }} aria-label="Redo">
          <Redo2 size={17} />
        </button>
        <span className="mx-1 h-7 w-px bg-[var(--border)]" />
        <button className="paper-tool" type="button" onClick={() => setZoom((value) => clampZoom(value - 0.1))} aria-label="Zoom out">
          <Minus size={17} />
        </button>
        <div className="rounded-lg bg-[var(--surface-muted)] px-2 py-1 text-xs font-bold text-[var(--text-muted)]">{Math.round(zoom * 100)}%</div>
        <button className="paper-tool" type="button" onClick={() => setZoom((value) => clampZoom(value + 0.1))} aria-label="Zoom in">
          <Plus size={17} />
        </button>
        <div className="paper-player-list">
          <div className="paper-player-icon">
            <Volume2 size={15} />
          </div>
          <div className="paper-player-items">
            {sortedRecordings.length === 0 ? (
              <div className="paper-player-empty">Voice recordings will appear here.</div>
            ) : (
              sortedRecordings.map((item, index) => {
                const duration = playerDurations[item.id] || item.duration || 0
                const time = Math.min(playerTimes[item.id] || 0, Math.max(duration, 1))
                return (
                  <div className="paper-player-row" key={item.id}>
                    <div className="paper-player-label">
                      <span>Voice {sortedRecordings.length - index}</span>
                      <small>Page {item.page}</small>
                    </div>
                    <button className="paper-player-button" type="button" onClick={() => playRecording(item)} aria-label={playingId === item.id ? 'Pause recording' : 'Play recording'}>
                      {playingId === item.id ? <Pause size={15} /> : <Play size={15} />}
                    </button>
                    <button className="paper-player-button" type="button" onClick={() => jumpPlayer(item, -10)} aria-label="Back 10 seconds">
                      <Rewind size={15} />
                    </button>
                    <button className="paper-player-button" type="button" onClick={() => jumpPlayer(item, 10)} aria-label="Forward 10 seconds">
                      <FastForward size={15} />
                    </button>
                    <input
                      className="paper-player-range"
                      type="range"
                      min="0"
                      max={Math.max(duration, 1)}
                      step="0.1"
                      value={time}
                      onChange={(event) => seekPlayer(item, Number(event.target.value))}
                      aria-label="Recording timeline"
                    />
                    <span className="paper-player-time">{formatDuration(time)} / {formatDuration(duration)}</span>
                    <button className="paper-player-button danger" type="button" onClick={() => deleteRecording(item)} aria-label="Delete recording">
                      <Trash2 size={14} />
                    </button>
                    {playbackErrors[item.id] ? <span className="paper-player-error">{playbackErrors[item.id]}</span> : null}
                  </div>
                )
              })
            )}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="rounded-lg bg-[var(--surface-muted)] px-2 py-1 text-xs font-bold text-[var(--text-muted)]">Page {currentPage} / {pageCount}</div>
        </div>
      </div>
      <div className="border-b border-[var(--border)] bg-[var(--workspace)] px-3 py-3">
        <AudioRecorder
          pageTitle={pageTitle}
          onInsertRecording={addRecording}
          className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_14px_32px_rgba(31,31,28,0.06)]"
        />
      </div>

      <div ref={scrollRef} className="notebook-scroll min-h-0 flex-1 overflow-auto px-2 py-4 md:px-5" onWheel={handleNotebookWheel}>
        <div className="mx-auto flex flex-col items-center gap-5 pb-8" style={{ width: `${Math.round(794 * zoom)}px`, maxWidth: 'none' }}>
          {pages.map((page) => {
            const pageStrokes = state.strokes.filter((stroke) => stroke.page === page)
            const pageDraft = draft?.page === page ? draft.points : []
            return (
              <div
                key={page}
                className="paper-page relative overflow-hidden rounded-lg border border-[var(--border)] bg-[#fffef9]"
                style={{ width: `${Math.round(794 * zoom)}px`, height: `${Math.round(1123 * zoom)}px`, touchAction: 'none', cursor: palmRejection ? (isPanning ? 'grabbing' : 'grab') : 'crosshair' }}
                onPointerDown={(event) => {
                  setActivePage(page)
                  if (beginPagePan(event)) return
                  if (!acceptsPointer(event)) return
                  const point = pointFromEvent(event)
                  activePointerRef.current = event.pointerId
                  event.currentTarget.setPointerCapture(event.pointerId)
                  lastPointRef.current = { page, point }
                  if (tool === 'eraser') {
                    eraseAt(page, point)
                    return
                  }
                  setDraft({ page, points: [point] })
                }}
                onPointerMove={(event) => {
                  if (movePagePan(event)) return
                  if (activePointerRef.current !== event.pointerId || !pointerAllowedRef.current || pinchingRef.current) return
                  const point = pointFromEvent(event)
                  lastPointRef.current = { page, point }
                  if (tool === 'eraser') {
                    eraseAt(page, point)
                    return
                  }
                  setDraft((current) => (current?.page === page ? { page, points: [...current.points, point] } : current))
                }}
                onPointerUp={(event) => {
                  if (pagePanRef.current?.pointerId === event.pointerId) {
                    pagePanRef.current = null
                    setIsPanning(false)
                    return
                  }
                  if (activePointerRef.current !== event.pointerId) return
                  activePointerRef.current = null
                  pointerAllowedRef.current = false
                  finishStroke()
                }}
                onPointerCancel={() => {
                  pagePanRef.current = null
                  setIsPanning(false)
                  activePointerRef.current = null
                  pointerAllowedRef.current = false
                  setDraft(null)
                }}
              >
                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 794 1123" preserveAspectRatio="none">
                  <rect width="794" height="1123" fill="#fffef9" />
                  {Array.from({ length: 29 }, (_, index) => (
                    <line key={index} x1="54" x2="740" y1={82 + index * 34} y2={82 + index * 34} stroke="#dfe3ee" strokeWidth="1" />
                  ))}
                  {[...pageStrokes, ...(pageDraft.length > 1 ? [{ id: 'draft', page, tool: tool === 'highlight' ? 'highlight' : 'pen', points: pageDraft, color, width: tool === 'highlight' ? 18 : 3.2, opacity: tool === 'highlight' ? 0.28 : 1 } satisfies PaperStroke] : [])].map((stroke) => (
                    <polyline key={stroke.id} points={pathForStroke(stroke)} fill="none" stroke={stroke.color} strokeLinecap="round" strokeLinejoin="round" strokeWidth={stroke.width} opacity={stroke.opacity} />
                  ))}
                </svg>
                <div className="pointer-events-none absolute right-4 top-3 rounded-md bg-white/80 px-2 py-1 text-[11px] font-black text-[#8a887f]">{page}</div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
