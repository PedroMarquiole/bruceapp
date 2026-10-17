# Banco de dados

Supabase (Postgres 17), projeto `bruceapp`, região São Paulo (`sa-east-1`). Migrations em
`supabase/migrations/`, aplicadas em ordem pelo nome. Estado: **Implementado** (Fase 2), salvo
onde indicado.

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

Esquema privado `app_private` (não exposto pela API): `allowed_emails`, a lista de e-mails que
podem criar conta, e as funções dos gatilhos de conta.

## Planejado

| Tabelas                                                                                     | Fase |
| ------------------------------------------------------------------------------------------- | ---- |
| `meal_templates`, `meal_template_items` (refeições salvas)                                  | 3    |
| `ai_conversations`, `ai_messages`, `ai_usage`                                               | 4    |
| `progress_photos` + bucket privado                                                          | 4    |
| `missions`, `achievements`, `user_achievements`, `points_ledger` (único por regra e origem) | 5    |
| `push_subscriptions`                                                                        | 5    |

## Retenção

Os dados ficam até o usuário apagar. Conversas com a IA terão retenção configurável (padrão
sugerido de 90 dias) quando existirem. A exclusão da conta apaga tudo em cascata.

## Comandos úteis

- Teste de isolamento: `supabase/tests/rls_test.sql` (ver docs/TESTING.md).
- Liberar um e-mail para criar conta (SQL Editor, como administrador):
  `insert into app_private.allowed_emails (email) values ('seu@email.com');`
