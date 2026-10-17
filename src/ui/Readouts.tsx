type Readout = { label: string; value: string }

/** Linha de indicadores do dia, lidos como um painel de instrumentos. */
export function Readouts({ items }: { items: readonly Readout[] }) {
  return (
    <dl className="grid grid-cols-3 divide-x divide-line border-y border-line">
      {items.map((item) => (
        <div key={item.label} className="min-w-0 px-3 py-4 first:pl-0 last:pr-0">
          <dt className="truncate text-small text-ink-muted">{item.label}</dt>
          <dd className="mt-1 truncate text-[1.75rem] leading-none font-extrabold text-ink [font-stretch:70%]">
            {item.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}
