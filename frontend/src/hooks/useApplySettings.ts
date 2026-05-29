import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { settingsApi } from '@/api/settings'

export function useApplySettings() {
  const { data } = useQuery({
    queryKey: ['settings'],
    queryFn:  () => settingsApi.get().then(r => r.data.data),
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

export function applyColors(primary: string, from: string, to: string) {
  const root = document.documentElement
  root.style.setProperty('--color-primary',   primary)
  root.style.setProperty('--sidebar-from',    from)
  root.style.setProperty('--sidebar-to',      to)
}
