import { useState } from 'react'

interface CleanupItem {
  id: string
  label: string
  description: string
  icon: string
  size: string
  type: 'cache' | 'orphan' | 'temp'
}

const cleanupItems: CleanupItem[] = [
  { id: '1', label: 'pip Cache', description: 'Cached wheel files and package downloads (pip cache purge)', icon: 'folder_delete', size: '842 MB', type: 'cache' },
  { id: '2', label: 'Orphaned .egg-info', description: 'Development egg-info directories from uninstalled packages', icon: 'delete_sweep', size: '124 MB', type: 'orphan' },
  { id: '3', label: '__pycache__ Dirs', description: 'Compiled bytecode files in site-packages directories', icon: 'folder_zip', size: '56 MB', type: 'temp' },
]

export default function Cleanup() {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [cleaned, setCleaned] = useState<Set<string>>(new Set())
  const [running, setRunning] = useState(false)

  const toggle = (id: string) =>
    setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })

  const handleClean = () => {
    if (selected.size === 0) return
    setRunning(true)
    setTimeout(() => {
      setCleaned((p) => new Set([...p, ...selected]))
      setSelected(new Set())
      setRunning(false)
    }, 2000)
  }

  const remaining = cleanupItems.filter((i) => !cleaned.has(i.id))
  const totalSavings = remaining
    .filter((i) => selected.has(i.id))
    .reduce((acc, i) => acc + parseFloat(i.size), 0)
    .toFixed(0)

  return (
    <div className="flex flex-col min-h-screen">
      <header className="p-8 pb-0">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-3xl font-black tracking-tight">Cleanup</h2>
            <p className="text-[#0f1723]/50 dark:text-white/50 text-sm">Free disk space used by pip cache and orphaned files</p>
          </div>
          <button
            onClick={handleClean}
            disabled={selected.size === 0 || running}
            className="flex items-center gap-2 px-4 h-10 bg-[#0048ad] hover:brightness-110 text-white font-bold text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {running ? (
              <>
                <span className="material-symbols-outlined text-[18px] animate-spin">progress_activity</span>
                Cleaning…
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">cleaning_services</span>
                {selected.size > 0 ? `Clean Selected (${totalSavings} MB)` : 'Clean Selected'}
              </>
            )}
          </button>
        </div>
      </header>

      <div className="p-8 space-y-4">
        {remaining.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center text-[#0f1723]/30 dark:text-white/30">
            <span className="material-symbols-outlined text-6xl mb-4 opacity-30">check_circle</span>
            <p className="text-sm font-bold uppercase tracking-widest">pip cache is clean</p>
            <p className="text-xs mt-1">Nothing to remove at this time</p>
          </div>
        )}

        {remaining.map((item) => (
          <div
            key={item.id}
            className={`border p-5 flex items-center gap-4 cursor-pointer transition-colors ${
              selected.has(item.id)
                ? 'border-[#0048ad] bg-[#0048ad]/5 dark:bg-[#0048ad]/10'
                : 'border-black/15 dark:border-white/10 bg-white dark:bg-white/5 hover:border-black/25 dark:hover:border-white/20'
            }`}
            onClick={() => toggle(item.id)}
          >
            <input
              type="checkbox"
              className="flex-shrink-0"
              checked={selected.has(item.id)}
              onChange={() => toggle(item.id)}
              onClick={(e) => e.stopPropagation()}
            />
            <div className="w-10 h-10 bg-[#0048ad]/10 flex items-center justify-center flex-shrink-0">
              <span className="material-symbols-outlined text-[#0048ad]">{item.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold">{item.label}</p>
              <p className="text-xs text-[#0f1723]/50 dark:text-white/50 mt-0.5 font-mono">{item.description}</p>
            </div>
            <div className="text-right flex-shrink-0">
              <p className="text-sm font-black tracking-tight">{item.size}</p>
              <p className="text-[10px] text-[#0f1723]/40 dark:text-white/40 uppercase tracking-widest">reclaimable</p>
            </div>
          </div>
        ))}

        {cleaned.size > 0 && (
          <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-900">
            <span className="material-symbols-outlined text-emerald-600">check_circle</span>
            <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">
              {cleaned.size} item{cleaned.size > 1 ? 's' : ''} successfully cleaned.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
