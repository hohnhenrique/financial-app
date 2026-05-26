import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { categoriesApi, type CategoryPayload } from '@/api/categories'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { Alert } from '@/components/ui/Alert'
import type { Category } from '@/types'

const TYPES = [{ value: 'expense', label: 'Despesa' }, { value: 'income', label: 'Receita' }, { value: 'both', label: 'Receita e Despesa' }]
const ICONS = [
  { value: 'circle', label: 'Círculo' }, { value: 'wallet', label: 'Carteira' }, { value: 'briefcase', label: 'Trabalho' },
  { value: 'trending-up', label: 'Investimentos' }, { value: 'home', label: 'Casa' }, { value: 'car', label: 'Transporte' },
  { value: 'heart', label: 'Saúde' }, { value: 'book', label: 'Educação' }, { value: 'tag', label: 'Etiqueta' },
  { value: 'fork-knife', label: 'Alimentação' }, { value: 'shirt', label: 'Roupas' }, { value: 'device-gamepad', label: 'Lazer' },
]

const EMPTY: CategoryPayload = { name: '', type: 'expense', color: '#1B4F8A', icon: 'circle' }

export function CategoriesPage() {
  const qc = useQueryClient()
  const [form, setForm] = useState<CategoryPayload>(EMPTY)
  const [editing, setEditing] = useState<Category | null>(null)
  const [error, setError] = useState('')

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: () => categoriesApi.list().then(r => r.data.data) })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['categories'] })
  const createMut = useMutation({ mutationFn: categoriesApi.create, onSuccess: () => { invalidate(); setForm(EMPTY) } })
  const updateMut = useMutation({ mutationFn: ({ id, data }: { id: string; data: CategoryPayload }) => categoriesApi.update(id, data), onSuccess: () => { invalidate(); setEditing(null); setForm(EMPTY) } })
  const deleteMut = useMutation({ mutationFn: categoriesApi.delete, onSuccess: invalidate })

  const openEdit = (c: Category) => {
    setEditing(c)
    setForm({ name: c.name, type: c.type, color: c.color, icon: c.icon })
  }

  const handleSubmit = async () => {
    setError('')
    try {
      if (editing) await updateMut.mutateAsync({ id: String(editing.id), data: form })
      else await createMut.mutateAsync(form)
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Erro ao salvar.')
    }
  }

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6">
      <Card title={editing ? 'Editar Categoria' : 'Nova Categoria'} subtitle="Organize receitas e despesas.">
        <div className="px-6 pb-6 space-y-5">
          {error && <Alert type="error" message={error} />}
          <Input label="Nome" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Mercado, Aluguel" required />
          <Select label="Tipo" options={TYPES} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))} required />
          <Select label="Ícone" options={ICONS} value={form.icon ?? 'circle'} onChange={e => setForm(f => ({ ...f, icon: e.target.value }))} required />
          <div>
            <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">Cor</label>
            <input type="color" value={form.color ?? '#1B4F8A'} onChange={e => setForm(f => ({ ...f, color: e.target.value }))}
              className="h-11 w-14 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 p-1 cursor-pointer" />
          </div>
          <div className="flex gap-3">
            {editing && <Button variant="secondary" onClick={() => { setEditing(null); setForm(EMPTY) }} className="flex-1">Cancelar</Button>}
            <Button onClick={handleSubmit} loading={createMut.isPending || updateMut.isPending} className="flex-1">
              {editing ? 'Salvar alterações' : 'Salvar Categoria'}
            </Button>
          </div>
        </div>
      </Card>

      <Card title="Categorias Cadastradas">
        {(categories ?? []).length === 0
          ? <div className="px-6 py-16 text-center text-slate-400 text-sm">Nenhuma categoria.</div>
          : <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-slate-50 dark:bg-slate-700/50 border-b border-slate-100 dark:border-slate-700">
                  {['Categoria','Tipo','Origem','Status','Ações'].map(h => <th key={h} className="px-6 py-3 text-slate-500 dark:text-slate-400 font-medium text-left">{h}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700">
                  {(categories ?? []).map(c => (
                    <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: c.color }} />
                          <span className="font-medium text-slate-700 dark:text-slate-200">{c.name}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{TYPES.find(t => t.value === c.type)?.label}</td>
                      <td className="px-6 py-4 text-slate-500 dark:text-slate-400">{c.is_global ? 'Padrão' : 'Minha'}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${c.is_archived ? 'bg-slate-100 dark:bg-slate-700 text-slate-500' : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400'}`}>
                          {c.is_archived ? 'Arquivada' : 'Ativa'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {!c.is_global && (
                          <div className="flex items-center gap-1">
                            <button onClick={() => openEdit(c)} className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                            </button>
                            <button onClick={() => confirm(`Excluir ${c.name}?`) && deleteMut.mutate(String(c.id))} className="p-1.5 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        }
      </Card>
    </div>
  )
}
