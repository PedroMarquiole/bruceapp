import { lazy, StrictMode, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import { createBrowserRouter, createMemoryRouter } from 'react-router'
import { RouterProvider } from 'react-router/dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { routes } from './app/routes'
import { AuthProvider } from './features/auth/AuthProvider'
import { queryClient } from './lib/queryClient'
import './styles/index.css'

// A versão de teste guarda a rota em memória: funciona em qualquer endereço ou moldura.
const demo = import.meta.env.VITE_DEMO === '1'
const router = demo ? createMemoryRouter(routes) : createBrowserRouter(routes)
const DemoBanner = demo
  ? lazy(() => import('./demo/DemoBanner').then((m) => ({ default: m.DemoBanner })))
  : null
const root = document.getElementById('root')

if (!root) throw new Error('Elemento #root não encontrado em index.html')

createRoot(root).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {DemoBanner ? (
          <Suspense fallback={null}>
            <DemoBanner />
          </Suspense>
        ) : null}
        <RouterProvider router={router} />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
)
