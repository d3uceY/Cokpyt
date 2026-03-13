import { useState } from 'react'
import { SearchPackages, InstallPackage } from '../../wailsjs/go/main/App'
import type { pip } from '../../wailsjs/go/models'
import { PipTerminal } from '../components/ui/PipTerminal'

export default function Search() {
  const [query, setQuery] = useState('')
  const [searched, setSearched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<pip.SearchResult[]>([])
  const [installing, setInstalling] = useState<string | null>(null)
  const [installed, setInstalled] = useState<Set<string>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [terminalOpen, setTerminalOpen] = useState(false)
  const [terminalTitle, setTerminalTitle] = useState('')

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true)
    setError(null)
    try {
      const data = await SearchPackages(query.trim())
      setResults(data ?? [])
    } catch (err) {
      setError(String(err))
      setResults([])
    } finally {
      setLoading(false)
      setSearched(true)
    }
  }

  const handleInstall = async (name: string) => {
    setTerminalTitle(`pip install ${name}`)
    setTerminalOpen(true)
    setInstalling(name)
    try {
      await InstallPackage(name)
      setInstalled((prev) => new Set(prev).add(name))
    } finally {
      setInstalling(null)
    }
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <header className="p-8 pb-4 flex-shrink-0 border-b border-black/10 dark:border-white/10">
        <div className="space-y-1 mb-6">
          <h2 className="text-3xl font-black tracking-tight">Search PyPI</h2>
          <p className="text-[#0f1723]/50 dark:text-white/50 text-sm">Find and install packages from the Python Package Index</p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-3 max-w-2xl">
          <div className="relative flex-1">
            <span className="absolute inset-y-0 left-3 flex items-center text-[#0f1723]/30 dark:text-white/30">
              <span className="material-symbols-outlined text-[20px]">search</span>
            </span>
            <input
              className="w-full h-11 pl-10 pr-4 bg-white dark:bg-white/5 border border-black/15 dark:border-white/10 focus:outline-none focus:ring-1 focus:ring-[#0048ad] focus:border-[#0048ad] text-sm transition-all"
              placeholder="Search PyPI (e.g. numpy, requests, flask)..."
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-6 h-11 bg-[#0048ad] text-white text-sm font-bold hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                Searching…
              </>
            ) : (
              'Search'
            )}
          </button>
        </form>

        {terminalOpen && (
          <PipTerminal
            open={terminalOpen}
            title={terminalTitle}
            running={installing !== null}
            onClose={() => setTerminalOpen(false)}
          />
        )}
      </header>

      <div className="flex-1 overflow-auto p-8">
        {!searched && !loading && (
          <div className="flex flex-col items-center justify-center h-full text-center text-[#0f1723]/30 dark:text-white/30">
            <span className="material-symbols-outlined text-6xl mb-4 opacity-30">manage_search</span>
            <p className="text-sm font-bold uppercase tracking-widest">Search the Python Package Index</p>
            <p className="text-xs mt-1 font-mono">pip install &lt;package&gt;</p>
          </div>
        )}

        {error && (
          <div className="flex flex-col items-center justify-center h-full text-center text-red-500">
            <span className="material-symbols-outlined text-6xl mb-4">error</span>
            <p className="text-sm font-bold uppercase tracking-widest">Search failed</p>
            <p className="text-xs mt-1 font-mono">{error}</p>
          </div>
        )}

        {searched && !error && results.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center text-[#0f1723]/30 dark:text-white/30">
            <span className="material-symbols-outlined text-6xl mb-4 opacity-30">search_off</span>
            <p className="text-sm font-bold uppercase tracking-widest">No results on PyPI</p>
            <p className="text-xs mt-1">Try a different package name</p>
          </div>
        )}

        {results.length > 0 && (
          <>
            <p className="text-[10px] font-bold uppercase tracking-widest text-[#0f1723]/30 dark:text-white/30 mb-4">
              {results.length} result{results.length !== 1 ? 's' : ''} for "{query}" on PyPI
            </p>
            <div className="border border-black/15 dark:border-white/10 bg-white dark:bg-white/5 overflow-hidden">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                  <tr className="bg-black/5 dark:bg-white/5">
                    {['Package', 'Version', 'Description', 'Source', 'Actions'].map((h, i) => (
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
                  {results.map((r) => (
                    <tr key={r.name} className="hover:bg-black/2 dark:hover:bg-white/3 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold font-mono">{r.name}</p>
                        {r.author && <p className="text-[10px] text-[#0f1723]/40 dark:text-white/40 mt-0.5">{r.author}</p>}
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-[#0f1723]/60 dark:text-white/60">{r.version}</td>
                      <td className="px-6 py-4 text-xs text-[#0f1723]/50 dark:text-white/50 max-w-[260px]">{r.description}</td>
                      <td className="px-6 py-4">
                        {r.homePage ? (
                          <a
                            href={r.homePage}
                            target="_blank"
                            rel="noreferrer"
                            className="px-2 py-1 border border-black/10 dark:border-white/10 text-[10px] font-bold uppercase tracking-wider text-[#0048ad] hover:underline"
                          >
                            PyPI
                          </a>
                        ) : (
                          <span className="px-2 py-1 border border-black/10 dark:border-white/10 text-[10px] font-bold uppercase tracking-wider text-[#0f1723]/40 dark:text-white/40">
                            PyPI
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {installed.has(r.name) ? (
                          <span className="px-3 py-1.5 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 text-xs font-bold flex items-center gap-1.5 ml-auto w-fit border border-emerald-200 dark:border-emerald-800">
                            <span className="material-symbols-outlined text-sm">check</span>
                            Installed
                          </span>
                        ) : (
                          <button
                            className="px-3 py-1.5 bg-[#0048ad] text-white text-xs font-bold hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5 ml-auto"
                            disabled={installing === r.name}
                            onClick={() => handleInstall(r.name)}
                          >
                            {installing === r.name ? (
                              <>
                                <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                                Installing…
                              </>
                            ) : (
                              <>
                                <span className="material-symbols-outlined text-sm">download</span>
                                 install
                              </>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
