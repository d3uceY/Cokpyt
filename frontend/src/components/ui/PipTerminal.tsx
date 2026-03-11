import { useEffect, useRef, useState } from 'react'
import { EventsOn } from '../../../wailsjs/runtime/runtime'

interface PipTerminalProps {
  /** Whether the terminal panel is visible */
  open: boolean
  /** Title shown in the terminal header, e.g. "pip install requests" */
  title?: string
  /** Called when user clicks the close/dismiss button (only enabled when done) */
  onClose: () => void
  /** Whether the operation is still running */
  running: boolean
}

export function PipTerminal({ open, title, onClose, running }: PipTerminalProps) {
  const [lines, setLines] = useState<string[]>([])
  const bottomRef = useRef<HTMLDivElement>(null)

  // Clear lines whenever a new operation opens the terminal
  useEffect(() => {
    if (open) setLines([])
  }, [open, title])

  useEffect(() => {
    const off = EventsOn('pip:stream', (line: string) => {
      setLines((prev) => [...prev, line])
    })
    return () => { off() }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [lines])

  if (!open) return null

  return (
    <div className="mt-4 border border-black/15 dark:border-white/10 bg-[#0f1723] overflow-hidden">
      {/* Terminal header */}
      <div className="flex items-center justify-between px-4 py-2 bg-black/30 border-b border-white/10">
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-[14px] text-white/50">terminal</span>
          <span className="text-[11px] font-mono font-bold text-white/60 uppercase tracking-widest truncate max-w-xs">
            {title ?? 'pip output'}
          </span>
          {running && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 uppercase tracking-widest">
              <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
              running
            </span>
          )}
          {!running && lines.length > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 uppercase tracking-widest">
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
              done
            </span>
          )}
        </div>
        <button
          className="text-white/30 hover:text-white/70 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          disabled={running}
          onClick={onClose}
          aria-label="Close terminal"
        >
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>

      {/* Output */}
      <div className="h-48 overflow-auto p-4 font-mono text-xs space-y-0.5">
        {lines.length === 0 && (
          <span className="text-white/20">Waiting for output…</span>
        )}
        {lines.map((line, i) => (
          <div
            key={i}
            className={
              line.toLowerCase().includes('error') || line.toLowerCase().includes('failed')
                ? 'text-red-400'
                : line.toLowerCase().includes('warning')
                  ? 'text-amber-400'
                  : line.toLowerCase().startsWith('successfully')
                    ? 'text-emerald-400'
                    : 'text-white/70'
            }
          >
            {line || '\u00a0'}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
