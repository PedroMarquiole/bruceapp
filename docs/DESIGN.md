# Sistema visual

Direção: preto tático e sóbrio, inspirado na atmosfera de Bruce Wayne — disciplina, tecnologia,
contenção. Identidade própria: nenhum símbolo, logotipo, personagem ou arte da franquia Batman.

## Cores

Todas definidas uma única vez em `src/styles/index.css` (`@theme`). Componentes usam só os
nomes abaixo, nunca hex literal.

| Token             | Hex     | Uso                                            | Origem   |
| ----------------- | ------- | ---------------------------------------------- | -------- |
| `obsidian`        | #090A0D | Fundo                                          | Briefing |
| `graphite`        | #17191F | Superfícies, botões secundários                | Briefing |
| `graphite-raised` | #1F2229 | Estado pressionado, campos, brilho do skeleton | Derivado |
| `line`            | #2A2D35 | Fios entre seções, bordas                      | Derivado |
| `signal`          | #F2C94C | Ação principal, aba ativa, progresso, foco     | Briefing |
| `signal-press`    | #D8B03C | Ação principal pressionada                     | Derivado |
| `steel`           | #A7ADB8 | Ícones, detalhes                               | Briefing |
| `ink`             | #F5F6F8 | Texto principal                                | Briefing |
| `ink-muted`       | #8D95A3 | Texto secundário                               | Briefing |
| `danger`          | #EF7C6B | Erro e ação destrutiva                         | Derivado |
| `ok`              | #7CC5A8 | Sucesso                                        | Derivado |

Por que os derivados: erro e sucesso não podem usar o amarelo, senão o amarelo deixa de
significar "ação". Contraste de `ink-muted` sobre `obsidian` ≈ 6,6:1 (passa AA).

Regra do amarelo: no máximo um elemento amarelo forte por área da tela. Ele marca o que fazer
agora, não decora.

## Tipografia

Uma família só: **Archivo** variável, servida localmente (sem Google Fonts, por privacidade e
CSP). A personalidade vem do eixo de largura:

| Classe           | Uso                        | Largura | Peso | Tamanho |
| ---------------- | -------------------------- | ------- | ---- | ------- |
| `.type-monument` | Dia da semana na tela Hoje | 64%     | 850  | 76px    |
| `.type-headline` | Título de tela             | 72%     | 800  | 40px    |
| `.type-section`  | Título de seção            | 88%     | 700  | 19px    |
| corpo            | Texto                      | 100%    | 400  | 16px    |
| `text-small`     | Contexto, datas            | 100%    | 400  | 13px    |

Números usam algarismos tabulares (`tnum`) em todo o app, para cargas e totais alinharem.

## Composição

- Seções separadas por fio fino, não por cartões. Cartão só quando o conteúdo é de fato um objeto
  manipulável (ex.: uma série durante o treino).
- Alinhamento à esquerda. Coluna única, largura máxima 576px, margens de 20px.
- Rótulos em caixa normal (nada de CAIXA ALTA espaçada).
- Alvos de toque com no mínimo 44px.

## Movimento

Um momento orquestrado: o dia da semana na tela Hoje entra comprimindo a largura da fonte. O
resto só se move em resposta ao toque. `prefers-reduced-motion` desliga as animações.

## Estados

Toda área com dados tem três estados desenhados (ver `/perfil/sistema`):

- **Vazio**: diz o que vai aparecer ali e, quando existir, como começar.
- **Carregando**: blocos com o formato do conteúdo.
- **Erro**: o que falhou, o que fazer, e "Tentar de novo" quando faz sentido.

## Marca

Ícone original: um "B" construído com três blocos amarelos sobre preto. Fonte em
`public/icons/favicon.svg`; PNGs gerados por `scripts/generate-icons.ts`.
