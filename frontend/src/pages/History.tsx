import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { GetHistory, ClearHistory } from '../../wailsjs/go/main/App'

const actionStyles = {
  install:   'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400',
  upgrade:   'bg-[#0048ad]/10 text-[#0048ad]',
  uninstall: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400',
}

const PAGE_SIZE = 20

export default function History() {
  const queryClient = useQueryClient()
  const [filter, setFilter]     = useState<'all' | 'install' | 'upgrade' | 'uninstall'>('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [page, setPage]         = useState(1)
  const [confirmClear, setConfirmClear] = useState(false)
  const [clearing, setClearing] = useState(false)

  const { data: history = [], isLoading: loading } = useQuery({
    queryKey: ['history'],
    queryFn: () => GetHistory(),
    staleTime: 0,
  })

  const filtered = history.filter((h) => filter === 'all' || h.action === filter)
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const handleFilterChange = (f: typeof filter) => {
    setFilter(f)
    setPage(1)
    setExpandedId(null)
  }

  const handleExport = () => {
    const csv = ['Action,Package,Version,Status,Timestamp,Command',
      ...history.map(h => `${h.action},${h.package},${h.version},${h.status},${h.timestamp},"${h.command}"`)].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'pip-history.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const handleClearAll = async () => {
    setClearing(true)
    try {
      await ClearHistory()
      queryClient.setQueryData(['history'], [])
      setPage(1)
      setExpandedId(null)
    } finally {
      setClearing(false)
      setConfirmClear(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <header className="p-8 pb-4">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-3xl font-black tracking-tight">History</h2>
            <p className="text-[#0f1723]/50 dark:text-white/50 text-sm">pip command audit trail</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={() => queryClient.invalidateQueries({ queryKey: ['history'] })}
              disabled={loading}
              className="flex items-center gap-2 px-4 h-9 border border-black/15 dark:border-white/10 text-xs font-bold uppercase tracking-widest hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              <span className={`material-symbols-outlined text-[16px] ${loading ? 'animate-spin' : ''}`}>refresh</span>
              Refresh
            </button>
            <button
              onClick={handleExport}
              disabled={history.length === 0}
              className="flex items-center gap-2 px-4 h-9 border border-black/15 dark:border-white/10 text-xs font-bold uppercase tracking-widest hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[16px]">download</span>
              Export CSV
            </button>
            {!confirmClear ? (
              <button
                onClick={() => setConfirmClear(true)}
                disabled={history.length === 0}
                className="flex items-center gap-2 px-4 h-9 border border-red-400/40 text-xs font-bold uppercase tracking-widest text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[16px]">delete_sweep</span>
                Clear All
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-red-500 uppercase tracking-widest">Sure?</span>
                <button
                  onClick={handleClearAll}
                  disabled={clearing}
                  className="px-3 h-9 bg-red-500 text-white text-xs font-bold uppercase tracking-widest hover:brightness-110 disabled:opacity-60"
                >
                  {clearing ? '…' : 'Yes, delete'}
                </button>
                <button
                  onClick={() => setConfirmClear(false)}
                  className="px-3 h-9 border border-black/15 dark:border-white/10 text-xs font-bold uppercase tracking-widest hover:bg-black/5 dark:hover:bg-white/5"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 flex gap-0 border-b border-black/10 dark:border-white/10">
          {(['all', 'install', 'upgrade', 'uninstall'] as const).map((f) => (
            <button
              key={f}
              onClick={() => handleFilterChange(f)}
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

      <div className="flex-1 overflow-auto px-8 pb-4">
        {!loading && history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-[#0f1723]/30 dark:text-white/30">
            <span className="material-symbols-outlined text-6xl mb-4 opacity-30">history</span>
            <p className="text-sm font-bold uppercase tracking-widest">No history yet</p>
            <p className="text-xs mt-1">Install, upgrade, or uninstall a package to start logging</p>
          </div>
        ) : (
          <div className="border border-black/15 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="bg-black/5 dark:bg-white/5">
                  {['Action', 'Package', 'Version', 'Status', 'Time', ''].map((h, i) => (
                    <th key={`${h}${i}`} className="px-6 py-4 text-[10px] font-black uppercase tracking-wider text-[#0f1723]/40 dark:text-white/40 border-b border-black/10 dark:border-white/10">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/5">
                {loading && Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-6 py-4"><div className="h-3 bg-black/8 dark:bg-white/8 rounded-sm" style={{ width: `${60 + j * 15}px` }} /></td>
                    ))}
                  </tr>
                ))}
                {!loading && paginated.map((entry) => (
                  <>
                    <tr
                      key={entry.id}
                      className="hover:bg-black/2 dark:hover:bg-white/3 transition-colors cursor-pointer"
                      onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                    >
                      <td className="px-6 py-4">
                        <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${actionStyles[entry.action as keyof typeof actionStyles] ?? ''}`}>
                          {entry.action}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-bold font-mono">{entry.package}</td>
                      <td className="px-6 py-4 text-sm font-mono text-[#0f1723]/50 dark:text-white/50">{entry.version || '—'}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 ${entry.status === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                          <span className="text-xs font-bold">{entry.status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-xs text-[#0f1723]/40 dark:text-white/40">{entry.timestamp}</td>
                      <td className="px-6 py-4">
                        <span className="material-symbols-outlined text-[14px] text-[#0f1723]/30 dark:text-white/30">
                          {expandedId === entry.id ? 'expand_less' : 'expand_more'}
                        </span>
                      </td>
                    </tr>
                    {expandedId === entry.id && (
                      <tr key={`${entry.id}-expand`}>
                        <td colSpan={6} className="px-6 py-3 bg-black/3 dark:bg-white/3 border-t border-black/5 dark:border-white/5">
                          <code className="text-xs font-mono text-[#0048ad]">{entry.command}</code>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!loading && filtered.length > PAGE_SIZE && (
        <div className="px-8 py-4 border-t border-black/10 dark:border-white/10 flex items-center justify-between text-xs font-bold">
          <span className="text-[#0f1723]/40 dark:text-white/40 uppercase tracking-widest">
            {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length} entries
          </span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage(1)}
              disabled={safePage === 1}
              className="px-2 h-8 border border-black/15 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">first_page</span>
            </button>
            <button
              onClick={() => setPage(safePage - 1)}
              disabled={safePage === 1}
              className="px-2 h-8 border border-black/15 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">chevron_left</span>
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter(p => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
              .reduce<(number | '...')[]>((acc, p, i, arr) => {
                if (i > 0 && (p as number) - (arr[i - 1] as number) > 1) acc.push('...')
                acc.push(p)
                return acc
              }, [])
              .map((p, i) =>
                p === '...'
                  ? <span key={`ellipsis-${i}`} className="px-2 h-8 flex items-center text-[#0f1723]/30 dark:text-white/30">…</span>
                  : <button
                      key={p}
                      onClick={() => setPage(p as number)}
                      className={`px-3 h-8 border transition-colors ${safePage === p ? 'bg-[#0048ad] text-white border-[#0048ad]' : 'border-black/15 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5'}`}
                    >
                      {p}
                    </button>
              )
            }
            <button
              onClick={() => setPage(safePage + 1)}
              disabled={safePage === totalPages}
              className="px-2 h-8 border border-black/15 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">chevron_right</span>
            </button>
            <button
              onClick={() => setPage(totalPages)}
              disabled={safePage === totalPages}
              className="px-2 h-8 border border-black/15 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-30 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">last_page</span>
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

