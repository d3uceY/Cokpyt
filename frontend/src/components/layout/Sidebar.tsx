import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', label: 'Overview', icon: 'dashboard', exact: true, tourId: 'tour-nav-overview' },
  { to: '/packages', label: 'Packages', icon: 'inventory_2', tourId: 'tour-nav-packages' },
  { to: '/search', label: 'Search PyPI', icon: 'search', tourId: 'tour-nav-search' },
  { to: '/updates', label: 'Updates', icon: 'update', tourId: 'tour-nav-updates' },
  { to: '/cleanup', label: 'Cleanup', icon: 'cleaning_services', tourId: 'tour-nav-cleanup' },
  { to: '/environment', label: 'Environment', icon: 'hub', tourId: 'tour-nav-environment' },
]

const systemItems = [
  { to: '/history', label: 'History', icon: 'history', tourId: 'tour-history' },
  { to: '/logs', label: 'Logs', icon: 'terminal', tourId: 'tour-logs' },
  { to: '/doctor', label: 'Doctor', icon: 'health_and_safety', tourId: 'tour-doctor' },
  { to: '/settings', label: 'Settings', icon: 'settings', tourId: 'tour-settings' },
]

interface SidebarProps {
  isDark: boolean
  onToggleTheme: () => void
  updateCount: number
  version: string
}

export function Sidebar({ isDark, onToggleTheme, updateCount, version }: SidebarProps) {
  return (
    <aside id="tour-sidebar" className="w-64 border-r border-black/10 dark:border-white/10 bg-[#f5f7f8] dark:bg-[#0f1723] flex flex-col fixed h-full z-10">
      {/* Brand */}
      <div className="p-6 flex items-center gap-3 border-b border-black/10 dark:border-white/10">
        <div className='w-12 h-12'>
          <img src={isDark ? 'logo-dark.png' : 'logo-light.png'} alt="" />
        </div>
        <div className="flex flex-col">
          <span className="text-xl font-black tracking-tighter capitalize leading-none">Cokpyt</span>
          <span className="text-[10px] text-[#0048ad] font-bold uppercase tracking-widest">pip manager</span>
        </div>
      </div>

      {/* Nav */}
      <nav id="tour-nav" className="flex-1 overflow-y-auto p-4 space-y-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            id={item.tourId}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 font-medium transition-colors text-sm',
                isActive
                  ? 'bg-[#0048ad] text-white font-bold'
                  : 'text-[#0f1723]/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5',
              )
            }
          >
            <span className="material-symbols-outlined text-xl leading-none">{item.icon}</span>
            <span>{item.label}</span>
            {item.to === '/updates' && updateCount > 0 && (
              <span className="ml-auto bg-[#0048ad]/15 text-[#0048ad] dark:bg-[#0048ad]/30 dark:text-blue-300 text-[10px] px-1.5 py-0.5 font-bold leading-none">
                {updateCount}
              </span>
            )}
          </NavLink>
        ))}

        <div id="tour-system-section" className="pt-4 pb-2 px-3 text-[10px] uppercase font-bold text-[#0f1723]/30 dark:text-white/30 tracking-widest border-t border-black/5 dark:border-white/5 mt-4">
          System
        </div>

        {systemItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            id={item.tourId}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 font-medium transition-colors text-sm',
                isActive
                  ? 'bg-[#0048ad] text-white font-bold'
                  : 'text-[#0f1723]/60 dark:text-white/60 hover:bg-black/5 dark:hover:bg-white/5',
              )
            }
          >
            <span className="material-symbols-outlined text-xl leading-none">{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-black/10 dark:border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2 text-[10px] font-bold text-[#0f1723]/40 dark:text-white/40 uppercase tracking-widest">
          <span className="w-1.5 h-1.5 bg-emerald-500"></span>
          <span>Cokpyt {version}</span>
        </div>
        <button
          onClick={onToggleTheme}
          id="tour-theme-toggle"
          className="flex items-center justify-center w-8 h-8 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
          title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          <span className="material-symbols-outlined text-[20px] text-[#0f1723]/50 dark:text-white/50">
            {isDark ? 'light_mode' : 'dark_mode'}
          </span>
        </button>
      </div>
    </aside>
  )
}
