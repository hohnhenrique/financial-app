import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { authApi } from '@/api/auth'
import { setCsrfToken } from '@/api/client'
import type { User } from '@/types'

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    authApi.me()
        .then(res => {
          setUser(res.data.data)

          // Captura o CSRF token retornado no header da resposta
          const token = res.headers['x-csrf-token']
          if (token) setCsrfToken(token)
        })
        .catch(() => setUser(null))
        .finally(() => setLoading(false))
  }, [])

  const login = async (email: string, password: string): Promise<void> => {
    const res = await authApi.login(email, password)
    setUser(res.data.data)

    // Após login, busca o CSRF token via /me
    try {
      const me = await authApi.me()
      const token = me.headers['x-csrf-token']
      localStorage.setItem('session_renewed_at', String(Date.now()))

      if (token) setCsrfToken(token)
    } catch {
      // ignora — o token virá no próximo interceptor de response
    }
  }

  const register = async (name: string, email: string, password: string): Promise<void> => {
    const res = await authApi.register(name, email, password)
    setUser(res.data.data)

    try {
      const me = await authApi.me()
      const token = me.headers['x-csrf-token']
      if (token) setCsrfToken(token)
    } catch {
      // ignora
    }
  }

  const logout = async (): Promise<void> => {
    await authApi.logout()
    setUser(null)
    setCsrfToken('') // limpa o token local ao sair
  }

  return (
      <AuthContext.Provider value={{ user, loading, login, register, logout }}>
        {children}
      </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}