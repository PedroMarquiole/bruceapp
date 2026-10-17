# Bruceapp

App pessoal de treino, alimentação, hábitos e evolução. Web app instalável na tela inicial do
iPhone (PWA), hospedado no Netlify, com Supabase como banco a partir da Fase 2.

Uso pessoal de uma pessoa só. Sem feed, sem seguidores, sem ranking entre usuários.

## Estado atual

Fase 1 (fundação) concluída: base do projeto, navegação, sistema visual e verificações.
Nada de dados reais ainda — as telas mostram estados vazios explicando o que virá.
O que está planejado, implementado e validado está em [docs/ROADMAP.md](docs/ROADMAP.md).

## Rodar localmente

Requer Node 22.12 ou superior.

```sh
npm install
npm run dev          # http://localhost:5173
```

## Comandos

| Comando             | O que faz                                                  |
| ------------------- | ---------------------------------------------------------- |
| `npm run dev`       | Servidor de desenvolvimento                                |
| `npm run build`     | Checagem de tipos + build de produção em `dist/`           |
| `npm run preview`   | Serve o build de produção                                  |
| `npm run lint`      | ESLint                                                     |
| `npm run typecheck` | TypeScript em modo strict                                  |
| `npm test`          | Testes unitários e de componente (Vitest)                  |
| `npm run test:e2e`  | Testes de ponta a ponta em viewport de iPhone (Playwright) |
| `npm run check`     | lint + tipos + testes + build, nesta ordem                 |

No ambiente de nuvem deste projeto, o Chromium já está instalado: rode os testes de ponta a ponta
com `PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run test:e2e`.

## Variáveis de ambiente

Copie `.env.example` para `.env.local` e preencha. Valores reais nunca são versionados.
Chaves secretas (service role do Supabase, provedor de IA, VAPID privada) ficam apenas como
segredos das Edge Functions, nunca no código do site.

## Publicação

O Netlify constrói a partir de `netlify.toml` e publica `dist/`. O deploy acontece a cada envio
para o GitHub. Para instalar no iPhone: abra o site no Safari, toque em Compartilhar e em
"Adicionar à Tela de Início". Lembretes por notificação só funcionam com o app instalado assim.

## Documentação

- [docs/PRODUCT_SPEC.md](docs/PRODUCT_SPEC.md) — o que o app faz e não faz
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) — estrutura e decisões técnicas
- [docs/DESIGN.md](docs/DESIGN.md) — tokens, tipografia e regras visuais
- [docs/DATABASE.md](docs/DATABASE.md) — modelo de dados (planejado)
- [docs/SECURITY.md](docs/SECURITY.md) — segurança e privacidade
- [docs/TESTING.md](docs/TESTING.md) — o que é testado e como
- [docs/ROADMAP.md](docs/ROADMAP.md) — fases, estado e pendências
