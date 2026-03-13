import { useState, useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { GetConfig, SetTheme, MarkTourSeen } from '../../../wailsjs/go/main/App'
import type { pip } from '../../../wailsjs/go/models'
import { startTour } from '../../lib/tour'

export type AppOutletContext = {
  setUpdateCount: (n: number) => void
  isDark: boolean
  onToggleTheme: (theme: 'dark' | 'light') => void
  onStartTour: () => void
}

export function AppLayout() {
  const [isDark, setIsDark] = useState<boolean | null>(null)
  const [updateCount, setUpdateCount] = useState(0)

  useEffect(() => {
    GetConfig().then((cfg: pip.AppConfig) => {
      const dark = cfg.theme === 'dark'
      if (dark) document.documentElement.classList.add('dark')
      else document.documentElement.classList.remove('dark')
      setIsDark(dark)

      if (!cfg.tourSeen) {
        // Small delay so the layout has rendered before the tour highlights elements
        setTimeout(() => startTour(() => MarkTourSeen()), 400)
      }
    }).catch(() => setIsDark(false))
  }, [])

  const applyTheme = (dark: boolean) => {
    if (dark) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }

  const toggleTheme = () =>
    setIsDark((d) => {
      const next = !d
      applyTheme(next)
      SetTheme(next ? 'dark' : 'light')
      return next
    })

  const setTheme = (theme: 'dark' | 'light') => {
    const dark = theme === 'dark'
    setIsDark(dark)
    applyTheme(dark)
    SetTheme(theme)
  }

  const handleStartTour = () => startTour()

  if (isDark === null) return null

  return (
    <div className="flex min-h-screen bg-[#f5f7f8] dark:bg-[#0f1723] text-[#0f1723] dark:text-white font-sans antialiased overflow-hidden">
      <Sidebar isDark={isDark} onToggleTheme={toggleTheme} updateCount={updateCount} />
      <main className="ml-64 flex-1 flex flex-col min-w-0 min-h-screen">
        <Outlet context={{ setUpdateCount, isDark, onToggleTheme: setTheme, onStartTour: handleStartTour } satisfies AppOutletContext} />
      </main>
    </div>
  )
}

