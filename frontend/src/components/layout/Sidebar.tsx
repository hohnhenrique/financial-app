import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useState, useEffect } from 'react'

interface NavItemDef {
  label: string
  path: string
  icon: string
  children?: NavItemDef[]
}

const navSections: { title: string; items: NavItemDef[] }[] = [
  {
    title: 'Principal',
    items: [
      {
        label: 'Dashboard',
        path: '/',
        icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6',
      },
    ],
  },
  {
    title: 'Financeiro',
    items: [
      {
        label: 'Movimentações',
        path: '/transactions',
        icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2',
        children: [
          {
            label: 'Nova',
            path: '/transactions/new',
            icon: 'M12 4v16m8-8H4',
          },
          {
            label: 'Todas',
            path: '/transactions',
            icon: 'M4 6h16M4 10h16M4 14h16M4 18h16',
          },
        ],
      },
      {
        label: 'Contas',
        path: '/accounts',
        icon: 'M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z',
      },
      {
        label: 'Categorias',
        path: '/categories',
        icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z',
      },
      {
        label: 'Importar CSV',
        path: '/import',
        icon: 'M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12',
      },
      {
        label: 'Metas',
        path: '/goals',
        icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z'
      },
      {
        label: 'Relatórios',
        path: '/reports',
        icon: 'M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z'
      },
    ],
  },
]

function Icon({ d, className = 'w-4 h-4' }: { d: string; className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={d} />
    </svg>
  )
}

function NavItemLink({ item }: { item: NavItemDef }) {
  const location = useLocation()
  const hasChildren = !!item.children?.length

  // Submenu abre automaticamente se qualquer filho está ativo
  const isChildActive = hasChildren && item.children!.some(
    child => child.path === '/transactions'
      ? location.pathname === '/transactions' || location.pathname === '/transactions/new'
      : location.pathname.startsWith(child.path)
  )

  const [open, setOpen] = useState(isChildActive)

  // Reabre se navegar para uma rota filha
  useEffect(() => {
    if (isChildActive) setOpen(true)
  }, [isChildActive])

  if (hasChildren) {
    return (
      <div>
        <button
          onClick={() => setOpen(o => !o)}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
            isChildActive
              ? 'text-white bg-white/8'
              : 'text-slate-400 hover:text-white hover:bg-white/6'
          }`}
        >
          <Icon
            d={item.icon}
            className={`w-4 h-4 flex-shrink-0 transition-opacity ${isChildActive ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`}
          />
          <span className="flex-1 text-left">{item.label}</span>
          <svg
            className={`w-3.5 h-3.5 transition-transform flex-shrink-0 ${open ? 'rotate-180' : ''} ${isChildActive ? 'opacity-70' : 'opacity-40'}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div className="ml-4 mt-1 border-l border-white/8 pl-3 space-y-0.5">
            {item.children!.map(child => {
              // "Todas" só é ativa em /transactions exato, não em /transactions/new
              const isActive = child.path === '/transactions'
                ? location.pathname === '/transactions'
                : location.pathname === child.path

              return (
                <NavLink
                  key={child.path}
                  to={child.path}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all group ${
                    isActive
                      ? 'bg-blue-500/15 text-white'
                      : 'text-slate-500 hover:text-white hover:bg-white/6'
                  }`}
                >
                  <Icon
                    d={child.icon}
                    className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'opacity-100' : 'opacity-50 group-hover:opacity-100'}`}
                  />
                  {child.label}
                  {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />}
                </NavLink>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  const isActive = item.path === '/'
    ? location.pathname === '/'
    : location.pathname.startsWith(item.path)

  return (
    <NavLink
      to={item.path}
      end={item.path === '/'}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group ${
        isActive
          ? 'bg-blue-500/15 text-white'
          : 'text-slate-400 hover:text-white hover:bg-white/6'
      }`}
    >
      <Icon
        d={item.icon}
        className={`w-4 h-4 flex-shrink-0 transition-opacity ${isActive ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`}
      />
      {item.label}
      {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-blue-400 flex-shrink-0" />}
    </NavLink>
  )
}

export function Sidebar() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [userOpen, setUserOpen] = useState(false)

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <aside
      className="w-64 min-h-screen flex flex-col fixed left-0 top-0 bottom-0 z-30 overflow-hidden"
      style={{ background: 'linear-gradient(160deg, #0f172a 0%, #1e293b 100%)' }}
    >
      <div className="absolute right-0 top-0 bottom-0 w-px bg-white/5" />

      {/* Logo */}
      <div className="px-5 py-6 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/20 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div>
          <h1 className="text-white font-bold text-base leading-none tracking-tight">Finance App</h1>
          <p className="text-slate-500 text-xs mt-0.5 font-medium">Controle Financeiro</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto space-y-5">
        {navSections.map(section => (
          <div key={section.title}>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-600 px-3 mb-2">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map(item => <NavItemLink key={item.path} item={item} />)}
            </div>
          </div>
        ))}

        {user?.role === 'admin' && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] text-slate-600 px-3 mb-2">Admin</p>
            <div className="space-y-0.5">
              <NavItemLink item={{
                label: 'Usuários',
                path: '/admin/users',
                icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
              }} />
            </div>
          </div>
        )}
      </nav>

      {/* Footer usuário */}
      <div className="px-3 py-4 border-t border-white/5">
        <button
          onClick={() => setUserOpen(o => !o)}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all group"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-lg shadow-blue-900/30">
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div className="flex-1 overflow-hidden text-left">
            <p className="text-white text-sm font-medium truncate leading-none">{user?.name}</p>
            <p className="text-slate-500 text-xs truncate mt-0.5">{user?.email}</p>
          </div>
          <svg
            className={`w-4 h-4 text-slate-600 transition-transform flex-shrink-0 ${userOpen ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {userOpen && (
          <div className="mt-1.5 space-y-0.5">
            <NavLink
              to="/profile"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/8 text-sm transition-all"
            >
              <Icon d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              Meu Perfil
            </NavLink>
            <NavLink
              to="/settings"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/8 text-sm transition-all"
            >
              <Icon d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              Configurações
            </NavLink>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 text-sm transition-all"
            >
              <Icon d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              Sair da conta
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
