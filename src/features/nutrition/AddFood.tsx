import { useCallback, useState } from 'react'
import { Camera, PenLine, ScanBarcode, Search } from 'lucide-react'
import { Button } from '../../ui/Button'
import { inputClass, Segmented, TextField } from '../../ui/Form'
import { LoadingRows } from '../../ui/States'
import type { Food, Meal } from '../../lib/db'
import { BarcodeScanner } from './BarcodeScanner'
import { SOURCE_LABEL } from './labels'
import { FoodForm } from './FoodForm'
import { fmt, gramsFromServings, scaleNutrients } from './domain/nutrients'
import {
  lookupBarcode,
  MEALS,
  useAddEntry,
  useFoodSearch,
  useRecentFoods,
  useSaveFood,
} from './queries'

type Mode = 'buscar' | 'codigo' | 'novo' | 'quantidade'

function FoodRow({ food, onPick }: { food: Food; onPick: (f: Food) => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onPick(food)}
        className="flex min-h-14 w-full items-center justify-between gap-3 rounded-[var(--radius-control)] px-1 py-2 text-left hover:bg-graphite"
      >
        <span className="min-w-0">
          <span className="block truncate">{food.name}</span>
          <span className="block text-small text-ink-muted">
            {[food.brand, SOURCE_LABEL[food.source]].filter(Boolean).join(' — ')}
          </span>
        </span>
        <span className="shrink-0 text-small text-ink-muted tabular-nums">
          {food.kcal_100g !== null ? `${fmt(food.kcal_100g, 0)} kcal/100 g` : 'sem kcal'}
        </span>
      </button>
    </li>
  )
}

/** Fluxo de adicionar alimento ao diário: buscar, ler código, cadastrar e escolher a quantidade. */
export function AddFood({
  day,
  initialMeal,
  onDone,
  onPhoto,
}: {
  day: string
  initialMeal: Meal
  onDone: () => void
  onPhoto?: () => void
}) {
  const [mode, setMode] = useState<Mode>('buscar')
  const [term, setTerm] = useState('')
  const [food, setFood] = useState<Food | null>(null)
  const [unit, setUnit] = useState<'g' | 'porcao'>('g')
  const [amount, setAmount] = useState('100')
  const [meal, setMeal] = useState<Meal>(initialMeal)
  const [error, setError] = useState<string | null>(null)
  const [lookingUp, setLookingUp] = useState(false)
  const [notFoundCode, setNotFoundCode] = useState<string | null>(null)
  const search = useFoodSearch(term)
  const recent = useRecentFoods()
  const saveFood = useSaveFood()
  const add = useAddEntry()

  const pick = (f: Food) => {
    setFood(f)
    setUnit(f.serving_g ? 'porcao' : 'g')
    setAmount(f.serving_g ? '1' : '100')
    setError(null)
    setMode('quantidade')
  }

  const onCode = useCallback(async (code: string) => {
    setLookingUp(true)
    setError(null)
    try {
      const r = await lookupBarcode(code)
      if (r.found && r.food.id) pick(r.food)
      else {
        setNotFoundCode(code)
        setMode('novo')
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Não foi possível consultar o código.')
    } finally {
      setLookingUp(false)
    }
  }, [])

  const amountNum = Number(amount.replace(',', '.'))
  let grams: number | null = null
  try {
    grams = food
      ? unit === 'porcao' && food.serving_g
        ? gramsFromServings(amountNum, food.serving_g)
        : amountNum > 0
          ? amountNum
          : null
      : null
  } catch {
    grams = null
  }
  const preview = food && grams && grams <= 5000 ? scaleNutrients(food, grams) : null

  if (mode === 'quantidade' && food) {
    return (
      <div className="space-y-5">
        <div>
          <p className="font-semibold">{food.name}</p>
          <p className="text-small text-ink-muted">
            {[food.brand, `Fonte: ${SOURCE_LABEL[food.source]}`].filter(Boolean).join(' — ')}
          </p>
          {food.is_incomplete ? (
            <p className="mt-1 text-small text-danger">
              Dados incompletos: alguns nutrientes não foram informados pela fonte.
            </p>
          ) : null}
          {food.attribution ? (
            <p className="mt-1 text-micro text-ink-muted">Dados: {food.attribution}</p>
          ) : null}
        </div>
        {food.serving_g ? (
          <Segmented
            label="Medida"
            options={[
              {
                value: 'porcao',
                label: food.serving_name
                  ? `Porção (${food.serving_name})`
                  : `Porção (${fmt(food.serving_g)} g)`,
              },
              { value: 'g', label: 'Gramas' },
            ]}
            value={unit}
            onChange={(v) => {
              setUnit(v)
              setAmount(v === 'porcao' ? '1' : String(food.serving_g ?? 100))
            }}
          />
        ) : null}
        <TextField
          label={unit === 'porcao' ? 'Quantidade de porções' : 'Quantidade (g)'}
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          error={grams === null || grams > 5000 ? 'Informe uma quantidade entre 0 e 5000 g.' : null}
        />
        <Segmented label="Refeição" options={MEALS} value={meal} onChange={setMeal} />
        {preview ? (
          <dl className="grid grid-cols-4 gap-2 border-y border-line py-3 text-center tabular-nums">
            {[
              ['kcal', preview.kcal],
              ['Proteína', preview.protein_g],
              ['Carbo', preview.carbs_g],
              ['Gordura', preview.fat_g],
            ].map(([label, v]) => (
              <div key={label as string}>
                <dt className="text-micro text-ink-muted">{label}</dt>
                <dd className="font-semibold">{fmt(v as number | null)}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        {error ? (
          <p role="alert" className="text-small text-danger">
            {error}
          </p>
        ) : null}
        <div className="flex gap-3">
          <Button
            className="flex-1"
            busy={add.isPending}
            disabled={!preview || !grams}
            onClick={() =>
              grams &&
              add.mutate(
                { food, grams, day, meal },
                {
                  onSuccess: onDone,
                  onError: () =>
                    setError('Não foi possível registrar. Confira a internet e tente de novo.'),
                },
              )
            }
          >
            Registrar
          </Button>
          <Button variant="quiet" onClick={() => setMode('buscar')}>
            Trocar alimento
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-4 grid grid-cols-4 gap-2">
        {(
          [
            ['buscar', 'Buscar', Search],
            ['codigo', 'Código', ScanBarcode],
            ['novo', 'Cadastrar', PenLine],
          ] as const
        ).map(([m, label, Icon]) => (
          <button
            key={m}
            type="button"
            aria-pressed={mode === m}
            onClick={() => {
              setMode(m)
              setError(null)
            }}
            className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-[var(--radius-control)] border text-small ${
              mode === m ? 'border-signal text-ink' : 'border-line text-ink-muted hover:text-ink'
            }`}
          >
            <Icon aria-hidden className="size-5" />
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={onPhoto}
          disabled={!onPhoto}
          className="flex min-h-16 flex-col items-center justify-center gap-1 rounded-[var(--radius-control)] border border-line text-small text-ink-muted hover:text-ink disabled:opacity-40"
        >
          <Camera aria-hidden className="size-5" />
          Foto
        </button>
      </div>

      {mode === 'buscar' ? (
        <div>
          <label className="relative block">
            <span className="sr-only">Buscar alimento</span>
            <Search
              aria-hidden
              className="pointer-events-none absolute top-1/2 left-4 size-4 -translate-y-1/2 text-ink-muted"
            />
            <input
              type="search"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Nome do alimento"
              className={`${inputClass} h-12 pl-11`}
            />
          </label>
          {!term && recent.data?.length ? (
            <>
              <p className="mt-4 text-small text-ink-muted">Usados recentemente</p>
              <ul className="divide-y divide-line">
                {recent.data.map((f) => (
                  <FoodRow key={f.id} food={f} onPick={pick} />
                ))}
              </ul>
            </>
          ) : null}
          {term || !recent.data?.length ? (
            search.isPending ? (
              <LoadingRows label="Buscando alimentos" rows={2} />
            ) : (
              <ul className="mt-3 max-h-[45dvh] divide-y divide-line overflow-y-auto">
                {(search.data ?? []).map((f) => (
                  <FoodRow key={f.id} food={f} onPick={pick} />
                ))}
                {search.data?.length === 0 ? (
                  <li className="py-4 text-ink-muted">
                    Nada encontrado. Leia o código de barras ou cadastre o alimento com os valores
                    do rótulo.
                  </li>
                ) : null}
              </ul>
            )
          ) : null}
        </div>
      ) : null}

      {mode === 'codigo' ? <BarcodeScanner onCode={onCode} busy={lookingUp} /> : null}

      {mode === 'novo' ? (
        <div>
          {notFoundCode ? (
            <p className="mb-4 text-ink-muted">
              O código {notFoundCode} não está no Open Food Facts. Cadastre com os valores do
              rótulo.
            </p>
          ) : null}
          <FoodForm
            {...(notFoundCode ? { initial: { barcode: notFoundCode } } : {})}
            busy={saveFood.isPending}
            onSubmit={(f) =>
              saveFood.mutate(f, {
                onSuccess: (saved) => pick(saved),
                onError: () => setError('Não foi possível salvar o alimento.'),
              })
            }
          />
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mt-3 text-small text-danger">
          {error}
        </p>
      ) : null}
    </div>
  )
}
