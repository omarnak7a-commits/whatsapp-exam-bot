import React, { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react'

interface RouterContextValue {
  path: string
  navigate: (to: string, replace?: boolean) => void
  params: Record<string, string>
}

const RouterContext = createContext<RouterContextValue>({
  path: '/',
  navigate: () => {},
  params: {},
})

const ROUTES = [
  '/login',
  '/admin/login',
  '/admin',
  '/admin/exams',
  '/admin/exams/new',
  '/admin/exams/:id/edit',
  '/admin/exams/:id/questions',
  '/admin/results',
  '/admin/results/:id',
  '/admin/participants',
  '/admin/students',
  '/admin/leaderboard',
  '/admin/settings',
  '/exam/:slug',
  '/exam/:slug/take/:attemptId',
  '/exam/:slug/result/:attemptId',
  '/exam/:slug/leaderboard',
  // Generic single-segment exam route last (matches '/admin/exams/:id' legacy editor URL).
  '/admin/exams/:id',
]

function matchRoute(pattern: string, path: string): Record<string, string> | null {
  const patternParts = pattern.split('/')
  const pathParts = path.split('/')
  if (patternParts.length !== pathParts.length) return null
  const params: Record<string, string> = {}
  for (let i = 0; i < patternParts.length; i++) {
    if (patternParts[i].startsWith(':')) {
      params[patternParts[i].slice(1)] = pathParts[i]
    } else if (patternParts[i] !== pathParts[i]) {
      return null
    }
  }
  return params
}

export function RouterProvider({ children }: { children: React.ReactNode }) {
  const [path, setPath] = useState(() => window.location.pathname || '/')

  const params = useMemo(() => {
    for (const route of ROUTES) {
      const matched = matchRoute(route, path)
      if (matched) return matched
    }
    return {}
  }, [path])

  useEffect(() => {
    const onPop = () => {
      const newPath = window.location.pathname
      setPath(newPath)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const navigate = useCallback((to: string, replace = false) => {
    if (replace) {
      window.history.replaceState(null, '', to)
    } else {
      window.history.pushState(null, '', to)
    }
    setPath(to)
  }, [])

  return (
    <RouterContext.Provider value={{ path, navigate, params }}>
      {children}
    </RouterContext.Provider>
  )
}

export function useRouter() {
  return useContext(RouterContext)
}

export function useParams() {
  return useContext(RouterContext).params
}

export function useNavigate() {
  return useContext(RouterContext).navigate
}

export function Route({ pattern, children }: { pattern: string; children: React.ReactNode }) {
  const { path } = useContext(RouterContext)
  const matched = matchRoute(pattern, path)
  if (!matched) return null
  return <>{children}</>
}
