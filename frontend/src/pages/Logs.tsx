import { useEffect, useRef, useState } from 'react'

const mockLogs = [
  { ts: '14:32:01', level: 'INFO', msg: 'pip 24.0 from /usr/local/lib/python3.12/site-packages/pip (python 3.12)' },
  { ts: '14:32:02', level: 'INFO', msg: 'Fetching package index from https://pypi.org/simple...' },
  { ts: '14:32:04', level: 'INFO', msg: 'Checking installed packages for outdated versions...' },
  { ts: '14:32:06', level: 'INFO', msg: '47 packages checked — 5 outdated' },
  { ts: '14:32:07', level: 'WARN', msg: 'numpy 1.26.0 → 1.26.4 available' },
  { ts: '14:32:07', level: 'WARN', msg: 'pandas 2.1.4 → 2.2.0 available' },
  { ts: '14:32:07', level: 'CRIT', msg: 'Django 4.2.9 — CVE-2024-27351 (security vulnerability). Upgrade required.' },
  { ts: '14:32:08', level: 'CRIT', msg: 'pillow 10.1.0 — CVE-2024-28219 (security vulnerability). Upgrade required.' },
  { ts: '14:32:09', level: 'INFO', msg: 'Running: pip install --upgrade numpy' },
  { ts: '14:32:10', level: 'INFO', msg: 'Collecting numpy>=1.26.4' },
  { ts: '14:32:14', level: 'INFO', msg: 'Downloading numpy-1.26.4-cp312-cp312-manylinux_2_17_x86_64.whl (18.2 MB)' },
  { ts: '14:32:20', level: 'INFO', msg: 'Installing collected packages: numpy' },
  { ts: '14:32:22', level: 'INFO', msg: 'Successfully installed numpy-1.26.4' },
  { ts: '14:32:22', level: 'INFO', msg: 'pip cache stored: ~/.cache/pip/wheels/numpy-1.26.4...' },
]

const levelStyles: Record<string, string> = {
  INFO: 'text-slate-400',
  WARN: 'text-amber-400',
  CRIT: 'text-red-400 font-bold',
  ERR: 'text-red-500 font-bold',
}

export default function Logs() {
  const [logs, setLogs] = useState(mockLogs)
  const [autoscroll, setAutoscroll] = useState(true)
  const [filter, setFilter] = useState('')
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (autoscroll) bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs, autoscroll])

  const handleClear = () => setLogs([])
  const handleRefresh = () => setLogs(mockLogs)

  const displayed = logs.filter(
    (l) =>
      filter === '' ||
      l.msg.toLowerCase().includes(filter.toLowerCase()) ||
      l.level.toLowerCase().includes(filter.toLowerCase()),
  )

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <header className="p-8 pb-4 flex-shrink-0 border-b border-slate-200 dark:border-slate-800">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-3xl font-black tracking-tight">Logs</h2>
            <p className="text-[#0f1723]/50 dark:text-white/50 text-sm">Real-time output from pip operations</p>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-xs font-medium cursor-pointer select-none">
              <input
                type="checkbox"
                checked={autoscroll}
                className="rounded"
                onChange={(e) => setAutoscroll(e.target.checked)}
              />
              Auto-scroll
            </label>
            <button
              onClick={handleRefresh}
              className="flex items-center gap-1.5 px-3 h-8 border border-slate-200 dark:border-slate-800 text-xs font-bold uppercase tracking-widest rounded hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">refresh</span>
              Refresh
            </button>
            <button
              onClick={handleClear}
              className="flex items-center gap-1.5 px-3 h-8 border border-red-200 dark:border-red-900 text-xs font-bold text-red-500 uppercase tracking-widest rounded hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <span className="material-symbols-outlined text-[14px]">delete</span>
              Clear
            </button>
          </div>
        </div>

        <div className="mt-4 relative max-w-sm">
          <span className="absolute inset-y-0 left-3 flex items-center text-slate-400">
            <span className="material-symbols-outlined text-[16px]">filter_list</span>
          </span>
          <input
            className="w-full h-8 pl-9 pr-4 bg-white dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded text-xs focus:outline-none focus:ring-1 focus:ring-[#0048ad]"
            placeholder="Filter logs..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>
      </header>

      <div className="flex-1 overflow-auto bg-slate-950 font-mono text-xs">
        <div className="p-6 space-y-1 min-h-full">
          {displayed.length === 0 && (
            <p className="text-slate-600 italic">No log entries to display.</p>
          )}
          {displayed.map((log, i) => (
            <div key={i} className="flex gap-3 hover:bg-slate-900 px-2 py-0.5 rounded -mx-2">
              <span className="text-slate-600 flex-shrink-0">{log.ts}</span>
              <span className={`flex-shrink-0 w-10 ${levelStyles[log.level] ?? 'text-slate-400'}`}>
                [{log.level}]
              </span>
              <span className={levelStyles[log.level] ?? 'text-slate-300'}>{log.msg}</span>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="px-6 py-2 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono text-slate-600">
        <span>{displayed.length} entries</span>
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Live</span>
        </div>
      </div>
    </div>
  )
}
