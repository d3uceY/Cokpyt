import { useState } from 'react'

interface SettingToggle {
  id: string
  label: string
  description: string
  value: boolean
}

export default function Settings() {
  const [theme, setTheme] = useState<'dark' | 'light' | 'system'>('dark')
  const [toggles, setToggles] = useState<SettingToggle[]>([
    { id: 'auto-update-check', label: 'Automatic Update Checks', description: 'Check for package updates on startup', value: true },
    { id: 'silent-install', label: 'Silent Installs', description: 'Run installations without interactive prompts', value: true },
    { id: 'notify-critical', label: 'Critical Update Notifications', description: 'Alert when critical security patches are available', value: true },
    { id: 'startup', label: 'Start with Windows', description: 'Launch Cokpit automatically at login', value: false },
    { id: 'telemetry', label: 'Anonymous Usage Data', description: 'Help improve Cokpit by sharing anonymous usage metrics', value: false },
  ])

  const toggle = (id: string) =>
    setToggles((prev) => prev.map((t) => (t.id === id ? { ...t, value: !t.value } : t)))

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
              {(['dark', 'light', 'system'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`px-4 py-2 text-xs font-bold uppercase tracking-widest transition-colors border ${
                    theme === t
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

        {/* Behavior */}
        <section>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-[#0f1723]/40 dark:text-white/40 mb-4">Behavior</h3>
          <div className="border border-black/15 dark:border-white/10 bg-white dark:bg-white/5 divide-y divide-black/10 dark:divide-white/10">
            {toggles.map((t) => (
              <div key={t.id} className="flex items-center justify-between p-5">
                <div>
                  <p className="text-sm font-bold">{t.label}</p>
                  <p className="text-xs text-[#0f1723]/50 dark:text-white/50 mt-0.5">{t.description}</p>
                </div>
                <button
                  onClick={() => toggle(t.id)}
                  className={`relative w-10 h-5 transition-colors flex-shrink-0 ${
                    t.value ? 'bg-[#0048ad]' : 'bg-black/20 dark:bg-white/20'
                  }`}
                  role="switch"
                  aria-checked={t.value}
                >
                  <span
                    className={`absolute top-0.5 w-4 h-4 bg-white shadow transition-transform ${
                      t.value ? 'translate-x-5' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* pip Configuration */}
        <section>
          <h3 className="text-[10px] font-black uppercase tracking-widest text-[#0f1723]/40 dark:text-white/40 mb-4">pip Configuration</h3>
          <div className="border border-black/15 dark:border-white/10 bg-white dark:bg-white/5 p-5 space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-[#0f1723]/50 dark:text-white/40 block mb-2">
                Index URL
              </label>
              <input
                type="text"
                defaultValue="https://pypi.org/simple"
                className="w-full h-9 px-3 bg-[#f5f7f8] dark:bg-white/5 border border-black/15 dark:border-white/10 text-sm focus:outline-none focus:ring-1 focus:ring-[#0048ad]"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-[#0f1723]/50 dark:text-white/40 block mb-2">
                Trusted Hosts
              </label>
              <input
                type="text"
                defaultValue="pypi.org files.pythonhosted.org"
                className="w-full h-9 px-3 bg-[#f5f7f8] dark:bg-white/5 border border-black/15 dark:border-white/10 text-sm focus:outline-none focus:ring-1 focus:ring-[#0048ad]"
              />
            </div>
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-[#0f1723]/50 dark:text-white/40 block mb-2">
                Default Timeout (seconds)
              </label>
              <input
                type="number"
                defaultValue={15}
                min={5}
                max={120}
                className="w-full h-9 px-3 bg-[#f5f7f8] dark:bg-white/5 border border-black/15 dark:border-white/10 text-sm focus:outline-none focus:ring-1 focus:ring-[#0048ad]"
              />
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

        <div className="pt-2">
          <button className="px-6 py-2 bg-[#0048ad] text-white text-xs font-bold uppercase tracking-widest hover:brightness-110 transition-all">
            Save Changes
          </button>
        </div>
      </div>
    </div>
  )
}
