import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'
import { fakeDb } from './fakeSupabase'

// Nenhum teste fala com o Supabase real.
vi.mock('../lib/supabase', async () => {
  const { fakeSupabase } = await import('./fakeSupabase')
  return { supabase: fakeSupabase, missingEnv: [] }
})

afterEach(() => {
  cleanup()
  fakeDb.reset()
})

// jsdom não implementa scrollTo; o ScrollRestoration do router o chama ao navegar.
window.scrollTo = () => {}

// jsdom não implementa <dialog>.showModal/close.
if (typeof HTMLDialogElement !== 'undefined') {
  HTMLDialogElement.prototype.showModal ??= function (this: HTMLDialogElement) {
    this.setAttribute('open', '')
  }
  HTMLDialogElement.prototype.close ??= function (this: HTMLDialogElement) {
    this.removeAttribute('open')
  }
}
