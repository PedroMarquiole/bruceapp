# Especificação do produto

Legenda de estado: **Planejado** (decidido, não construído) · **Implementado** (no código) ·
**Validado** (testado no iPhone real).

## O que é

App pessoal de um único usuário para centralizar treino, alimentação, evolução, hábitos e um
assistente de IA. Web app instalável (PWA) aberto no iPhone pela tela inicial.

## O que não é

Não é rede social: sem feed, seguidores, perfis públicos, ranking ou desafios com outras pessoas.
Não substitui médico, nutricionista ou profissional de educação física.

## Funcionalidades

| Área               | Escopo                                                                          | Estado                  |
| ------------------ | ------------------------------------------------------------------------------- | ----------------------- |
| Navegação          | Cinco abas (Hoje, Nutrição, Treino, Evolução, Bruce) e Perfil pelo topo         | Implementado            |
| Sistema visual     | Tema preto, tokens, componentes base, estados vazio/carregando/erro             | Implementado            |
| Login              | Código de uso único por e-mail; cadastro público desativado; PIN local opcional | Planejado (Fase 2)      |
| Onboarding         | Objetivo, experiência, rotina, equipamentos, alimentação, hábitos, unidades     | Planejado (Fase 3)      |
| Hoje               | Treino do dia, refeições e totais, hábitos, consistência, sugestão da IA        | Planejado (Fase 3)      |
| Alimentação        | Busca, porções, refeições, alimentos próprios, código de barras, foto com IA    | Planejado (Fases 3–4)   |
| Treinos            | Planos, biblioteca de exercícios, sessão ativa, histórico, recordes             | Planejado (Fase 3)      |
| Evolução           | Peso, medidas, gráficos, recordes, fotos privadas                               | Planejado (Fase 4)      |
| Hábitos e missões  | Hábitos, missões individuais, sequências, pontos, conquistas                    | Planejado (Fases 3 e 5) |
| Bruce AI           | Perguntas sobre os próprios dados, ajustes propostos com confirmação            | Planejado (Fase 4)      |
| Lembretes          | Web Push com o app instalado (iOS 16.4+)                                        | Planejado (Fase 5)      |
| Exportar e excluir | Exportação em JSON e exclusão total de conta e arquivos                         | Planejado (Fase 5)      |
| Apple Saúde        | Não suportado em web app; possível importação de arquivo no futuro              | Fora do escopo          |

## Princípios

- Todo número exibido vem de dado registrado. Estimativas aparecem marcadas.
- Calorias são opcionais e nunca viram julgamento moral.
- Nenhuma mudança sugerida pela IA é salva sem confirmação.
- Fontes nutricionais são identificadas em cada registro. TBCA fica fora do MVP por falta de
  licença de reuso; Open Food Facts (ODbL) é usado para código de barras, com atribuição.
