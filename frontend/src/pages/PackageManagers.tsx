const envInfo = [
  { label: 'Python Version', value: '3.12.1', icon: 'terminal' },
  { label: 'pip Version', value: '24.0', icon: 'package_2' },
  { label: 'Virtual Env', value: 'Active — .venv', icon: 'check_circle' },
  { label: 'Site-Packages', value: '.venv/lib/python3.12/site-packages', icon: 'folder' },
]

const indexSources = [
  { name: 'pypi', url: 'https://pypi.org/simple', trusted: true },
  { name: 'files.pythonhosted.org', url: 'https://files.pythonhosted.org', trusted: true },
]

export default function PackageManagers() {
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
            {envInfo.map((row) => (
              <div key={row.label} className="flex items-center justify-between px-5 py-4">
                <div className="flex items-center gap-3">
                  <span className="material-symbols-outlined text-[#0048ad] text-[18px]">{row.icon}</span>
                  <p className="text-xs font-black uppercase tracking-widest text-[#0f1723]/50 dark:text-white/50">{row.label}</p>
                </div>
                <p className="text-sm font-bold font-mono">{row.value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* pip Stats */}
        <section>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-[#0f1723]/40 dark:text-white/40 mb-4">pip Stats</h3>
          <div className="border border-black/15 dark:border-white/10 bg-white dark:bg-white/5 grid grid-cols-3 divide-x divide-black/10 dark:divide-white/10">
            {[
              { label: 'Installed', value: '47' },
              { label: 'Outdated', value: '5' },
              { label: 'Cache Size', value: '842 MB' },
            ].map((stat) => (
              <div key={stat.label} className="p-5 text-center">
                <p className="text-2xl font-black font-mono text-[#0048ad]">{stat.value}</p>
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
