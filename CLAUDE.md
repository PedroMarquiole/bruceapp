# Bruceapp — instruções do projeto

App pessoal (um único usuário) de treino, alimentação, hábitos e evolução. PWA em Vite + React +
TypeScript, publicado no Netlify, com Supabase como backend a partir da Fase 2. Idioma: pt-BR.
Unidades: kg, cm, kcal, g, ml, minutos.

## Regras de trabalho

- Trabalhe uma fase por vez (docs/ROADMAP.md) e pare para revisão ao final de cada uma.
- Leia um arquivo antes de editá-lo. Nunca apague dados, migrations ou funcionalidades sem
  autorização explícita.
- Não marque tarefa como concluída sem rodar `npm run check`. Nunca declare que um teste passou
  sem tê-lo executado.
- Nada de dados falsos apresentados como registros reais. Dados de demonstração ficam isolados e
  rotulados (ex.: a tela `/perfil/sistema`).
- Todo botão principal tem ação real. Sem botão decorativo.
- Decisões importantes em aberto: apresente opções com prós, contras e custo, recomende uma, e
  espere resposta.

## Comandos

```sh
npm run check    # lint + tipos + testes + build — rode antes de concluir qualquer etapa
npm test         # Vitest
PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium npm run test:e2e
```

## Convenções de código

- TypeScript strict, incluindo `noUncheckedIndexedAccess` e `exactOptionalPropertyTypes`.
- Cálculos (nutrição, recordes, pontos, sequências) ficam em funções puras em
  `src/features/<feature>/domain/`, com testes próprios, sem React e sem rede.
- Estilos só com tokens de `src/styles/index.css`. Nenhuma cor literal em componente.
- Componentes de tela ficam em `src/routes/`; peças reutilizáveis em `src/ui/`.
- Prettier sem ponto e vírgula, aspas simples, largura 100.

## Segurança

- Nenhum segredo no código do site. `VITE_*` é público por definição: só URL e chave publishable
  do Supabase entram ali.
- Chave service role, chaves de IA e VAPID privada ficam apenas em segredos de Edge Functions.
- Toda tabela exposta ao cliente tem RLS, com teste de acesso permitido e negado.
- A CSP está em `netlify.toml`; ao adicionar um domínio externo, atualize-a junto.

## Produto

- Sem rede social: nada de feed, seguidores, perfis públicos ou ranking entre usuários.
- A IA não diagnostica, não prescreve e não incentiva treinar com dor ou dieta extrema. Ela
  sempre explica o porquê e pede confirmação antes de salvar qualquer mudança.
- Estimativas (foto, 1RM) aparecem marcadas como estimativa e podem ser corrigidas.
- Gamificação premia consistência; descanso, doença ou um dia perdido não punem o usuário.
