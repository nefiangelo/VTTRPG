import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react'

const SESSION_KEY = 'vttrpg_session'

export interface AuthUser {
  id: number
  username: string
  email: string | null
  created_at: string
}

interface AuthContextValue {
  user: AuthUser | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<string | null>
  register: (username: string, password: string, email?: string) => Promise<string | null>
  logout: () => void
  updateProfile: (data: {
    currentPassword: string
    username?: string
    email?: string | null
    newPassword?: string
  }) => Promise<string | null>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Restore saved session on app start
  useEffect(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      if (raw) setUser(JSON.parse(raw))
    } catch {
      localStorage.removeItem(SESSION_KEY)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const login = useCallback(async (username: string, password: string): Promise<string | null> => {
    const result = await window.api.auth.login(username, password)
    if (!result.success || !result.user) return result.error ?? 'Login failed.'
    setUser(result.user)
    localStorage.setItem(SESSION_KEY, JSON.stringify(result.user))
    return null
  }, [])

  const register = useCallback(
    async (username: string, password: string, email?: string): Promise<string | null> => {
      const result = await window.api.auth.register(username, password, email)
      if (!result.success || !result.user) return result.error ?? 'Registration failed.'
      setUser(result.user)
      localStorage.setItem(SESSION_KEY, JSON.stringify(result.user))
      return null
    },
    []
  )

  const logout = useCallback((): void => {
    setUser(null)
    localStorage.removeItem(SESSION_KEY)
  }, [])

  const updateProfile = useCallback(
    async (data: {
      currentPassword: string
      username?: string
      email?: string | null
      newPassword?: string
    }): Promise<string | null> => {
      if (!user) return 'Not authenticated.'
      const result = await window.api.auth.updateProfile({ userId: user.id, ...data })
      if (!result.success || !result.user) return result.error ?? 'Update failed.'
      setUser(result.user)
      localStorage.setItem(SESSION_KEY, JSON.stringify(result.user))
      return null
    },
    [user]
  )

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, updateProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
