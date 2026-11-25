# Studio Interiores

App web para designers de interiores, com IA (Claude).

## O que já faz

| Tela | Para quê |
|---|---|
| **Início** | Resumo: projetos ativos, orçamento total, valor já especificado |
| **Projetos** | Clientes, ambiente, estilo, prazo, status, briefing, **lista de compras com orçamento** (especificado × comprado × saldo) e impressão da proposta |
| **Análise de ambiente** | Envie a foto de um cômodo → diagnóstico, paleta de cores, lista de compras com preços estimados, iluminação e layout. Envia tudo para um projeto com 1 clique |
| **Consultor IA** | Chat com um designer sênior virtual; aceita fotos e pode usar os dados de um projeto como contexto |
| **Planta baixa** | Cômodo em escala, biblioteca de móveis com medidas reais, arrastar, girar, duplicar; salva no projeto |
| **Moodboard** | Paleta gerada por IA ou manual, imagens de referência, conceito; salva no projeto e imprime |

## Como rodar

1. Instale as dependências (só na primeira vez):
   ```
   npm install
   ```
2. Copie `.env.local.example` para `.env.local` e coloque sua chave da API da Anthropic
   (crie em https://platform.claude.com/settings/keys).
3. Inicie:
   ```
   npm run dev
   ```
4. Abra http://localhost:3000

## Onde ficam os dados

Nesta primeira versão, os projetos ficam salvos **no navegador** (localStorage). Isso significa
que cada computador/navegador tem seus próprios dados. As próximas fases planejadas:

- Login e banco de dados na nuvem (ex.: Supabase) — dados em qualquer dispositivo
- Área do cliente final (link para ver moodboard, planta e aprovar a proposta)
- Geração de imagens do ambiente redesenhado (requer um serviço de geração de imagens)
- Planos de assinatura para vender o app a outros designers

## Estrutura

- `src/app/*` — telas
- `src/app/api/*` — rotas do servidor que conversam com a IA (a chave nunca vai para o navegador)
- `src/lib/designer-interiores.ts` — instruções da IA (o "jeito" do designer virtual)
- `src/lib/store.ts` — armazenamento dos projetos
