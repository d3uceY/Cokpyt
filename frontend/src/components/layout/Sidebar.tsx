import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

const navItems = [
  { to: '/', label: 'Overview', icon: 'dashboard', exact: true },
  { to: '/packages', label: 'Packages', icon: 'inventory_2' },
  { to: '/search', label: 'Search PyPI', icon: 'search' },
  { to: '/updates', label: 'Updates', icon: 'update', badge: 5 },
  { to: '/cleanup', label: 'Cleanup', icon: 'cleaning_services' },
  { to: '/environment', label: 'Environment', icon: 'hub' },
]

const systemItems = [
  { to: '/history', label: 'History', icon: 'history' },
  { to: '/logs', label: 'Logs', icon: 'terminal' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
]

interface SidebarProps {
  isDark: boolean
  onToggleTheme: () => void
}

export function Sidebar({ isDark, onToggleTheme }: SidebarProps) {
  return (
    <aside className="w-64 border-r border-black/10 dark:border-white/10 bg-[#f5f7f8] dark:bg-[#0f1723] flex flex-col fixed h-full z-10">
      {/* Brand */}
      <div className="p-6 flex items-center gap-3 border-b border-black/10 dark:border-white/10">
        <div className="w-8 h-8 bg-[#0048ad] flex items-center justify-center flex-shrink-0">
          <span className="text-white text-xs font-black tracking-tighter">C</span>
        </div>
        <div className="flex flex-col">
          <span className="text-xl font-black tracking-tighter uppercase leading-none">Cokpit</span>
          <span className="text-[10px] text-[#0048ad] font-bold uppercase tracking-widest">pip manager</span>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-0.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
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
            {item.badge != null && (
              <span className="ml-auto bg-[#0048ad]/15 text-[#0048ad] dark:bg-[#0048ad]/30 dark:text-blue-300 text-[10px] px-1.5 py-0.5 font-bold leading-none">
                {item.badge}
              </span>
            )}
          </NavLink>
        ))}

        <div className="pt-4 pb-2 px-3 text-[10px] uppercase font-bold text-[#0f1723]/30 dark:text-white/30 tracking-widest border-t border-black/5 dark:border-white/5 mt-4">
          System
        </div>

        {systemItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
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
          <span>Cokpit v0.1.0</span>
        </div>
        <button
          onClick={onToggleTheme}
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
