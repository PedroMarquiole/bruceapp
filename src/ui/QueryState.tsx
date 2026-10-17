import type { ReactNode } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import { ErrorState, LoadingRows } from './States'

/** Mostra carregando/erro de uma consulta e, com dados, renderiza `children(data)`. */
export function QueryState<T>({
  query,
  loadingLabel,
  errorTitle,
  children,
}: {
  query: UseQueryResult<T>
  loadingLabel: string
  errorTitle: string
  children: (data: T) => ReactNode
}) {
  if (query.isPending) return <LoadingRows label={loadingLabel} />
  if (query.isError) {
    return (
      <ErrorState
        title={errorTitle}
        onRetry={() => void query.refetch()}
        retrying={query.isFetching}
      >
        {navigator.onLine
          ? 'O servidor não respondeu como esperado. Tente de novo.'
          : 'Você está sem internet. Conecte-se e tente de novo.'}
      </ErrorState>
    )
  }
  return <>{children(query.data)}</>
}
