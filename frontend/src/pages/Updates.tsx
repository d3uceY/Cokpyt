import { useState } from 'react'

interface UpdateItem {
  id: string
  name: string
  category: string
  currentVersion: string
  latestVersion: string
  priority: 'critical' | 'functional' | 'minor'
}

const mockUpdates: UpdateItem[] = [
  { id: '1', name: 'numpy', category: 'Scientific Computing', currentVersion: '1.26.0', latestVersion: '1.26.4', priority: 'minor' },
  { id: '2', name: 'Django', category: 'Web Framework', currentVersion: '4.2.9', latestVersion: '5.0.3', priority: 'critical' },
  { id: '3', name: 'pillow', category: 'Image Processing', currentVersion: '10.1.0', latestVersion: '10.2.0', priority: 'critical' },
  { id: '4', name: 'scikit-learn', category: 'Machine Learning', currentVersion: '1.4.0', latestVersion: '1.4.1', priority: 'functional' },
  { id: '5', name: 'pytest', category: 'Testing', currentVersion: '7.4.4', latestVersion: '8.0.0', priority: 'functional' },
]

const priorityStyles = {
  critical: { badge: 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400', label: 'Security' },
  functional: { badge: 'bg-[#0048ad]/10 text-[#0048ad]', label: 'Functional' },
  minor: { badge: 'bg-black/5 dark:bg-white/5 text-[#0f1723]/50 dark:text-white/50', label: 'Minor' },
}

export default function Updates() {
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [updating, setUpdating] = useState<Set<string>>(new Set())

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const handleUpdate = (id: string) => {
    setUpdating((prev) => new Set(prev).add(id))
    setTimeout(() => setUpdating((prev) => { const n = new Set(prev); n.delete(id); return n }), 2500)
  }

  const handleUpdateAll = () => {
    const ids = selected.size > 0 ? Array.from(selected) : mockUpdates.map((u) => u.id)
    ids.forEach((id) => handleUpdate(id))
  }

  const criticalCount = mockUpdates.filter((u) => u.priority === 'critical').length

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <header className="p-8 pb-4 flex-shrink-0">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-3xl font-black tracking-tight">Updates</h2>
            <p className="text-[#0f1723]/50 dark:text-white/50 text-sm">
              {mockUpdates.length} outdated packages — <span className="font-mono">pip list --outdated</span>
            </p>
          </div>
          <div className="flex items-center gap-3">
            {selected.size > 0 && (
              <span className="text-xs text-[#0f1723]/40 dark:text-white/40 font-medium">
                {selected.size} selected
              </span>
            )}
            <button
              onClick={handleUpdateAll}
              className="flex items-center gap-2 px-4 h-10 bg-[#0048ad] hover:brightness-110 text-white font-bold text-sm transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">system_update</span>
              {selected.size > 0 ? `Upgrade Selected (${selected.size})` : `Upgrade All (${mockUpdates.length})`}
            </button>
            <button className="flex items-center justify-center w-10 h-10 bg-[#f5f7f8] dark:bg-white/5 border border-black/10 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/10 transition-colors">
              <span className="material-symbols-outlined text-[20px]">refresh</span>
            </button>
          </div>
        </div>

        {criticalCount > 0 && (
          <div className="mt-4 flex items-center gap-3 p-3 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900">
            <span className="material-symbols-outlined text-red-500">warning</span>
            <p className="text-xs font-bold text-red-600 dark:text-red-400">
              {criticalCount} package{criticalCount > 1 ? 's have' : ' has'} known security vulnerabilities. Upgrade immediately.
            </p>
          </div>
        )}
      </header>

      <div className="flex-1 overflow-auto px-8 pb-8">
        <div className="border border-black/15 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-black/5 dark:bg-white/5">
                <th className="px-6 py-4 border-b border-black/10 dark:border-white/10 w-10">
                  <input
                    type="checkbox"
                    className="border-black/20 dark:border-white/20"
                    checked={selected.size === mockUpdates.length}
                    onChange={() =>
                      setSelected(selected.size === mockUpdates.length ? new Set() : new Set(mockUpdates.map((u) => u.id)))
                    }
                  />
                </th>
                {['Package', 'Current', 'Latest', 'Priority', 'Actions'].map((h, i) => (
                  <th
                    key={h}
                    className={`px-6 py-4 text-[10px] font-black uppercase tracking-wider text-[#0f1723]/40 dark:text-white/40 border-b border-black/10 dark:border-white/10${i === 4 ? ' text-right' : ''}`}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5 dark:divide-white/5">
              {mockUpdates.map((item) => (
                <tr key={item.id} className={`hover:bg-black/2 dark:hover:bg-white/3 transition-colors${selected.has(item.id) ? ' bg-[#0048ad]/5' : ''}`}>
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      className="border-black/20 dark:border-white/20"
                      checked={selected.has(item.id)}
                      onChange={() => toggleSelect(item.id)}
                    />
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#0048ad]/10 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[#0048ad] text-sm">data_object</span>
                      </div>
                      <div>
                        <p className="text-sm font-bold font-mono">{item.name}</p>
                        <p className="text-[10px] text-[#0f1723]/40 dark:text-white/40 uppercase tracking-tighter">{item.category}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm font-mono text-[#0f1723]/50 dark:text-white/50">{item.currentVersion}</td>
                  <td className="px-6 py-4">
                    <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5">
                      {item.latestVersion}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-0.5 text-[10px] font-black uppercase tracking-widest ${priorityStyles[item.priority].badge}`}>
                      {priorityStyles[item.priority].label}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0048ad] text-white text-xs font-bold hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-not-allowed ml-auto"
                      disabled={updating.has(item.id)}
                      onClick={() => handleUpdate(item.id)}
                    >
                      {updating.has(item.id) ? (
                        <>
                          <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                          Upgrading…
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-sm">upgrade</span>
                          Upgrade
                        </>
                      )}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
