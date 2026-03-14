import { useEffect, useState } from 'react'
import { GetPipEnvironmentInfo, GetInstalledPackages, GetOutdatedPackages, GetCleanupInfo } from '../../wailsjs/go/main/App'
import type { pip } from '../../wailsjs/go/models'

const indexSources = [
  { name: 'pypi', url: 'https://pypi.org/simple', trusted: true },
]

export default function PackageManagers() {
  const [envInfo, setEnvInfo] = useState<pip.PipEnvironmentInfo | null>(null)
  const [installedCount, setInstalledCount] = useState<number | null>(null)
  const [outdatedCount, setOutdatedCount] = useState<number | null>(null)
  const [cacheSize, setCacheSize] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [env, pkgs, out, cleanup] = await Promise.all([
          GetPipEnvironmentInfo(),
          GetInstalledPackages(),
          GetOutdatedPackages(),
          GetCleanupInfo(),
        ])
        setEnvInfo(env)
        setInstalledCount((pkgs ?? []).length)
        setOutdatedCount((out ?? []).length)
        setCacheSize(cleanup?.cacheSize ?? null)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const Skeleton = ({ w }: { w?: string }) => (
    <div className={`animate-pulse bg-black/10 dark:bg-white/10 h-4 ${w ?? 'w-28'}`} />
  )

  const runtimeRows = envInfo
    ? [
        { label: 'Python Version', value: envInfo.pythonVersion, icon: 'terminal' },
        { label: 'pip Version',    value: envInfo.pipVersion,    icon: 'package_2' },
        { label: 'Virtual Env',
          value: envInfo.venvActive ? `Active — ${envInfo.venvPath}` : 'Not active',
          icon: envInfo.venvActive ? 'check_circle' : 'cancel' },
        { label: 'Python Path',    value: envInfo.pythonPath,    icon: 'code' },
        { label: 'Site-Packages',  value: envInfo.sitePackages,  icon: 'folder' },
      ]
    : [
        { label: 'Python Version', value: null, icon: 'terminal' },
        { label: 'pip Version',    value: null, icon: 'package_2' },
        { label: 'Virtual Env',    value: null, icon: 'check_circle' },
        { label: 'Python Path',    value: null, icon: 'code' },
        { label: 'Site-Packages',  value: null, icon: 'folder' },
      ]

  return (
    <div className="flex flex-col min-h-screen">
      <header className="p-8 pb-4 border-b border-black/10 dark:border-white/10">
        <div className="space-y-1">
          <h2 className="text-3xl font-black tracking-tight">Environment</h2>
          <p className="text-[#0f1723]/50 dark:text-white/50 text-sm">Python runtime and pip environment details</p>
        </div>
      </header>

      <div className="p-8 space-y-6 max-w-3xl">
        {/* Runtime Info */}
        <section>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-[#0f1723]/40 dark:text-white/40 mb-4">Runtime</h3>
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

        {/* pip Stats */}
        <section>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-[#0f1723]/40 dark:text-white/40 mb-4">pip Stats</h3>
          <div className="border border-black/15 dark:border-white/10 bg-white dark:bg-white/5 grid grid-cols-3 divide-x divide-black/10 dark:divide-white/10">
            {[
              { label: 'Installed', value: loading ? null : String(installedCount ?? '—') },
              { label: 'Outdated',  value: loading ? null : String(outdatedCount ?? '—') },
              { label: 'Cache Size', value: loading ? null : (cacheSize ?? '—') },
            ].map((stat) => (
              <div key={stat.label} className="p-5 text-center">
                {stat.value === null
                  ? <div className="animate-pulse bg-black/10 dark:bg-white/10 h-8 w-12 mx-auto" />
                  : <p className="text-2xl font-black font-mono text-[#0048ad]">{stat.value}</p>
                }
                <p className="text-[10px] font-black uppercase tracking-widest text-[#0f1723]/40 dark:text-white/40 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </section>

        {/* PyPI Index Sources */}
        <section>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-[#0f1723]/40 dark:text-white/40 mb-4">PyPI Index Sources</h3>
          <div className="border border-black/15 dark:border-white/10 bg-white dark:bg-white/5 divide-y divide-black/10 dark:divide-white/10">
            {indexSources.map((src) => (
              <div key={src.name} className="flex items-center justify-between px-5 py-4">
                <div>
                  <p className="text-sm font-bold font-mono text-[#0048ad]">{src.name}</p>
                  <p className="text-[11px] text-[#0f1723]/40 dark:text-white/40 font-mono mt-0.5">{src.url}</p>
                </div>
                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 border ${src.trusted ? 'border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5' : 'border-black/10 dark:border-white/10 text-[#0f1723]/40 dark:text-white/40'}`}>
                  {src.trusted ? 'Trusted' : 'Untrusted'}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  )
}
