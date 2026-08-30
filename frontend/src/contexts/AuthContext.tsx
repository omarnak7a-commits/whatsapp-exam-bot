import { createContext, useContext, useState, useCallback } from 'react'
import { apiFetch } from '../api/client'

interface Admin {
  name: string
  email: string
}

interface AuthContextValue {
  admin: Admin | null
  login: (email: string, password: string) => Promise<boolean>
  logout: () => void
  updateAdmin: (patch: Partial<Admin>) => void
  isAuthenticated: boolean
}

const AuthContext = createContext<AuthContextValue>({
  admin: null,
  login: async () => false,
  logout: () => {},
  updateAdmin: () => {},
  isAuthenticated: false,
})

interface LoginResponse {
  access_token: string
  token_type: string
  admin_name: string
  admin_email: string
}

function loadAdmin(): Admin | null {
  // Session lives in localStorage (JWT + admin identity) — same keys the
  // shared API client uses so a 401 clears everything consistently.
  const token = localStorage.getItem('access_token')
  if (!token) return null
  const name = localStorage.getItem('admin_name')
  const email = localStorage.getItem('admin_email')
  if (!name || !email) return null
  return { name, email }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [admin, setAdmin] = useState<Admin | null>(loadAdmin)

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    // Real authentication against the platform's JWT endpoint.
    const res = await apiFetch<LoginResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    localStorage.setItem('access_token', res.access_token)
    localStorage.setItem('admin_name', res.admin_name)
    localStorage.setItem('admin_email', res.admin_email)
    setAdmin({ name: res.admin_name, email: res.admin_email })
    return true
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem('access_token')
    localStorage.removeItem('admin_name')
    localStorage.removeItem('admin_email')
    setAdmin(null)
  }, [])

  const updateAdmin = useCallback((patch: Partial<Admin>) => {
    setAdmin(prev => {
      if (!prev) return prev
      const next = { ...prev, ...patch }
      localStorage.setItem('admin_name', next.name)
      localStorage.setItem('admin_email', next.email)
      return next
    })
  }, [])

  return (
    <AuthContext.Provider value={{ admin, login, logout, updateAdmin, isAuthenticated: !!admin }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
