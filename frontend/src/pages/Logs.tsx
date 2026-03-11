import { useEffect, useRef, useState } from 'react'
import { EventsOn } from '../../wailsjs/runtime/runtime'

interface LogEntry {
  ts: string
  level: string
  msg: string
}

const levelStyles: Record<string, string> = {
  INFO: 'text-slate-400',
  WARN: 'text-amber-400',
  CRIT: 'text-red-400 font-bold',
  ERR:  'text-red-500 font-bold',
}

export default function Logs() {
  const [logs, setLogs]           = useState<LogEntry[]>([])
  const [autoscroll, setAutoscroll] = useState(true)
  const [filter, setFilter]       = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const off = EventsOn('pip:log', (level: string, msg: string) => {
      const ts = new Date().toLocaleTimeString('en-GB', { hour12: false })
      setLogs((prev) => [...prev, { ts, level: level ?? 'INFO', msg: msg ?? '' }])
    })
    return () => { off() }
  }, [])

  useEffect(() => {
    if (autoscroll) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs, autoscroll])

  const handleClear = () => setLogs([])

  const displayed = logs.filter(
    (l) =>
      filter === '' ||
      l.msg.toLowerCase().includes(filter.toLowerCase()) ||
      l.level.toLowerCase().includes(filter.toLowerCase()),
  )

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <header className="p-8 pb-4 flex-shrink-0 border-b border-black/10 dark:border-white/10">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-3xl font-black tracking-tight">Logs</h2>
            <p className="text-[#0f1723]/50 dark:text-white/50 text-sm">Real-time output from pip operations</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoscroll}
                onChange={(e) => setAutoscroll(e.target.checked)}
              />
              Auto-scroll
            </label>
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 px-3 h-8 border border-red-400/40 text-xs font-bold text-red-500 uppercase tracking-widest hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">delete</span>
              Clear
            </button>
          </div>
        </div>

        <div className="mt-4 relative max-w-sm">
          <span className="absolute inset-y-0 left-3 flex items-center text-[#0f1723]/30 dark:text-white/30">
            <span className="material-symbols-outlined text-[16px]">filter_list</span>
          </span>
          <input
            className="w-full h-8 pl-9 pr-4 bg-white dark:bg-white/5 border border-black/15 dark:border-white/10 text-xs focus:outline-none focus:ring-1 focus:ring-[#0048ad]"
            placeholder="Filter logs..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </header>

      <div className="flex-1 overflow-auto bg-[#0f1723] font-mono text-xs">
        <div className="p-6 space-y-1 min-h-full">
          {displayed.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <span className="material-symbols-outlined text-4xl text-white/20 mb-3">terminal</span>
              <p className="text-white/30 text-xs font-bold uppercase tracking-widest">Waiting for pip operations...</p>
              <p className="text-white/20 text-[10px] mt-1">Logs will appear here when packages are installed, upgraded, or removed</p>
            </div>
          )}
          {displayed.map((log, i) => (
            <div key={i} className="flex gap-3 hover:bg-white/5 px-2 py-0.5 -mx-2">
              <span className="text-white/30 flex-shrink-0">{log.ts}</span>
              <span className={`flex-shrink-0 w-12 ${levelStyles[log.level] ?? 'text-slate-400'}`}>
                [{log.level}]
              </span>
              <span className={levelStyles[log.level] ?? 'text-white/70'}>{log.msg}</span>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="px-6 py-2 bg-[#0f1723] border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-white/30">
        <span>{displayed.length} entries</span>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-emerald-500 animate-pulse"></span>
          <span>Live</span>
        </div>
      </div>
    </div>
  )
}
