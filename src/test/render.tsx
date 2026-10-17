import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { routes } from '../app/routes'
import type { AuthApi } from '../features/auth/auth-context'
import { WithAuth, fakeAuth } from './auth'

/** Renderiza o app numa rota, com sessão falsa (logado) e Supabase falso. */
export function renderRoute(path: string, api: AuthApi = fakeAuth()) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  const utils = render(
    <QueryClientProvider client={queryClient}>
      <WithAuth api={api}>
        <RouterProvider router={router} />
      </WithAuth>
    </QueryClientProvider>,
  )
  return { router, api, queryClient, ...utils }
}
