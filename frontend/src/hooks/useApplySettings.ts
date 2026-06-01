import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { settingsApi } from '@/api/settings'
import { useAuth } from '@/context/AuthContext'

export function applyColors(primary: string, from: string, to: string) {
  const r = document.documentElement
  r.style.setProperty('--color-primary', primary)
  r.style.setProperty('--sidebar-from',  from)
  r.style.setProperty('--sidebar-to',    to)
}

// Hook seguro: sempre chama useQuery, mas só busca quando logado
export function useApplySettings() {
  const { user } = useAuth()

  const { data } = useQuery({
    queryKey: ['settings'],
    queryFn:  () => settingsApi.get().then(r => r.data.data),
    enabled:  !!user,           // só busca quando autenticado
    staleTime: 5 * 60 * 1000,
  })

  useEffect(() => {
    if (!data) return
    applyColors(data.primary_color, data.sidebar_color_from, data.sidebar_color_to)
    if (data.session_lifetime) {
      localStorage.setItem('session_lifetime', String(data.session_lifetime))
    }
  }, [data])
}
