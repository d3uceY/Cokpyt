import { useEffect, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import {
  GetPipEnvironmentInfo,
  GetConfig,
  ListEnvironments,
  AddEnvironment,
  RemoveEnvironment,
  SetActiveEnvironment,
  ScanForVenvs,
  BrowseForDirectory,
} from '../../wailsjs/go/main/App'
import type { pip } from '../../wailsjs/go/models'

export default function PackageManagers() {
  const queryClient = useQueryClient()

  const [envInfo, setEnvInfo] = useState<pip.PipEnvironmentInfo | null>(null)
  const [environments, setEnvironments] = useState<pip.VenvEntry[]>([])
  const [activeEnv, setActiveEnvState] = useState<string>('')
  const [loading, setLoading] = useState(true)

  // Add-environment form
  const [addName, setAddName] = useState('')
  const [addPath, setAddPath] = useState('')
  const [addError, setAddError] = useState('')
  const [addBusy, setAddBusy] = useState(false)

  // Scan
  const [scanning, setScanning] = useState(false)
  const [scanResults, setScanResults] = useState<pip.VenvEntry[] | null>(null)

  const [switchingPath, setSwitchingPath] = useState<string | null>(null)
  const [removingPath, setRemovingPath] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [env, cfg, envs] = await Promise.all([
        GetPipEnvironmentInfo(),
        GetConfig(),
        ListEnvironments(),
      ])
      setEnvInfo(env)
      setActiveEnvState(cfg.activeEnv ?? '')
      setEnvironments(envs ?? [])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['installed-packages'] })
    queryClient.invalidateQueries({ queryKey: ['outdated-packages'] })
    queryClient.invalidateQueries({ queryKey: ['python-info'] })
  }

  const handleSwitch = async (path: string) => {
    setSwitchingPath(path)
    try {
      await SetActiveEnvironment(path)
      setActiveEnvState(path)
      invalidateAll()
      await load()
    } finally {
      setSwitchingPath(null)
    }
  }

  const handleUseSystem = async () => {
    setSwitchingPath('__system__')
    try {
      await SetActiveEnvironment('')
      setActiveEnvState('')
      invalidateAll()
      await load()
    } finally {
      setSwitchingPath(null)
    }
  }

  const handleRemove = async (path: string) => {
    setRemovingPath(path)
    try {
      await RemoveEnvironment(path)
      if (activeEnv === path) {
        setActiveEnvState('')
        invalidateAll()
      }
      await load()
    } finally {
      setRemovingPath(null)
    }
  }

  const handleBrowse = async () => {
    const dir = await BrowseForDirectory()
    if (dir) setAddPath(dir)
  }

  const handleAdd = async () => {
    if (!addPath.trim()) { setAddError('Path is required'); return }
    setAddBusy(true)
    setAddError('')
    try {
      await AddEnvironment(addName.trim(), addPath.trim())
      setAddName('')
      setAddPath('')
      setScanResults(null)
      await load()
    } catch (e: any) {
      setAddError(e?.message ?? String(e))
    } finally {
      setAddBusy(false)
    }
  }

  const handleScan = async () => {
    const dir = await BrowseForDirectory()
    if (!dir) return
    setScanning(true)
    setScanResults(null)
    try {
      const found = await ScanForVenvs(dir)
      setScanResults(found ?? [])
    } finally {
      setScanning(false)
    }
  }

  const handleAddScanned = async (entry: pip.VenvEntry) => {
    try {
      await AddEnvironment(entry.name, entry.path)
      await load()
      setScanResults((prev) => prev?.filter((e) => e.path !== entry.path) ?? null)
    } catch { /* already saved */ }
  }

  const Skeleton = ({ w }: { w?: string }) => (
    <div className={`animate-pulse bg-black/10 dark:bg-white/10 h-4 ${w ?? 'w-28'}`} />
  )

  const isSystemActive = activeEnv === ''

  const runtimeRows = envInfo
    ? [
        { label: 'Python Version', value: envInfo.pythonVersion, icon: 'terminal' },
        { label: 'pip Version',    value: envInfo.pipVersion,    icon: 'package_2' },
        { label: 'Python Path',    value: envInfo.pythonPath,    icon: 'code' },
        { label: 'Site-Packages',  value: envInfo.sitePackages,  icon: 'folder' },
      ]
    : Array(4).fill(null).map((_, i) => ({ label: ['Python Version','pip Version','Python Path','Site-Packages'][i], value: null, icon: ['terminal','package_2','code','folder'][i] }))

  const savedPaths = new Set(environments.map((e) => e.path))

  return (
    <div className="flex flex-col min-h-screen">
      <header className="p-8 pb-4 border-b border-black/10 dark:border-white/10">
        <div className="space-y-1">
          <h2 className="text-3xl font-black tracking-tight">Environments</h2>
          <p className="text-[#0f1723]/50 dark:text-white/50 text-sm">
            Switch between virtual environments — all package operations use the active one
          </p>
        </div>
      </header>

      <div className="p-8 space-y-8 max-w-3xl">

        {/* Active environment banner */}
        <section>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-[#0f1723]/40 dark:text-white/40 mb-4">Active Environment</h3>
          <div className={`flex items-center justify-between px-5 py-4 border ${isSystemActive ? 'border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-900/10' : 'border-[#0048ad]/30 bg-[#0048ad]/5'}`}>
            <div className="flex items-center gap-3 min-w-0">
              <span className={`material-symbols-outlined text-xl ${isSystemActive ? 'text-emerald-600 dark:text-emerald-400' : 'text-[#0048ad]'}`}>
                {isSystemActive ? 'computer' : 'hub'}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-bold">
                  {isSystemActive ? 'System Python' : (environments.find((e) => e.path === activeEnv)?.name ?? activeEnv)}
                </p>
                {!isSystemActive && (
                  <p className="text-[11px] font-mono text-[#0f1723]/50 dark:text-white/40 truncate">{activeEnv}</p>
                )}
              </div>
            </div>
            {!isSystemActive && (
              <button
                onClick={handleUseSystem}
                disabled={switchingPath === '__system__'}
                className="ml-4 flex-shrink-0 px-3 py-1.5 text-xs font-bold uppercase tracking-widest border border-black/15 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50"
              >
                Use System Python
              </button>
            )}
          </div>
        </section>

        {/* Runtime info for active env */}
        <section>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-[#0f1723]/40 dark:text-white/40 mb-4">Runtime Details</h3>
          <div className="border border-black/15 dark:border-white/10 bg-white dark:bg-white/5 divide-y divide-black/10 dark:divide-white/10">
            {runtimeRows.map((row) => (
              <div key={row.label} className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#0048ad] text-[18px]">{row.icon}</span>
                  <p className="text-xs font-black uppercase tracking-widest text-[#0f1723]/50 dark:text-white/50">{row.label}</p>
                </div>
                {loading || row.value === null
                  ? <Skeleton w="w-36" />
                  : <p className="text-sm font-bold font-mono truncate max-w-xs text-right">{row.value}</p>
                }
              </div>
            ))}
          </div>
        </section>

        {/* Saved environments */}
        <section>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-[#0f1723]/40 dark:text-white/40 mb-4">Saved Environments</h3>
          {!loading && environments.length === 0 ? (
            <div className="border border-dashed border-black/15 dark:border-white/10 px-5 py-8 text-center">
              <p className="text-sm text-[#0f1723]/40 dark:text-white/40">No environments saved yet — add one below or scan a directory</p>
            </div>
          ) : (
            <div className="border border-black/15 dark:border-white/10 bg-white dark:bg-white/5 divide-y divide-black/10 dark:divide-white/10">
              {loading
                ? Array(2).fill(null).map((_, i) => (
                    <div key={i} className="flex items-center justify-between px-5 py-4 gap-4">
                      <Skeleton w="w-40" />
                      <Skeleton w="w-24" />
                    </div>
                  ))
                : environments.map((env) => {
                    const isActive = env.path === activeEnv
                    return (
                      <div key={env.path} className="flex items-center justify-between px-5 py-4 gap-4">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-bold truncate">{env.name}</p>
                            {isActive && (
                              <span className="text-[10px] font-black uppercase tracking-widest px-1.5 py-0.5 bg-[#0048ad]/10 text-[#0048ad] dark:bg-[#0048ad]/20 dark:text-blue-300">
                                Active
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] font-mono text-[#0f1723]/40 dark:text-white/40 truncate">{env.path}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {!isActive && (
                            <button
                              onClick={() => handleSwitch(env.path)}
                              disabled={switchingPath === env.path}
                              className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest bg-[#0048ad] text-white hover:bg-[#0048ad]/90 disabled:opacity-50"
                            >
                              {switchingPath === env.path ? 'Switching…' : 'Switch'}
                            </button>
                          )}
                          <button
                            onClick={() => handleRemove(env.path)}
                            disabled={removingPath === env.path}
                            className="px-3 py-1.5 text-xs font-bold uppercase tracking-widest border border-red-500/30 text-red-600 dark:text-red-400 hover:bg-red-500/5 disabled:opacity-50"
                          >
                            {removingPath === env.path ? '…' : 'Remove'}
                          </button>
                        </div>
                      </div>
                    )
                  })
              }
            </div>
          )}
        </section>

        {/* Add environment */}
        <section>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-[#0f1723]/40 dark:text-white/40 mb-4">Add Environment</h3>
          <div className="border border-black/15 dark:border-white/10 bg-white dark:bg-white/5 p-5 space-y-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <label className="block text-[10px] font-black uppercase tracking-widest text-[#0f1723]/40 dark:text-white/40 mb-1">Name <span className="normal-case font-normal">(optional)</span></label>
                <input
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="e.g. my-project"
                  className="w-full px-3 py-2 text-sm bg-transparent border border-black/15 dark:border-white/10 focus:outline-none focus:border-[#0048ad] dark:focus:border-[#0048ad]"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-[#0f1723]/40 dark:text-white/40 mb-1">Path</label>
              <div className="flex gap-2">
                <input
                  value={addPath}
                  onChange={(e) => setAddPath(e.target.value)}
                  placeholder="C:\path\to\your\venv"
                  className="flex-1 px-3 py-2 text-sm font-mono bg-transparent border border-black/15 dark:border-white/10 focus:outline-none focus:border-[#0048ad] dark:focus:border-[#0048ad]"
                />
                <button
                  onClick={handleBrowse}
                  className="px-3 py-2 text-xs font-bold uppercase tracking-widest border border-black/15 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-base leading-none">folder_open</span>
                  Browse
                </button>
              </div>
            </div>
            {addError && (
              <p className="text-xs text-red-600 dark:text-red-400">{addError}</p>
            )}
            <div className="flex gap-3 pt-1">
              <button
                onClick={handleAdd}
                disabled={addBusy || !addPath.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-[#0048ad] text-white text-xs font-bold uppercase tracking-widest hover:bg-[#0048ad]/90 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-base leading-none">add</span>
                {addBusy ? 'Adding…' : 'Add Environment'}
              </button>
              <button
                onClick={handleScan}
                disabled={scanning}
                className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest border border-black/15 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-base leading-none">search</span>
                {scanning ? 'Scanning…' : 'Scan Directory'}
              </button>
            </div>
          </div>
        </section>

        {/* Scan results */}
        {scanResults !== null && (
          <section>
            <h3 className="text-[10px] font-black uppercase tracking-widest text-[#0f1723]/40 dark:text-white/40 mb-4">
              Scan Results <span className="font-normal normal-case">({scanResults.length} found)</span>
            </h3>
            {scanResults.length === 0 ? (
              <div className="border border-dashed border-black/15 dark:border-white/10 px-5 py-6 text-center">
                <p className="text-sm text-[#0f1723]/40 dark:text-white/40">No virtual environments detected in that directory</p>
              </div>
            ) : (
              <div className="border border-black/15 dark:border-white/10 bg-white dark:bg-white/5 divide-y divide-black/10 dark:divide-white/10">
                {scanResults.map((env) => {
                  const alreadySaved = savedPaths.has(env.path)
                  return (
                    <div key={env.path} className="flex items-center justify-between px-5 py-4 gap-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-bold truncate">{env.name}</p>
                        <p className="text-[11px] font-mono text-[#0f1723]/40 dark:text-white/40 truncate">{env.path}</p>
                      </div>
                      <button
                        onClick={() => handleAddScanned(env)}
                        disabled={alreadySaved}
                        className="flex-shrink-0 px-3 py-1.5 text-xs font-bold uppercase tracking-widest bg-[#0048ad] text-white hover:bg-[#0048ad]/90 disabled:opacity-40 disabled:cursor-default"
                      >
                        {alreadySaved ? 'Saved' : 'Add'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </section>
        )}

      </div>
    </div>
  )
}
