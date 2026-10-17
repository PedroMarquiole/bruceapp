---
name: bruceapp-testing
description: Use ao escrever ou rodar testes do Bruceapp, ou antes de declarar qualquer etapa concluída.
---

# Testes

Nunca dizer que passou sem ter rodado. Ver `docs/TESTING.md`.

## Comandos

```sh
npm run check                                                       # lint + tipos + Vitest + build
PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run test:e2e  # ponta a ponta (nuvem)
```

## Onde cada teste mora

- Cálculo puro (nutrição, recordes, pontos, sequências, datas): `*.test.ts` ao lado do arquivo. Cobrir bordas: virada de mês, domingo, zero, valores máximos, duplicação.
- Tela ou componente: `*.test.tsx` com Testing Library. Use `renderRoute(path, fakeAuth(...))` de `src/test/render.tsx` para rotas; consulte por papel e rótulo (`getByRole`, `getByLabelText`), nunca por classe.
- Ponta a ponta: `e2e/*.spec.ts` com as fixtures `loggedIn`/`loggedOut` de `e2e/fixtures.ts`. Elas bloqueiam qualquer chamada real ao Supabase; mocke as rotas necessárias com `page.route`.
- RLS: casos em `supabase/tests/rls_test.sql` (transação desfeita no fim; sucesso = `RLS_OK`).

## Antes de concluir uma etapa

1. `npm run check` verde.
2. E2E verde e capturas conferidas.
3. RLS testado se o banco mudou.
4. Pendências manuais no iPhone listadas em `docs/TESTING.md`.
