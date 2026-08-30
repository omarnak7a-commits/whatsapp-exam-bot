import { useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from '@/router'

export default function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', true)
    }
  }, [isAuthenticated, navigate])

  if (!isAuthenticated) return null
  return <>{children}</>
}
