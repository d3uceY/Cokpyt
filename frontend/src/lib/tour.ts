import { driver } from 'driver.js'
import 'driver.js/dist/driver.css'

export function startTour(onDone?: () => void): void {
  const driverObj = driver({
    showProgress: true,
    progressText: '{{current}} of {{total}}',
    nextBtnText: 'Next',
    prevBtnText: 'Back',
    doneBtnText: 'Done',
    overlayColor: 'rgba(15, 23, 35, 0.65)',
    onDestroyed: () => onDone?.(),
    steps: [
      {
        element: '#tour-sidebar',
        popover: {
          title: 'Welcome to Cokpyt',
          description: 'Your pip package manager. All pages and tools are accessible from this sidebar — it stays visible on every screen.',
          side: 'right',
          align: 'start',
        },
      },
      {
        element: '#tour-nav-overview',
        popover: {
          title: 'Overview',
          description: 'The dashboard shows a summary of installed packages, pending updates, and recent activity.',
          side: 'right',
          align: 'center',
        },
      },
      {
        element: '#tour-nav-packages',
        popover: {
          title: 'Packages',
          description: 'Browse, install, upgrade, and uninstall all pip packages in your Python environment.',
          side: 'right',
          align: 'center',
        },
      },
      {
        element: '#tour-nav-search',
        popover: {
          title: 'Search PyPI',
          description: 'Search the Python Package Index and install any package directly from its listing.',
          side: 'right',
          align: 'center',
        },
      },
      {
        element: '#tour-nav-updates',
        popover: {
          title: 'Updates',
          description: 'See which packages have newer versions available and apply upgrades individually or all at once.',
          side: 'right',
          align: 'center',
        },
      },
      {
        element: '#tour-nav-cleanup',
        popover: {
          title: 'Cleanup',
          description: 'Reclaim disk space by removing pip caches, build artifacts, and orphaned package files.',
          side: 'right',
          align: 'center',
        },
      },
      {
        element: '#tour-nav-environment',
        popover: {
          title: 'Environment',
          description: 'Inspect Python runtime details — interpreter path, pip version, platform information, and more.',
          side: 'right',
          align: 'center',
        },
      },
      {
        element: '#tour-system-section',
        popover: {
          title: 'System Tools',
          description: 'Utilities for tracking history, viewing logs, running diagnostics, and configuring the app.',
          side: 'right',
          align: 'start',
        },
      },
      {
        element: '#tour-history',
        popover: {
          title: 'History',
          description: 'A paginated record of every install, upgrade, and uninstall operation that has been run.',
          side: 'right',
          align: 'center',
        },
      },
      {
        element: '#tour-logs',
        popover: {
          title: 'Logs',
          description: 'Live and persisted output from pip commands, streamed in real time and saved to disk.',
          side: 'right',
          align: 'center',
        },
      },
      {
        element: '#tour-doctor',
        popover: {
          title: 'Doctor',
          description: 'Diagnostic checks to verify Python, pip, and PyPI connectivity are all working correctly.',
          side: 'right',
          align: 'center',
        },
      },
      {
        element: '#tour-settings',
        popover: {
          title: 'Settings',
          description: 'Change the application theme or restart this tour at any time from this page.',
          side: 'right',
          align: 'center',
        },
      },
      {
        element: '#tour-theme-toggle',
        popover: {
          title: 'Theme',
          description: 'Switch between light and dark mode. Your preference is saved to disk and restored on next launch.',
          side: 'top',
          align: 'end',
        },
      },
    ],
  })

  driverObj.drive()
}
