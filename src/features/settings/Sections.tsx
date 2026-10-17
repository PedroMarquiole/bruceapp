import { useEffect, useState, type FormEvent } from 'react'
import { Archive, Bell, BellOff, Download, KeyRound, Plus, Send, Trash2 } from 'lucide-react'
import { Section } from '../../ui/Screen'
import { Button } from '../../ui/Button'
import { Segmented, TextField } from '../../ui/Form'
import { Sheet } from '../../ui/Sheet'
import type { Goal } from '../../lib/db'
import { useGoals, useProfile, useSaveGoal, useUpdateProfile } from '../profile/queries'
import { useNutritionTarget, useSetNutritionTarget } from '../nutrition/queries'
import { useAiUsageMonth, useAiUsageToday } from '../progress/queries'
import { fmt } from '../nutrition/domain/nutrients'
import { db } from '../../lib/db'
import { useAuth } from '../auth/auth-context'
import { currentSubscription, disablePush, enablePush, pushSupport, sendTestPush } from './push'
import { clearPin, hasPin, isValidPin, setPin } from './pin'
import { collectExport, downloadJson } from './exportData'

function Feedback({ error, ok }: { error?: string | null; ok?: string | null }) {
  if (error)
    return (
      <p role="alert" className="mt-3 text-small text-danger">
        {error}
      </p>
    )
  if (ok)
    return (
      <p role="status" className="mt-3 text-small text-ok">
        {ok}
      </p>
    )
  return null
}

const num = (v: string): number | null => (v.trim() === '' ? null : Number(v.replace(',', '.')))

// Dados pessoais ---------------------------------------------------------------------------------

export function PersonalSection() {
  const profile = useProfile()
  const update = useUpdateProfile()
  const [name, setName] = useState('')
  const [ok, setOk] = useState<string | null>(null)

  // Preenche o campo quando o perfil chega (ajuste de estado durante a renderização).
  const [loaded, setLoaded] = useState<string | null | undefined>(undefined)
  if (profile.data && loaded !== profile.data.display_name) {
    setLoaded(profile.data.display_name)
    setName(profile.data.display_name ?? '')
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setOk(null)
    await update.mutateAsync({ display_name: name.trim() || null })
    setOk('Nome salvo.')
  }

  return (
    <Section title="Você">
      <form onSubmit={onSubmit} className="mt-3 space-y-4">
        <TextField
          label="Como quer ser chamado"
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
        />
        <Button type="submit" variant="secondary" busy={update.isPending} disabled={!profile.data}>
          Salvar nome
        </Button>
      </form>
      <Feedback error={update.isError ? 'Não foi possível salvar.' : null} ok={ok} />
    </Section>
  )
}

// Nutrição ---------------------------------------------------------------------------------------

export function NutritionSection() {
  const profile = useProfile()
  const update = useUpdateProfile()
  const target = useNutritionTarget()
  const setTarget = useSetNutritionTarget()
  const [form, setForm] = useState({ kcal: '', protein_g: '', carbs_g: '', fat_g: '' })
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const [loadedId, setLoadedId] = useState<string | null>(null)
  const t = target.data
  if (t && loadedId !== t.id) {
    setLoadedId(t.id)
    setForm({
      kcal: t.kcal?.toString() ?? '',
      protein_g: t.protein_g?.toString() ?? '',
      carbs_g: t.carbs_g?.toString() ?? '',
      fat_g: t.fat_g?.toString() ?? '',
    })
  }

  const track = profile.data?.track_calories ?? true

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setOk(null)
    const values = {
      kcal: num(form.kcal),
      protein_g: num(form.protein_g),
      carbs_g: num(form.carbs_g),
      fat_g: num(form.fat_g),
    }
    if (Object.values(values).some((v) => v !== null && (!Number.isFinite(v) || v < 0))) {
      setError('Use apenas números positivos.')
      return
    }
    if (values.kcal !== null && values.kcal < 1200) {
      setError('Metas abaixo de 1200 kcal não são aceitas aqui. Converse com um nutricionista.')
      return
    }
    try {
      await setTarget.mutateAsync(values)
      setOk('Meta salva. A anterior fica no histórico.')
    } catch {
      setError('Não foi possível salvar a meta.')
    }
  }

  const field = (key: keyof typeof form, label: string) => (
    <TextField
      label={label}
      inputMode="decimal"
      value={form[key]}
      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
    />
  )

  return (
    <Section title="Alimentação">
      <div className="mt-3">
        <Segmented
          label="Mostrar calorias"
          options={[
            { value: 'sim', label: 'Sim' },
            { value: 'nao', label: 'Só proteína e refeições' },
          ]}
          value={track ? 'sim' : 'nao'}
          onChange={(v) => void update.mutateAsync({ track_calories: v === 'sim' })}
        />
      </div>
      <form onSubmit={onSubmit} className="mt-5 grid grid-cols-2 gap-4">
        {field('kcal', 'Calorias (kcal)')}
        {field('protein_g', 'Proteína (g)')}
        {field('carbs_g', 'Carboidratos (g)')}
        {field('fat_g', 'Gorduras (g)')}
        <div className="col-span-2">
          <Button type="submit" variant="secondary" busy={setTarget.isPending}>
            Salvar meta diária
          </Button>
        </div>
      </form>
      <Feedback error={error} ok={ok} />
    </Section>
  )
}

// Metas ------------------------------------------------------------------------------------------

const GOAL_KINDS = [
  { value: 'peso', label: 'Peso' },
  { value: 'forca', label: 'Força' },
  { value: 'habito', label: 'Hábito' },
  { value: 'outro', label: 'Outra' },
] as const

export function GoalsSection() {
  const goals = useGoals()
  const save = useSaveGoal()
  const [open, setOpen] = useState(false)
  const [kind, setKind] = useState<Goal['kind']>('peso')
  const [title, setTitle] = useState('')
  const [target, setTarget] = useState('')
  const [unit, setUnit] = useState('kg')
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      setError('Dê um nome à meta.')
      return
    }
    const value = num(target)
    if (value !== null && !Number.isFinite(value)) {
      setError('Valor inválido.')
      return
    }
    try {
      await save.mutateAsync({
        kind,
        title: title.trim(),
        target_value: value,
        unit: unit.trim() || null,
      })
      setOpen(false)
      setTitle('')
      setTarget('')
      setError(null)
    } catch {
      setError('Não foi possível salvar a meta.')
    }
  }

  return (
    <Section
      title="Metas"
      aside={
        <Button
          variant="quiet"
          icon={<Plus aria-hidden className="size-4" />}
          onClick={() => setOpen(true)}
        >
          Nova meta
        </Button>
      }
    >
      {(goals.data ?? []).length === 0 ? (
        <p className="mt-2 text-ink-muted">Nenhuma meta ativa.</p>
      ) : (
        <ul className="mt-2 divide-y divide-line">
          {(goals.data ?? []).map((g) => (
            <li key={g.id} className="flex min-h-14 items-center gap-3">
              <span className="min-w-0 flex-1">
                <span className="block">{g.title}</span>
                {g.target_value !== null ? (
                  <span className="block text-small text-ink-muted tabular-nums">
                    Alvo {fmt(g.target_value)} {g.unit ?? ''}
                  </span>
                ) : null}
              </span>
              {g.status === 'ativa' ? (
                <Button
                  variant="quiet"
                  onClick={() =>
                    void save.mutateAsync({
                      id: g.id,
                      kind: g.kind,
                      title: g.title,
                      status: 'alcancada',
                    })
                  }
                >
                  Alcancei
                </Button>
              ) : (
                <span className="text-small text-ok">Alcançada</span>
              )}
              <button
                type="button"
                aria-label={`Arquivar ${g.title}`}
                onClick={() =>
                  void save.mutateAsync({
                    id: g.id,
                    kind: g.kind,
                    title: g.title,
                    status: 'arquivada',
                  })
                }
                className="grid size-11 place-items-center rounded-[var(--radius-control)] text-ink-muted hover:bg-graphite hover:text-ink"
              >
                <Archive aria-hidden className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      <Sheet open={open} title="Nova meta" onClose={() => setOpen(false)}>
        <form onSubmit={onSubmit} className="space-y-5 p-5">
          <h2 className="type-section">Nova meta</h2>
          <Segmented
            label="Tipo"
            options={GOAL_KINDS}
            value={kind as (typeof GOAL_KINDS)[number]['value']}
            onChange={setKind}
          />
          <TextField
            label="Meta"
            placeholder="Ex.: chegar a 78 kg"
            value={title}
            maxLength={80}
            onChange={(e) => setTitle(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-4">
            <TextField
              label="Valor alvo (opcional)"
              inputMode="decimal"
              value={target}
              onChange={(e) => setTarget(e.target.value)}
            />
            <TextField
              label="Unidade"
              value={unit}
              maxLength={12}
              onChange={(e) => setUnit(e.target.value)}
            />
          </div>
          <Feedback error={error} />
          <Button type="submit" className="w-full" busy={save.isPending}>
            Salvar meta
          </Button>
        </form>
      </Sheet>
    </Section>
  )
}

// Lembretes --------------------------------------------------------------------------------------

export function RemindersSection() {
  const profile = useProfile()
  const update = useUpdateProfile()
  const support = pushSupport()
  const [subscribed, setSubscribed] = useState<boolean | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)
  const settings = (profile.data?.settings ?? {}) as {
    lembretes_ativos?: boolean
    lembrete_treino?: string | null
  }
  const [time, setTime] = useState('')

  useEffect(() => {
    void currentSubscription().then((s) => setSubscribed(s !== null))
  }, [])
  const saved = settings.lembrete_treino ?? ''
  const [loadedTime, setLoadedTime] = useState<string | null>(null)
  if (profile.data && loadedTime !== saved) {
    setLoadedTime(saved)
    setTime(saved)
  }

  async function saveSettings(patch: Record<string, unknown>) {
    await update.mutateAsync({ settings: { ...(profile.data?.settings ?? {}), ...patch } })
  }

  async function run(fn: () => Promise<void>) {
    setBusy(true)
    setError(null)
    setOk(null)
    try {
      await fn()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Algo deu errado.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Section title="Lembretes">
      <p className="mt-2 max-w-prose text-small text-ink-muted">
        Avisos de hábitos no horário que você definiu em cada um, e do treino no horário abaixo. Só
        chegam neste aparelho depois de ativados.
      </p>
      {!support.ok ? (
        <p className="mt-3 max-w-prose text-small text-ink">{support.reason}</p>
      ) : subscribed && settings.lembretes_ativos ? (
        <div className="mt-4 flex flex-wrap gap-3">
          <Button
            variant="secondary"
            icon={<Send aria-hidden className="size-4" />}
            busy={busy}
            onClick={() =>
              run(async () => {
                const sent = await sendTestPush()
                setOk(
                  sent > 0
                    ? 'Teste enviado. Deve chegar em instantes.'
                    : 'Nenhum aparelho inscrito recebeu o teste.',
                )
              })
            }
          >
            Enviar teste
          </Button>
          <Button
            variant="quiet"
            icon={<BellOff aria-hidden className="size-4" />}
            disabled={busy}
            onClick={() =>
              run(async () => {
                await disablePush()
                await saveSettings({ lembretes_ativos: false })
                setSubscribed(false)
                setOk('Lembretes desativados.')
              })
            }
          >
            Desativar
          </Button>
        </div>
      ) : (
        <Button
          className="mt-4"
          variant="secondary"
          icon={<Bell aria-hidden className="size-4" />}
          busy={busy}
          onClick={() =>
            run(async () => {
              await enablePush()
              await saveSettings({ lembretes_ativos: true })
              setSubscribed(true)
              setOk('Lembretes ativados neste aparelho.')
            })
          }
        >
          Ativar lembretes
        </Button>
      )}
      <form
        className="mt-5 flex items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault()
          void run(async () => {
            await saveSettings({ lembrete_treino: time || null })
            setOk(
              time
                ? `Lembrete de treino às ${time} nos dias com treino planejado.`
                : 'Lembrete de treino removido.',
            )
          })
        }}
      >
        <div className="flex-1">
          <TextField
            label="Horário do lembrete de treino"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        </div>
        <Button type="submit" variant="secondary" disabled={busy}>
          Salvar
        </Button>
      </form>
      <Feedback error={error} ok={ok} />
    </Section>
  )
}

// Segurança neste aparelho -----------------------------------------------------------------------

export function PinSection() {
  const [active, setActive] = useState(() => hasPin())
  const [pin, setPinValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setOk(null)
    if (!isValidPin(pin)) {
      setError('O PIN tem de 4 a 6 dígitos.')
      return
    }
    await setPin(pin)
    setPinValue('')
    setError(null)
    setActive(true)
    setOk('PIN ativado neste aparelho.')
  }

  return (
    <Section title="Bloqueio com PIN">
      <p className="mt-2 max-w-prose text-small text-ink-muted">
        Pede um PIN ao abrir o app e depois de 5 minutos fora dele. Vale só para este aparelho. Se
        esquecer, você sai e entra de novo pelo e-mail.
      </p>
      {active ? (
        <Button
          className="mt-4"
          variant="secondary"
          onClick={() => {
            clearPin()
            setActive(false)
            setOk('PIN removido.')
          }}
        >
          Remover PIN
        </Button>
      ) : (
        <form onSubmit={onSubmit} className="mt-4 flex items-end gap-3">
          <div className="flex-1">
            <TextField
              label="Novo PIN"
              type="password"
              inputMode="numeric"
              autoComplete="new-password"
              maxLength={6}
              value={pin}
              onChange={(e) => setPinValue(e.target.value.replace(/\D/g, ''))}
            />
          </div>
          <Button
            type="submit"
            variant="secondary"
            icon={<KeyRound aria-hidden className="size-4" />}
          >
            Ativar
          </Button>
        </form>
      )}
      <Feedback error={error} ok={ok} />
    </Section>
  )
}

// Uso da IA --------------------------------------------------------------------------------------

export function AiUsageSection() {
  const today = useAiUsageToday()
  const month = useAiUsageMonth()
  const usd = (n: number) =>
    n.toLocaleString('pt-BR', { style: 'currency', currency: 'USD', maximumFractionDigits: 3 })
  return (
    <Section title="Uso do Bruce">
      <dl className="mt-3 grid grid-cols-2 gap-4 tabular-nums">
        <div>
          <dt className="text-small text-ink-muted">Hoje</dt>
          <dd className="text-ink">{today.data ? `${today.data.count} de 40 pedidos` : '—'}</dd>
          <dd className="text-small text-ink-muted">{today.data ? usd(today.data.cost) : ''}</dd>
        </div>
        <div>
          <dt className="text-small text-ink-muted">Este mês</dt>
          <dd className="text-ink">{month.data ? `${month.data.count} pedidos` : '—'}</dd>
          <dd className="text-small text-ink-muted">
            {month.data ? `${usd(month.data.cost)} estimados` : ''}
          </dd>
        </div>
      </dl>
      <p className="mt-3 text-small text-ink-muted">
        Só a contagem e o custo estimado ficam registrados, nunca o conteúdo.
      </p>
    </Section>
  )
}

// Seus dados -------------------------------------------------------------------------------------

export function DataSection() {
  const { signOut } = useAuth()
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [confirm, setConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function onExport() {
    setExporting(true)
    setError(null)
    try {
      const data = await collectExport()
      const day = new Date().toISOString().slice(0, 10)
      downloadJson(data, `bruceapp-${day}.json`)
    } catch {
      setError('Não foi possível exportar agora. Confira a internet e tente de novo.')
    } finally {
      setExporting(false)
    }
  }

  async function onDelete(e: FormEvent) {
    e.preventDefault()
    if (confirm !== 'EXCLUIR') return
    setDeleting(true)
    setDeleteError(null)
    const { error: err } = await db().functions.invoke('delete-account', {
      body: { confirm: 'EXCLUIR' },
    })
    if (err) {
      setDeleteError('A exclusão falhou. Nada foi apagado; tente de novo.')
      setDeleting(false)
      return
    }
    clearPin()
    await signOut().catch(() => undefined)
  }

  return (
    <Section title="Seus dados">
      <p className="mt-2 max-w-prose text-small text-ink-muted">
        Baixe tudo o que você registrou em um arquivo JSON. Fotos não vão no arquivo.
      </p>
      <Button
        className="mt-4"
        variant="secondary"
        icon={<Download aria-hidden className="size-4" />}
        busy={exporting}
        onClick={onExport}
      >
        Exportar dados
      </Button>
      <Feedback error={error} />
      <Button
        className="mt-6"
        variant="danger"
        icon={<Trash2 aria-hidden className="size-4" />}
        onClick={() => setConfirmOpen(true)}
      >
        Excluir conta e dados
      </Button>
      <Sheet open={confirmOpen} title="Excluir conta" onClose={() => setConfirmOpen(false)}>
        <form onSubmit={onDelete} className="space-y-5 p-5">
          <h2 className="type-section">Excluir conta e todos os dados</h2>
          <p className="text-ink-muted">
            Apaga treinos, refeições, hábitos, medidas, fotos, conversas e pontos. Não dá para
            desfazer. Exporte antes se quiser guardar.
          </p>
          <TextField
            label="Digite EXCLUIR para confirmar"
            autoComplete="off"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          <Feedback error={deleteError} />
          <Button
            type="submit"
            variant="danger"
            className="w-full"
            busy={deleting}
            disabled={confirm !== 'EXCLUIR'}
          >
            Excluir definitivamente
          </Button>
        </form>
      </Sheet>
    </Section>
  )
}
