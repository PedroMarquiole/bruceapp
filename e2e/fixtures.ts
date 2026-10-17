import { test as base, type Page } from '@playwright/test'

const REF = 'bfhfikboegfrzkhylfwz'
export const STORAGE_KEY = `sb-${REF}-auth-token`

export function fakeSession(email = 'eu@teste.invalid') {
  const now = Math.floor(Date.now() / 1000)
  return {
    access_token: 'token-de-teste',
    refresh_token: 'refresh-de-teste',
    token_type: 'bearer',
    expires_in: 3600,
    expires_at: now + 3600,
    user: {
      id: '00000000-0000-0000-0000-000000000001',
      aud: 'authenticated',
      role: 'authenticated',
      email,
      app_metadata: { provider: 'email' },
      user_metadata: {},
      created_at: new Date().toISOString(),
    },
  }
}

/** Nenhum teste fala com o Supabase de verdade: toda chamada é interceptada. */
async function isolateSupabase(page: Page) {
  await page.route(`https://${REF}.supabase.co/**`, (route) =>
    route.fulfill({ status: 503, json: { message: 'bloqueado no teste' } }),
  )
}

export const test = base.extend<{ loggedIn: Page; loggedOut: Page }>({
  loggedIn: async ({ page }, use) => {
    await isolateSupabase(page)
    await page.addInitScript(([key, value]) => window.localStorage.setItem(key, value), [
      STORAGE_KEY,
      JSON.stringify(fakeSession()),
    ] as const)
    await use(page)
  },
  loggedOut: async ({ page }, use) => {
    await isolateSupabase(page)
    await use(page)
  },
})

export { expect } from '@playwright/test'
