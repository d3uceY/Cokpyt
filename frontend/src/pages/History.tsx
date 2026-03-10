import { useState } from 'react'

interface HistoryEntry {
  id: string
  action: 'install' | 'upgrade' | 'uninstall'
  package: string
  version: string
  status: 'success' | 'failed'
  timestamp: string
  command: string
}

const mockHistory: HistoryEntry[] = [
  { id: '1', action: 'upgrade', package: 'numpy', version: '1.26.4', status: 'success', timestamp: '2026-03-09 14:32', command: 'pip install --upgrade numpy' },
  { id: '2', action: 'install', package: 'httpx', version: '0.26.0', status: 'success', timestamp: '2026-03-09 12:15', command: 'pip install httpx' },
  { id: '3', action: 'install', package: 'pydantic', version: '2.5.3', status: 'success', timestamp: '2026-03-08 18:04', command: 'pip install pydantic==2.5.3' },
  { id: '4', action: 'uninstall', package: 'Flask', version: '3.0.1', status: 'success', timestamp: '2026-03-08 10:22', command: 'pip uninstall flask' },
  { id: '5', action: 'install', package: 'black', version: '24.1.1', status: 'failed', timestamp: '2026-03-07 20:11', command: 'pip install black' },
  { id: '6', action: 'upgrade', package: 'pandas', version: '2.2.0', status: 'success', timestamp: '2026-03-07 09:30', command: 'pip install --upgrade pandas' },
  { id: '7', action: 'install', package: 'fastapi', version: '0.109.0', status: 'success', timestamp: '2026-03-06 16:48', command: 'pip install fastapi[all]' },
  { id: '8', action: 'upgrade', package: 'Django', version: '5.0.3', status: 'success', timestamp: '2026-03-06 11:05', command: 'pip install --upgrade Django' },
]

const actionStyles = {
  install: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400',
  upgrade: 'bg-[#0048ad]/10 text-[#0048ad]',
  uninstall: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400',
}

export default function History() {
  const [filter, setFilter] = useState<'all' | 'install' | 'upgrade' | 'uninstall'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const filtered = mockHistory.filter((h) => filter === 'all' || h.action === filter)

  return (
    <div className="flex flex-col min-h-screen">
      <header className="p-8 pb-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-3xl font-black tracking-tight">History</h2>
            <p className="text-[#0f1723]/50 dark:text-white/50 text-sm">pip command audit trail</p>
          </div>
          <button className="flex items-center gap-2 px-4 h-9 border border-black/15 dark:border-white/10 text-xs font-bold uppercase tracking-widest hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            <span className="material-symbols-outlined text-[16px]">download</span>
            Export
          </button>
        </div>

        {/* Filter tabs */}
        <div className="mt-6 flex gap-0 border-b border-black/10 dark:border-white/10">
          {(['all', 'install', 'upgrade', 'uninstall'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 text-xs font-bold uppercase tracking-widest border-b-2 transition-colors -mb-px ${
                filter === f
                  ? 'border-[#0048ad] text-[#0048ad]'
                  : 'border-transparent text-[#0f1723]/40 dark:text-white/40 hover:text-[#0f1723] dark:hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </header>

      <div className="flex-1 overflow-auto px-8 pb-8">
        <div className="border border-black/15 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden">
          <table className="w-full text-left border-collapse min-w-[600px]">
            <thead>
              <tr className="bg-black/5 dark:bg-white/5">
                {['Action', 'Package', 'Version', 'Status', 'Time', ''].map((h, i) => (
                  <th
                    key={`${h}${i}`}
                    className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-[#0f1723]/40 dark:text-white/40 border-b border-black/10 dark:border-white/10"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {filtered.map((entry) => (
                <>
                  <tr
                    key={entry.id}
                    className="hover:bg-black/2 dark:hover:bg-white/3 transition-colors cursor-pointer"
                    onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                  >
                    <td className="px-6 py-4">
                      <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${actionStyles[entry.action]}`}>
                        {entry.action}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm font-bold font-mono">{entry.package}</td>
                    <td className="px-6 py-4 text-sm font-mono text-[#0f1723]/50 dark:text-white/50">{entry.version}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 ${entry.status === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}></span>
                        <span className={`text-xs font-bold ${entry.status === 'success' ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-500'}`}>
                          {entry.status}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-[#0f1723]/40 dark:text-white/40 font-mono">{entry.timestamp}</td>
                    <td className="px-6 py-4">
                      <span className={`material-symbols-outlined text-[#0f1723]/30 dark:text-white/30 text-[18px] transition-transform ${expandedId === entry.id ? 'rotate-180' : ''}`}>
                        expand_more
                      </span>
                    </td>
                  </tr>
                  {expandedId === entry.id && (
                    <tr key={`${entry.id}-expand`} className="bg-black/3 dark:bg-white/3">
                      <td colSpan={6} className="px-6 py-3">
                        <p className="text-[10px] font-bold uppercase tracking-widest text-[#0f1723]/30 dark:text-white/30 mb-1">Command</p>
                        <code className="text-xs font-mono text-[#0048ad]">{entry.command}</code>
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-[#0f1723]/30 dark:text-white/30">
                    No history entries.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
