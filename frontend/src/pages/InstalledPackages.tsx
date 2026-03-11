
import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogAction,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog';
import { PipTerminal } from '@/components/ui/PipTerminal';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { GetInstalledPackages, InstallPackage, UninstallPackage, UpgradePackage } from '../../wailsjs/go/main/App';
import type { pip } from '../../wailsjs/go/models';

export default function InstalledPackages() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [installName, setInstallName] = useState('');
  const [showInstall, setShowInstall] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmUninstall, setConfirmUninstall] = useState<string | null>(null);
  const [confirmBulk, setConfirmBulk] = useState(false);
  const [terminalOpen, setTerminalOpen] = useState(false);
  const [terminalTitle, setTerminalTitle] = useState('');
  const pageSize = 20;

  const queryClient = useQueryClient();
  const {
    data: packages = [],
    isLoading: loading,
    error,
  } = useQuery<pip.PipPackage[], Error>({
    queryKey: ['installed-packages'],
    queryFn: async () => await GetInstalledPackages(),
    staleTime: 0, // always refetch on window focus
    // cacheTime is not a valid option in the object overload, so remove it
  });


  const handleUpgrade = async (name: string) => {
    setTerminalTitle(`pip install --upgrade ${name}`);
    setTerminalOpen(true);
    setActionLoading(name);
    try {
      await UpgradePackage(name);
      await queryClient.invalidateQueries({ queryKey: ['installed-packages'] });
    } catch (e: any) {
      alert(`Failed to upgrade ${name}: ${e?.message ?? e}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUninstall = async (name: string) => {
    setTerminalTitle(`pip uninstall -y ${name}`);
    setTerminalOpen(true);
    setActionLoading(name);
    try {
      await UninstallPackage(name);
      await queryClient.invalidateQueries({ queryKey: ['installed-packages'] });
    } catch (e: any) {
      alert(`Failed to uninstall ${name}: ${e?.message ?? e}`);
    } finally {
      setActionLoading(null);
      setConfirmUninstall(null);
    }
  };

  const handleBulkUninstall = async () => {
    setTerminalTitle(`pip uninstall -y (${selected.size} packages)`);
    setTerminalOpen(true);
    setActionLoading('bulk');
    try {
      for (const name of selected) {
        await UninstallPackage(name);
      }
      await queryClient.invalidateQueries({ queryKey: ['installed-packages'] });
      setSelected(new Set());
    } catch (e: any) {
      alert(`Failed to uninstall selected packages: ${e?.message ?? e}`);
    } finally {
      setActionLoading(null);
      setConfirmBulk(false);
    }
  };

  const handleInstall = async () => {
    if (!installName.trim()) return;
    setTerminalTitle(`pip install ${installName.trim()}`);
    setTerminalOpen(true);
    setActionLoading('__install__');
    try {
      await InstallPackage(installName.trim());
      setInstallName('');
      setShowInstall(false);
      await queryClient.invalidateQueries({ queryKey: ['installed-packages'] });
    } catch (e: any) {
      alert(`Failed to install ${installName}: ${e?.message ?? e}`);
    } finally {
      setActionLoading(null);
    }
  };

  const filtered = packages.filter(
    (p: pip.PipPackage) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.summary.toLowerCase().includes(search.toLowerCase())
  );

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  const allSelected = filtered.length > 0 && selected.size === filtered.length;

  const toggleSelect = (name: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(name) ? next.delete(name) : next.add(name);
      return next;
    });
  };

  const toggleSelectAll = () => {
    setSelected(() => {
      if (allSelected) return new Set();
      return new Set(filtered.map((p) => p.name));
    });
  };

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
            {selected.size > 0 && (
              <>
                <AlertDialog open={confirmBulk} onOpenChange={setConfirmBulk}>
                  <AlertDialogTrigger asChild>
                    <button
                      className="flex items-center gap-2 px-4 h-10 bg-red-600 hover:brightness-110 text-white font-bold text-sm transition-all"
                      onClick={() => setConfirmBulk(true)}
                      disabled={actionLoading === 'bulk'}
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                      Bulk Uninstall ({selected.size})
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Uninstall selected packages?</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to uninstall {selected.size} selected package(s)? This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel disabled={actionLoading === 'bulk'}>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleBulkUninstall} disabled={actionLoading === 'bulk'}>
                        {actionLoading === 'bulk' ? 'Uninstalling…' : 'Uninstall'}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            )}
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
              onClick={() => queryClient.invalidateQueries({ queryKey: ['installed-packages'] })}
            >
              <span
                className={`material-symbols-outlined text-[20px] ${loading ? "animate-spin" : ""}`}
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

        {/* Live terminal output */}
        <PipTerminal
          open={terminalOpen}
          title={terminalTitle}
          running={actionLoading !== null}
          onClose={() => setTerminalOpen(false)}
        />

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
            <span>{error.message}</span>
          </div>
        )}

        <div className="border border-black/15 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-black/5 dark:bg-white/5">
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-wider text-[#0f1723]/40 dark:text-white/40 border-b border-black/10 dark:border-white/10">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleSelectAll}
                    aria-label="Select all packages"
                  />
                </th>
                {["Package", "Version", "Latest", "Source", "Status", "Actions"].map(
                  (h, i) => (
                    <th
                      key={h}
                      className={`px-6 py-4 text-[10px] font-black uppercase tracking-wider text-[#0f1723]/40 dark:text-white/40 border-b border-black/10 dark:border-white/10${i === 5 ? " text-right" : ""}`}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>

            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {loading &&
                Array.from({ length: 8 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-black/8 dark:bg-white/8 rounded-sm" />
                        <div className="space-y-1.5">
                          <div className="h-3 w-28 bg-black/8 dark:bg-white/8 rounded-sm" />
                          <div className="h-2 w-40 bg-black/5 dark:bg-white/5 rounded-sm" />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><div className="h-3 w-16 bg-black/8 dark:bg-white/8 rounded-sm" /></td>
                    <td className="px-6 py-4"><div className="h-3 w-16 bg-black/8 dark:bg-white/8 rounded-sm" /></td>
                    <td className="px-6 py-4"><div className="h-5 w-10 bg-black/5 dark:bg-white/5 rounded-sm" /></td>
                    <td className="px-6 py-4"><div className="h-3 w-20 bg-black/8 dark:bg-white/8 rounded-sm" /></td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <div className="h-6 w-14 bg-black/8 dark:bg-white/8 rounded-sm" />
                        <div className="h-6 w-16 bg-black/5 dark:bg-white/5 rounded-sm" />
                      </div>
                    </td>
                  </tr>
                ))}
              {!loading &&
                paginated.map((pkg) => {
                  const isActing = actionLoading === pkg.name;
                  const isChecked = selected.has(pkg.name);
                  return (
                    <tr
                      key={pkg.name}
                      className="hover:bg-black/2 dark:hover:bg-white/3 transition-colors"
                    >
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelect(pkg.name)}
                          aria-label={`Select ${pkg.name}`}
                        />
                      </td>
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
                          {pkg.status === "update-available" ? (
                            <button
                              className="px-3 py-1.5 bg-[#0048ad] text-white text-xs font-bold hover:brightness-110 transition-all disabled:opacity-50"
                              disabled={isActing}
                              onClick={() => handleUpgrade(pkg.name)}
                            >
                              {isActing ? "…" : "Upgrade"}
                            </button>
                          ) : (
                            <button
                              className="px-3 py-1.5 bg-black/5 dark:bg-white/5 text-[#0f1723]/30 dark:text-white/30 text-xs font-bold cursor-not-allowed"
                              disabled
                            >
                              Upgrade
                            </button>
                          )}
                          <AlertDialog open={confirmUninstall === pkg.name} onOpenChange={(open) => setConfirmUninstall(open ? pkg.name : null)}>
                            <AlertDialogTrigger asChild>
                              <button
                                className="px-3 py-1.5 text-[#0f1723]/50 dark:text-white/50 hover:text-red-500 dark:hover:text-red-400 text-xs font-bold transition-colors"
                                disabled={isActing}
                                onClick={() => setConfirmUninstall(pkg.name)}
                              >
                                {isActing ? "…" : "Uninstall"}
                              </button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Uninstall {pkg.name}?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to uninstall <b>{pkg.name}</b>? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel disabled={isActing}>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleUninstall(pkg.name)} disabled={isActing}>
                                  {isActing ? 'Uninstalling…' : 'Uninstall'}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="mt-4 flex items-center justify-between text-[11px] font-medium text-[#0f1723]/40 dark:text-white/40 uppercase tracking-widest px-1">
            <span>Showing {Math.min((page - 1) * pageSize + 1, filtered.length)}–{Math.min(page * pageSize, filtered.length)} of {filtered.length} packages</span>
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
        )}
      </div>
    </div>
  )
}