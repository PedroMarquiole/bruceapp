import { Outlet, ScrollRestoration } from 'react-router'
import { TabBar } from '../ui/TabBar'
import { AuthGate } from '../features/auth/AuthGate'
import { PinLock } from '../features/settings/PinLock'

/** Tudo que exige login passa por aqui. */
export function AuthedLayout() {
  return (
    <AuthGate>
      <PinLock>
        <Outlet />
        <ScrollRestoration />
      </PinLock>
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
