import React, { useEffect } from 'react'
import { RouterProvider, useRouter } from './router'
import { AuthProvider } from './contexts/AuthContext'
import { DataProvider } from './contexts/DataContext'
import ProtectedRoute from './components/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import AdminLayout from './pages/admin/AdminLayout'
import Dashboard from './pages/admin/Dashboard'
import Exams from './pages/admin/Exams'
import CreateExam from './pages/admin/CreateExam'
import EditExam from './pages/admin/EditExam'
import QuestionBuilder from './pages/admin/QuestionBuilder'
import Results from './pages/admin/Results'
import ResultDetail from './pages/admin/ResultDetail'
import Participants from './pages/admin/Participants'
import AdminLeaderboard from './pages/admin/AdminLeaderboard'
import Settings from './pages/admin/Settings'
import ExamStart from './pages/student/ExamStart'
import ExamTake from './pages/student/ExamTake'
import ExamResult from './pages/student/ExamResult'
import PublicLeaderboard from './pages/student/PublicLeaderboard'

function Redirect({ to }: { to: string }) {
  const { navigate } = useRouter()
  useEffect(() => {
    navigate(to, true)
  }, [])
  return null
}

function NotFound() {
  const { navigate } = useRouter()
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="text-center">
        <p className="text-6xl font-black text-indigo-200 mb-4">404</p>
        <h1 className="text-xl font-bold text-gray-700 mb-2">الصفحة غير موجودة</h1>
        <button onClick={() => navigate('/admin')} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold">العودة</button>
      </div>
    </div>
  )
}

function Router() {
  const { path } = useRouter()

  // Student routes (no auth)
  if (path.match(/^\/exam\/[^/]+$/)) return <ExamStart />
  if (path.match(/^\/exam\/[^/]+\/take\/[^/]+$/)) return <ExamTake />
  if (path.match(/^\/exam\/[^/]+\/result\/[^/]+$/)) return <ExamResult />
  if (path.match(/^\/exam\/[^/]+\/leaderboard$/)) return <PublicLeaderboard />

  // Login (Figma route + legacy URL kept working)
  if (path === '/login' || path === '/admin/login') return <LoginPage />

  // Root redirect
  if (path === '/') return <Redirect to="/admin" />

  // Legacy top-level redirects (kept from the previous app)
  if (path === '/exams') return <Redirect to="/admin/exams" />
  if (path === '/students') return <Redirect to="/admin/students" />
  if (path === '/results') return <Redirect to="/admin/results" />
  if (path === '/leaderboard') return <Redirect to="/admin/leaderboard" />

  // Admin routes
  if (path.startsWith('/admin')) {
    // Legacy combined editor URL → questions builder
    const legacyEditor = path.match(/^\/admin\/exams\/([^/]+)$/)
    if (legacyEditor && legacyEditor[1] !== 'new') {
      return <Redirect to={`/admin/exams/${legacyEditor[1]}/questions`} />
    }

    const adminRoutes: Array<{ pattern: string; element: React.ReactNode }> = [
      { pattern: '/admin/exams/new', element: <CreateExam /> },
      { pattern: '/admin/exams/:id/edit', element: <EditExam /> },
      { pattern: '/admin/exams/:id/questions', element: <QuestionBuilder /> },
      { pattern: '/admin/exams', element: <Exams /> },
      { pattern: '/admin/results/:id', element: <ResultDetail /> },
      { pattern: '/admin/results', element: <Results /> },
      { pattern: '/admin/participants', element: <Participants /> },
      { pattern: '/admin/students', element: <Participants /> },
      { pattern: '/admin/leaderboard', element: <AdminLeaderboard /> },
      { pattern: '/admin/settings', element: <Settings /> },
      { pattern: '/admin', element: <Dashboard /> },
    ]
    const matched = adminRoutes.find(r => {
      const parts = r.pattern.split('/')
      const pathParts = path.split('/')
      if (parts.length !== pathParts.length) return false
      return parts.every((p, i) => p.startsWith(':') || p === pathParts[i])
    })
    return (
      <ProtectedRoute>
        <AdminLayout>
          {matched?.element || <NotFound />}
        </AdminLayout>
      </ProtectedRoute>
    )
  }

  return <Redirect to="/admin" />
}

export default function App() {
  return (
    <RouterProvider>
      <AuthProvider>
        <DataProvider>
          <Router />
        </DataProvider>
      </AuthProvider>
    </RouterProvider>
  )
}
