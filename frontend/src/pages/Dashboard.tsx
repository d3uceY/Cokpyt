import { useEffect, useState, useCallback } from 'react'
import { useOutletContext } from 'react-router-dom'
import { GetInstalledPackages, GetOutdatedPackages, GetPythonInfo, GetHistory, UpgradePackage } from '../../wailsjs/go/main/App'
import type { pip } from '../../wailsjs/go/models'
import type { AppOutletContext } from '../components/layout/AppLayout'

const statusBadge: Record<string, string> = {
  success: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400',
  failed: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400',
}

export default function Dashboard() {
  const { setUpdateCount } = useOutletContext<AppOutletContext>()

  const [packages, setPackages] = useState<pip.PipPackage[]>([])
  const [outdated, setOutdated] = useState<pip.OutdatedPackage[]>([])
  const [pythonInfo, setPythonInfo] = useState<pip.PythonInfo | null>(null)
  const [recentActivity, setRecentActivity] = useState<pip.HistoryEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [upgradingAll, setUpgradingAll] = useState(false)
  const [lastSync, setLastSync] = useState(new Date())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [pkgs, out, info, hist] = await Promise.all([
        GetInstalledPackages(),
        GetOutdatedPackages(),
        GetPythonInfo(),
        GetHistory(),
      ])
      setPackages(pkgs ?? [])
      setOutdated(out ?? [])
      setPythonInfo(info)
      setRecentActivity((hist ?? []).slice(0, 5))
      setUpdateCount((out ?? []).length)
      setLastSync(new Date())
    } finally {
      setLoading(false)
    }
  }, [setUpdateCount])

  useEffect(() => { load() }, [load])

  const handleUpgradeAll = async () => {
    setUpgradingAll(true)
    try {
      await Promise.all(outdated.map((p) => UpgradePackage(p.name)))
      await load()
    } finally {
      setUpgradingAll(false)
    }
  }

  // Compute update priority breakdown from bump types
  const majorCount = outdated.filter((p) => p.bumpType === 'major').length
  const minorCount = outdated.filter((p) => p.bumpType === 'minor').length
  const total = outdated.length || 1
  const majorPct = Math.round((majorCount / total) * 100)
  const minorPct = Math.round((minorCount / total) * 100)
  const patchPct = 100 - majorPct - minorPct

  const Skeleton = ({ className }: { className?: string }) => (
    <div className={`animate-pulse bg-black/10 dark:bg-white/10 ${className ?? ''}`} />
  )

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <header className="h-16 border-b border-black/10 dark:border-white/10 flex items-center justify-between px-8 bg-[#f5f7f8] dark:bg-[#0f1723] sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <h1 className="text-2xl font-black tracking-tight uppercase">Overview</h1>
          <div className="flex items-center gap-2 px-2 py-0.5 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
            <span className="w-1.5 h-1.5 bg-emerald-500 animate-pulse"></span>
            <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400">PyPI Reachable</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={load}
            disabled={loading}
            className="px-4 py-2 border border-black/15 dark:border-white/10 text-xs font-bold uppercase tracking-widest hover:bg-black/5 dark:hover:bg-white/5 transition-colors disabled:opacity-60"
          >
            {loading ? 'Loading…' : 'Refresh'}
          </button>
          {outdated.length > 0 && (
            <button
              onClick={handleUpgradeAll}
              disabled={upgradingAll}
              className="px-4 py-2 bg-[#0048ad] text-white text-xs font-bold uppercase tracking-widest hover:brightness-110 transition-colors disabled:opacity-60 flex items-center gap-2"
            >
              {upgradingAll && <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>}
              Update All ({outdated.length})
            </button>
          )}
        </div>
      </header>

      {/* Content */}
      <div className="p-8 space-y-8 max-w-7xl w-full">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Installed count */}
          <div className="border border-black/15 dark:border-white/10 p-6 flex flex-col justify-between bg-white dark:bg-white/5">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#0f1723]/40 dark:text-white/40">Installed Packages</span>
              <span className="material-symbols-outlined text-[#0f1723]/30 dark:text-white/30">inventory_2</span>
            </div>
            <div className="mt-4">
              {loading
                ? <Skeleton className="h-12 w-24 rounded" />
                : <span className="text-5xl font-black tracking-tighter">{packages.length}</span>
              }
            </div>
          </div>

          {/* Outdated count */}
          <div className="border border-black/15 dark:border-white/10 p-6 flex flex-col justify-between bg-white dark:bg-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1 bg-[#0048ad] h-full"></div>
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#0f1723]/40 dark:text-white/40">Outdated Packages</span>
              <span className="material-symbols-outlined text-[#0048ad]">download</span>
            </div>
            <div className="mt-4">
              {loading
                ? <Skeleton className="h-12 w-16 rounded" />
                : <span className="text-5xl font-black tracking-tighter text-[#0048ad]">{outdated.length}</span>
              }
            </div>
          </div>

          {/* Python runtime */}
          <div className="border border-black/15 dark:border-white/10 p-6 flex flex-col justify-between bg-white dark:bg-white/5">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#0f1723]/40 dark:text-white/40">Python Runtime</span>
              <span className="material-symbols-outlined text-[#0f1723]/30 dark:text-white/30">data_object</span>
            </div>
            <div className="mt-4">
              {loading || !pythonInfo
                ? <Skeleton className="h-9 w-28 rounded" />
                : (
                  <>
                    <span className="text-3xl font-black tracking-tighter">{pythonInfo.pythonVersion}</span>
                    <div className="flex items-center gap-1 mt-2">
                      <div className="w-2 h-2 bg-[#0048ad]"></div>
                      <span className="text-[10px] font-bold uppercase tracking-tighter">pip {pythonInfo.pipVersion}</span>
                    </div>
                  </>
                )
              }
            </div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Recent Activity */}
          <div className="xl:col-span-2 border border-black/15 dark:border-white/10 bg-white dark:bg-white/5">
            <div className="p-4 border-b border-black/10 dark:border-white/10 flex justify-between items-center">
              <h2 className="text-sm font-black uppercase tracking-widest">Recent Activity</h2>
              <button className="text-[10px] font-bold uppercase text-[#0048ad] hover:underline">View All History</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-black/5 dark:bg-white/5">
                    {['Package', 'Version', 'Action', 'Status', 'Time'].map((h, i) => (
                      <th
                        key={h}
                        className={`p-4 text-[10px] font-black uppercase tracking-widest text-[#0f1723]/40 dark:text-white/40 border-b border-black/10 dark:border-white/10${i === 4 ? ' text-right' : ''}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                  {loading && Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j} className="p-4"><div className="h-3 bg-black/8 dark:bg-white/8" style={{ width: `${50 + j * 20}px` }} /></td>
                      ))}
                    </tr>
                  ))}
                  {!loading && recentActivity.length === 0 && (
                    <tr>
                      <td colSpan={5} className="p-8 text-center text-[10px] font-bold uppercase tracking-widest text-[#0f1723]/30 dark:text-white/30">
                        No activity yet — install or upgrade a package to start logging
                      </td>
                    </tr>
                  )}
                  {!loading && recentActivity.map((item) => (
                    <tr key={item.id} className="hover:bg-black/2 dark:hover:bg-white/3 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-[#0048ad]/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[#0048ad] text-sm">data_object</span>
                          </div>
                          <span className="text-sm font-bold font-mono">{item.package}</span>
                        </div>
                      </td>
                      <td className="p-4 text-xs font-mono">{item.version || '—'}</td>
                      <td className="p-4 text-[10px] font-bold uppercase tracking-tighter">{item.action}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-widest border ${statusBadge[item.status] ?? ''}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="p-4 text-[10px] font-bold text-[#0f1723]/40 dark:text-white/40 text-right">{item.timestamp}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Side Widgets */}
          <div className="space-y-6">
            {/* PyPI Status */}
            <div className="border border-black/15 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden">
              <div className="p-4 border-b border-black/10 dark:border-white/10">
                <h2 className="text-sm font-black uppercase tracking-widest">Registry Status</h2>
              </div>
              <div className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#0048ad]">lan</span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-tight">PyPI</p>
                      <p className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold uppercase">Connected</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Update Priority */}
            <div className="border border-black/15 dark:border-white/10 bg-white dark:bg-white/5 p-4">
              <h2 className="text-sm font-black uppercase tracking-widest mb-4">Update Priority</h2>
              <div className="space-y-3">
                {[
                  { label: 'Major', pct: majorPct, color: 'bg-red-500' },
                  { label: 'Minor', pct: minorPct, color: 'bg-[#0048ad]' },
                  { label: 'Patch', pct: patchPct, color: 'bg-[#0f1723]/20 dark:bg-white/20' },
                ].map((bar) => (
                  <div key={bar.label}>
                    <div className="flex justify-between items-end mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest">{bar.label}</span>
                      <span className="text-xs font-black">{outdated.length === 0 ? '—' : `${bar.pct}%`}</span>
                    </div>
                    <div className="w-full h-1 bg-black/5 dark:bg-white/5">
                      <div className={`${bar.color} h-full`} style={{ width: `${bar.pct}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Footer Status */}
        <footer className="flex items-center justify-between text-[10px] font-bold text-[#0f1723]/30 dark:text-white/30 uppercase tracking-widest pt-4 border-t border-black/10 dark:border-white/10">
          <div className="flex gap-4">
            {pythonInfo && <span>pip {pythonInfo.pipVersion}</span>}
            {pythonInfo && <span>Python {pythonInfo.pythonVersion}</span>}
            <span>Last Sync: {lastSync.toLocaleTimeString()}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-emerald-500"></span>
            <span>PyPI Connected</span>
          </div>
        </footer>
      </div>
    </div>
  )
}
