import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { personalApi, type PersonalGoal } from '@/api/personal'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/context/ToastContext'

const CATEGORIES = [
  { value: 'saude',        label: '🏃 Saúde' },
  { value: 'financas',     label: '💰 Finanças' },
  { value: 'educacao',     label: '📚 Educação' },
  { value: 'carreira',     label: '💼 Carreira' },
  { value: 'relacionamentos', label: '❤️ Relacionamentos' },
  { value: 'lazer',        label: '🎮 Lazer' },
  { value: 'outros',       label: '⭐ Outros' },
]

const UNITS   = [{ value: '%', label: '%' },{ value: 'kg', label: 'kg' },{ value: 'R$', label: 'R$' },{ value: 'km', label: 'km' },{ value: 'horas', label: 'horas' },{ value: 'vezes', label: 'vezes' },{ value: 'páginas', label: 'páginas' },{ value: 'dias', label: 'dias' }]
const STATUSES = [{ value: 'active', label: 'Ativa' },{ value: 'completed', label: 'Concluída' },{ value: 'paused', label: 'Pausada' },{ value: 'abandoned', label: 'Abandonada' }]
const STATUS_COLORS: Record<string,string> = { active: 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400', completed: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400', paused: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400', abandoned: 'bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400' }

const EMPTY = { title: '', description: '', category: 'outros', priority_id: '', target_value: 100, current_value: 0, unit: '%', color: '#3b82f6', icon: 'target', deadline: '', status: 'active' }

export function PersonalGoalsPage() {
  const qc    = useQueryClient()
  const toast = useToast()
  const [form, setForm] = useState<Partial<PersonalGoal>>(EMPTY)
  const [editing, setEditing] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState('')

  const { data: goals }      = useQuery({ queryKey: ['personal-goals', filterStatus], queryFn: () => personalApi.goals.list(filterStatus || undefined).then(r => r.data.data) })
  const { data: priorities } = useQuery({ queryKey: ['priorities'], queryFn: () => personalApi.priorities().then(r => r.data.data) })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['personal-goals'] })
  const priorityOptions = (priorities ?? []).map(p => ({ value: p.id, label: p.label }))

  const createMut = useMutation({ mutationFn: () => personalApi.goals.create(form), onSuccess: () => { invalidate(); setForm(EMPTY); toast.success('Meta criada!') }, onError: () => toast.error('Erro ao criar meta.') })
  const updateMut = useMutation({ mutationFn: () => personalApi.goals.update(editing!, form), onSuccess: () => { invalidate(); setEditing(null); setForm(EMPTY); toast.success('Meta atualizada!') }, onError: () => toast.error('Erro ao atualizar.') })
  const deleteMut = useMutation({ mutationFn: personalApi.goals.delete, onSuccess: () => { invalidate(); toast.success('Meta removida.') } })

  const openEdit = (g: PersonalGoal) => { setEditing(g.id); setForm(g) }
  const pct = (g: PersonalGoal) => g.target_value > 0 ? Math.min(100, Math.round((g.current_value / g.target_value) * 100)) : 0

  const set = (patch: Partial<PersonalGoal>) => setForm(f => ({ ...f, ...patch }))

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">Metas Pessoais</h1>
          <p className="text-sm text-slate-400 mt-0.5">Acompanhe seu progresso rumo aos seus objetivos</p>
        </div>
        <div className="flex gap-2">
          {['', 'active', 'completed', 'paused'].map(s => (
            <button key={s} onClick={() => setFilterStatus(s)}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${filterStatus === s ? 'text-white border-transparent' : 'border-slate-200 dark:border-slate-600 text-slate-500 dark:text-slate-400'}`}
              style={filterStatus === s ? { backgroundColor: 'var(--color-primary)', borderColor: 'var(--color-primary)' } : undefined}>
              {{ '': 'Todas', active: 'Ativas', completed: 'Concluídas', paused: 'Pausadas' }[s]}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[380px_1fr] gap-6">
        {/* Form */}
        <Card title={editing ? 'Editar Meta' : 'Nova Meta'} padding>
          <div className="space-y-4">
            <Input label="Título" value={form.title ?? ''} onChange={e => set({ title: e.target.value })} placeholder="Ex: Correr 5km, Economizar R$10k" required />
            <Select label="Categoria" options={CATEGORIES} value={form.category ?? 'outros'} onChange={e => set({ category: e.target.value })} />
            <Select label="Prioridade" options={priorityOptions} value={form.priority_id ?? ''} onChange={e => set({ priority_id: e.target.value })} placeholder="Selecione..." />

            <div className="grid grid-cols-2 gap-3">
              <Input label="Meta" type="number" value={String(form.target_value ?? 100)} onChange={e => set({ target_value: +e.target.value })} />
              <Select label="Unidade" options={UNITS} value={form.unit ?? '%'} onChange={e => set({ unit: e.target.value })} />
            </div>

            <Input label="Progresso atual" type="number" value={String(form.current_value ?? 0)} onChange={e => set({ current_value: +e.target.value })} />
            <Input label="Prazo" type="date" value={form.deadline ?? ''} onChange={e => set({ deadline: e.target.value })} />

            {editing && <Select label="Status" options={STATUSES} value={form.status ?? 'active'} onChange={e => set({ status: e.target.value })} />}

            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">Cor</label>
              <div className="flex gap-2 flex-wrap">
                {['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4','#84cc16'].map(c => (
                  <button key={c} onClick={() => set({ color: c })}
                    className={`w-8 h-8 rounded-lg transition-all ${form.color === c ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : ''}`}
                    style={{ background: c }} />
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              {editing && <Button variant="secondary" onClick={() => { setEditing(null); setForm(EMPTY) }} className="flex-1">Cancelar</Button>}
              <Button onClick={() => editing ? updateMut.mutate() : createMut.mutate()} loading={createMut.isPending || updateMut.isPending} className="flex-1">
                {editing ? 'Salvar' : 'Criar Meta'}
              </Button>
            </div>
          </div>
        </Card>

        {/* Grid de metas */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 content-start">
          {(goals ?? []).length === 0
            ? <div className="col-span-2 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-12 text-center text-slate-400 text-sm">Nenhuma meta encontrada.</div>
            : (goals ?? []).map(g => {
                const p   = pct(g)
                const done = p >= 100 || g.status === 'completed'
                return (
                  <div key={g.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm hover:shadow-md transition-shadow">
                    {/* Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 text-lg" style={{ background: g.color + '22' }}>
                          {CATEGORIES.find(c => c.value === g.category)?.label?.split(' ')[0] ?? '⭐'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-700 dark:text-slate-200 truncate">{g.title}</p>
                          {g.priority_label && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: (g.priority_color ?? '#94a3b8') + '22', color: g.priority_color ?? '#94a3b8' }}>
                              {g.priority_label}
                            </span>
                          )}
                        </div>
                      </div>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ml-2 ${STATUS_COLORS[g.status] ?? ''}`}>
                        {STATUSES.find(s => s.value === g.status)?.label}
                      </span>
                    </div>

                    {/* Progress */}
                    <div className="mb-3">
                      <div className="flex justify-between text-xs text-slate-500 dark:text-slate-400 mb-1.5">
                        <span>{g.current_value} {g.unit} de {g.target_value} {g.unit}</span>
                        <span className="font-bold" style={{ color: done ? '#10b981' : g.color }}>{p}%</span>
                      </div>
                      <div className="h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${p}%`, background: done ? '#10b981' : g.color }} />
                      </div>
                    </div>

                    {/* Deadline */}
                    {g.deadline && (
                      <p className="text-xs text-slate-400 dark:text-slate-500 mb-3">
                        📅 Prazo: {new Date(g.deadline).toLocaleDateString('pt-BR')}
                      </p>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                      <Button variant="secondary" size="sm" onClick={() => openEdit(g)} className="flex-1">Editar</Button>
                      <button onClick={() => confirm('Excluir meta?') && deleteMut.mutate(g.id)}
                        className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      </button>
                    </div>
                  </div>
                )
              })
          }
        </div>
      </div>
    </div>
  )
}
