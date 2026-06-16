# Fluxbus

Plataforma web de mobilidade urbana para transporte escolar, com rastreamento em tempo real, calculo de rotas e deteccao de desvios por IA.

## Stack

- Next.js 16 (App Router) + React 19
- Firebase Authentication + Realtime Database
- Leaflet + react-leaflet (mapas)
- OpenRouteService (rotas e tempos)
- Tailwind CSS v4

## Configuracao

1. `npm install`
2. Crie `.env.local` baseado em `.env.example` e preencha os valores.
3. `npm run dev`

Variaveis necessarias estao listadas em `.env.example`. Se alguma variavel essencial
estiver ausente, a interface exibe avisos amigaveis em vez de quebrar.

## Estrutura

Veja `src/` para o app, componentes (`ui/`, `layout/`, `features/`), dados
hardcoded (`data/rotas.ts`), helpers (`lib/`) e middleware de protecao de rotas.

Consulte `CHANGES.md` para detalhes da reformulacao.
