import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { accountsApi, type AccountPayload } from '@/api/accounts'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Alert } from '@/components/ui/Alert'
import { Pagination } from '@/components/ui/Pagination'
import { SortHeader } from '@/components/ui/SortHeader'
import { MoneyValue } from '@/components/ui/MoneyValue'
import type { Account } from '@/types'

const TYPES = [
  { value: 'checking', label: 'Conta corrente' }, { value: 'savings', label: 'Poupança' },
  { value: 'wallet', label: 'Carteira' }, { value: 'investment', label: 'Investimento' },
  { value: 'credit_card', label: 'Cartão de crédito' },
]
const EMPTY: AccountPayload = { name: '', type: 'checking', initial_balance: '0,00', color: '#1B4F8A', is_hidden: false }

export function AccountsPage() {
  const qc = useQueryClient()
  const [page, setPage]       = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [sortBy, setSortBy]   = useState('created_at')
  const [sortDir, setSortDir] = useState<'ASC'|'DESC'>('DESC')
  const [form, setForm]       = useState<AccountPayload>(EMPTY)
  const [editing, setEditing] = useState<Account | null>(null)
  const [error, setError]     = useState('')
  const [success, setSuccess] = useState('')

  const { data } = useQuery({
    queryKey: ['accounts', page, perPage, sortBy, sortDir],
    queryFn:  () => accountsApi.list({ page, per_page: perPage, sort_by: sortBy, sort_dir: sortDir }).then(r => r.data.data),
  })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['accounts'] })
  const createMut  = useMutation({ mutationFn: accountsApi.create, onSuccess: () => { invalidate(); setForm(EMPTY); setSuccess('Conta cadastrada!') } })
  const updateMut  = useMutation({ mutationFn: ({ id, data }: { id: string; data: AccountPayload }) => accountsApi.update(id, data), onSuccess: () => { invalidate(); setEditing(null); setForm(EMPTY); setSuccess('Conta atualizada!') } })
  const deleteMut  = useMutation({ mutationFn: accountsApi.delete, onSuccess: invalidate })

  const openEdit = (a: Account) => {
    setEditing(a)
    setForm({ name: a.name, type: a.type, initial_balance: (a.initial_balance_cents / 100).toFixed(2).replace('.', ','), color: a.color, is_hidden: a.is_hidden })
  }

  const handleSubmit = async () => {
    setError(''); setSuccess('')
    try {
      if (editing) await updateMut.mutateAsync({ id: String(editing.id), data: form })
      else await createMut.mutateAsync(form)
    } catch (e: unknown) {
      setError((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Erro ao salvar.')
    }
  }

  const handleSort = (field: string, dir: 'ASC' | 'DESC') => { setSortBy(field); setSortDir(dir); setPage(1) }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6">
      <Card title={editing ? 'Editar Conta' : 'Nova Conta'} subtitle="Cadastre bancos, carteiras e cartões.">
        <div className="px-6 pb-6 space-y-5">
          {error   && <Alert type="error"   message={error} />}
          {success && <Alert type="success" message={success} />}
          <Input label="Nome" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Nubank, Carteira" required />
          <Select label="Tipo" options={TYPES} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} required />
          <Input label="Saldo inicial" prefix="R$" value={form.initial_balance ?? ''} onChange={e => setForm(f => ({ ...f, initial_balance: e.target.value }))} placeholder="0,00" />
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">Cor</label>
            <div className="flex items-center gap-3">
              <input type="color" value={form.color ?? '#1B4F8A'} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
                className="h-11 w-14 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 p-1 cursor-pointer" />
              <span className="text-sm text-slate-400">Cor de identificação</span>
            </div>
          </div>
          <label className="flex items-center gap-3 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
            <input type="checkbox" checked={form.is_hidden ?? false} onChange={e => setForm(f => ({ ...f, is_hidden: e.target.checked }))} className="rounded border-slate-300 dark:border-slate-600" />
            Ocultar em listas principais
          </label>
          <div className="flex gap-3">
            {editing && <Button variant="secondary" onClick={() => { setEditing(null); setForm(EMPTY) }} className="flex-1">Cancelar</Button>}
            <Button onClick={handleSubmit} loading={createMut.isPending || updateMut.isPending} className="flex-1">
              {editing ? 'Salvar alterações' : 'Salvar Conta'}
            </Button>
          </div>
        </div>
      </Card>

      <Card title={`Contas Cadastradas ${data?.total ? `(${data.total})` : ''}`}>
        {(data?.items ?? []).length === 0
          ? <div className="px-6 py-16 text-center text-slate-400 dark:text-slate-500 text-sm">Nenhuma conta cadastrada.</div>
          : <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                    <SortHeader label="Conta" field="name" current={sortBy} direction={sortDir} onChange={handleSort} />
                    <th className="px-6 py-3 text-slate-500 dark:text-slate-400 font-medium text-left">Tipo</th>
                    <SortHeader label="Saldo" field="balance" current={sortBy} direction={sortDir} onChange={handleSort} />
                    <th className="px-6 py-3 text-slate-500 dark:text-slate-400 font-medium text-left">Status</th>
                    <th className="px-6 py-3 text-slate-500 dark:text-slate-400 font-medium text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                  {(data?.items ?? []).map(a => (
                    <tr key={a.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: a.color }} />
                          <span className="font-medium text-slate-700 dark:text-slate-200">{a.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{TYPES.find(t => t.value === a.type)?.label}</td>
                      <td className="px-6 py-4 font-semibold text-slate-700 dark:text-slate-200">
                        <MoneyValue cents={a.initial_balance_cents} />
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${a.is_hidden ? 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'}`}>
                          {a.is_hidden ? 'Oculta' : 'Ativa'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-1">
                          <button onClick={() => openEdit(a)} className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                          </button>
                          <button onClick={() => confirm(`Excluir ${a.name}?`) && deleteMut.mutate(String(a.id))} className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={page} totalPages={data?.total_pages ?? 1} perPage={perPage} total={data?.total ?? 0} onPageChange={setPage} onPerPageChange={p => { setPerPage(p); setPage(1) }} />
          </>
        }
      </Card>
    </div>
  )
}
