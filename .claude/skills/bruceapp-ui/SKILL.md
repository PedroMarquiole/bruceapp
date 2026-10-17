---
name: bruceapp-ui
description: Use ao criar ou alterar qualquer tela, componente ou estilo do Bruceapp. Garante o sistema visual preto com amarelo de sinal, tipografia Archivo condensada e estados vazio/carregando/erro.
---

# Interface do Bruceapp

Fonte de verdade: `src/styles/index.css` (tokens) e `docs/DESIGN.md`. Vitrine: rota `/perfil/sistema`.

## Regras

1. Cores só por token (`bg-graphite`, `text-ink-muted`, `border-line`, `bg-signal`...). Nunca hex em componente.
2. Amarelo (`signal`) marca uma coisa por área: a ação principal, a aba ativa, o dia de hoje, o progresso. Erro usa `danger`, sucesso usa `ok`.
3. Títulos de tela: `<Screen title>` (usa `.type-headline`). Seções: `<Section title>` (fio fino, sem cartão). O dia na tela Hoje é o único `.type-monument`.
4. Sem caixa alta em rótulos, sem rótulo acima de título, sem numeração (01/02) se não for sequência, sem `·` como separador.
5. Toda área com dados tem três estados: `EmptyState` (diz o que vai aparecer e como começar), `LoadingRows` (formato do conteúdo), `ErrorState` (o que falhou + "Tentar de novo").
6. Estado vazio honesto: pode mostrar a estrutura real (semana, horários, datas do eixo), nunca números inventados.
7. Alvos de toque com 44px no mínimo (`min-h-11`). Inputs com 16px ou mais (evita zoom no iOS). `inputMode` e `autoComplete` corretos.
8. Botões dizem a ação ("Salvar treino", não "Enviar"). Mensagem de confirmação repete o verbo ("Treino salvo").
9. Movimento só em resposta ao toque, mais o momento único do dia na tela Hoje. `prefers-reduced-motion` já é respeitado globalmente.
10. Coluna única, `max-w-xl`, margens `px-5`, alinhado à esquerda. Respeitar `safe-top`/`safe-bottom`.

## Verificação

- `PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run test:e2e` gera capturas em `test-results/screens/`. Abra e confira: largura 390px, nada cortado, nada sob a barra de abas.
- O teste e2e falha se houver rolagem horizontal.
