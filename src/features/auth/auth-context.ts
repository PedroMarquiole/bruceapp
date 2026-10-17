import { createContext, useContext } from 'react'
import type { Session } from '@supabase/supabase-js'

export type AuthState =
  | { status: 'carregando' }
  | { status: 'sem-config'; missing: string[] }
  | { status: 'deslogado' }
  | { status: 'logado'; session: Session }

export type AuthApi = {
  state: AuthState
  sendCode: (email: string) => Promise<void>
  verifyCode: (email: string, code: string) => Promise<void>
  signOut: () => Promise<void>
}

export const AuthContext = createContext<AuthApi | null>(null)

export function useAuth(): AuthApi {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return ctx
}
