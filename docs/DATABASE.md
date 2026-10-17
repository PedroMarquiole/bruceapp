# Banco de dados

Supabase (Postgres 17), projeto `bruceapp`, região São Paulo (`sa-east-1`). Migrations em
`supabase/migrations/`, aplicadas em ordem pelo nome. Estado: **Implementado** (Fases 2 a 5).

## Regras gerais

- Toda tabela do usuário tem `id uuid`, `user_id` (padrão `auth.uid()`, apaga em cascata com a
  conta), `created_at` e `updated_at` (atualizado por gatilho).
- RLS ligado em todas as tabelas de `public`. Políticas: dono lê, insere, atualiza e exclui.
- Tabelas filhas usam chave estrangeira composta `(pai_id, user_id)`: um filho não aponta para o
  pai de outra conta, nem por engano nem de propósito.
- Catálogos (`exercises`, `foods`): `user_id` nulo = item global somente leitura; os itens
  próprios seguem as regras do dono.
- Histórico guarda cópias: sessões guardam o nome do exercício; o diário guarda nome e
  nutrientes da quantidade consumida. Editar o original não altera o passado.
- Totais (do dia, da semana) não são colunas: sempre calculados a partir das entradas.

## Tabelas

| Tabela                                                           | Para quê                     | Regras importantes                                                                                                                                         |
| ---------------------------------------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `profiles`                                                       | Preferências da conta        | Criada por gatilho ao criar a conta; o app só lê e atualiza                                                                                                |
| `goals`                                                          | Metas pessoais               | Status `ativa`, `alcancada`, `arquivada`                                                                                                                   |
| `habits`                                                         | Hábitos configurados         | Dias da semana 1 (segunda) a 7; meta por dia 1–20                                                                                                          |
| `habit_logs`                                                     | Registro diário de hábito    | Único por hábito e dia                                                                                                                                     |
| `exercises`                                                      | Biblioteca de exercícios     | Catálogo global + próprios                                                                                                                                 |
| `workout_plans` → `workout_plan_days` → `workout_plan_exercises` | Planos de treino             | Excluir plano apaga dias e exercícios do plano; exercício do catálogo em uso não pode ser apagado                                                          |
| `workout_sessions`                                               | Sessões realizadas           | Status `ativa`, `pausada`, `finalizada`, `cancelada`; no máximo uma em andamento; finalizada exige `finished_at`; apagar o dia do plano não apaga a sessão |
| `session_exercises` → `exercise_sets`                            | O que foi feito na sessão    | Nome do exercício copiado; carga 0–1000 kg; repetições 0–200                                                                                               |
| `foods`                                                          | Alimentos                    | Fonte `usuario`, `open_food_facts`, `ia`, `tbca`; valores por 100 g; marca de incompleto e atribuição                                                      |
| `food_diary_entries`                                             | Diário alimentar             | Cópia dos valores; `is_estimate` para estimativas; quantidade até 5 kg                                                                                     |
| `nutrition_targets`                                              | Metas nutricionais opcionais | Vigência com início e fim                                                                                                                                  |
| `body_measurements`                                              | Peso e medidas               | Tipos fixos; unidade `kg`, `cm` ou `%`                                                                                                                     |
| `personal_records`                                               | Recordes                     | Critérios: carga para 1, 3, 5, 10 repetições e 1RM estimado                                                                                                |

| `ai_conversations`, `ai_messages` | Conversas com o Bruce | Propostas da IA ficam na mensagem e só viram registro quando o usuário aceita |
| `ai_usage` | Contagem e custo da IA | Sem conteúdo; usada para o limite diário (padrão 40 pedidos) |
| `progress_photos` | Fotos de evolução | Arquivo no bucket privado `progress-photos`, pasta do dono; exibida por URL assinada curta |
| `points_ledger` | Extrato de pontos | Só gatilhos `SECURITY DEFINER` escrevem; único por `(user_id, rule, source_key)`; desfazer a ação apaga a linha |
| `push_subscriptions` | Aparelhos com notificação | Único por endpoint; removida automaticamente quando o serviço de push responde 404/410 |

Esquema privado `app_private` (não exposto pela API): `allowed_emails`, a lista de e-mails que
podem criar conta, e as funções dos gatilhos de conta.

## Funções e gatilhos

- `finish_workout_session(session_id)`: finaliza a sessão e calcula recordes (carga para 1, 3, 5 e
  10 repetições; 1RM estimado por Epley para 2–12 repetições, marcado como estimativa).
- Pontos (`20261017050000_pontos.sql`): hábito cumprido no dia +10, treino finalizado +50, primeiro
  registro alimentar do dia +5, primeira medida do dia +5, recorde +20. Nível = ⌊√(pontos/50)⌋ + 1.
  Dia perdido nunca tira pontos.
- `public.app_secret(name)`: lê segredos do Vault; executável apenas por `service_role`.
- `pg_cron` job `bruceapp-lembretes` a cada 15 min chama a Edge Function `send-reminders` via
  `pg_net`, com o segredo `cron_secret` do Vault no cabeçalho.

## Edge Functions

| Função           | Para quê                                                     | Autenticação                       |
| ---------------- | ------------------------------------------------------------ | ---------------------------------- |
| `food-lookup`    | Código de barras no Open Food Facts, com cache global        | JWT do usuário                     |
| `bruce-ai`       | Conversa, sugestões e estimativa por foto (Claude Haiku 5.5) | JWT do usuário + limite diário     |
| `send-reminders` | Lembretes de hábitos e treino por Web Push                   | `x-cron-secret` ou JWT (só teste)  |
| `delete-account` | Apaga fotos e a conta; o banco apaga o resto em cascata      | JWT do usuário + `confirm=EXCLUIR` |

## Retenção

Os dados ficam até o usuário apagar. Conversas com a IA podem ser apagadas na tela do Bruce. A exclusão da conta apaga tudo em cascata.

## Comandos úteis

- Testes no banco: `supabase/tests/rls_test.sql`, `treino_test.sql`, `pontos_test.sql` (ver
  docs/TESTING.md).
- Liberar um e-mail para criar conta (SQL Editor, como administrador):
  `insert into app_private.allowed_emails (email) values ('seu@email.com');`
