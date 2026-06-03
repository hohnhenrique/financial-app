import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { personalApi, type PersonalTask } from '@/api/personal'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/context/ToastContext'

const CATEGORIES = [{ value: 'pessoal', label: 'Pessoal' },{ value: 'trabalho', label: 'Trabalho' },{ value: 'saude', label: 'Saúde' },{ value: 'financas', label: 'Finanças' },{ value: 'outros', label: 'Outros' }]
const COLUMNS: { id: string; label: string; color: string; icon: string }[] = [
  { id: 'todo',        label: 'A Fazer',      color: '#64748b', icon: '○' },
  { id: 'in_progress', label: 'Em Progresso', color: '#f59e0b', icon: '◐' },
  { id: 'done',        label: 'Concluído',    color: '#10b981', icon: '●' },
]
const EMPTY = { title: '', description: '', category: 'pessoal', status: 'todo', priority_id: '', due_date: '', color: '#6366f1', tags: '' }

export function PersonalTasksPage() {
  const qc    = useQueryClient()
  const toast = useToast()
  const [form, setForm]     = useState<Partial<PersonalTask>>(EMPTY)
  const [editing, setEditing] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [quickTitle, setQuickTitle] = useState('')
  const [quickStatus, setQuickStatus] = useState('todo')

  const { data: tasks }      = useQuery({ queryKey: ['personal-tasks'], queryFn: () => personalApi.tasks.list().then(r => r.data.data) })
  const { data: priorities } = useQuery({ queryKey: ['priorities'],     queryFn: () => personalApi.priorities().then(r => r.data.data) })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['personal-tasks'] })
  const priorityOptions = (priorities ?? []).map(p => ({ value: p.id, label: p.label }))
  const set = (patch: Partial<PersonalTask>) => setForm(f => ({ ...f, ...patch }))

  const createMut       = useMutation({ mutationFn: () => personalApi.tasks.create(form), onSuccess: () => { invalidate(); setForm(EMPTY); setShowForm(false); toast.success('Tarefa criada!') } })
  const quickCreateMut  = useMutation({ mutationFn: (data: Partial<PersonalTask>) => personalApi.tasks.create(data), onSuccess: () => { invalidate(); setQuickTitle(''); toast.success('Tarefa criada!') } })
  const updateMut       = useMutation({ mutationFn: () => personalApi.tasks.update(editing!, form), onSuccess: () => { invalidate(); setEditing(null); setShowForm(false); setForm(EMPTY); toast.success('Tarefa atualizada!') } })
  const statusMut       = useMutation({ mutationFn: ({ id, status }: { id: string; status: string }) => personalApi.tasks.updateStatus(id, status), onSuccess: invalidate })
  const deleteMut       = useMutation({ mutationFn: personalApi.tasks.delete, onSuccess: () => { invalidate(); toast.success('Tarefa removida.') } })

  const openEdit = (t: PersonalTask) => { setEditing(t.id); setForm(t); setShowForm(true) }

  const byStatus = (status: string) => (tasks ?? []).filter(t => t.status === status)

  const isOverdue = (t: PersonalTask) => t.due_date && t.status !== 'done' && new Date(t.due_date) < new Date()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">Tarefas</h1>
          <p className="text-sm text-slate-400 mt-0.5">Organize o que precisa ser feito</p>
        </div>
        <Button size="sm" onClick={() => { setShowForm(v => !v); setEditing(null); setForm(EMPTY) }}>
          {showForm ? '× Fechar' : '+ Nova Tarefa'}
        </Button>
      </div>

      {/* Form completo */}
      {showForm && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-6 shadow-sm">
          <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-4">{editing ? 'Editar Tarefa' : 'Nova Tarefa'}</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Título" value={form.title ?? ''} onChange={e => set({ title: e.target.value })} placeholder="O que precisa ser feito?" required />
            <Select label="Categoria" options={CATEGORIES} value={form.category ?? 'pessoal'} onChange={e => set({ category: e.target.value })} />
            <Select label="Prioridade" options={priorityOptions} value={form.priority_id ?? ''} onChange={e => set({ priority_id: e.target.value })} placeholder="Selecione..." />
            <Input label="Prazo" type="date" value={form.due_date ?? ''} onChange={e => set({ due_date: e.target.value })} />
            {editing && (
              <Select label="Status" options={COLUMNS.map(c => ({ value: c.id, label: c.label }))} value={form.status ?? 'todo'} onChange={e => set({ status: e.target.value })} />
            )}
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">Cor</label>
              <div className="flex gap-2">
                {['#6366f1','#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899'].map(c => (
                  <button key={c} onClick={() => set({ color: c })}
                    className={`w-8 h-8 rounded-lg transition-all ${form.color === c ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : ''}`}
                    style={{ background: c }} />
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            {editing && <Button variant="secondary" onClick={() => { setEditing(null); setForm(EMPTY); setShowForm(false) }} className="flex-1">Cancelar</Button>}
            <Button onClick={() => editing ? updateMut.mutate() : createMut.mutate()} loading={createMut.isPending || updateMut.isPending} className="flex-1">
              {editing ? 'Salvar' : 'Criar Tarefa'}
            </Button>
          </div>
        </div>
      )}

      {/* Kanban */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {COLUMNS.map(col => (
          <div key={col.id} className="bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden">
            {/* Header da coluna */}
            <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-lg" style={{ color: col.color }}>{col.icon}</span>
                <h3 className="font-semibold text-slate-700 dark:text-slate-200 text-sm">{col.label}</h3>
                <span className="bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-xs font-bold px-2 py-0.5 rounded-full">
                  {byStatus(col.id).length}
                </span>
              </div>
            </div>

            {/* Quick add em "A Fazer" */}
            {col.id === 'todo' && (
              <div className="px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                <div className="flex gap-2">
                  <input
                    value={quickTitle}
                    onChange={e => setQuickTitle(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && quickTitle.trim()) {
                        quickCreateMut.mutate({ title: quickTitle.trim(), status: 'todo', category: 'pessoal' })
                      }
                    }}
                    placeholder="Adicionar tarefa rápida..."
                    className="flex-1 px-3 py-2 text-xs border border-slate-200 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                  <button
                    onClick={() => quickTitle.trim() && quickCreateMut.mutate({ title: quickTitle.trim(), status: 'todo', category: 'pessoal' })}
                    className="px-2 py-1 rounded-lg text-white text-xs font-bold"
                    style={{ background: 'var(--color-primary)' }}>
                    +
                  </button>
                </div>
              </div>
            )}

            {/* Cards */}
            <div className="p-3 space-y-2 min-h-[200px]">
              {byStatus(col.id).map(t => (
                <div key={t.id}
                  className="bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 p-3.5 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
                >
                  {/* Barra de cor */}
                  <div className="w-full h-1 rounded-full mb-3" style={{ background: t.color }} />

                  {/* Título */}
                  <p className={`text-sm font-medium text-slate-700 dark:text-slate-200 mb-2 ${t.status === 'done' ? 'line-through opacity-60' : ''}`}>
                    {t.title}
                  </p>

                  {/* Meta info */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {t.priority_label && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                            style={{ background: (t.priority_color ?? '#94a3b8') + '22', color: t.priority_color ?? '#94a3b8' }}>
                        {t.priority_label}
                      </span>
                    )}
                    <span className="text-[10px] bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 px-1.5 py-0.5 rounded-full">
                      {CATEGORIES.find(c => c.value === t.category)?.label}
                    </span>
                    {t.due_date && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${isOverdue(t) ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400'}`}>
                        📅 {new Date(t.due_date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                      </span>
                    )}
                  </div>

                  {/* Ações */}
                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-50 dark:border-slate-700/50">
                    {/* Mover status */}
                    <div className="flex gap-1">
                      {COLUMNS.filter(c => c.id !== t.status).map(c => (
                        <button key={c.id} onClick={() => statusMut.mutate({ id: t.id, status: c.id })}
                          title={`Mover para ${c.label}`}
                          className="text-[10px] px-2 py-0.5 rounded-lg border border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400 hover:border-slate-300 transition-all">
                          → {c.label}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(t)} className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                      </button>
                      <button onClick={() => confirm('Excluir?') && deleteMut.mutate(t.id)} className="p-1 text-slate-400 hover:text-red-500 rounded">
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {byStatus(col.id).length === 0 && (
                <div className="text-center py-8 text-slate-300 dark:text-slate-600 text-xs">
                  Nenhuma tarefa
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
