import { AudioLines, Mic, Pause, Play, RotateCcw, Save, SkipBack, SkipForward, Square, Trash2 } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { appendVoiceRecordingChunk, canStreamVoiceRecording, createVoiceRecordingFile, deleteVoiceRecordingFile } from '../../lib/tauri/voiceRecording'

type AudioRecording = {
  src: string
  name: string
  mime: string
  duration: number
  path?: string
}

type AudioRecorderProps = {
  pageTitle: string
  onInsertRecording: (recording: AudioRecording) => void
}

type RecorderStatus = 'idle' | 'requesting' | 'recording' | 'paused' | 'ready'
type WindowWithWebkitAudio = Window & typeof globalThis & { webkitAudioContext?: typeof AudioContext }
type AndroidRecorderPayload = {
  ok: boolean
  event?: 'started' | 'stopped' | 'paused' | 'resumed' | 'cancelled'
  error?: string
  src?: string
  name?: string
  mime?: string
  duration?: number
}
type WindowWithAndroidRecorder = Window &
  typeof globalThis & {
    VeloraAndroidRecorder?: {
      startRecording: (callbackId: string) => void
      stopRecording: (callbackId: string) => void
      pauseRecording: (callbackId: string) => void
      resumeRecording: (callbackId: string) => void
      cancelRecording: (callbackId: string) => void
    }
    __veloraAndroidRecorderCallback?: (callbackId: string, payload: AndroidRecorderPayload) => void
  }

const androidRecorderCallbacks = new Map<string, (payload: AndroidRecorderPayload) => void>()
let androidRecorderCallbackSequence = 0

function androidRecorder() {
  return (window as WindowWithAndroidRecorder).VeloraAndroidRecorder
}

function callAndroidRecorder(action: keyof NonNullable<WindowWithAndroidRecorder['VeloraAndroidRecorder']>) {
  const recorder = androidRecorder()
  if (!recorder) return Promise.reject(new Error('Android recorder is not available.'))
  const callbackId = `velora-recorder-${Date.now()}-${androidRecorderCallbackSequence++}`
  return new Promise<AndroidRecorderPayload>((resolve) => {
    androidRecorderCallbacks.set(callbackId, resolve)
    recorder[action](callbackId)
  })
}

if (typeof window !== 'undefined') {
  ;(window as WindowWithAndroidRecorder).__veloraAndroidRecorderCallback = (callbackId, payload) => {
    const resolve = androidRecorderCallbacks.get(callbackId)
    if (!resolve) return
    androidRecorderCallbacks.delete(callbackId)
    resolve(payload)
  }
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const minutes = Math.floor(seconds / 60)
  const rest = Math.floor(seconds % 60)
  return `${minutes}:${String(rest).padStart(2, '0')}`
}

function audioExtension(mime: string) {
  if (mime.includes('mp4') || mime.includes('aac')) return 'm4a'
  if (mime.includes('ogg')) return 'ogg'
  return 'webm'
}

function supportedAudioMimeType() {
  const candidates = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/aac', 'audio/ogg;codecs=opus']
  return candidates.find((candidate) => MediaRecorder.isTypeSupported(candidate))
}

function microphoneErrorMessage(cause: unknown) {
  const error = cause instanceof DOMException ? cause : null
  if (error?.name === 'NotAllowedError' || error?.name === 'SecurityError') {
    return 'Microphone is blocked. Allow it in the browser and system privacy settings.'
  }
  if (error?.name === 'NotFoundError' || error?.name === 'DevicesNotFoundError') {
    return 'No microphone input was found on this device.'
  }
  if (error?.name === 'NotReadableError' || error?.name === 'TrackStartError') {
    return 'The microphone is busy or blocked by the operating system.'
  }
  return 'Microphone permission is needed to record audio.'
}

function recordingName(pageTitle: string, mime: string) {
  const base = (pageTitle || 'Velora note').trim().replace(/[^\w\s.-]/g, '').replace(/\s+/g, '-').slice(0, 44) || 'Velora-note'
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  return `${base}-voice-${stamp}.${audioExtension(mime)}`
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result ?? ''))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

export function AudioRecorder({ pageTitle, onInsertRecording }: AudioRecorderProps) {
  const [status, setStatus] = useState<RecorderStatus>('idle')
  const [error, setError] = useState('')
  const [recordingUrl, setRecordingUrl] = useState('')
  const [mime, setMime] = useState('audio/webm')
  const [elapsed, setElapsed] = useState(0)
  const [duration, setDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [inputLabel, setInputLabel] = useState('')
  const [micLevel, setMicLevel] = useState(0)
  const [micWarning, setMicWarning] = useState('')
  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<BlobPart[]>([])
  const pendingWritesRef = useRef<Promise<void>[]>([])
  const streamedFileRef = useRef<{ path: string; src: string; name: string } | null>(null)
  const readyRecordingRef = useRef<AudioRecording | null>(null)
  const startedAtRef = useRef(0)
  const elapsedBeforePauseRef = useRef(0)
  const finalElapsedRef = useRef(0)
  const timerRef = useRef<number | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const micLevelFrameRef = useRef<number | null>(null)
  const micSilenceStartedAtRef = useRef(0)
  const capturedBytesRef = useRef(0)
  const statusRef = useRef<RecorderStatus>('idle')
  const nativeRecorderActiveRef = useRef(false)

  useEffect(() => {
    statusRef.current = status
  }, [status])

  const progress = useMemo(() => {
    const total = status === 'ready' ? duration : elapsed
    if (!total) return 0
    return Math.min(100, Math.max(0, ((status === 'ready' ? currentTime : elapsed) / total) * 100))
  }, [currentTime, duration, elapsed, status])

  const stopTimer = () => {
    if (timerRef.current) window.clearInterval(timerRef.current)
    timerRef.current = null
  }

  const stopMicMonitor = () => {
    if (micLevelFrameRef.current) window.cancelAnimationFrame(micLevelFrameRef.current)
    micLevelFrameRef.current = null
    audioContextRef.current?.close().catch(() => undefined)
    audioContextRef.current = null
    micSilenceStartedAtRef.current = 0
    setMicLevel(0)
  }

  const stopStream = () => {
    stopMicMonitor()
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  const startMicMonitor = (stream: MediaStream) => {
    const AudioContextCtor = window.AudioContext ?? (window as WindowWithWebkitAudio).webkitAudioContext
    if (!AudioContextCtor) return

    const audioContext = new AudioContextCtor()
    const analyser = audioContext.createAnalyser()
    analyser.fftSize = 1024
    audioContext.createMediaStreamSource(stream).connect(analyser)
    audioContextRef.current = audioContext

    const samples = new Uint8Array(analyser.fftSize)
    let lastPaintedLevel = -1

    const tick = () => {
      analyser.getByteTimeDomainData(samples)
      let sum = 0
      samples.forEach((sample) => {
        const centered = (sample - 128) / 128
        sum += centered * centered
      })
      const rms = Math.sqrt(sum / samples.length)
      const nextLevel = Math.min(100, Math.round(rms * 520))

      if (Math.abs(nextLevel - lastPaintedLevel) > 2) {
        lastPaintedLevel = nextLevel
        setMicLevel(nextLevel)
      }

      if (statusRef.current === 'recording') {
        if (rms < 0.006) {
          if (!micSilenceStartedAtRef.current) micSilenceStartedAtRef.current = Date.now()
          if (Date.now() - micSilenceStartedAtRef.current > 2500) {
            setMicWarning('No microphone signal detected. Check your input device and system mic level.')
          }
        } else {
          micSilenceStartedAtRef.current = 0
          setMicWarning('')
        }
      }

      micLevelFrameRef.current = window.requestAnimationFrame(tick)
    }

    tick()
  }

  const resetRecording = (deleteStreamedFile = true) => {
    stopTimer()
    stopStream()
    if (nativeRecorderActiveRef.current && deleteStreamedFile) {
      callAndroidRecorder('cancelRecording').catch((cause) => console.error(cause))
    }
    nativeRecorderActiveRef.current = false
    recorderRef.current = null
    chunksRef.current = []
    pendingWritesRef.current = []
    capturedBytesRef.current = 0
    elapsedBeforePauseRef.current = 0
    finalElapsedRef.current = 0
    startedAtRef.current = 0
    if (recordingUrl) URL.revokeObjectURL(recordingUrl)
    if (deleteStreamedFile && streamedFileRef.current?.path) {
      deleteVoiceRecordingFile(streamedFileRef.current.path).catch((cause) => console.error(cause))
    }
    streamedFileRef.current = null
    readyRecordingRef.current = null
    setRecordingUrl('')
    setStatus('idle')
    setElapsed(0)
    setDuration(0)
    setCurrentTime(0)
    setIsPlaying(false)
    setInputLabel('')
    setMicWarning('')
    setError('')
  }

  const startElapsedTimer = () => {
    stopTimer()
    startedAtRef.current = Date.now()
    timerRef.current = window.setInterval(() => {
      const next = elapsedBeforePauseRef.current + (Date.now() - startedAtRef.current) / 1000
      finalElapsedRef.current = next
      setElapsed(next)
    }, 120)
  }

  const startRecording = async () => {
    try {
      resetRecording()
      if (androidRecorder()) {
        setStatus('requesting')
        setError('')
        setMicWarning('')
        setInputLabel('Android microphone')
        setMime('audio/mp4')
        const response = await callAndroidRecorder('startRecording')
        if (!response.ok) {
          setError(response.error || 'Could not start Android audio recording.')
          setStatus('idle')
          return
        }
        nativeRecorderActiveRef.current = true
        setStatus('recording')
        startElapsedTimer()
        return
      }
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
        setError('Audio recording is not available on this device.')
        return
      }
      if (!window.isSecureContext) {
        setError('Microphone recording requires HTTPS or localhost.')
        return
      }
      setStatus('requesting')
      setError('')
      setMicWarning('')
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      })
      streamRef.current = stream
      const audioTrack = stream.getAudioTracks()[0]
      setInputLabel(audioTrack?.label || 'Microphone input')
      if (audioTrack) {
        audioTrack.onmute = () => setMicWarning('Microphone input is muted by the system.')
        audioTrack.onunmute = () => setMicWarning('')
        audioTrack.onended = () => setError('Microphone input stopped.')
      }
      startMicMonitor(stream)
      const preferredMime = supportedAudioMimeType()
      const recorder = preferredMime ? new MediaRecorder(stream, { mimeType: preferredMime }) : new MediaRecorder(stream)
      const activeMime = recorder.mimeType || preferredMime || 'audio/webm'
      const shouldStreamToDisk = canStreamVoiceRecording()
      const fileName = recordingName(pageTitle, activeMime)
      const diskFile = shouldStreamToDisk ? await createVoiceRecordingFile(fileName) : null
      streamedFileRef.current = diskFile ? { ...diskFile, name: fileName } : null
      setMime(activeMime)
      recorderRef.current = recorder
      chunksRef.current = []
      recorder.ondataavailable = (event) => {
        if (event.data.size <= 0) return
        capturedBytesRef.current += event.data.size
        if (streamedFileRef.current) {
          const targetPath = streamedFileRef.current.path
          const write = event.data
            .arrayBuffer()
            .then((buffer) => appendVoiceRecordingChunk(targetPath, new Uint8Array(buffer)))
            .catch((cause) => {
              console.error(cause)
              setError('Could not write this recording to disk.')
            })
          pendingWritesRef.current.push(write)
          return
        }
        chunksRef.current.push(event.data)
      }
      recorder.onstop = async () => {
        stopTimer()
        stopStream()
        const finalDuration = finalElapsedRef.current || elapsedBeforePauseRef.current
        await Promise.all(pendingWritesRef.current)
        if (capturedBytesRef.current <= 0) {
          if (streamedFileRef.current?.path) deleteVoiceRecordingFile(streamedFileRef.current.path).catch((cause) => console.error(cause))
          streamedFileRef.current = null
          setError('No audio data was captured. Check the selected microphone and try again.')
          setStatus('idle')
          return
        }
        const streamedFile = streamedFileRef.current
        if (streamedFile) {
          readyRecordingRef.current = {
            src: streamedFile.src,
            name: streamedFile.name,
            mime: activeMime,
            duration: finalDuration,
            path: streamedFile.path,
          }
          setRecordingUrl(streamedFile.src)
        } else {
          const blob = new Blob(chunksRef.current, { type: activeMime })
          const url = URL.createObjectURL(blob)
          readyRecordingRef.current = {
            src: url,
            name: recordingName(pageTitle, blob.type || activeMime),
            mime: blob.type || activeMime,
            duration: finalDuration,
          }
          setRecordingUrl(url)
        }
        setDuration(finalDuration)
        setCurrentTime(0)
        setStatus('ready')
      }
      recorder.start(500)
      setStatus('recording')
      startElapsedTimer()
    } catch (cause) {
      console.error(cause)
      resetRecording()
      setError(microphoneErrorMessage(cause))
    }
  }

  const pauseRecording = () => {
    if (nativeRecorderActiveRef.current) {
      callAndroidRecorder('pauseRecording')
        .then((response) => {
          if (!response.ok) {
            setError(response.error || 'Could not pause recording.')
            return
          }
          elapsedBeforePauseRef.current = elapsed
          finalElapsedRef.current = elapsed
          stopTimer()
          setStatus('paused')
        })
        .catch(() => setError('Could not pause recording.'))
      return
    }
    const recorder = recorderRef.current
    if (!recorder || recorder.state !== 'recording') return
    recorder.pause()
    elapsedBeforePauseRef.current = elapsed
    finalElapsedRef.current = elapsed
    stopTimer()
    setStatus('paused')
  }

  const resumeRecording = () => {
    if (nativeRecorderActiveRef.current) {
      callAndroidRecorder('resumeRecording')
        .then((response) => {
          if (!response.ok) {
            setError(response.error || 'Could not resume recording.')
            return
          }
          setStatus('recording')
          startElapsedTimer()
        })
        .catch(() => setError('Could not resume recording.'))
      return
    }
    const recorder = recorderRef.current
    if (!recorder || recorder.state !== 'paused') return
    recorder.resume()
    setStatus('recording')
    startElapsedTimer()
  }

  const stopRecording = () => {
    if (nativeRecorderActiveRef.current) {
      callAndroidRecorder('stopRecording')
        .then((response) => {
          stopTimer()
          nativeRecorderActiveRef.current = false
          const finalDuration = finalElapsedRef.current || elapsedBeforePauseRef.current || elapsed || response.duration || 0
          if (!response.ok || !response.src) {
            setError(response.error || 'No audio data was captured.')
            setStatus('idle')
            return
          }
          readyRecordingRef.current = {
            src: response.src,
            name: response.name || recordingName(pageTitle, response.mime || 'audio/mp4'),
            mime: response.mime || 'audio/mp4',
            duration: finalDuration,
          }
          setRecordingUrl(response.src)
          setMime(response.mime || 'audio/mp4')
          setDuration(finalDuration)
          setCurrentTime(0)
          setStatus('ready')
        })
        .catch(() => {
          stopTimer()
          nativeRecorderActiveRef.current = false
          setError('Could not finish Android audio recording.')
          setStatus('idle')
        })
      return
    }
    const recorder = recorderRef.current
    if (!recorder || recorder.state === 'inactive') return
    recorder.requestData()
    recorder.stop()
  }

  const togglePlayback = () => {
    const audio = audioRef.current
    if (!audio) return
    if (audio.paused) audio.play().catch(() => setError('Could not play this recording.'))
    else audio.pause()
  }

  const jump = (amount: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = Math.min(Math.max(audio.currentTime + amount, 0), audio.duration || duration || 0)
  }

  const insertRecording = async () => {
    if (!recordingUrl || !readyRecordingRef.current) return
    if (readyRecordingRef.current.path) {
      onInsertRecording({ ...readyRecordingRef.current, duration: duration || elapsed })
      resetRecording(false)
      return
    }
    const response = await fetch(recordingUrl)
    const blob = await response.blob()
    onInsertRecording({
      src: await blobToDataUrl(blob),
      name: readyRecordingRef.current.name || recordingName(pageTitle, blob.type || mime),
      mime: blob.type || mime,
      duration: duration || elapsed,
    })
    resetRecording(false)
  }

  useEffect(() => {
    return () => resetRecording()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <section className="mt-5 overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-[0_18px_44px_rgba(31,31,28,0.06)]">
      <div className="flex flex-wrap items-center gap-3 px-3 py-2.5">
        <div className="flex min-w-[190px] items-center gap-2">
          <span className={`grid h-9 w-9 place-items-center rounded-lg ${status === 'recording' ? 'bg-red-500/10 text-red-500' : 'bg-[var(--accent-soft)] text-[var(--accent)]'}`}>
            <AudioLines size={18} />
          </span>
          <div className="min-w-0">
            <div className="text-xs font-semibold text-[var(--text)]">{status === 'requesting' ? 'Preparing mic' : status === 'recording' ? 'Recording' : status === 'paused' ? 'Paused' : status === 'ready' ? 'Voice memo ready' : 'Voice memo'}</div>
            <div className="text-[11px] text-[var(--text-faint)]">{error || micWarning || (status === 'requesting' ? 'Waiting for microphone access' : status === 'ready' ? `${formatTime(duration)} captured locally` : 'Local microphone recording')}</div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {status === 'idle' ? (
            <button className="inline-flex h-9 items-center gap-2 rounded-lg bg-[var(--accent)] px-3 text-xs font-semibold text-white shadow-[0_12px_24px_rgba(91,77,255,.24)] transition hover:brightness-110" onClick={startRecording}>
              <Mic size={15} /> Record
            </button>
          ) : null}
          {status === 'requesting' ? (
            <button className="inline-flex h-9 cursor-wait items-center gap-2 rounded-lg bg-[var(--surface-muted)] px-3 text-xs font-semibold text-[var(--text-muted)]" disabled>
              <Mic size={15} /> Starting
            </button>
          ) : null}
          {status === 'recording' ? (
            <>
              <button className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--surface-muted)] text-[var(--text)] transition hover:bg-[var(--accent-soft)]" onClick={pauseRecording} aria-label="Pause recording">
                <Pause size={15} />
              </button>
              <button className="grid h-9 w-9 place-items-center rounded-lg bg-red-500/10 text-red-500 transition hover:bg-red-500/20" onClick={stopRecording} aria-label="Stop recording">
                <Square size={14} fill="currentColor" />
              </button>
            </>
          ) : null}
          {status === 'paused' ? (
            <>
              <button className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--accent)] text-white transition hover:brightness-110" onClick={resumeRecording} aria-label="Resume recording">
                <Play size={15} fill="currentColor" />
              </button>
              <button className="grid h-9 w-9 place-items-center rounded-lg bg-red-500/10 text-red-500 transition hover:bg-red-500/20" onClick={stopRecording} aria-label="Stop recording">
                <Square size={14} fill="currentColor" />
              </button>
            </>
          ) : null}
          {status === 'ready' ? (
            <>
              <button className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--surface-muted)] text-[var(--text)] transition hover:bg-[var(--accent-soft)]" onClick={() => jump(-10)} aria-label="Back 10 seconds">
                <SkipBack size={15} />
              </button>
              <button className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--accent)] text-white transition hover:brightness-110" onClick={togglePlayback} aria-label={isPlaying ? 'Pause audio' : 'Play audio'}>
                {isPlaying ? <Pause size={15} /> : <Play size={15} fill="currentColor" />}
              </button>
              <button className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--surface-muted)] text-[var(--text)] transition hover:bg-[var(--accent-soft)]" onClick={() => jump(10)} aria-label="Forward 10 seconds">
                <SkipForward size={15} />
              </button>
            </>
          ) : null}
        </div>

        <div className="min-w-[220px] flex-1">
          <div className="mb-1 flex items-center justify-between text-[11px] font-medium text-[var(--text-faint)]">
            <span>{formatTime(status === 'ready' ? currentTime : elapsed)}</span>
            <span>{status === 'ready' ? formatTime(duration) : 'live'}</span>
          </div>
          <div className="relative h-2 overflow-hidden rounded-full bg-[var(--surface-muted)]">
            <div className={`${status === 'recording' ? 'bg-red-500' : 'bg-[var(--accent)]'} h-full rounded-full transition-[width]`} style={{ width: `${progress}%` }} />
          </div>
          {status === 'ready' ? (
            <input
              aria-label="Audio position"
              className="mt-1 h-3 w-full cursor-pointer accent-[var(--accent)]"
              type="range"
              min={0}
              max={duration || 0}
              step={0.05}
              value={currentTime}
              onChange={(event) => {
                const next = Number(event.target.value)
                if (audioRef.current) audioRef.current.currentTime = next
                setCurrentTime(next)
              }}
            />
          ) : null}
          {status === 'requesting' || status === 'recording' || status === 'paused' ? (
            <div className="mt-2 flex items-center gap-2">
              <div className="h-1.5 w-24 overflow-hidden rounded-full bg-[var(--surface-muted)]">
                <div className="h-full rounded-full bg-[var(--accent)] transition-[width]" style={{ width: `${status === 'paused' ? 0 : micLevel}%` }} />
              </div>
              <span className="truncate text-[10px] font-medium text-[var(--text-faint)]">{inputLabel || 'Microphone input'}</span>
            </div>
          ) : null}
        </div>

        {status === 'ready' ? (
          <div className="flex items-center gap-1">
            <button className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--surface-muted)] text-[var(--text-muted)] transition hover:bg-[var(--surface)] hover:text-[var(--text)]" onClick={() => audioRef.current && (audioRef.current.currentTime = 0)} aria-label="Restart">
              <RotateCcw size={15} />
            </button>
            <button className="grid h-9 w-9 place-items-center rounded-lg bg-[var(--accent-soft)] text-[var(--accent)] transition hover:brightness-95" onClick={insertRecording} aria-label="Save recording to page">
              <Save size={15} />
            </button>
            <button className="grid h-9 w-9 place-items-center rounded-lg bg-red-500/10 text-red-500 transition hover:bg-red-500/20" onClick={() => resetRecording()} aria-label="Discard recording">
              <Trash2 size={15} />
            </button>
          </div>
        ) : null}
      </div>
      <audio
        ref={audioRef}
        src={recordingUrl}
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || duration)}
        onTimeUpdate={(event) => setCurrentTime(event.currentTarget.currentTime)}
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onEnded={() => setIsPlaying(false)}
      />
    </section>
  )
}
