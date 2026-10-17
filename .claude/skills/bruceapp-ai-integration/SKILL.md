---
name: bruceapp-ai-integration
description: Use ao construir o assistente Bruce AI, a estimativa nutricional por foto ou qualquer chamada a modelo de IA no Bruceapp (Fase 4).
---

# Integração de IA

Estado: planejado (Fase 4). Provedor padrão: Claude Haiku 5.5, atrás de uma interface trocável.

## Arquitetura

- O site nunca chama o provedor. Chama a Edge Function `bruce-ai`, que guarda a chave como segredo.
- Cada pedido tem uma intenção (`resumo_semana`, `ajuste_treino`, `analise_dia`, `estimativa_foto`) com um construtor de contexto que busca só os registros necessários. Nunca enviar o banco inteiro.
- Resposta estruturada validada com Zod. Falha de validação = erro tratado, não texto cru na tela.
- Toda chamada registra em `ai_usage`: data, intenção, modelo, tokens, custo estimado. Sem conteúdo.
- Limite diário por usuário checado antes de chamar o provedor.

## Regras de comportamento (no prompt de sistema e na interface)

1. Mudanças propostas viram cartões com Aceitar / Editar / Descartar. Nada salva sem confirmação.
2. Separar registrado de estimado; estimativa por foto sempre marcada e corrigível item a item.
3. Não se apresentar como médico, nutricionista ou educador físico. Não diagnosticar, não prescrever.
4. Dor, lesão ou questão clínica: recomendar profissional; nunca incentivar treinar com dor nem aumento imprudente de carga.
5. Sem dietas extremas e sem julgamento moral sobre calorias.
6. Dizer quando não há dados suficientes.
7. Fotos de corpo nunca são enviadas à IA.

## Verificação

Testes com respostas do provedor simuladas: sucesso, JSON inválido, tempo esgotado, limite diário atingido.
