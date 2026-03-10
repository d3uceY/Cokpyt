const recentActivity = [
  { id: 1, name: 'numpy', version: '1.26.4', action: 'upgrade', status: 'success' as const, time: '5M AGO' },
  { id: 2, name: 'requests', version: '2.31.0', action: 'install', status: 'success' as const, time: '1H AGO' },
  { id: 3, name: 'pandas', version: '2.2.0', action: 'upgrade', status: 'processing' as const, time: 'JUST NOW' },
]

const statusBadge = {
  success: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400',
  processing: 'bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400',
  failed: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400',
}

export default function Dashboard() {
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
          <button className="px-4 py-2 border border-black/15 dark:border-white/10 text-xs font-bold uppercase tracking-widest hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            Refresh
          </button>
          <button className="px-4 py-2 bg-[#0048ad] text-white text-xs font-bold uppercase tracking-widest hover:brightness-110 transition-colors">
            Update All (5)
          </button>
        </div>
      </header>

      {/* Content */}
      <div className="p-8 space-y-8 max-w-7xl w-full">
        {/* Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="border border-black/15 dark:border-white/10 p-6 flex flex-col justify-between bg-white dark:bg-white/5">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#0f1723]/40 dark:text-white/40">Installed Packages</span>
              <span className="material-symbols-outlined text-[#0f1723]/30 dark:text-white/30">inventory_2</span>
            </div>
            <div className="mt-4">
              <span className="text-5xl font-black tracking-tighter">47</span>
              <div className="flex items-center gap-1 mt-1">
                <span className="material-symbols-outlined text-sm text-emerald-500">trending_up</span>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">+3 This Week</span>
              </div>
            </div>
          </div>

          <div className="border border-black/15 dark:border-white/10 p-6 flex flex-col justify-between bg-white dark:bg-white/5 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1 bg-[#0048ad] h-full"></div>
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#0f1723]/40 dark:text-white/40">Outdated Packages</span>
              <span className="material-symbols-outlined text-[#0048ad]">download</span>
            </div>
            <div className="mt-4">
              <span className="text-5xl font-black tracking-tighter text-[#0048ad]">5</span>
              <div className="flex items-center gap-1 mt-1">
                <span className="material-symbols-outlined text-sm text-red-500">warning</span>
                <span className="text-[10px] font-bold text-red-600 dark:text-red-400 uppercase">1 Security CVE</span>
              </div>
            </div>
          </div>

          <div className="border border-black/15 dark:border-white/10 p-6 flex flex-col justify-between bg-white dark:bg-white/5">
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#0f1723]/40 dark:text-white/40">Python Runtime</span>
              <span className="material-symbols-outlined text-[#0f1723]/30 dark:text-white/30">data_object</span>
            </div>
            <div className="mt-4">
              <span className="text-3xl font-black tracking-tighter">3.12.1</span>
              <div className="flex items-center gap-3 mt-2">
                <div className="flex items-center gap-1">
                  <div className="w-2 h-2 bg-[#0048ad]"></div>
                  <span className="text-[10px] font-bold uppercase tracking-tighter">pip 24.0</span>
                </div>
              </div>
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
                  {recentActivity.map((item) => (
                    <tr key={item.id} className="hover:bg-black/2 dark:hover:bg-white/3 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-[#0048ad]/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-[#0048ad] text-sm">data_object</span>
                          </div>
                          <span className="text-sm font-bold font-mono">{item.name}</span>
                        </div>
                      </td>
                      <td className="p-4 text-xs font-mono">{item.version}</td>
                      <td className="p-4 text-[10px] font-bold uppercase tracking-tighter">{item.action}</td>
                      <td className="p-4">
                        <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-widest border ${statusBadge[item.status]}`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="p-4 text-[10px] font-bold text-[#0f1723]/40 dark:text-white/40 text-right">{item.time}</td>
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
                  <div className="text-[10px] font-mono text-[#0f1723]/40 dark:text-white/40">45ms</div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="material-symbols-outlined text-[#0f1723]/30 dark:text-white/30">storage</span>
                    <div>
                      <p className="text-xs font-bold uppercase tracking-tight">pip cache</p>
                      <p className="text-[10px] text-[#0f1723]/40 dark:text-white/40 font-bold uppercase">842 MB used</p>
                    </div>
                  </div>
                  <div className="text-[10px] font-mono text-[#0f1723]/40 dark:text-white/40">—</div>
                </div>
              </div>
            </div>

            {/* Update Priority */}
            <div className="border border-black/15 dark:border-white/10 bg-white dark:bg-white/5 p-4">
              <h2 className="text-sm font-black uppercase tracking-widest mb-4">Update Priority</h2>
              <div className="space-y-3">
                {[
                  { label: 'Security Fix', pct: 20, color: 'bg-red-500' },
                  { label: 'Feature Updates', pct: 60, color: 'bg-[#0048ad]' },
                  { label: 'Patch / Minor', pct: 20, color: 'bg-[#0f1723]/20 dark:bg-white/20' },
                ].map((bar) => (
                  <div key={bar.label}>
                    <div className="flex justify-between items-end mb-1">
                      <span className="text-[10px] font-bold uppercase tracking-widest">{bar.label}</span>
                      <span className="text-xs font-black">{bar.pct}%</span>
                    </div>
                    <div className="w-full h-1 bg-black/5 dark:bg-white/5">
                      <div className={`${bar.color} h-full`} style={{ width: `${bar.pct}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-3 bg-[#0048ad]/5 border-l-2 border-[#0048ad]">
                <p className="text-[10px] font-bold leading-relaxed text-[#0f1723]/70 dark:text-white/60">
                  Django 4.2.9 has a known security vulnerability — CVE-2024-27351. Update immediately.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer Status */}
        <footer className="flex items-center justify-between text-[10px] font-bold text-[#0f1723]/30 dark:text-white/30 uppercase tracking-widest pt-4 border-t border-black/10 dark:border-white/10">
          <div className="flex gap-4">
            <span>pip 24.0</span>
            <span>Python 3.12.1</span>
            <span>Last Sync: {new Date().toLocaleTimeString()}</span>
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
