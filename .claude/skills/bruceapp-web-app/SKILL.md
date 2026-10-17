---
name: bruceapp-web-app
description: Use ao mexer na estrutura do app web do Bruceapp — rotas, PWA, dados remotos com TanStack Query, formulários com Zod, Vite e dependências.
---

# App web (Vite + React + PWA)

O Bruceapp é um PWA (não React Native). Stack fixada em `package.json` com versões exatas.

## Estrutura

- `src/app/routes.tsx`: todas as rotas. Telas novas entram como filhas do `AppShell` (protegidas pelo `AuthGate`).
- `src/routes/<Tela>.tsx`: uma tela por arquivo. `src/ui/`: peças reutilizáveis.
- `src/features/<feature>/`: `api.ts` (chamadas Supabase), `hooks.ts` (TanStack Query), `schemas.ts` (Zod), `domain/` (cálculos puros testados), `components/`.

## Padrões

1. Dados remotos sempre por TanStack Query (`useQuery`/`useMutation`), com chave estável `['feature', ...params]` e invalidação após mutação. Nada de `useEffect` + `fetch` manual.
2. Validar entrada com Zod antes de chamar o Supabase; mostrar a mensagem do Zod no campo.
3. Datas: use `src/lib/date.ts` (dia local `AAAA-MM-DD`, semana começa na segunda). Nunca `toISOString()` para chave de dia (vira UTC).
4. Quantidades em `numeric` no banco chegam como `number`; arredonde só na exibição.
5. Antes de adicionar dependência: verificar versão atual (`npm view`), compatibilidade de peers e se resolve algo real. Instalar com `--save-exact`.
6. Domínio externo novo (API, imagem) exige atualizar a CSP em `netlify.toml`.
7. Offline: só o rascunho da sessão de treino ativa fica local (IndexedDB). O resto é online; avisar quando a ação depende de internet.

## Verificação

`npm run check` (lint + tipos + testes + build) antes de concluir.
