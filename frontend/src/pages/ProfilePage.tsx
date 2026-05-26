import { useState, useEffect, type FormEvent } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import axios from 'axios'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Alert } from '@/components/ui/Alert'
import { useAuth } from '@/context/AuthContext'

const profileApi = {
  get: () => axios.get('/api/profile', { withCredentials: true }),
  update: (data: { name: string; email: string }) => axios.put('/api/profile', data, { withCredentials: true }),
  updatePassword: (data: { current_password: string; new_password: string; confirm_password: string }) =>
    axios.put('/api/profile/password', data, { withCredentials: true }),
}

export function ProfilePage() {
  const { user } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [profileMsg, setProfileMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [pwdMsg, setPwdMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [current, setCurrent] = useState('')
  const [newPwd, setNewPwd] = useState('')
  const [confirm, setConfirm] = useState('')

  const { data } = useQuery({ queryKey: ['profile'], queryFn: () => profileApi.get().then(r => r.data.data) })

  useEffect(() => { if (data) { setName(data.name); setEmail(data.email) } }, [data])

  const updateMut = useMutation({
    mutationFn: () => profileApi.update({ name, email }),
    onSuccess: () => setProfileMsg({ type: 'success', text: 'Dados atualizados com sucesso.' }),
    onError: (e: unknown) => setProfileMsg({ type: 'error', text: (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erro.' }),
  })

  const pwdMut = useMutation({
    mutationFn: () => profileApi.updatePassword({ current_password: current, new_password: newPwd, confirm_password: confirm }),
    onSuccess: () => { setPwdMsg({ type: 'success', text: 'Senha alterada com sucesso.' }); setCurrent(''); setNewPwd(''); setConfirm('') },
    onError: (e: unknown) => setPwdMsg({ type: 'error', text: (e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erro.' }),
  })

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card title="Dados Pessoais" subtitle="Atualize seu nome e e-mail de acesso.">
        <div className="px-8 py-6 space-y-5">
          {profileMsg && <Alert type={profileMsg.type} message={profileMsg.text} />}
          <Input label="Nome" value={name} onChange={e => setName(e.target.value)} required />
          <Input label="E-mail" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">Membro desde</label>
            <p className="text-sm text-slate-500 dark:text-slate-400 px-4 py-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
              {data?.created_at ? new Date(data.created_at).toLocaleDateString('pt-BR') : '—'}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">Perfil</label>
            <p className="text-sm text-slate-500 dark:text-slate-400 px-4 py-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl capitalize">
              {user?.role === 'admin' ? '👑 Administrador' : '👤 Usuário'}
            </p>
          </div>
          <Button onClick={() => updateMut.mutate()} loading={updateMut.isPending} className="w-full">Salvar dados</Button>
        </div>
      </Card>

      <Card title="Alterar Senha" subtitle="Mínimo de 8 caracteres.">
        <div className="px-8 py-6 space-y-5">
          {pwdMsg && <Alert type={pwdMsg.type} message={pwdMsg.text} />}
          <Input label="Senha atual" type="password" value={current} onChange={e => setCurrent(e.target.value)} placeholder="••••••••" required />
          <Input label="Nova senha" type="password" value={newPwd} onChange={e => setNewPwd(e.target.value)} placeholder="Mínimo 8 caracteres" required />
          <Input label="Confirmar nova senha" type="password" value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Repita a nova senha" required />
          <Button variant="secondary" onClick={() => pwdMut.mutate()} loading={pwdMut.isPending} className="w-full">Alterar senha</Button>
        </div>
      </Card>
    </div>
  )
}
