# Arquitetura

## Visão geral

SPA em Vite + React + TypeScript, servida como arquivos estáticos pelo Netlify e instalável como
PWA. A partir da Fase 2, fala apenas com o Supabase (Auth, Postgres com RLS, Storage privado).
Tudo que exige segredo — IA, exclusão de conta, consulta ao Open Food Facts, envio de Web Push —
roda em Edge Functions do Supabase. O Netlify não executa lógica de servidor.

Next.js não foi usado: o app é privado e de um usuário, sem necessidade de SEO ou renderização no
servidor.

## Stack (versões fixadas em package.json)

| Camada                     | Escolha                                                        | Estado             |
| -------------------------- | -------------------------------------------------------------- | ------------------ |
| Build                      | Vite 8                                                         | Implementado       |
| UI                         | React 19, React Router 8 (modo SPA)                            | Implementado       |
| Estilo                     | Tailwind CSS 4 sobre tokens em `src/styles/index.css`          | Implementado       |
| Fonte                      | Archivo variável (eixos de peso e largura), servida localmente | Implementado       |
| Ícones                     | lucide-react                                                   | Implementado       |
| PWA                        | vite-plugin-pwa (Workbox), atualização automática              | Implementado       |
| Testes                     | Vitest + Testing Library; Playwright em viewport de iPhone     | Implementado       |
| Dados remotos              | @supabase/supabase-js + TanStack Query + Zod                   | Implementado       |
| Gráficos                   | Recharts                                                       | Planejado (Fase 4) |
| Código de barras           | @zxing/browser                                                 | Planejado (Fase 3) |
| Rascunho offline do treino | IndexedDB (Dexie)                                              | Planejado (Fase 3) |

## Estrutura de pastas

```
src/
  app/          roteamento e casca do app (AppShell, routes)
  routes/       uma tela por arquivo
  ui/           componentes base reutilizáveis (Button, Screen, Section, States, TabBar)
  lib/          datas, cliente Supabase, queryClient, tipos do banco (db.ts)
  features/     auth, habits, workouts, nutrition, progress, assistant, gamification, profile,
                settings — cada uma com queries.ts, componentes e domain/ (funções puras testadas)
  styles/       tokens e camadas CSS
  test/         configuração dos testes
e2e/            testes Playwright
supabase/       migrations/, tests/ (SQL) e functions/ (Edge Functions em Deno)
public/push-sw.js  tratamento das notificações, importado pelo service worker do Workbox
scripts/        utilitários de manutenção (ex.: gerar ícones)
docs/           esta documentação
```

## Decisões

- **Online primeiro.** O único dado guardado só no aparelho será o rascunho da sessão de treino
  ativa, reenviado ao voltar a conexão. O iOS pode limpar o armazenamento de sites, então nada
  importante vive só ali.
- **Totais derivados, não armazenados.** Totais do dia são sempre calculados das entradas.
- **Histórico imutável.** Registros guardam cópia dos valores do momento (nutrientes, nome do
  exercício); editar um alimento ou plano não altera o passado.
- **Integridade no banco.** Pontos, recordes e finalização de sessão passam por funções SQL com
  restrições únicas, não por updates livres do cliente.
- **Telas sob demanda.** Só Hoje e o login vão no pacote inicial; as outras telas e o leitor de
  código de barras carregam quando abertas, e as bibliotecas grandes ficam em arquivos próprios.
- **Provedor de IA trocável.** As Edge Functions isolam o provedor atrás de uma interface; o
  padrão é Claude Haiku 5.5.

## Limitações conhecidas da plataforma (iOS)

- Web Push só funciona com o app instalado na tela inicial, iOS 16.4+, sem horário exato.
- Não há notificação local agendada nem sincronização em segundo plano na web.
- Não há acesso ao Apple Saúde (HealthKit).
- A leitura de código de barras depende de biblioteca JS; precisa ser validada no iPhone real.
