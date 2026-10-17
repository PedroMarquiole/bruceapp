# Roadmap

Legenda: **Validado** (conferido no iPhone real) · **Implementado** (no código, testes passando) ·
**Planejado**.

| Fase                         | Entrega                                                                               | Estado                                   |
| ---------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------- |
| 0 — Auditoria                | Plano técnico e decisões                                                              | Concluída                                |
| 1 — Fundação                 | Vite + React + TS strict, PWA, navegação, sistema visual, testes, docs, skills locais | Implementado                             |
| 2 — Dados e login            | Projeto Supabase, migrations, RLS, conta única, login por código                      | Implementado                             |
| 3 — Funcionalidades centrais | Onboarding, hábitos, treinos e sessão ativa, diário alimentar, Hoje com dados reais   | Implementado                             |
| 4 — Evolução e IA            | Gráficos, fotos privadas, Bruce AI, estimativa por foto, limites de uso               | Implementado                             |
| 5 — Experiência avançada     | Missões, pontos, conquistas, Web Push, exportação e exclusão, PIN                     | Implementado                             |
| 6 — Validação                | Testes integrados, revisão de segurança, roteiro no iPhone                            | Implementado (falta o roteiro no iPhone) |

## O que falta, feito por você

Nada aqui exige mexer em código. São passos de painel que dependem da sua conta.

- [ ] Supabase → Edge Functions → Secrets: criar `ANTHROPIC_API_KEY` com a sua chave. Sem ela o
      Bruce AI e a estimativa por foto respondem que a IA não está configurada; o resto do app
      funciona normalmente.
- [ ] Supabase → Authentication → Email Templates: incluir `{{ .Token }}` nos modelos **Magic
      link** e **Confirm signup**, para o e-mail trazer o código de 6 dígitos.
- [ ] Rodar no SQL Editor `supabase/tests/rls_test.sql` (espera `RLS_OK`) e `treino_test.sql`
      (espera `TREINO_OK`) completos. As partes sem DELETE já foram conferidas; as com DELETE
      pedem confirmação manual.
- [ ] Opcional: definir um limite de gasto na chave da Anthropic (Console → Limits).
- [ ] GitHub: deixar o repositório privado (Settings → General → Danger Zone).
- [ ] Hospedagem: publicar `dist/` com o redirecionamento da SPA e os cabeçalhos de
      `netlify.toml` (no Netlify isso é automático).
- [ ] iPhone: instalar pelo Safari, entrar com o código, ativar lembretes em Perfil e tocar em
      **Enviar teste**. Seguir o roteiro em docs/TESTING.md.

## Riscos aceitos

- Aviso do Supabase "extensão `pg_net` no schema public": o pg_net não pode ser movido sem ser
  recriado; suas funções ficam no schema `net`, sem acesso pela API. Mantido como está.
- Avisos de "índice não usado": esperado com o banco vazio; os índices cobrem as chaves
  estrangeiras e as consultas por data.

## Limitações conhecidas

- Web Push no iPhone só com o app instalado, iOS 16.4+, sem horário exato.
- Sem acesso ao Apple Saúde em web app.
- O iOS pode apagar o armazenamento local de sites; dados importantes ficam sempre no Supabase.
- Supabase grátis pausa o projeto após 1 semana sem uso.
