const LOCALE = 'pt-BR'

/** Dia da semana curto para o título da tela Hoje: "Sexta", "Sábado", "Domingo". */
export function weekdayTitle(date: Date): string {
  const raw = new Intl.DateTimeFormat(LOCALE, { weekday: 'long' }).format(date)
  const withoutSuffix = raw.replace(/-feira$/i, '')
  return withoutSuffix.charAt(0).toLocaleUpperCase(LOCALE) + withoutSuffix.slice(1)
}

/** Data por extenso sem o ano: "16 de outubro". */
export function dayAndMonth(date: Date): string {
  return new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'long' }).format(date)
}

/** Data ISO local (AAAA-MM-DD), usada como chave de dia nos registros. */
export function localDayKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Hora local no formato 24h: "23:31". */
export function clockTime(date: Date): string {
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

/** Fração do dia local já decorrida, de 0 a 1. */
export function dayProgress(date: Date): number {
  const seconds = date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds()
  return seconds / 86_400
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

/** Segunda-feira da semana de `date` (semana começa na segunda, padrão no Brasil para treinos). */
export function startOfWeek(date: Date): Date {
  const d = startOfDay(date)
  const offset = (d.getDay() + 6) % 7
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() - offset)
}

export type WeekDay = {
  key: string
  short: string
  day: number
  isToday: boolean
}

/** Os sete dias da semana atual, de segunda a domingo. */
export function currentWeek(today: Date): WeekDay[] {
  const monday = startOfWeek(today)
  const todayKey = localDayKey(today)
  const fmt = new Intl.DateTimeFormat(LOCALE, { weekday: 'short' })
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)
    const short = fmt.format(d).replace('.', '')
    return {
      key: localDayKey(d),
      short: short.charAt(0).toLocaleUpperCase(LOCALE) + short.slice(1),
      day: d.getDate(),
      isToday: localDayKey(d) === todayKey,
    }
  })
}

/**
 * Grade de consistência: `weeks` colunas de segunda a domingo, terminando na semana atual.
 * Dias futuros vêm marcados para não serem desenhados como "perdidos".
 */
export function consistencyGrid(today: Date, weeks: number) {
  const lastMonday = startOfWeek(today)
  const todayStart = startOfDay(today).getTime()
  const todayKey = localDayKey(today)
  return Array.from({ length: weeks }, (_, w) => {
    const monday = new Date(
      lastMonday.getFullYear(),
      lastMonday.getMonth(),
      lastMonday.getDate() - (weeks - 1 - w) * 7,
    )
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i)
      return {
        key: localDayKey(d),
        isToday: localDayKey(d) === todayKey,
        isFuture: d.getTime() > todayStart,
      }
    })
  })
}

/** Rótulos curtos de data para eixos: "21 set". */
export function shortDate(date: Date): string {
  return new Intl.DateTimeFormat(LOCALE, { day: 'numeric', month: 'short' })
    .format(date)
    .replace(/\./g, '')
    .replace(' de ', ' ')
}

/** Datas das segundas-feiras das últimas `weeks` semanas, terminando na atual. */
export function recentMondays(today: Date, weeks: number): Date[] {
  const monday = startOfWeek(today)
  return Array.from(
    { length: weeks },
    (_, i) =>
      new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() - (weeks - 1 - i) * 7),
  )
}
