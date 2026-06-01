import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsApi, type UserSettings } from '@/api/settings'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { applyColors } from '@/hooks/useApplySettings'
import { useToast } from '@/context/ToastContext'

// ── Opções de sessão ─────────────────────────────────────────────────────────
const SESSION_OPTIONS = [
  { value: 30,    label: '30 minutos' },
  { value: 60,    label: '1 hora' },
  { value: 120,   label: '2 horas' },
  { value: 240,   label: '4 horas' },
  { value: 480,   label: '8 horas (padrão)' },
  { value: 720,   label: '12 horas' },
  { value: 1440,  label: '24 horas' },
  { value: 4320,  label: '3 dias' },
  { value: 10080, label: '7 dias' },
]

// ── Temas prontos ─────────────────────────────────────────────────────────────
const COLOR_PRESETS = [
  { label: 'Azul escuro (padrão)', primary: '#1B4F8A', from: '#0f172a', to: '#1e293b' },
  { label: 'Roxo profundo',        primary: '#7c3aed', from: '#1e1b4b', to: '#2e1065' },
  { label: 'Verde esmeralda',      primary: '#059669', from: '#022c22', to: '#064e3b' },
  { label: 'Vermelho rubi',        primary: '#dc2626', from: '#1c0a09', to: '#3b0f0f' },
  { label: 'Laranja vibrante',     primary: '#ea580c', from: '#1c1001', to: '#3b1a00' },
  { label: 'Cinza moderno',        primary: '#475569', from: '#0f172a', to: '#334155' },
  { label: 'Rosa elegante',        primary: '#db2777', from: '#1a0011', to: '#3b0024' },
  { label: 'Teal fresco',          primary: '#0891b2', from: '#042026', to: '#0e3a46' },
]

export function SettingsPage() {
  const qc    = useQueryClient()
  const toast = useToast()

  const [form, setForm] = useState<UserSettings>({
    session_lifetime:   480,
    primary_color:      '#1B4F8A',
    sidebar_color_from: '#0f172a',
    sidebar_color_to:   '#1e293b',
  })

  const [customColors, setCustomColors] = useState(false)

  // Carrega configurações salvas
  const { data, isLoading } = useQuery({
    queryKey: ['settings'],
    queryFn:  () => settingsApi.get().then(r => r.data.data),
  })

  // Preenche o form quando os dados chegam
  useEffect(() => {
    if (data) setForm(data)
  }, [data])

  const saveMut = useMutation({
    mutationFn: (values: Partial<UserSettings>) => settingsApi.update(values),
    onSuccess: (res) => {
      qc.setQueryData(['settings'], res.data.data)
      applyColors(form.primary_color, form.sidebar_color_from, form.sidebar_color_to)
      localStorage.setItem('session_lifetime', String(form.session_lifetime))
      toast.success('Configurações salvas com sucesso!')
    },
    onError: () => {
      toast.error('Erro ao salvar configurações. Tente novamente.')
    },
  })

  const applyPreset = (preset: typeof COLOR_PRESETS[0]) => {
    setForm(f => ({
      ...f,
      primary_color:      preset.primary,
      sidebar_color_from: preset.from,
      sidebar_color_to:   preset.to,
    }))
    setCustomColors(false)
    // Preview imediato ao selecionar o tema
    applyColors(preset.primary, preset.from, preset.to)
  }

  const handleColorChange = (key: keyof UserSettings, value: string) => {
    setForm(f => ({ ...f, [key]: value }))
    // Preview ao alterar cor customizada
    const updated = { ...form, [key]: value }
    applyColors(updated.primary_color, updated.sidebar_color_from, updated.sidebar_color_to)
  }

  if (isLoading) return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-7 h-7 border-4 border-t-transparent rounded-full"
             style={{ borderColor: 'var(--color-primary)', borderTopColor: 'transparent' }} />
      </div>
  )

  return (
      <div className="max-w-2xl mx-auto space-y-6">

        {/* ── Tempo de sessão ──────────────────────────────────────────────── */}
        <Card title="Tempo de Sessão" subtitle="Por quanto tempo sua sessão fica ativa após o login.">
          <div className="px-8 pb-6 pt-5 space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {SESSION_OPTIONS.map(opt => (
                  <button
                      key={opt.value}
                      onClick={() => setForm(f => ({ ...f, session_lifetime: opt.value }))}
                      className={`px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all text-left ${
                          form.session_lifetime === opt.value
                              ? 'text-white shadow-sm'
                              : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500 bg-white dark:bg-slate-800'
                      }`}
                      style={
                        form.session_lifetime === opt.value
                            ? { backgroundColor: 'var(--color-primary)', borderColor: 'var(--color-primary)' }
                            : undefined
                      }
                  >
                    {opt.label}
                  </button>
              ))}
            </div>

            <p className="text-xs text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-700/40 px-4 py-2.5 rounded-xl">
              ℹ️ Sessão expira após{' '}
              <strong>{SESSION_OPTIONS.find(o => o.value === form.session_lifetime)?.label ?? `${form.session_lifetime} min`}</strong>{' '}
              de inatividade. Aplicado no próximo login.
            </p>
          </div>
        </Card>

        {/* ── Personalização de cores ──────────────────────────────────────── */}
        <Card title="Personalização de Cores" subtitle="Escolha o tema visual do sistema.">
          <div className="px-8 pb-6 pt-5 space-y-6">

            {/* Temas prontos */}
            <div>
              <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">Temas prontos</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {COLOR_PRESETS.map(preset => {
                  const isActive =
                      form.primary_color      === preset.primary &&
                      form.sidebar_color_from === preset.from    &&
                      form.sidebar_color_to   === preset.to

                  return (
                      <button
                          key={preset.label}
                          onClick={() => applyPreset(preset)}
                          className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all text-left ${
                              isActive && !customColors
                                  ? 'border-2 shadow-sm'
                                  : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500 bg-white dark:bg-slate-800'
                          }`}
                          style={isActive && !customColors
                              ? { borderColor: 'var(--color-primary)', backgroundColor: 'var(--color-primary)10' }
                              : undefined
                          }
                      >
                        {/* Preview miniatura do tema */}
                        <div className="flex gap-0.5 flex-shrink-0 rounded overflow-hidden h-8 w-10">
                          <div className="w-4" style={{ background: preset.from }} />
                          <div className="w-3" style={{ background: preset.to }} />
                          <div className="w-3" style={{ background: preset.primary }} />
                        </div>
                        <span className="text-slate-600 dark:text-slate-300 text-xs leading-tight">
                      {preset.label}
                    </span>
                        {isActive && !customColors && (
                            <svg className="w-4 h-4 flex-shrink-0 ml-auto" style={{ color: 'var(--color-primary)' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7"/>
                            </svg>
                        )}
                      </button>
                  )
                })}
              </div>
            </div>

            {/* Cores customizadas */}
            <div>
              <button
                  onClick={() => setCustomColors(v => !v)}
                  className="flex items-center gap-2 text-sm font-medium hover:underline transition-colors"
                  style={{ color: 'var(--color-primary)' }}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01"/>
                </svg>
                {customColors ? 'Ocultar cores personalizadas' : 'Definir cores personalizadas'}
              </button>

              {customColors && (
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-5">
                    {([
                      { key: 'primary_color'      as keyof UserSettings, label: 'Cor principal',  hint: 'Botões e destaques' },
                      { key: 'sidebar_color_from' as keyof UserSettings, label: 'Sidebar — topo', hint: 'Cor de cima do menu' },
                      { key: 'sidebar_color_to'   as keyof UserSettings, label: 'Sidebar — base', hint: 'Cor de baixo do menu' },
                    ] as { key: keyof UserSettings; label: string; hint: string }[]).map(({ key, label, hint }) => (
                        <div key={key}>
                          <label className="block text-xs font-semibold text-slate-600 dark:text-slate-400 mb-1">{label}</label>
                          <p className="text-xs text-slate-400 dark:text-slate-500 mb-2">{hint}</p>
                          <div className="flex items-center gap-3">
                            <input
                                type="color"
                                value={String(form[key])}
                                onChange={e => handleColorChange(key, e.target.value)}
                                className="h-10 w-14 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 p-1 cursor-pointer"
                            />
                            <span className="text-xs text-slate-400 font-mono">{String(form[key])}</span>
                          </div>
                        </div>
                    ))}
                  </div>
              )}
            </div>

            {/* Preview do resultado */}
            <div>
              <p className="text-xs font-medium text-slate-500 dark:text-slate-400 mb-2 uppercase tracking-wide">
                Preview
              </p>
              <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-600 flex h-16">
                <div
                    className="w-16 flex-shrink-0"
                    style={{ background: `linear-gradient(to bottom, ${form.sidebar_color_from}, ${form.sidebar_color_to})` }}
                />
                <div className="flex-1 flex items-center px-4 bg-slate-50 dark:bg-slate-700/30">
                  <div
                      className="w-6 h-6 rounded-lg flex-shrink-0 mr-3"
                      style={{ backgroundColor: form.primary_color }}
                  />
                  <div className="flex-1">
                    <div className="h-2 rounded-full w-24 mb-1.5" style={{ backgroundColor: form.primary_color }} />
                    <div className="h-1.5 rounded-full w-16 opacity-40" style={{ backgroundColor: form.primary_color }} />
                  </div>
                  <div
                      className="px-3 py-1.5 rounded-lg text-white text-xs font-semibold"
                      style={{ backgroundColor: form.primary_color }}
                  >
                    Botão
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* ── Salvar ────────────────────────────────────────────────────────── */}
        <Button
            onClick={() => saveMut.mutate(form)}
            loading={saveMut.isPending}
            className="w-full"
            size="lg"
        >
          Salvar configurações
        </Button>

      </div>
  )
}