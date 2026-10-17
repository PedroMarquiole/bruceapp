import { Outlet, ScrollRestoration } from 'react-router'
import { TabBar } from '../ui/TabBar'

export function AppShell() {
  return (
    <>
      <Outlet />
      <TabBar />
      <ScrollRestoration />
    </>
  )
}
