import { useState, useEffect, useCallback } from 'react'
import { GetInstalledPackages, InstallPackage, UninstallPackage, UpgradePackage } from '../../wailsjs/go/main/App'
import { pip } from '../../wailsjs/go/models'

export default function InstalledPackages() {
  const [packages, setPackages] = useState<pip.Package[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [installName, setInstallName] = useState('')
  const [showInstall, setShowInstall] = useState(false)
  const pageSize = 20

  const loadPackages = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const pkgs = await GetInstalledPackages()
      setPackages(pkgs ?? [])
    } catch (e: any) {
      setError(e?.message ?? String(e))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadPackages()
  }, [loadPackages])

  const handleUpgrade = async (name: string) => {
    setActionLoading(name)
    try {
      await UpgradePackage(name)
      await loadPackages()
    } catch (e: any) {
      alert(`Failed to upgrade ${name}: ${e?.message ?? e}`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleUninstall = async (name: string) => {
    if (!confirm(`Uninstall ${name}?`)) return
    setActionLoading(name)
    try {
      await UninstallPackage(name)
      setPackages((prev) => prev.filter((p) => p.name !== name))
    } catch (e: any) {
      alert(`Failed to uninstall ${name}: ${e?.message ?? e}`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleInstall = async () => {
    if (!installName.trim()) return
    setActionLoading('__install__')
    try {
      await InstallPackage(installName.trim())
      setInstallName('')
      setShowInstall(false)
      await loadPackages()
    } catch (e: any) {
      alert(`Failed to install ${installName}: ${e?.message ?? e}`)
    } finally {
      setActionLoading(null)
    }
  }

  const filtered = packages.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.summary.toLowerCase().includes(search.toLowerCase()),
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
          <p className="text-[#0f1723]/50 dark:text-white/50 text-sm">
            Manage pip packages in the active Python environment
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            className="flex items-center gap-2 px-4 h-10 bg-[#0048ad] hover:brightness-110 text-white font-bold text-sm transition-all"
            onClick={() => setShowInstall(true)}
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            pip install
          </button>

          <button
            className="flex items-center justify-center w-10 h-10 bg-[#f5f7f8] dark:bg-white/5 border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 transition-colors disabled:opacity-50"
            disabled={loading}
            onClick={loadPackages}
          >
            <span
              className={`material-symbols-outlined text-[20px] ${
                loading ? "animate-spin" : ""
              }`}
            >
              refresh
            </span>
          </button>
        </div>
      </div>

      {/* Install bar */}
      {showInstall && (
        <div className="mt-4 flex items-center gap-3 p-4 border border-[#0048ad]/30 bg-[#0048ad]/5">
          <span className="material-symbols-outlined text-[#0048ad] text-[20px]">
            terminal
          </span>

          <input
            autoFocus
            className="flex-1 h-9 px-3 bg-white dark:bg-white/5 border border-black/15 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-[#0048ad] text-sm font-mono"
            placeholder="package-name or package==1.0.0"
            value={installName}
            onChange={(e) => setInstallName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleInstall()
              if (e.key === "Escape") {
                setShowInstall(false)
                setInstallName("")
              }
            }}
          />

          <button
            className="px-4 h-9 bg-[#0048ad] text-white text-sm font-bold hover:brightness-110 disabled:opacity-50"
            disabled={actionLoading === "__install__" || !installName.trim()}
            onClick={handleInstall}
          >
            {actionLoading === "__install__" ? "Installing…" : "Install"}
          </button>

          <button
            className="px-3 h-9 text-sm text-[#0f1723]/50 dark:text-white/50 hover:text-[#0f1723] dark:hover:text-white border border-black/10 dark:border-white/10"
            onClick={() => {
              setShowInstall(false)
              setInstallName("")
            }}
          >
            Cancel
          </button>
        </div>
      )}

      {/* Controls */}
      <div className="mt-6 flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-48 max-w-md">
          <span className="absolute inset-y-0 left-3 flex items-center text-[#0f1723]/30 dark:text-white/30">
            <span className="material-symbols-outlined text-[20px]">
              search
            </span>
          </span>

          <input
            className="w-full h-10 pl-10 pr-4 bg-white dark:bg-white/5 border border-black/15 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-[#0048ad] focus:border-[#0048ad] text-sm transition-all"
            placeholder="Filter packages..."
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
          />
        </div>

        <div className="flex items-center gap-2 ml-auto text-xs text-[#0f1723]/40 dark:text-white/40">
          <span className="font-medium">
            {loading ? "…" : `${filtered.length} packages`}
          </span>
        </div>
      </div>
    </header>

    {/* Table */}
    <div className="flex-1 overflow-auto px-8 pb-8">
      {error && (
        <div className="mb-4 flex items-center gap-3 p-4 border border-red-500/30 bg-red-50 dark:bg-red-900/10 text-red-600 dark:text-red-400 text-sm">
          <span className="material-symbols-outlined text-[20px]">error</span>
          <span>{error}</span>
        </div>
      )}

      <div className="border border-black/15 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden">
        <table className="w-full text-left border-collapse min-w-[700px]">
          <thead>
            <tr className="bg-black/5 dark:bg-white/5">
              {["Package", "Version", "Latest", "Source", "Status", "Actions"].map(
                (h, i) => (
                  <th
                    key={h}
                    className={`px-6 py-4 text-[10px] font-black uppercase tracking-wider text-[#0f1723]/40 dark:text-white/40 border-b border-black/10 dark:border-white/10${
                      i === 5 ? " text-right" : ""
                    }`}
                  >
                    {h}
                  </th>
                )
              )}
            </tr>
          </thead>

          <tbody className="divide-y divide-black/5 dark:divide-white/5">
            {!loading &&
              paginated.map((pkg) => {
                const isActing = actionLoading === pkg.name

                return (
                  <tr
                    key={pkg.name}
                    className="hover:bg-black/2 dark:hover:bg-white/3 transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#0048ad]/10 flex items-center justify-center">
                          <span className="material-symbols-outlined text-[#0048ad] text-sm">
                            data_object
                          </span>
                        </div>

                        <div>
                          <p className="text-sm font-bold font-mono">
                            {pkg.name}
                          </p>
                          {pkg.summary && (
                            <p
                              className="text-[10px] text-[#0f1723]/40 dark:text-white/40 tracking-tight max-w-[240px] truncate"
                              title={pkg.summary}
                            >
                              {pkg.summary}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-sm font-mono text-[#0f1723]/60 dark:text-white/60">
                      {pkg.version}
                    </td>

                    <td className="px-6 py-4">
                      {pkg.status === "update-available" ? (
                        <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5">
                          {pkg.latestVersion}
                        </span>
                      ) : (
                        <span className="text-sm font-mono text-[#0f1723]/40 dark:text-white/40">
                          {pkg.latestVersion}
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <span className="px-2 py-1 border border-black/10 dark:border-white/10 text-[10px] font-bold uppercase tracking-wider text-[#0f1723]/50 dark:text-white/50">
                        PyPI
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      {pkg.status === "update-available" ? (
                        <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                          Outdated
                        </span>
                      ) : (
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          Up to date
                        </span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          className="px-3 py-1.5 text-[#0f1723]/50 dark:text-white/50 hover:text-red-500 dark:hover:text-red-400 text-xs font-bold transition-colors"
                          disabled={isActing}
                          onClick={() => handleUninstall(pkg.name)}
                        >
                          {isActing ? "…" : "Uninstall"}
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
          </tbody>
        </table>
      </div>
    </div>
  </div>
)
}