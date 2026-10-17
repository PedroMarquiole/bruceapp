import { useState } from 'react'
import { useNavigate } from 'react-router'
import { Button } from '../ui/Button'
import { Segmented, TextField } from '../ui/Form'
import { useSaveGoal, useUpdateProfile } from '../features/profile/queries'
import { db } from '../lib/db'
import { localDayKey } from '../lib/date'

const OBJETIVOS = [
  { value: 'forca', label: 'Ganhar força' },
  { value: 'condicionamento', label: 'Condicionamento' },
  { value: 'composicao', label: 'Composição corporal' },
  { value: 'saude', label: 'Saúde e rotina' },
] as const
const EXPERIENCIA = [
  { value: 'iniciante', label: 'Começando' },
  { value: 'intermediario', label: 'Alguns anos' },
  { value: 'avancado', label: 'Muita experiência' },
] as const
const SIM_NAO = [
  { value: 'sim', label: 'Sim, mostrar' },
  { value: 'nao', label: 'Não, só registrar' },
] as const

type Objetivo = (typeof OBJETIVOS)[number]['value']
type Experiencia = (typeof EXPERIENCIA)[number]['value']

const STEPS = 3

/** Primeira configuração: só o necessário. Tudo pode ser mudado depois no Perfil. */
export function BoasVindas() {
  const navigate = useNavigate()
  const update = useUpdateProfile()
  const saveGoal = useSaveGoal()
  const [step, setStep] = useState(0)
  const [name, setName] = useState('')
  const [objetivo, setObjetivo] = useState<Objetivo | null>(null)
  const [experiencia, setExperiencia] = useState<Experiencia | null>(null)
  const [peso, setPeso] = useState('')
  const [calorias, setCalorias] = useState<'sim' | 'nao' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  async function finish() {
    setBusy(true)
    setError(null)
    try {
      const pesoNum = Number(peso.replace(',', '.'))
      if (peso.trim() && !(pesoNum > 20 && pesoNum < 400)) {
        setBusy(false)
        return setError('Peso entre 20 e 400 kg, ou deixe em branco.')
      }
      if (peso.trim()) {
        const { error: e } = await db()
          .from('body_measurements')
          .insert({
            kind: 'peso',
            value: pesoNum,
            unit: 'kg',
            measured_on: localDayKey(new Date()),
          })
        if (e) throw new Error(e.message)
      }
      if (objetivo) {
        await saveGoal.mutateAsync({
          kind: objetivo === 'forca' ? 'forca' : objetivo === 'composicao' ? 'peso' : 'outro',
          title: OBJETIVOS.find((o) => o.value === objetivo)?.label ?? 'Objetivo',
        })
      }
      await update.mutateAsync({
        display_name: name.trim().slice(0, 60) || null,
        track_calories: calorias === 'sim',
        settings: { objetivo, experiencia },
        onboarded_at: new Date().toISOString(),
      })
      navigate('/', { replace: true })
    } catch {
      setError('Não foi possível salvar. Confira a internet e tente de novo.')
      setBusy(false)
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col px-5 safe-top">
      <main className="flex flex-1 flex-col pt-10 pb-12">
        <p className="text-small text-ink-muted tabular-nums" aria-live="polite">
          Passo {step + 1} de {STEPS}
        </p>
        <div aria-hidden className="mt-2 flex gap-1.5">
          {Array.from({ length: STEPS }, (_, i) => (
            <span
              key={i}
              className={`h-0.5 flex-1 rounded-full ${i <= step ? 'bg-signal' : 'bg-line'}`}
            />
          ))}
        </div>

        {step === 0 ? (
          <section className="mt-10 space-y-6">
            <h1 className="type-headline">Bem-vindo ao Bruceapp</h1>
            <p className="text-ink-muted">
              Três perguntas rápidas. Pode pular qualquer uma e mudar depois no Perfil.
            </p>
            <TextField
              label="Como quer ser chamado? (opcional)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              autoComplete="given-name"
            />
          </section>
        ) : null}

        {step === 1 ? (
          <section className="mt-10 space-y-6">
            <h1 className="type-headline">Seu foco</h1>
            <Segmented
              label="Objetivo principal"
              options={OBJETIVOS}
              value={objetivo}
              onChange={setObjetivo}
            />
            <Segmented
              label="Experiência com treino"
              options={EXPERIENCIA}
              value={experiencia}
              onChange={setExperiencia}
            />
            <TextField
              label="Peso atual em kg (opcional)"
              inputMode="decimal"
              value={peso}
              onChange={(e) => setPeso(e.target.value)}
              hint="Vira o primeiro ponto do seu gráfico de evolução."
            />
          </section>
        ) : null}

        {step === 2 ? (
          <section className="mt-10 space-y-6">
            <h1 className="type-headline">Alimentação</h1>
            <Segmented
              label="Quer ver calorias e macronutrientes?"
              options={SIM_NAO}
              value={calorias}
              onChange={setCalorias}
            />
            <p className="text-small text-ink-muted">
              Com &quot;só registrar&quot;, o diário guarda o que você comeu sem mostrar números. Dá
              para mudar a qualquer momento.
            </p>
          </section>
        ) : null}

        {error ? (
          <p role="alert" className="mt-4 text-small text-danger">
            {error}
          </p>
        ) : null}

        <div className="mt-auto flex gap-3 pt-10">
          {step > 0 ? (
            <Button variant="secondary" onClick={() => setStep(step - 1)}>
              Voltar
            </Button>
          ) : null}
          {step < STEPS - 1 ? (
            <Button className="flex-1" onClick={() => setStep(step + 1)}>
              Continuar
            </Button>
          ) : (
            <Button className="flex-1" busy={busy} onClick={() => void finish()}>
              Começar
            </Button>
          )}
        </div>
      </main>
    </div>
  )
}
