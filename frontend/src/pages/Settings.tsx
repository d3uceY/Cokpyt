import { useOutletContext } from 'react-router-dom'
import type { AppOutletContext } from '../components/layout/AppLayout'

export default function Settings() {
  const { isDark, onToggleTheme } = useOutletContext<AppOutletContext>()

  return (
    <div className="flex flex-col min-h-screen">
      <header className="p-8 pb-4 border-b border-black/10 dark:border-white/10">
        <div className="space-y-1">
          <h2 className="text-3xl font-black tracking-tight">Settings</h2>
          <p className="text-[#0f1723]/50 dark:text-white/50 text-sm">Configure Cokpit preferences and behavior</p>
        </div>
      </header>

      <div className="p-8 space-y-8 max-w-2xl">
        {/* Appearance */}
        <section>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-[#0f1723]/40 dark:text-white/40 mb-4">Appearance</h3>
          <div className="border border-black/15 dark:border-white/10 bg-white dark:bg-white/5 p-5">
            <p className="text-sm font-bold mb-3">Theme</p>
            <div className="flex gap-3">
              {(['dark', 'light'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => onToggleTheme(t)}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors border ${
                    (isDark ? 'dark' : 'light') === t
                      ? 'bg-[#0048ad] text-white border-[#0048ad]'
                      : 'border-black/15 dark:border-white/10 hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Danger Zone */}
        <section>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-4">Danger Zone</h3>
          <div className="border border-red-400/30 dark:border-red-500/20 bg-white dark:bg-white/5 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold">Reset All Settings</p>
                <p className="text-xs text-[#0f1723]/50 dark:text-white/50 mt-0.5">Restore all preferences to factory defaults</p>
              </div>
              <button className="px-4 py-1.5 border border-red-400/50 dark:border-red-500/30 text-red-500 text-xs font-bold hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors">
                Reset
              </button>
            </div>
          </div>
        </section>


      </div>
    </div>
  )
}
