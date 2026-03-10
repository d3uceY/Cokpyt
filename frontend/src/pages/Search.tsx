import { useState } from 'react'

interface SearchResult {
  id: string
  name: string
  version: string
  description: string
}

const mockResults: SearchResult[] = [
  { id: '1', name: 'httpx', version: '0.26.0', description: 'The next generation HTTP client for Python.' },
  { id: '2', name: 'pydantic', version: '2.5.3', description: 'Data validation using Python type hints.' },
  { id: '3', name: 'fastapi', version: '0.109.0', description: 'FastAPI framework, high performance, easy to learn, fast to code.' },
  { id: '4', name: 'typer', version: '0.9.0', description: 'Build great CLIs using Python type hints.' },
  { id: '5', name: 'rich', version: '13.7.0', description: 'Rich text and beautiful formatting in the terminal.' },
  { id: '6', name: 'click', version: '8.1.7', description: 'Composable command line interface toolkit.' },
]

export default function Search() {
  const [query, setQuery] = useState('')
  const [searched, setSearched] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [installing, setInstalling] = useState<string | null>(null)

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault()
    if (!query.trim()) return
    const q = query.toLowerCase()
    setResults(mockResults.filter((r) => r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q)))
    setSearched(true)
  }

  const handleInstall = (id: string) => {
    setInstalling(id)
    setTimeout(() => setInstalling(null), 2000)
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
            className="px-6 h-11 bg-[#0048ad] text-white text-sm font-bold hover:brightness-110 transition-all"
          >
            Search
          </button>
        </form>
      </header>

      <div className="flex-1 overflow-auto p-8">
        {!searched && (
          <div className="flex flex-col items-center justify-center h-full text-center text-[#0f1723]/30 dark:text-white/30">
            <span className="material-symbols-outlined text-6xl mb-4 opacity-30">manage_search</span>
            <p className="text-sm font-bold uppercase tracking-widest">Search the Python Package Index</p>
            <p className="text-xs mt-1 font-mono">pip install &lt;package&gt;</p>
          </div>
        )}

        {searched && results.length === 0 && (
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
                    <tr key={r.id} className="hover:bg-black/2 dark:hover:bg-white/3 transition-colors">
                      <td className="px-6 py-4">
                        <p className="text-sm font-bold font-mono">{r.name}</p>
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-[#0f1723]/60 dark:text-white/60">{r.version}</td>
                      <td className="px-6 py-4 text-xs text-[#0f1723]/50 dark:text-white/50 max-w-[260px]">{r.description}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 border border-black/10 dark:border-white/10 text-[10px] font-bold uppercase tracking-wider text-[#0f1723]/40 dark:text-white/40">
                          PyPI
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          className="px-3 py-1.5 bg-[#0048ad] text-white text-xs font-bold hover:brightness-110 transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-1.5 ml-auto"
                          disabled={installing === r.id}
                          onClick={() => handleInstall(r.id)}
                        >
                          {installing === r.id ? (
                            <>
                              <span className="material-symbols-outlined text-sm animate-spin">progress_activity</span>
                              Installing…
                            </>
                          ) : (
                            <>
                              <span className="material-symbols-outlined text-sm">download</span>
                              pip install
                            </>
                          )}
                        </button>
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
