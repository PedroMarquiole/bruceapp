import type { RouteObject } from 'react-router'
import { AppShell } from './AppShell'
import { Hoje } from '../routes/Hoje'
import { Nutricao } from '../routes/Nutricao'
import { Treino } from '../routes/Treino'
import { Evolucao } from '../routes/Evolucao'
import { Bruce } from '../routes/Bruce'
import { Perfil } from '../routes/Perfil'
import { Sistema } from '../routes/Sistema'
import { RouteError } from '../routes/RouteError'

export const routes: RouteObject[] = [
  {
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: <Hoje /> },
      { path: 'nutricao', element: <Nutricao /> },
      { path: 'treino', element: <Treino /> },
      { path: 'evolucao', element: <Evolucao /> },
      { path: 'bruce', element: <Bruce /> },
      { path: 'perfil', element: <Perfil /> },
      { path: 'perfil/sistema', element: <Sistema /> },
    ],
  },
]
