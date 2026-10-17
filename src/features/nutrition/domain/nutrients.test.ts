import { describe, expect, it } from 'vitest'
import { fmt, gramsFromServings, scaleNutrients, sumEntries } from './nutrients'

const arroz = {
  kcal_100g: 128,
  protein_100g: 2.5,
  carbs_100g: 28.1,
  fat_100g: 0.2,
  fiber_100g: 1.6,
}

describe('scaleNutrients', () => {
  it('escala por gramas e arredonda a 0,1', () => {
    expect(scaleNutrients(arroz, 150)).toEqual({
      kcal: 192,
      protein_g: 3.8,
      carbs_g: 42.2,
      fat_g: 0.3,
      fiber_g: 2.4,
    })
  })

  it('mantém nulo quando o dado não existe', () => {
    const r = scaleNutrients({ ...arroz, fiber_100g: null }, 100)
    expect(r.fiber_g).toBeNull()
    expect(r.kcal).toBe(128)
  })

  it('recusa quantidade zero ou negativa', () => {
    expect(() => scaleNutrients(arroz, 0)).toThrow(RangeError)
    expect(() => scaleNutrients(arroz, -5)).toThrow(RangeError)
  })
})

describe('gramsFromServings', () => {
  it('converte porções em gramas', () => {
    expect(gramsFromServings(1.5, 30)).toBe(45)
    expect(() => gramsFromServings(0, 30)).toThrow()
  })
})

describe('sumEntries', () => {
  it('soma o dia e conta entradas incompletas', () => {
    const a = scaleNutrients(arroz, 100)
    const b = { kcal: 200, protein_g: 20, carbs_g: null, fat_g: 10, fiber_g: 0 }
    const t = sumEntries([a, b])
    expect(t.kcal).toBe(328)
    expect(t.protein_g).toBe(22.5)
    expect(t.carbs_g).toBe(28.1)
    expect(t.entries).toBe(2)
    expect(t.incomplete).toBe(1)
  })

  it('dia vazio soma zero', () => {
    expect(sumEntries([])).toMatchObject({ kcal: 0, entries: 0, incomplete: 0 })
  })

  it('remover uma entrada corrige o total (sem soma acumulada guardada)', () => {
    const e1 = scaleNutrients(arroz, 100)
    const e2 = scaleNutrients(arroz, 50)
    expect(sumEntries([e1, e2]).kcal).toBe(192)
    expect(sumEntries([e1]).kcal).toBe(128)
  })
})

describe('fmt', () => {
  it('formata em pt-BR', () => {
    expect(fmt(12.5)).toBe('12,5')
    expect(fmt(1200)).toBe('1.200')
    expect(fmt(null)).toBe('—')
  })
})
