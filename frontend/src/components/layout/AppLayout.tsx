import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { NotificationBell } from './NotificationBell'
import { SessionRenewalModal } from '../SessionRenewalModal'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { useVisibility } from '@/context/VisibilityContext'
import { useApplySettings } from '@/hooks/useApplySettings'

function MoonIcon()   { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg> }
function SunIcon()    { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg> }
function EyeIcon()    { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg> }
function EyeOffIcon() { return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"/></svg> }

// Mapa de rotas → título
const PAGE_TITLES: Record<string, string> = {
  '/':                   'Dashboard',
  '/transactions':       'Movimentações',
  '/transactions/new':   'Nova Movimentação',
  '/accounts':           'Contas',
  '/categories':         'Categorias',
  '/goals':              'Metas',
  '/reports':            'Relatórios',
  '/import':             'Importar Extrato',
  '/profile':            'Meu Perfil',
  '/settings':           'Configurações',
  '/admin/users':        'Usuários do Sistema',
}

function usePageTitle(): string {
  const { pathname } = useLocation()

  // Tenta match exato primeiro
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]

  // Match por prefixo (ex: /transactions/123/edit)
  if (pathname.startsWith('/transactions')) return 'Movimentações'
  if (pathname.startsWith('/admin'))        return 'Administração'

  return 'Finance App'
}

function formatDatePtBR(): string {
  return new Date().toLocaleDateString('pt-BR', {
    weekday: 'long',
    day:     '2-digit',
    month:   'long',
    year:    'numeric',
  })
}

export function AppLayout() {
  const { user, loading }           = useAuth()
  const { dark, toggleDark }        = useTheme()
  const { visible, toggle }         = useVisibility()
  const pageTitle                   = usePageTitle()

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 dark:bg-slate-900">
      <div className="animate-spin w-8 h-8 border-4 border-[#1B4F8A] border-t-transparent rounded-full" />
    </div>
  )

  if (!user) return <Navigate to="/login" replace />

  useApplySettings()

  return (
    <div className="flex min-h-screen bg-slate-100 dark:bg-slate-900 transition-colors">
      <Sidebar />
      <div className="ml-64 flex-1 flex flex-col min-h-screen">

        {/* Header */}
        <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 px-8 py-4 flex items-center justify-between sticky top-0 z-20 shadow-sm transition-colors">
          {/* Título da página — lado esquerdo */}
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-white leading-tight">
              {pageTitle}
            </h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 capitalize">
              {formatDatePtBR()}
            </p>
          </div>

          {/* Ações — lado direito */}
          <div className="flex items-center gap-1">
            {/* Ocultar valores */}
            <button
              onClick={toggle}
              title={visible ? 'Ocultar valores' : 'Mostrar valores'}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
            >
              {visible ? <EyeIcon /> : <EyeOffIcon />}
            </button>

            {/* Notificações */}
            <NotificationBell />

            {/* Dark mode */}
            <button
              onClick={toggleDark}
              title={dark ? 'Modo claro' : 'Modo escuro'}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
            >
              {dark ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        </header>

        <main className="flex-1 p-8">
          <Outlet />
        </main>

        <footer className="px-8 py-4 text-center text-slate-400 dark:text-slate-600 text-xs border-t border-slate-200 dark:border-slate-700">
          Finance App &copy; {new Date().getFullYear()}
        </footer>
      </div>

      <SessionRenewalModal />
    </div>
  )
}
