# Segurança e privacidade

Legenda: **Implementado** · **Planejado**.

## Princípio

O site só conhece a URL do Supabase e a chave publishable, ambas públicas por natureza. Nenhum
dado sai do banco sem passar por uma política RLS que confere `auth.uid()`.

## Controles

| Controle                       | Detalhe                                                                                                                                     | Estado                                           |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Segredos fora do site          | `.env*` no `.gitignore`; só URL, chave publishable e chave pública VAPID no cliente                                                         | Implementado                                     |
| Conta única                    | Gatilho em `auth.users` só aceita e-mails da tabela privada `app_private.allowed_emails` (preenchida direto no banco, nunca no repositório) | Implementado                                     |
| RLS em todas as tabelas        | Leitura, inserção, atualização e exclusão limitadas ao dono (`user_id = auth.uid()`)                                                        | Implementado                                     |
| Dono consistente entre tabelas | Chaves estrangeiras compostas `(id, user_id)`: um registro filho não pode apontar para o registro de outra conta                            | Implementado                                     |
| Catálogos somente leitura      | Exercícios e alimentos sem dono podem ser lidos, nunca alterados pelo app                                                                   | Implementado                                     |
| Testes de isolamento           | `supabase/tests/rls_test.sql` prova acesso permitido e negado entre duas contas                                                             | Parcial: sem DELETE, `RLS_OK`; completo pendente |
| CSP                            | `netlify.toml`: só scripts próprios, conexão só com o projeto Supabase, sem iframes                                                         | Implementado                                     |
| Cabeçalhos                     | HSTS, `nosniff`, `no-referrer`, `X-Frame-Options: DENY`, câmera só na própria origem                                                        | Implementado                                     |
| Login sem senha                | Código de 6 dígitos por e-mail; sessão guardada pelo supabase-js no navegador                                                               | Implementado                                     |
| PIN local                      | Opcional, por aparelho; hash PBKDF2 com sal, nunca o PIN; rebloqueia após 5 min fora do app                                                 | Implementado                                     |
| Storage privado                | Bucket `progress-photos` por pasta do dono, URLs assinadas curtas                                                                           | Implementado                                     |
| Edge Functions                 | Validam JWT e entrada (Zod), limite diário de IA via `ai_usage`, erros sem detalhes internos                                                | Implementado                                     |
| Exclusão total                 | Edge Function apaga arquivos e o usuário; o banco apaga o resto em cascata                                                                  | Implementado                                     |
| Exportação                     | JSON gerado no app                                                                                                                          | Implementado                                     |

| Segredos do servidor | Chave da IA em segredo de Edge Function; VAPID privada e segredo do cron no Vault, lidos só pelo `service_role` | Implementado |
| Pontos à prova de fraude | Cliente não escreve em `points_ledger`; só gatilhos, com chave única por origem | Implementado |
| IA com confirmação | Propostas validadas com Zod (meta mínima de 1200 kcal) e só salvas ao tocar em Aceitar | Implementado |

## Riscos aceitos

- O token de sessão fica no armazenamento do navegador. Mitigação: CSP restrita, nenhum script de
  terceiros, poucas dependências, RLS limitando o estrago de qualquer vazamento.
- O site é público na internet (o plano grátis do Netlify não tem senha de site). Sem login não
  há dados, e só o e-mail autorizado consegue criar conta.

## LGPD

Dados de saúde são dados pessoais sensíveis. Banco na região de São Paulo. Ao usar o Bruce AI, um resumo
dos registros recentes vai para a Anthropic (fora do Brasil), apenas o necessário para cada
pedido; `ai_usage` guarda só contagem e custo. Isto não é uma avaliação jurídica; se o app tiver outros usuários, será preciso análise
formal.

## Ao mudar algo

- Novo domínio externo → atualizar a CSP em `netlify.toml`.
- Nova tabela → RLS + políticas + caso em `supabase/tests/rls_test.sql` + rodar os advisors do
  Supabase.
