import type { ComponentType } from 'react'
import type { RouteObject } from 'react-router'
import { AppShell, AuthedLayout } from './AppShell'
import { Hoje } from '../routes/Hoje'
import { BoasVindas } from '../routes/BoasVindas'
import { RouteError } from '../routes/RouteError'

/** Telas fora de Hoje carregam sob demanda, para a primeira abertura ser rápida. */
const page = (load: () => Promise<{ Component: ComponentType }>) => ({ lazy: load })

export const routes: RouteObject[] = [
  {
    element: <AuthedLayout />,
    errorElement: <RouteError />,
    children: [
      { path: 'boas-vindas', element: <BoasVindas /> },
      {
        element: <AppShell />,
        children: [
          { index: true, element: <Hoje /> },
          {
            path: 'nutricao',
            ...page(() => import('../routes/Nutricao').then((m) => ({ Component: m.Nutricao }))),
          },
          {
            path: 'treino',
            ...page(() => import('../routes/treino/Treino').then((m) => ({ Component: m.Treino }))),
          },
          {
            path: 'treino/planos/:id',
            ...page(() =>
              import('../routes/treino/PlanoEditor').then((m) => ({ Component: m.PlanoEditor })),
            ),
          },
          {
            path: 'treino/exercicios',
            ...page(() =>
              import('../routes/treino/Exercicios').then((m) => ({ Component: m.Exercicios })),
            ),
          },
          {
            path: 'treino/sessao/:id',
            ...page(() => import('../routes/treino/Sessao').then((m) => ({ Component: m.Sessao }))),
          },
          {
            path: 'evolucao',
            ...page(() => import('../routes/Evolucao').then((m) => ({ Component: m.Evolucao }))),
          },
          {
            path: 'bruce',
            ...page(() => import('../routes/Bruce').then((m) => ({ Component: m.Bruce }))),
          },
          {
            path: 'habitos',
            ...page(() => import('../routes/Habitos').then((m) => ({ Component: m.Habitos }))),
          },
          {
            path: 'missoes',
            ...page(() => import('../routes/Missoes').then((m) => ({ Component: m.Missoes }))),
          },
          {
            path: 'perfil',
            ...page(() => import('../routes/Perfil').then((m) => ({ Component: m.Perfil }))),
          },
          {
            path: 'perfil/sistema',
            ...page(() => import('../routes/Sistema').then((m) => ({ Component: m.Sistema }))),
          },
        ],
      },
    ],
  },
]
