import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

interface VisibilityContextType {
  visible: boolean
  toggle: () => void
}

const VisibilityContext = createContext<VisibilityContextType | null>(null)

export function VisibilityProvider({ children }: { children: ReactNode }) {
  const [visible, setVisible] = useState(true)
  return (
    <VisibilityContext.Provider value={{ visible, toggle: () => setVisible(v => !v) }}>
      {children}
    </VisibilityContext.Provider>
  )
}

export const useVisibility = () => {
  const ctx = useContext(VisibilityContext)
  if (!ctx) throw new Error('useVisibility deve estar dentro de VisibilityProvider')
  return ctx
}
