import { useState, useEffect, useCallback } from 'react'
import { GetCleanupInfo, RunCleanup } from '../../wailsjs/go/main/App'
import { pip } from '../../wailsjs/go/models'

const ITEMS = [
  { id: 'cache',  label: 'pip Cache',          description: 'Cached wheel files and package downloads (pip cache purge)', icon: 'folder_delete', sizeKey: 'cacheSize'   as const },
  { id: 'orphan', label: 'Orphaned .egg-info', description: 'Development egg-info directories from uninstalled packages',  icon: 'delete_sweep',  sizeKey: 'eggInfoSize' as const },
  { id: 'temp',   label: '__pycache__ Dirs',   description: 'Compiled bytecode files in site-packages directories',        icon: 'folder_zip',    sizeKey: 'pycacheSize' as const },
]

function parseSizeToMB(s: string): number {
  const [n, u] = s.split(' ')
  if (u === 'MB') return +n
  if (u === 'KB') return +n / 1024
  return +n / (1024 ** 2)
}

function formatMB(mb: number): string {
  if (mb < 0.1) return '< 0.1 MB'
  return mb.toFixed(1) + ' MB'
}

export default function Cleanup() {
  const [info, setInfo]         = useState<pip.CleanupInfo | null>(null)
  const [scanning, setScanning] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [running, setRunning]   = useState(false)
  const [cleaned, setCleaned]   = useState(false)
  const [error, setError]       = useState<string | null>(null)

  const fetchInfo = useCallback(async () => {
    setScanning(true)
    setError(null)
    try {
      setInfo(await GetCleanupInfo())
    } catch (e: any) {
      setError(String(e))
    } finally {
      setScanning(false)
    }
  }, [])

  useEffect(() => { fetchInfo() }, [fetchInfo])

  const sizeOf = (id: string) => {
    const item = ITEMS.find(i => i.id === id)!
    return info ? info[item.sizeKey] : '…'
  }

  const isEmpty = (id: string) => sizeOf(id) === '0 B'

  const toggle = (id: string) => {
    if (isEmpty(id) || scanning) return
    setSelected(p => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  const totalMB = info
    ? ITEMS.filter(i => selected.has(i.id)).reduce((acc, i) => acc + parseSizeToMB(info[i.sizeKey]), 0)
    : 0

  const handleClean = async () => {
    if (selected.size === 0 || running) return
    setRunning(true)
    setError(null)
    setCleaned(false)
    try {
      await RunCleanup(Array.from(selected))
      setSelected(new Set())
      setCleaned(true)
      await fetchInfo()
    } catch (e: any) {
      setError(String(e))
    } finally {
      setRunning(false)
    }
  }

  const allClean = !scanning && info != null && ITEMS.every(i => isEmpty(i.id))

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
            disabled={selected.size === 0 || running || scanning}
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
                {selected.size > 0 ? `Clean Selected (${formatMB(totalMB)})` : 'Clean Selected'}
              </>
            )}
          </button>
        </div>
      </header>

      <div className="p-8 space-y-4">
        {allClean ? (
          <div className="flex flex-col items-center justify-center py-20 text-center text-[#0f1723]/30 dark:text-white/30">
            <span className="material-symbols-outlined text-6xl mb-4 opacity-30">check_circle</span>
            <p className="text-sm font-bold uppercase tracking-widest">pip cache is clean</p>
            <p className="text-xs mt-1">Nothing to remove at this time</p>
          </div>
        ) : (
          ITEMS.map((item) => {
            const size = sizeOf(item.id)
            const clean = isEmpty(item.id)
            const sel = selected.has(item.id)
            return (
              <div
                key={item.id}
                className={`border p-5 flex items-center gap-4 transition-colors ${
                  clean
                    ? 'border-black/10 dark:border-white/5 bg-white dark:bg-white/5 opacity-40 cursor-default'
                    : sel
                    ? 'border-[#0048ad] bg-[#0048ad]/5 dark:bg-[#0048ad]/10 cursor-pointer'
                    : 'border-black/15 dark:border-white/10 bg-white dark:bg-white/5 hover:border-black/25 dark:hover:border-white/20 cursor-pointer'
                }`}
                onClick={() => toggle(item.id)}
              >
                <input
                  type="checkbox"
                  className="flex-shrink-0"
                  checked={sel}
                  disabled={clean}
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
                  {scanning ? (
                    <div className="h-4 w-16 bg-black/10 dark:bg-white/10 animate-pulse rounded" />
                  ) : (
                    <>
                      <p className="text-sm font-black tracking-tight">{size}</p>
                      <p className="text-[10px] text-[#0f1723]/40 dark:text-white/40 uppercase tracking-widest">
                        {clean ? 'already clean' : 'reclaimable'}
                      </p>
                    </>
                  )}
                </div>
              </div>
            )
          })
        )}

        {error && (
          <div className="flex items-center gap-3 p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900">
            <span className="material-symbols-outlined text-red-600">error</span>
            <p className="text-xs font-bold text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {cleaned && !error && (
          <div className="flex items-center gap-3 p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-900">
            <span className="material-symbols-outlined text-emerald-600">check_circle</span>
            <p className="text-xs font-bold text-emerald-700 dark:text-emerald-400">Cleanup complete.</p>
          </div>
        )}
      </div>
    </div>
  )
}
