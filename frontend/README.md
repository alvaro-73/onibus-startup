# Fluxbus

Plataforma de mobilidade urbana para acompanhamento de rotas escolares em tempo real.

## Stack

- Next.js 16 (App Router) + React 19 + TypeScript
- Firebase (Authentication + Realtime Database) — Web SDK
- Leaflet + react-leaflet
- OpenRouteService (cálculo de rotas)
- Tailwind CSS v4
- lucide-react (ícones)

## Como rodar

```bash
cp .env.example .env.local   # preencha suas chaves
npm install
npm run dev
```

A aplicação **inicia mesmo sem `.env.local`**: as funcionalidades que dependem de
chaves exibem mensagens amigáveis em vez de quebrar.

Consulte `CHANGES.md` para detalhes sobre a reformulação e o que ficou de fora.
