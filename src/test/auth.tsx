import type { ReactNode } from 'react'
import type { Session } from '@supabase/supabase-js'
import { vi } from 'vitest'
import { AuthContext, type AuthApi, type AuthState } from '../features/auth/auth-context'

export const fakeSession = {
  access_token: 'teste',
  refresh_token: 'teste',
  expires_in: 3600,
  token_type: 'bearer',
  user: { id: '00000000-0000-0000-0000-000000000001', email: 'eu@teste.invalid' },
} as unknown as Session

export function fakeAuth(state: AuthState = { status: 'logado', session: fakeSession }): AuthApi {
  return {
    state,
    sendCode: vi.fn(async () => {}),
    verifyCode: vi.fn(async () => {}),
    signOut: vi.fn(async () => {}),
  }
}

export function WithAuth({ api, children }: { api: AuthApi; children: ReactNode }) {
  return <AuthContext value={api}>{children}</AuthContext>
}
