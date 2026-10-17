import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { missingEnv, supabase } from '../../lib/supabase'
import { AuthContext, type AuthApi, type AuthState } from './auth-context'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() =>
    supabase ? { status: 'carregando' } : { status: 'sem-config', missing: missingEnv },
  )

  useEffect(() => {
    if (!supabase) return
    let active = true
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return
      setState(data.session ? { status: 'logado', session: data.session } : { status: 'deslogado' })
    })
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setState(session ? { status: 'logado', session } : { status: 'deslogado' })
    })
    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [])

  const api = useMemo<AuthApi>(
    () => ({
      state,
      async sendCode(email) {
        if (!supabase) throw new Error('Supabase não configurado')
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { shouldCreateUser: true },
        })
        if (error) throw error
      },
      async verifyCode(email, code) {
        if (!supabase) throw new Error('Supabase não configurado')
        const { error } = await supabase.auth.verifyOtp({ email, token: code, type: 'email' })
        if (error) throw error
      },
      async signOut() {
        if (!supabase) return
        const { error } = await supabase.auth.signOut()
        if (error) throw error
      },
    }),
    [state],
  )

  return <AuthContext value={api}>{children}</AuthContext>
}
