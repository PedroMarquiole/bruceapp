import type { RouteObject } from 'react-router'
import { AppShell, AuthedLayout } from './AppShell'
import { Hoje } from '../routes/Hoje'
import { Nutricao } from '../routes/Nutricao'
import { Treino } from '../routes/treino/Treino'
import { PlanoEditor } from '../routes/treino/PlanoEditor'
import { Exercicios } from '../routes/treino/Exercicios'
import { Sessao } from '../routes/treino/Sessao'
import { Evolucao } from '../routes/Evolucao'
import { Bruce } from '../routes/Bruce'
import { Perfil } from '../routes/Perfil'
import { Sistema } from '../routes/Sistema'
import { Habitos } from '../routes/Habitos'
import { BoasVindas } from '../routes/BoasVindas'
import { RouteError } from '../routes/RouteError'

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
          { path: 'nutricao', element: <Nutricao /> },
          { path: 'treino', element: <Treino /> },
          { path: 'treino/planos/:id', element: <PlanoEditor /> },
          { path: 'treino/exercicios', element: <Exercicios /> },
          { path: 'treino/sessao/:id', element: <Sessao /> },
          { path: 'evolucao', element: <Evolucao /> },
          { path: 'bruce', element: <Bruce /> },
          { path: 'habitos', element: <Habitos /> },
          { path: 'perfil', element: <Perfil /> },
          { path: 'perfil/sistema', element: <Sistema /> },
        ],
      },
    ],
  },
]
