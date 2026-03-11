
import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Loader } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'

const Dashboard = lazy(() => import('@/pages/Dashboard'))
const InstalledPackages = lazy(() => import('@/pages/InstalledPackages'))
const Search = lazy(() => import('@/pages/Search'))
const Updates = lazy(() => import('@/pages/Updates'))
const Cleanup = lazy(() => import('@/pages/Cleanup'))
const Environment = lazy(() => import('@/pages/PackageManagers'))
const History = lazy(() => import('@/pages/History'))
const Logs = lazy(() => import('@/pages/Logs'))
const Settings = lazy(() => import('@/pages/Settings'))

function PageFallback() {
  return (
    <div className="flex-1 flex items-center justify-center h-screen">
      <span className="material-symbols-outlined text-4xl text-slate-400 animate-spin"><Loader/></span>
    </div>
  )
}

function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<PageFallback />}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="packages" element={<InstalledPackages />} />
            <Route path="search" element={<Search />} />
            <Route path="updates" element={<Updates />} />
            <Route path="cleanup" element={<Cleanup />} />
            <Route path="environment" element={<Environment />} />
            <Route path="history" element={<History />} />
            <Route path="logs" element={<Logs />} />
            <Route path="settings" element={<Settings />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </Suspense>
    </BrowserRouter>
  )
}

export default App

