import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { routes } from '../app/routes'
import type { AuthApi } from '../features/auth/auth-context'
import { WithAuth, fakeAuth } from './auth'

/** Renderiza o app numa rota, com uma sessão falsa (logado) por padrão. */
export function renderRoute(path: string, api: AuthApi = fakeAuth()) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const utils = render(
    <WithAuth api={api}>
      <RouterProvider router={router} />
    </WithAuth>,
  )
  return { router, api, ...utils }
}
