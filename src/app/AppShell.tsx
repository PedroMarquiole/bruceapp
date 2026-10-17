import { Outlet, ScrollRestoration } from 'react-router'
import { TabBar } from '../ui/TabBar'
import { AuthGate } from '../features/auth/AuthGate'

export function AppShell() {
  return (
    <AuthGate>
      <Outlet />
      <TabBar />
      <ScrollRestoration />
    </AuthGate>
  )
}
