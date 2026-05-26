import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { useAuth } from '@/context/AuthContext'
import { Navigate } from 'react-router-dom'
import { useState } from 'react'

const adminApi = {
  users: () => axios.get('/api/admin/users', { withCredentials: true }),
  toggleRole: (id: string) => axios.put(`/api/admin/users/${id}/role`, {}, { withCredentials: true }),
  delete: (id: string) => axios.delete(`/api/admin/users/${id}`, { withCredentials: true }),
}

interface AdminUser { id: string; name: string; email: string; role: string; created_at: string; tx_count: number }

export function AdminUsersPage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  if (user?.role !== 'admin') return <Navigate to="/" replace />

  const { data: users } = useQuery({ queryKey: ['admin-users'], queryFn: () => adminApi.users().then(r => r.data.data as AdminUser[]) })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['admin-users'] })

  const toggleMut = useMutation({
    mutationFn: adminApi.toggleRole,
    onSuccess: () => { invalidate(); setMsg({ type: 'success', text: 'Perfil atualizado.' }) },
  })

  const deleteMut = useMutation({
    mutationFn: adminApi.delete,
    onSuccess: () => { invalidate(); setMsg({ type: 'success', text: 'Usuário removido.' }) },
    onError: () => setMsg({ type: 'error', text: 'Erro ao remover.' }),
  })

  return (
    <Card title="Usuários do Sistema" subtitle="Visível apenas para administradores.">
      <div className="px-6 pb-6">
        {msg && <Alert type={msg.type} message={msg.text} className="mt-4" />}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead><tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
            {['Nome','E-mail','Perfil','Movimentações','Desde','Ações'].map(h => <th key={h} className="px-6 py-3 text-slate-500 dark:text-slate-400 font-medium text-left">{h}</th>)}
          </tr></thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
            {(users ?? []).map(u => (
              <tr key={u.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                <td className="px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#1B4F8A] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                      {u.name[0].toUpperCase()}
                    </div>
                    <span className="font-medium text-slate-700 dark:text-slate-200">{u.name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{u.email}</td>
                <td className="px-6 py-4">
                  <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${u.role === 'admin' ? 'bg-purple-50 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                    {u.role === 'admin' ? 'Admin' : 'Usuário'}
                  </span>
                </td>
                <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{u.tx_count}</td>
                <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{new Date(u.created_at).toLocaleDateString('pt-BR')}</td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => toggleMut.mutate(u.id)} loading={toggleMut.isPending}>
                      {u.role === 'admin' ? '↓ Rebaixar' : '↑ Promover'}
                    </Button>
                    {u.id !== user?.id && (
                      <button onClick={() => confirm(`Excluir ${u.name}?`) && deleteMut.mutate(u.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all">
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
    </Card>
  )
}
