import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'

export type AppOutletContext = {
  setUpdateCount: (n: number) => void
  isDark: boolean
  onToggleTheme: (theme: 'dark' | 'light') => void
}

export function AppLayout() {
  const [isDark, setIsDark] = useState(() => {
    try {
      const saved = localStorage.getItem('cokpit-theme') === 'dark'
      if (saved) document.documentElement.classList.add('dark')
      return saved
    } catch { return false }
  })
  const [updateCount, setUpdateCount] = useState(0)

  const applyTheme = (dark: boolean) => {
    if (dark) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }

  const toggleTheme = () =>
    setIsDark((d) => {
      const next = !d
      applyTheme(next)
      try { localStorage.setItem('cokpit-theme', next ? 'dark' : 'light') } catch {}
      return next
    })

  const setTheme = (theme: 'dark' | 'light') => {
    const dark = theme === 'dark'
    setIsDark(dark)
    applyTheme(dark)
    try { localStorage.setItem('cokpit-theme', theme) } catch {}
  }

  return (
    <div className="flex min-h-screen bg-[#f5f7f8] dark:bg-[#0f1723] text-[#0f1723] dark:text-white font-sans antialiased overflow-hidden">
      <Sidebar isDark={isDark} onToggleTheme={toggleTheme} updateCount={updateCount} />
      <main className="ml-64 flex-1 flex flex-col min-w-0 min-h-screen">
        <Outlet context={{ setUpdateCount, isDark, onToggleTheme: setTheme } satisfies AppOutletContext} />
      </main>
    </div>
  )
}
