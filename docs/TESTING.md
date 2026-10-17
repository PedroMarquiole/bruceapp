# Testes

Nunca declarar que algo passou sem ter rodado. `npm run check` antes de concluir qualquer etapa.

## Camadas

| Camada              | Ferramenta                    | Onde                                 | O que cobre                                                                                                        |
| ------------------- | ----------------------------- | ------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Lógica pura         | Vitest                        | `src/**/*.test.ts`                   | Datas, sequências, nutrição, séries, tendência de peso, níveis e missões, PIN                                      |
| Componentes e rotas | Vitest + Testing Library      | `src/**/*.test.tsx`                  | Navegação, login, fluxos de hábito/treino/diário, Bruce AI, missões, Perfil, exclusão, PIN                         |
| Ponta a ponta       | Playwright, perfil iPhone 13  | `e2e/`                               | Cada tela abre sem erro e sem rolagem lateral; manifesto PWA; fallback da SPA; capturas em `test-results/screens/` |
| Banco (RLS)         | SQL contra o projeto Supabase | `supabase/tests/rls_test.sql`        | Dono lê e altera o que é seu; outra conta não vê nem altera; filhos não apontam para pais alheios                  |
| Banco (regras)      | SQL contra o projeto Supabase | `treino_test.sql`, `pontos_test.sql` | Recordes ao finalizar sessão (`TREINO_OK`); pontos sem duplicar e revogados ao desfazer (`PONTOS_OK`)              |

## Como rodar

```sh
npm run check
PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run test:e2e   # nuvem
npm run test:e2e                                                      # máquina com Playwright instalado
```

O teste de RLS roda inteiro dentro de uma transação desfeita no fim (não deixa dados). Execute o
conteúdo de `supabase/tests/rls_test.sql` no SQL Editor do Supabase ou pela ferramenta de SQL;
sucesso termina com a mensagem `RLS_OK`.

## Validação manual no iPhone

Itens que só o aparelho real confirma, a refazer a cada fase:

- [ ] Adicionar à Tela de Início pelo Safari e abrir em tela cheia
- [ ] Área segura do topo e da barra inferior (notch e indicador de início)
- [ ] Login com código recebido por e-mail, dentro do app instalado
- [ ] Teclado não cobre o campo ativo
- [ ] Câmera e leitura de código de barras em Nutrição
- [ ] Estimativa por foto (depois de configurar `ANTHROPIC_API_KEY`)
- [ ] Sessão de treino: cronômetro de descanso e rascunho ao fechar e reabrir o app
- [ ] Perfil → Ativar lembretes → Enviar teste: a notificação chega com o app fechado
- [ ] PIN: ativar, fechar o app por mais de 5 minutos e conferir o bloqueio
- [ ] Exportar dados abre/salva o arquivo JSON
