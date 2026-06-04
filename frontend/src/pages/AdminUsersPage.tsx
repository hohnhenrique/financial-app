import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Pagination } from '@/components/ui/Pagination'
import { SortHeader } from '@/components/ui/SortHeader'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { Navigate } from 'react-router-dom'

const api = {
  users:         () => axios.get('/api/admin/users', { withCredentials: true }),
  create:        (d: object) => axios.post('/api/admin/users', d, { withCredentials: true }),
  update:        (id: string, d: object) => axios.put(`/api/admin/users/${id}`, d, { withCredentials: true }),
  resetPassword: (id: string, p: string) => axios.put(`/api/admin/users/${id}/reset-password`, { password: p }, { withCredentials: true }),
  toggleRole:    (id: string) => axios.put(`/api/admin/users/${id}/role`, {}, { withCredentials: true }),
  toggleActive:  (id: string) => axios.put(`/api/admin/users/${id}/active`, {}, { withCredentials: true }),
  delete:        (id: string) => axios.delete(`/api/admin/users/${id}`, { withCredentials: true }),
  listTokens:    () => axios.get('/api/admin/invite-tokens', { withCredentials: true }),
  createToken:   (d: object) => axios.post('/api/admin/invite-tokens', d, { withCredentials: true }),
  revokeToken:   (id: string) => axios.delete(`/api/admin/invite-tokens/${id}`, { withCredentials: true }),
}

interface AdminUser {
  id: string; name: string; email: string; role: string; phone: string | null; bio: string | null
  is_active: boolean; last_login_at: string | null; created_at: string; tx_count: number
}
interface InviteToken {
  id: string; token: string; note: string | null; is_active: boolean
  expires_at: string; used_at: string | null; created_by_name: string; used_by_name: string | null
}

const EMPTY_USER = { name: '', email: '', password: '', role: 'user', phone: '', bio: '' }

export function AdminUsersPage() {
  const { user } = useAuth()
  const qc       = useQueryClient()
  const toast    = useToast()

  if (user?.role !== 'admin') return <Navigate to="/" replace />

  const [page, setPage]         = useState(1)
  const [perPage, setPerPage]   = useState(10)
  const [sortBy, setSortBy]     = useState('created_at')
  const [sortDir, setSortDir]   = useState<'ASC'|'DESC'>('DESC')
  const [tab, setTab]           = useState<'users'|'tokens'>('users')
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null)
  const [showCreateUser, setShowCreateUser] = useState(false)
  const [formUser, setFormUser] = useState(EMPTY_USER)
  const [resetPwdId, setResetPwdId] = useState<string | null>(null)
  const [newPassword, setNewPassword] = useState('')
  const [tokenNote, setTokenNote]     = useState('')
  const [tokenHours, setTokenHours]   = useState('72')
  const [createdToken, setCreatedToken] = useState('')

  const { data: allUsers }   = useQuery({ queryKey: ['admin-users'],   queryFn: () => api.users().then(r => r.data.data as AdminUser[]) })
  const { data: allTokens }  = useQuery({ queryKey: ['admin-tokens'],  queryFn: () => api.listTokens().then(r => r.data.data as InviteToken[]) })
  const invalidateUsers      = () => qc.invalidateQueries({ queryKey: ['admin-users'] })
  const invalidateTokens     = () => qc.invalidateQueries({ queryKey: ['admin-tokens'] })

  // Ordenação local
  const sorted = [...(allUsers ?? [])].sort((a, b) => {
    const va = (a as unknown as Record<string, unknown>)[sortBy] ?? ''
    const vb = (b as unknown as Record<string, unknown>)[sortBy] ?? ''
    const cmp = typeof va === 'string' ? va.localeCompare(String(vb), 'pt-BR') : Number(va) - Number(vb)
    return sortDir === 'DESC' ? -cmp : cmp
  })
  const total      = sorted.length
  const totalPages = Math.max(1, Math.ceil(total / perPage))
  const paged      = sorted.slice((page-1)*perPage, page*perPage)
  const handleSort = (f: string, d: 'ASC'|'DESC') => { setSortBy(f); setSortDir(d); setPage(1) }

  // Mutations
  const createMut  = useMutation({ mutationFn: () => api.create(formUser), onSuccess: () => { invalidateUsers(); setShowCreateUser(false); setFormUser(EMPTY_USER); toast.success('Usuário criado!') }, onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erro.') })
  const updateMut  = useMutation({ mutationFn: () => api.update(editingUser!.id, formUser), onSuccess: () => { invalidateUsers(); setEditingUser(null); toast.success('Usuário atualizado!') }, onError: (e: unknown) => toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erro.') })
  const resetPwMut = useMutation({ mutationFn: () => api.resetPassword(resetPwdId!, newPassword), onSuccess: () => { setResetPwdId(null); setNewPassword(''); toast.success('Senha redefinida!') }, onError: () => toast.error('Erro ao redefinir senha.') })
  const toggleActiveMut = useMutation({ mutationFn: api.toggleActive, onSuccess: () => { invalidateUsers(); toast.success('Status atualizado.') } })
  const toggleRoleMut   = useMutation({ mutationFn: api.toggleRole,   onSuccess: () => { invalidateUsers(); toast.success('Perfil atualizado.') } })
  const deleteMut       = useMutation({ mutationFn: api.delete,        onSuccess: () => { invalidateUsers(); toast.success('Usuário removido.') } })
  const createTokenMut  = useMutation({
    mutationFn: () => api.createToken({ note: tokenNote, expires_hours: parseInt(tokenHours) }),
    onSuccess: (res) => { invalidateTokens(); setCreatedToken(res.data.data.token); setTokenNote('') },
    onError: () => toast.error('Erro ao criar token.')
  })
  const revokeTokenMut  = useMutation({ mutationFn: api.revokeToken, onSuccess: () => { invalidateTokens(); toast.success('Token revogado.') } })

  const openEdit = (u: AdminUser) => {
    setEditingUser(u)
    setFormUser({ name: u.name, email: u.email, password: '', role: u.role, phone: u.phone ?? '', bio: u.bio ?? '' })
    setShowCreateUser(false)
  }

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex items-center gap-3">
        {['users','tokens'].map(t => (
          <button key={t} onClick={() => setTab(t as 'users'|'tokens')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${tab === t ? 'text-white' : 'border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400'}`}
            style={tab === t ? { backgroundColor: 'var(--color-primary)' } : undefined}>
            {{ users: '👤 Usuários', tokens: '🔑 Tokens de Convite' }[t]}
          </button>
        ))}
      </div>

      {/* ── USUÁRIOS ────────────────────────────────────────────────────────── */}
      {tab === 'users' && (
        <div className="space-y-5">
          {/* Modal criar / editar */}
          {(showCreateUser || editingUser) && (
            <Card title={editingUser ? `Editar: ${editingUser.name}` : 'Novo Usuário'} padding>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input label="Nome" value={formUser.name} onChange={e => setFormUser(f => ({ ...f, name: e.target.value }))} required />
                <Input label="E-mail" type="email" value={formUser.email} onChange={e => setFormUser(f => ({ ...f, email: e.target.value }))} required />
                {!editingUser && <Input label="Senha" type="password" value={formUser.password} onChange={e => setFormUser(f => ({ ...f, password: e.target.value }))} placeholder="Mínimo 8 caracteres" required />}
                <Select label="Perfil" options={[{ value: 'user', label: 'Usuário' },{ value: 'admin', label: 'Administrador' }]} value={formUser.role} onChange={e => setFormUser(f => ({ ...f, role: e.target.value }))} />
                <Input label="Telefone" value={formUser.phone} onChange={e => setFormUser(f => ({ ...f, phone: e.target.value }))} placeholder="(00) 00000-0000" />
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">Bio</label>
                  <textarea value={formUser.bio} onChange={e => setFormUser(f => ({ ...f, bio: e.target.value }))} rows={2} className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all resize-none" />
                </div>
              </div>
              <div className="flex gap-3 mt-4">
                <Button variant="secondary" onClick={() => { setShowCreateUser(false); setEditingUser(null) }} className="flex-1">Cancelar</Button>
                <Button onClick={() => editingUser ? updateMut.mutate() : createMut.mutate()} loading={createMut.isPending || updateMut.isPending} className="flex-1">
                  {editingUser ? 'Salvar' : 'Criar Usuário'}
                </Button>
              </div>
            </Card>
          )}

          {/* Modal reset senha */}
          {resetPwdId && (
            <Card title="Redefinir Senha" padding>
              <div className="space-y-4">
                <Input label="Nova senha" type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="Mínimo 8 caracteres" required />
                <div className="flex gap-3">
                  <Button variant="secondary" onClick={() => { setResetPwdId(null); setNewPassword('') }} className="flex-1">Cancelar</Button>
                  <Button onClick={() => resetPwMut.mutate()} loading={resetPwMut.isPending} className="flex-1">Redefinir</Button>
                </div>
              </div>
            </Card>
          )}

          <Card title={`Usuários (${total})`} action={<Button size="sm" onClick={() => { setShowCreateUser(true); setEditingUser(null); setFormUser(EMPTY_USER) }}>+ Novo</Button>}>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                    <SortHeader label="Nome"   field="name"        current={sortBy} direction={sortDir} onChange={handleSort} />
                    <SortHeader label="E-mail" field="email"       current={sortBy} direction={sortDir} onChange={handleSort} />
                    <th className="px-6 py-3 text-slate-500 dark:text-slate-400 font-medium text-left">Perfil</th>
                    <th className="px-6 py-3 text-slate-500 dark:text-slate-400 font-medium text-left">Status</th>
                    <SortHeader label="Movimentações" field="tx_count" current={sortBy} direction={sortDir} onChange={handleSort} />
                    <SortHeader label="Último login" field="last_login_at" current={sortBy} direction={sortDir} onChange={handleSort} />
                    <th className="px-6 py-3 text-slate-500 dark:text-slate-400 font-medium text-left">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                  {paged.map(u => (
                    <tr key={u.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${!u.is_active ? 'opacity-50' : ''}`}>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
                            style={{ background: u.is_active ? 'var(--color-primary)' : '#94a3b8' }}>
                            {u.name[0].toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-slate-700 dark:text-slate-200">{u.name}</p>
                            {u.phone && <p className="text-xs text-slate-400">{u.phone}</p>}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{u.email}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${u.role === 'admin' ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                          {u.role === 'admin' ? '👑 Admin' : '👤 Usuário'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${u.is_active ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400'}`}>
                          {u.is_active ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 tabular-nums">{u.tx_count}</td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
                        {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString('pt-BR') : '—'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1 flex-wrap">
                          <button onClick={() => openEdit(u)} title="Editar" className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                          </button>
                          <button onClick={() => { setResetPwdId(u.id); setNewPassword('') }} title="Resetar senha" className="p-1.5 text-slate-400 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-lg transition-all">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/></svg>
                          </button>
                          <button onClick={() => toggleActiveMut.mutate(u.id)} title={u.is_active ? 'Inativar' : 'Ativar'} className={`p-1.5 rounded-lg transition-all ${u.is_active ? 'text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20' : 'text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'}`}>
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={u.is_active ? 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636' : 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z'}/></svg>
                          </button>
                          {u.id !== user?.id && (
                            <button onClick={() => confirm(`Excluir ${u.name}?`) && deleteMut.mutate(u.id)} title="Excluir" className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={totalPages} perPage={perPage} total={total} onPageChange={setPage} onPerPageChange={p => { setPerPage(p); setPage(1) }} />
          </Card>
        </div>
      )}

      {/* ── TOKENS ──────────────────────────────────────────────────────────── */}
      {tab === 'tokens' && (
        <div className="space-y-5">
          <Card title="Gerar Token de Convite" subtitle="Compartilhe com quem deve ter acesso ao sistema." padding>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input label="Observação" value={tokenNote} onChange={e => setTokenNote(e.target.value)} placeholder="Ex: Convite para João Silva" />
              <Select label="Expira em" options={[{ value:'24',label:'24 horas'},{ value:'48',label:'48 horas'},{ value:'72',label:'72 horas'},{ value:'168',label:'7 dias'}]} value={tokenHours} onChange={e => setTokenHours(e.target.value)} />
              <div className="flex items-end">
                <Button onClick={() => createTokenMut.mutate()} loading={createTokenMut.isPending} className="w-full">Gerar Token</Button>
              </div>
            </div>

            {createdToken && (
              <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-700 rounded-xl">
                <p className="text-sm font-semibold text-emerald-700 dark:text-emerald-400 mb-2">✅ Token gerado! Compartilhe com o usuário:</p>
                <div className="flex items-center gap-3">
                  <code className="flex-1 text-xs bg-white dark:bg-slate-800 px-3 py-2 rounded-lg border border-emerald-200 dark:border-emerald-700 text-slate-700 dark:text-slate-200 font-mono break-all">
                    {createdToken}
                  </code>
                  <button onClick={() => { navigator.clipboard.writeText(createdToken); toast.success('Token copiado!') }}
                    className="px-3 py-2 rounded-lg text-xs font-semibold text-white flex-shrink-0"
                    style={{ background: 'var(--color-primary)' }}>
                    Copiar
                  </button>
                </div>
                <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-2">
                  Link direto: <code>{window.location.origin}/register?token={createdToken}</code>
                </p>
              </div>
            )}
          </Card>

          <Card title="Tokens ativos">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                    {['Token','Observação','Criado por','Expira em','Usado por','Ações'].map(h => (
                      <th key={h} className="px-6 py-3 text-slate-500 dark:text-slate-400 font-medium text-left">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                  {(allTokens ?? []).map(t => (
                    <tr key={t.id} className={`hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${!t.is_active ? 'opacity-50' : ''}`}>
                      <td className="px-6 py-4">
                        <code className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded font-mono text-slate-600 dark:text-slate-300">
                          {t.token.substring(0, 12)}...
                        </code>
                        <button onClick={() => { navigator.clipboard.writeText(t.token); toast.success('Copiado!') }}
                          className="ml-2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">⎘</button>
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{t.note ?? '—'}</td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{t.created_by_name}</td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400 text-xs whitespace-nowrap">
                        {new Date(t.expires_at) < new Date()
                          ? <span className="text-red-500">Expirado</span>
                          : new Date(t.expires_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4">
                        {t.used_by_name
                          ? <span className="text-xs text-emerald-600 dark:text-emerald-400">✓ {t.used_by_name}</span>
                          : <span className="text-xs text-slate-400">Não usado</span>
                        }
                      </td>
                      <td className="px-6 py-4">
                        {t.is_active && !t.used_at && (
                          <button onClick={() => revokeTokenMut.mutate(t.id)}
                            className="text-xs text-red-500 hover:underline">Revogar</button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {(allTokens ?? []).length === 0 && (
                    <tr><td colSpan={6} className="px-6 py-10 text-center text-slate-400 text-sm">Nenhum token gerado ainda.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
