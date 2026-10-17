import { Outlet, ScrollRestoration } from 'react-router'
import { TabBar } from '../ui/TabBar'
import { AuthGate } from '../features/auth/AuthGate'

/** Tudo que exige login passa por aqui. */
export function AuthedLayout() {
  return (
    <AuthGate>
      <Outlet />
      <ScrollRestoration />
    </AuthGate>
  )
}

/** Telas com a barra de abas. */
export function AppShell() {
  return (
    <>
      <Outlet />
      <TabBar />
    </>
  )
}
