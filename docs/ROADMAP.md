# Roadmap

Legenda: **Validado** (conferido no iPhone real) · **Implementado** (no código, testes passando) ·
**Planejado**.

| Fase                         | Entrega                                                                               | Estado       |
| ---------------------------- | ------------------------------------------------------------------------------------- | ------------ |
| 0 — Auditoria                | Plano técnico e decisões                                                              | Concluída    |
| 1 — Fundação                 | Vite + React + TS strict, PWA, navegação, sistema visual, testes, docs, skills locais | Implementado |
| 2 — Dados e login            | Projeto Supabase, migrations, RLS, conta única, login por código                      | Implementado |
| 3 — Funcionalidades centrais | Onboarding, hábitos, treinos e sessão ativa, diário alimentar, Hoje com dados reais   | Planejado    |
| 4 — Evolução e IA            | Gráficos, fotos privadas, Bruce AI, estimativa por foto, limites de uso               | Planejado    |
| 5 — Experiência avançada     | Missões, pontos, conquistas, Web Push, exportação e exclusão, PIN                     | Planejado    |
| 6 — Validação                | Testes integrados, revisão de segurança, roteiro no iPhone                            | Planejado    |

## Pendências da Fase 2

- [ ] Você: incluir `{{ .Token }}` nos modelos de e-mail **Magic link** e **Confirm signup** do
      Supabase (Authentication → Email Templates), para o e-mail trazer o código de 6 dígitos.
- [ ] Você: rodar `supabase/tests/rls_test.sql` no SQL Editor e conferir a mensagem `RLS_OK`
      (a ferramenta automática pediu confirmação e foi cancelada).
- [ ] Você: primeiro login real no iPhone, com o app instalado na tela inicial.

## Ordem da Fase 3

Hábitos → treinos (biblioteca, planos, sessão ativa com rascunho local) → alimentação (alimentos
próprios, diário, código de barras) → Hoje com indicadores reais → onboarding.

## Limitações conhecidas

- Web Push no iPhone só com o app instalado, iOS 16.4+, sem horário exato.
- Sem acesso ao Apple Saúde em web app.
- O iOS pode apagar o armazenamento local de sites; dados importantes ficam sempre no Supabase.
- Supabase grátis pausa o projeto após 1 semana sem uso.
