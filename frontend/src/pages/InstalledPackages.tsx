import { useState } from 'react'

type PackageStatus = 'up-to-date' | 'update-available'

interface Package {
  id: string
  name: string
  category: string
  version: string
  latest: string
  status: PackageStatus
}

const mockPackages: Package[] = [
  { id: '1', name: 'numpy', category: 'Scientific Computing', version: '1.26.0', latest: '1.26.4', status: 'update-available' },
  { id: '2', name: 'pandas', category: 'Data Analysis', version: '2.1.4', latest: '2.2.0', status: 'update-available' },
  { id: '3', name: 'requests', category: 'HTTP Client', version: '2.31.0', latest: '2.31.0', status: 'up-to-date' },
  { id: '4', name: 'Flask', category: 'Web Framework', version: '3.0.1', latest: '3.0.1', status: 'up-to-date' },
  { id: '5', name: 'scikit-learn', category: 'Machine Learning', version: '1.4.0', latest: '1.4.1', status: 'update-available' },
  { id: '6', name: 'matplotlib', category: 'Visualization', version: '3.8.2', latest: '3.8.2', status: 'up-to-date' },
  { id: '7', name: 'Django', category: 'Web Framework', version: '4.2.9', latest: '5.0.3', status: 'update-available' },
  { id: '8', name: 'pytest', category: 'Testing', version: '7.4.4', latest: '8.0.0', status: 'update-available' },
]

export default function InstalledPackages() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const pageSize = 5

  const filtered = mockPackages.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.category.toLowerCase().includes(search.toLowerCase()),
  )

  const totalPages = Math.ceil(filtered.length / pageSize)
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <header className="p-8 pb-4 flex-shrink-0">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-3xl font-black tracking-tight">Installed Packages</h2>
            <p className="text-[#0f1723]/50 dark:text-white/50 text-sm">Manage pip packages in the active Python environment</p>
          </div>
          <div className="flex items-center gap-3">
            <button className="flex items-center gap-2 px-4 h-10 bg-[#0048ad] hover:brightness-110 text-white font-bold text-sm transition-all">
              <span className="material-symbols-outlined text-[18px]">add</span>
              pip install
            </button>
            <button className="flex items-center justify-center w-10 h-10 bg-[#f5f7f8] dark:bg-white/5 border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
              <span className="material-symbols-outlined text-[20px]">refresh</span>
            </button>
          </div>
        </div>

        {/* Controls */}
        <div className="mt-6 flex gap-3 flex-wrap">
          <div className="relative flex-1 min-w-48 max-w-md">
            <span className="absolute inset-y-0 left-3 flex items-center text-[#0f1723]/30 dark:text-white/30">
              <span className="material-symbols-outlined text-[20px]">search</span>
            </span>
            <input
              className="w-full h-10 pl-10 pr-4 bg-white dark:bg-white/5 border border-black/15 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-[#0048ad] focus:border-[#0048ad] text-sm transition-all"
              placeholder="Filter packages..."
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            />
          </div>
          <div className="flex items-center gap-2 ml-auto text-xs text-[#0f1723]/40 dark:text-white/40">
            <span className="font-medium">{filtered.length} packages</span>
          </div>
        </div>
      </header>

      {/* Table */}
      <div className="flex-1 overflow-auto px-8 pb-8">
        <div className="border border-black/15 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-black/5 dark:bg-white/5">
                {['Package', 'Version', 'Latest', 'Source', 'Status', 'Actions'].map((h, i) => (
                  <th
                    key={h}
                    className={`px-6 py-4 text-[10px] font-black uppercase tracking-wider text-[#0f1723]/40 dark:text-white/40 border-b border-black/10 dark:border-white/10${i === 5 ? ' text-right' : ''}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {paginated.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-sm text-[#0f1723]/40 dark:text-white/40">
                    No packages match your filter.
                  </td>
                </tr>
              )}
              {paginated.map((pkg) => (
                <tr key={pkg.id} className="hover:bg-black/2 dark:hover:bg-white/3 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#0048ad]/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[#0048ad] text-sm">data_object</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold font-mono">{pkg.name}</p>
                        <p className="text-[10px] text-[#0f1723]/40 dark:text-white/40 uppercase tracking-tighter">{pkg.category}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-[#0f1723]/60 dark:text-white/60">{pkg.version}</td>
                  <td className="px-6 py-4">
                    {pkg.status === 'update-available' ? (
                      <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5">
                        {pkg.latest}
                      </span>
                    ) : (
                      <span className="text-sm font-mono text-[#0f1723]/40 dark:text-white/40">{pkg.latest}</span>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="px-2 py-1 border border-black/10 dark:border-white/10 text-[10px] font-bold uppercase tracking-wider text-[#0f1723]/50 dark:text-white/50">
                      PyPI
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {pkg.status === 'update-available' ? (
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-amber-500"></span>
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400">Outdated</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-emerald-500"></span>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Up to date</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {pkg.status === 'update-available' ? (
                        <button className="px-3 py-1.5 bg-[#0048ad] text-white text-xs font-bold hover:brightness-110 transition-all">
                          Upgrade
                        </button>
                      ) : (
                        <button
                          className="px-3 py-1.5 bg-black/5 dark:bg-white/5 text-[#0f1723]/30 dark:text-white/30 text-xs font-bold cursor-not-allowed"
                          disabled
                        >
                          Upgrade
                        </button>
                      )}
                      <button className="px-3 py-1.5 text-[#0f1723]/50 dark:text-white/50 hover:text-red-500 dark:hover:text-red-400 text-xs font-bold transition-colors">
                        Uninstall
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="mt-4 flex items-center justify-between text-[11px] font-medium text-[#0f1723]/40 dark:text-white/40 uppercase tracking-widest px-1">
          <div className="flex gap-4">
            <span>Showing {Math.min((page - 1) * pageSize + 1, filtered.length)}–{Math.min(page * pageSize, filtered.length)} of {filtered.length} packages</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              className="hover:text-[#0048ad] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </button>
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  className={`px-1 transition-colors ${n === page ? 'text-[#0048ad] font-bold' : 'hover:text-[#0048ad]'}`}
                  onClick={() => setPage(n)}
                >
                  {n}
                </button>
              ))}
            </div>
            <button
              className="hover:text-[#0048ad] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
