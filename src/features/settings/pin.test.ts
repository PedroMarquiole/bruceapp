import { afterEach, describe, expect, it } from 'vitest'
import {
  clearPin,
  failureDelayMs,
  hasPin,
  isValidPin,
  needsUnlock,
  RELOCK_MS,
  setPin,
  verifyPin,
} from './pin'

afterEach(() => clearPin())

describe('PIN local', () => {
  it('valida formato', () => {
    expect(isValidPin('1234')).toBe(true)
    expect(isValidPin('123')).toBe(false)
    expect(isValidPin('12a4')).toBe(false)
    expect(isValidPin('1234567')).toBe(false)
  })

  it('guarda só o hash e confere o PIN', async () => {
    await setPin('4821')
    expect(hasPin()).toBe(true)
    expect(localStorage.getItem('bruce.pin')).not.toContain('4821')
    expect(await verifyPin('4821')).toBe(true)
    expect(await verifyPin('0000')).toBe(false)
  })

  it('pede desbloqueio depois de 5 minutos', async () => {
    await setPin('4821')
    expect(needsUnlock()).toBe(false)
    expect(needsUnlock(Date.now() + RELOCK_MS + 1000)).toBe(true)
  })

  it('sem PIN, nunca bloqueia', () => {
    expect(needsUnlock()).toBe(false)
  })

  it('valor corrompido nunca destrava sozinho', async () => {
    localStorage.setItem('bruce.pin', '{quebrado')
    expect(hasPin()).toBe(true)
    expect(await verifyPin('1234')).toBe(false)
  })

  it('espera cresce depois de erros seguidos', () => {
    expect(failureDelayMs(2)).toBe(0)
    expect(failureDelayMs(3)).toBe(2000)
    expect(failureDelayMs(4)).toBe(4000)
    expect(failureDelayMs(20)).toBe(60_000)
  })
})
