---
name: bruceapp-supabase-security
description: Use ao criar ou alterar tabelas, políticas RLS, funções SQL, storage ou Edge Functions do Bruceapp no Supabase, e ao lidar com qualquer chave ou segredo.
---

# Supabase e segurança

Projeto `bruceapp` (ref `bfhfikboegfrzkhylfwz`, região `sa-east-1`). Referência: `docs/DATABASE.md` e `docs/SECURITY.md`.

## Nova tabela — checklist

1. Arquivo novo em `supabase/migrations/AAAAMMDDHHMMSS_nome.sql`; o mesmo SQL aplicado ao projeto (nunca editar migration já aplicada).
2. Colunas `id uuid default gen_random_uuid()`, `user_id uuid not null default auth.uid() references auth.users on delete cascade`, `created_at`, `updated_at` + gatilho `public.set_updated_at()`.
3. Tabela filha: `foreign key (pai_id, user_id) references pai (id, user_id)` e `unique (id, user_id)` no pai. Índice em `(pai_id, user_id)`.
4. `alter table ... enable row level security` + quatro políticas `to authenticated` com `(select auth.uid()) = user_id`.
5. `check` para limites (tamanho de texto, faixas numéricas, valores permitidos).
6. Acrescentar casos em `supabase/tests/rls_test.sql` (dono acessa; outra conta não lê, não altera, não insere em nome alheio, não pendura filho em pai alheio; anônimo não vê).
7. Rodar os advisors de segurança e performance do Supabase e resolver o que aparecer.
8. Atualizar `docs/DATABASE.md`.

## Segredos

- No site só vão `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` (públicas).
- Service role, chaves de IA e VAPID privada: só como segredos de Edge Function. Nunca em arquivo versionado, log ou resposta.
- Conta única: `app_private.allowed_emails` é preenchida direto no banco; nunca versionar e-mails.

## Edge Functions (a partir da Fase 4)

Validar o JWT do usuário, validar entrada com Zod, limitar tamanho de payload, registrar uso em `ai_usage` sem conteúdo sensível, devolver erro sem detalhes internos.
