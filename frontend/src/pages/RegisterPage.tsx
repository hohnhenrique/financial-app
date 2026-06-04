import { useState, type FormEvent } from 'react'
import { useNavigate, Link, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useTheme } from '@/context/ThemeContext'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'

export function RegisterPage() {
  const { register, user } = useAuth()
  const { dark, toggleDark } = useTheme()
  const navigate = useNavigate()
  const [params]  = useSearchParams()

  const [name,    setName]    = useState('')
  const [email,   setEmail]   = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [token,   setToken]   = useState(params.get('token') ?? '') // pré-preenche se vier na URL
  const [error,   setError]   = useState('')
  const [loading, setLoading] = useState(false)

  if (user) { navigate('/'); return null }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('As senhas não coincidem.'); return }
    if (password.length < 8)  { setError('Senha deve ter no mínimo 8 caracteres.'); return }

    setLoading(true)
    try {
      await register(name, email, password, token)
      navigate('/')
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Erro ao criar conta.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex transition-colors">
      {/* Painel esquerdo */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, var(--sidebar-from, #0f172a) 0%, var(--sidebar-to, #1e293b) 100%)' }}>
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-white/5 rounded-full" />
        <div className="relative flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl border border-white/10 flex items-center justify-center" style={{ backgroundColor: 'var(--color-primary, #1B4F8A)33' }}>
            <svg className="w-6 h-6" style={{ color: 'var(--color-primary, #60a5fa)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
          </div>
          <span className="text-white font-bold text-xl">Finance App</span>
        </div>
        <div className="relative">
          <h2 className="text-white text-4xl font-bold leading-tight mb-4">Comece a organizar<br/>seu dinheiro hoje.</h2>
          <p className="text-white/60 text-lg max-w-xs mb-10">Controle total das suas finanças pessoais.</p>
          {['Cadastre receitas e despesas', 'Visualize gráficos mensais', 'Gerencie múltiplas contas', 'Defina metas e hábitos'].map(item => (
            <div key={item} className="flex items-center gap-3 text-white/80 mb-3">
              <div className="w-5 h-5 rounded-full bg-emerald-400/80 flex items-center justify-center flex-shrink-0">
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7"/></svg>
              </div>
              <span className="text-sm">{item}</span>
            </div>
          ))}
        </div>
        <p className="relative text-white/30 text-sm">Finance App &copy; {new Date().getFullYear()}</p>
      </div>

      {/* Painel direito */}
      <div className="flex-1 flex flex-col items-center justify-center p-8 lg:p-16 relative">
        <button onClick={toggleDark} className="absolute top-6 right-6 p-2 rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
          {dark
            ? <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
            : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
          }
        </button>

        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-1">Criar sua conta</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mb-8">
            Preencha os dados abaixo para começar.{' '}
            {token && <span className="text-emerald-600 dark:text-emerald-400 font-medium">✓ Convite válido</span>}
          </p>

          {error && <Alert type="error" message={error} className="mb-6" />}

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input label="Nome completo" value={name} onChange={e => setName(e.target.value)} placeholder="Seu nome" required autoFocus />
            <Input label="E-mail" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" required />
            <Input label="Senha" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Mínimo 8 caracteres" required />
            <Input label="Confirmar senha" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repita a senha" required />

            {/* Token de convite */}
            <div>
              <Input
                label="Código de convite"
                value={token}
                onChange={e => setToken(e.target.value)}
                placeholder="Cole o código recebido"
                required
              />
              <p className="mt-1.5 text-xs text-slate-400 dark:text-slate-500">
                Solicite um código ao administrador do sistema.
              </p>
            </div>

            <Button type="submit" loading={loading} className="w-full mt-2" size="lg">
              Criar conta
            </Button>
          </form>

          <p className="text-center text-slate-500 dark:text-slate-400 text-sm mt-6">
            Já tem conta?{' '}
            <Link to="/login" className="font-semibold hover:underline" style={{ color: 'var(--color-primary)' }}>Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
