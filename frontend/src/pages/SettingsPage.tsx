import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { settingsApi, type UserSettings } from '@/api/settings'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'

const SESSION_OPTIONS = [
  { value: 30,   label: '30 minutos' },
  { value: 60,   label: '1 hora' },
  { value: 120,  label: '2 horas' },
  { value: 240,  label: '4 horas' },
  { value: 480,  label: '8 horas (padrão)' },
  { value: 720,  label: '12 horas' },
  { value: 1440, label: '24 horas' },
  { value: 4320, label: '3 dias' },
  { value: 10080,label: '7 dias' },
]

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
  const qc = useQueryClient()
  const [form, setForm] = useState<UserSettings>({
    session_lifetime: 480,
    primary_color: '#1B4F8A',
    sidebar_color_from: '#0f172a',
    sidebar_color_to: '#1e293b',
  })
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const [customColors, setCustomColors] = useState(false)

  const { data } = useQuery({
    queryKey: ['settings'],
    queryFn: () => settingsApi.get().then(r => r.data.data),
  })

  useEffect(() => {
    if (data) setForm(data)
  }, [data])

  const saveMut = useMutation({
    mutationFn: (values: Partial<UserSettings>) => settingsApi.update(values),
    onSuccess: (res) => {
      setMsg({ type: 'success', text: 'Configurações salvas! Recarregue para ver as cores aplicadas.' })
      qc.setQueryData(['settings'], res.data.data)
      // Aplica as cores no CSS imediatamente
      applyColors(form.primary_color, form.sidebar_color_from, form.sidebar_color_to)
    },
    onError: () => setMsg({ type: 'error', text: 'Erro ao salvar.' }),
  })

  const applyColors = (primary: string, from: string, to: string) => {
    document.documentElement.style.setProperty('--color-primary', primary)
    document.documentElement.style.setProperty('--sidebar-from', from)
    document.documentElement.style.setProperty('--sidebar-to', to)
  }

  const applyPreset = (preset: typeof COLOR_PRESETS[0]) => {
    setForm(f => ({ ...f, primary_color: preset.primary, sidebar_color_from: preset.from, sidebar_color_to: preset.to }))
    setCustomColors(false)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Sessão */}
      <Card title="Tempo de Sessão" subtitle="Por quanto tempo sua sessão fica ativa após o login.">
        <div className="px-8 py-6 space-y-4">
          {msg && <Alert type={msg.type} message={msg.text} />}

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {SESSION_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setForm(f => ({ ...f, session_lifetime: opt.value }))}
                className={`px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all text-left ${
                  form.session_lifetime === opt.value
                    ? 'border-[#1B4F8A] bg-blue-50 dark:bg-blue-900/20 text-[#1B4F8A] dark:text-blue-400'
                    : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-500'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <p className="text-xs text-slate-400 dark:text-slate-500">
            A sessão expira após {SESSION_OPTIONS.find(o => o.value === form.session_lifetime)?.label ?? form.session_lifetime + ' min'} de inatividade.
            Esta configuração é aplicada na próxima vez que você fizer login.
          </p>
        </div>
      </Card>

      {/* Cor do sistema */}
      <Card title="Personalização de Cores" subtitle="Escolha o visual do sistema.">
        <div className="px-8 py-6 space-y-5">

          {/* Presets */}
          <div>
            <p className="text-sm font-medium text-slate-600 dark:text-slate-400 mb-3">Temas prontos</p>
            <div className="grid grid-cols-2 gap-3">
              {COLOR_PRESETS.map(preset => (
                <button
                  key={preset.label}
                  onClick={() => applyPreset(preset)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 text-sm font-medium transition-all text-left ${
                    form.primary_color === preset.primary && !customColors
                      ? 'border-[#1B4F8A] bg-blue-50 dark:bg-blue-900/20'
                      : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
                  }`}
                >
                  {/* Preview da cor */}
                  <div className="flex gap-1 flex-shrink-0">
                    <span className="w-4 h-8 rounded-l" style={{ background: preset.from }} />
                    <span className="w-4 h-8" style={{ background: preset.to }} />
                    <span className="w-4 h-8 rounded-r" style={{ background: preset.primary }} />
                  </div>
                  <span className="text-slate-600 dark:text-slate-300 text-xs leading-tight">{preset.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Cores customizadas */}
          <div>
            <button
              onClick={() => setCustomColors(v => !v)}
              className="flex items-center gap-2 text-sm text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
              </svg>
              {customColors ? 'Ocultar' : 'Cores personalizadas'}
            </button>

            {customColors && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { key: 'primary_color' as keyof UserSettings, label: 'Cor principal' },
                  { key: 'sidebar_color_from' as keyof UserSettings, label: 'Sidebar topo' },
                  { key: 'sidebar_color_to' as keyof UserSettings, label: 'Sidebar base' },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-2">{label}</label>
                    <div className="flex items-center gap-3">
                      <input
                        type="color"
                        value={String(form[key])}
                        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                        className="h-10 w-12 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700 p-1 cursor-pointer"
                      />
                      <span className="text-xs text-slate-400 font-mono">{String(form[key])}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Preview */}
          <div className="rounded-xl overflow-hidden border border-slate-200 dark:border-slate-600 h-16 flex">
            <div className="w-16 flex-shrink-0" style={{ background: `linear-gradient(to bottom, ${form.sidebar_color_from}, ${form.sidebar_color_to})` }} />
            <div className="flex-1 flex items-center px-4" style={{ background: form.primary_color + '15' }}>
              <div className="w-5 h-5 rounded-full mr-3 flex-shrink-0" style={{ background: form.primary_color }} />
              <div>
                <div className="h-2 rounded w-24" style={{ background: form.primary_color }} />
                <div className="h-1.5 rounded w-16 mt-1.5 opacity-40" style={{ background: form.primary_color }} />
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Salvar */}
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
