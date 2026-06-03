import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { personalApi, type PersonalHabit } from '@/api/personal'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select } from '@/components/ui/Select'
import { useToast } from '@/context/ToastContext'

const CATEGORIES = [{ value: 'saude', label: '🏃 Saúde' },{ value: 'produtividade', label: '⚡ Produtividade' },{ value: 'bem-estar', label: '🧘 Bem-estar' },{ value: 'aprendizado', label: '📚 Aprendizado' },{ value: 'outros', label: '⭐ Outros' }]
const FREQUENCIES = [{ value: 'daily', label: 'Diário' },{ value: 'weekly', label: 'Semanal' },{ value: 'monthly', label: 'Mensal' }]
const EMPTY = { title: '', description: '', category: 'saude', frequency: 'daily', target_count: 1, color: '#10b981', priority_id: '' }

function todayISO() { return new Date().toISOString().split('T')[0] }

// Últimos 7 dias
function last7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    return d.toISOString().split('T')[0]
  })
}

export function PersonalHabitsPage() {
  const qc    = useQueryClient()
  const toast = useToast()
  const [form, setForm]   = useState<Partial<PersonalHabit>>(EMPTY)
  const [editing, setEditing] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  const { data: habits }     = useQuery({ queryKey: ['personal-habits'], queryFn: () => personalApi.habits.list().then(r => r.data.data) })
  const { data: priorities } = useQuery({ queryKey: ['priorities'], queryFn: () => personalApi.priorities().then(r => r.data.data) })

  const invalidate = () => qc.invalidateQueries({ queryKey: ['personal-habits'] })
  const priorityOptions = (priorities ?? []).map(p => ({ value: p.id, label: p.label }))
  const set = (patch: Partial<PersonalHabit>) => setForm(f => ({ ...f, ...patch }))

  const createMut = useMutation({ mutationFn: () => personalApi.habits.create(form), onSuccess: () => { invalidate(); setForm(EMPTY); setShowForm(false); toast.success('Hábito criado!') } })
  const updateMut = useMutation({ mutationFn: () => personalApi.habits.update(editing!, form), onSuccess: () => { invalidate(); setEditing(null); setShowForm(false); setForm(EMPTY); toast.success('Hábito atualizado!') } })
  const deleteMut = useMutation({ mutationFn: personalApi.habits.delete, onSuccess: () => { invalidate(); toast.success('Hábito removido.') } })
  const logMut    = useMutation({
    mutationFn: ({ id, date }: { id: string; date: string }) => personalApi.habits.log(id, date),
    onSuccess: (res) => {
      invalidate()
      toast.success(res.data.data?.logged ? '✅ Hábito concluído!' : '↩️ Registro removido.')
    },
  })

  const openEdit = (h: PersonalHabit) => { setEditing(h.id); setForm(h); setShowForm(true) }
  const days = last7Days()
  const dayLabels = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">Hábitos</h1>
          <p className="text-sm text-slate-400 mt-0.5">Construa uma rotina consistente, um dia de cada vez</p>
        </div>
        <Button onClick={() => { setShowForm(v => !v); setEditing(null); setForm(EMPTY) }} size="sm">
          {showForm ? '× Fechar' : '+ Novo Hábito'}
        </Button>
      </div>

      {/* Form */}
      {showForm && (
        <Card title={editing ? 'Editar Hábito' : 'Novo Hábito'} padding>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input label="Título" value={form.title ?? ''} onChange={e => set({ title: e.target.value })} placeholder="Ex: Beber 2L de água" required />
            <Select label="Categoria" options={CATEGORIES} value={form.category ?? 'saude'} onChange={e => set({ category: e.target.value })} />
            <Select label="Frequência" options={FREQUENCIES} value={form.frequency ?? 'daily'} onChange={e => set({ frequency: e.target.value })} />
            <Input label="Meta por dia" type="number" value={String(form.target_count ?? 1)} onChange={e => set({ target_count: +e.target.value })} />
            <Select label="Prioridade" options={priorityOptions} value={form.priority_id ?? ''} onChange={e => set({ priority_id: e.target.value })} placeholder="Selecione..." />
            <div>
              <label className="block text-sm font-medium text-slate-600 dark:text-slate-400 mb-1.5">Cor</label>
              <div className="flex gap-2">
                {['#10b981','#3b82f6','#f59e0b','#ef4444','#8b5cf6','#ec4899','#06b6d4'].map(c => (
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
              {editing ? 'Salvar' : 'Criar Hábito'}
            </Button>
          </div>
        </Card>
      )}

      {/* Lista de hábitos */}
      {(habits ?? []).length === 0
        ? <Card><div className="p-12 text-center text-slate-400 text-sm">Nenhum hábito criado ainda.</div></Card>
        : <div className="space-y-4">
            {(habits ?? []).map(h => {
              const todayLogged = h.today_count !== null && h.today_count > 0
              const weekLogs    = h.week_logs ?? []
              const logMap      = Object.fromEntries(weekLogs.map(l => [l.date, l.count]))

              return (
                <div key={h.id} className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 p-5 shadow-sm">
                  <div className="flex items-start gap-4">
                    {/* Botão de check */}
                    <button
                      onClick={() => logMut.mutate({ id: h.id, date: todayISO() })}
                      className={`w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all ${
                        todayLogged ? 'text-white shadow-lg' : 'border-2 border-dashed'
                      }`}
                      style={todayLogged
                        ? { background: h.color }
                        : { borderColor: h.color + '88', color: h.color }
                      }
                    >
                      {todayLogged
                        ? <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/></svg>
                        : <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 13l4 4L19 7"/></svg>
                      }
                    </button>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-semibold text-slate-700 dark:text-slate-200">{h.title}</p>
                        {h.priority_label && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                                style={{ background: (h.priority_color ?? '#94a3b8') + '22', color: h.priority_color ?? '#94a3b8' }}>
                            {h.priority_label}
                          </span>
                        )}
                        <span className="text-xs text-slate-400 dark:text-slate-500">
                          {CATEGORIES.find(c => c.value === h.category)?.label?.split(' ')[0]}
                          {' · '}{FREQUENCIES.find(f => f.value === h.frequency)?.label}
                        </span>
                      </div>

                      {/* Streak + mini calendário */}
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex items-center gap-1">
                          <span className="text-lg">🔥</span>
                          <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{h.streak ?? 0}</span>
                          <span className="text-xs text-slate-400">dias</span>
                        </div>
                        <div className="flex gap-1">
                          {days.map((day, i) => {
                            const done = !!logMap[day]
                            const isToday = day === todayISO()
                            return (
                              <div key={day} className="text-center">
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-medium transition-all ${
                                  done ? 'text-white' : isToday ? 'border-2' : 'bg-slate-50 dark:bg-slate-700/50 text-slate-300 dark:text-slate-600'
                                }`}
                                  style={done ? { background: h.color } : isToday ? { borderColor: h.color, color: h.color } : undefined}>
                                  {done ? '✓' : new Date(day).getDate()}
                                </div>
                                <p className="text-[9px] text-slate-400 mt-0.5">{dayLabels[(new Date(day).getDay())]}</p>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    </div>

                    {/* Ações */}
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(h)} className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                      </button>
                      <button onClick={() => confirm('Excluir hábito?') && deleteMut.mutate(h.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
      }
    </div>
  )
}
