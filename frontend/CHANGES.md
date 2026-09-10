# CHANGES.md

Reformulacao do projeto legado `frontend/` (Next.js 16 + Firebase + Leaflet)
para a especificacao "Ideia-Base" do Fluxbus.

## Fase 0 — Analise do legado

Estrutura encontrada no legado:

- `frontend/app/` continha `page.tsx` (login), `layout.tsx`, `firebase.ts`,
  `map.tsx`, `globals.css`, `aluno/page.tsx`, `motorista/page.tsx`,
  `cadastro/page.tsx`.
- Pasta solta `frontend/login/page.tsx` (UI dummy de login/cadastro, nao
  conectada ao roteamento do App Router por estar fora de `app/`).
- `frontend/components/MapComponent.tsx`.
- Sem `.env*`. Credenciais Firebase, endpoint da IA e estilos hardcoded.
- Nao havia `data/`, `lib/`, `middleware`, nem `api/`.
- Dependencias supérfluas: `@react-google-maps/api`, `leaflet-routing-machine`.
- SVGs do template Next em `public/`.

## Fase 1 — Seguranca e configuracao

- `firebaseConfig` migrado para `process.env.NEXT_PUBLIC_FIREBASE_*`
  em `src/lib/firebase.ts`.
- Endpoint da IA movido para `NEXT_PUBLIC_IA_ENDPOINT` (usado em
  `src/app/motorista/page.tsx`).
- Chave ORS lida de `NEXT_PUBLIC_ORS_API_KEY` (ja era o caso no legado).
- Criados `.env.example` (placeholders) e `.env.local` (valores extraidos do
  legado, prontos para teste; o ORS continua vazio pois nao havia chave).
- `.gitignore` inclui `.env*.local`.
- Resiliencia: `firebaseConfigured` evita inicializar SDK quando faltam
  variaveis; UI mostra avisos amigaveis no header e em pontos sensiveis
  (login, cadastro, aluno, motorista).

## Fase 2 — Estrutura de diretorios

```
src/
├── app/
│   ├── layout.tsx        (metadata "Fluxbus - Mobilidade Urbana", lang="pt-BR")
│   ├── page.tsx          (landing: busca de bairros + cartoes)
│   ├── login/page.tsx
│   ├── cadastro/page.tsx
│   ├── aluno/page.tsx
│   ├── motorista/page.tsx
│   ├── sobre/page.tsx
│   ├── globals.css
│   └── api/
│       ├── auth/{login,register}/route.ts
│       ├── onibus/[rota]/route.ts
│       └── historico/[rota]/route.ts
├── components/
│   ├── ui/        (Logo, Avatar, AvatarDropdown, OverflowMenu, BottomNav, BackButton)
│   ├── layout/    (AppShell)
│   └── features/  (MapComponent, RouteCard, BairroSearch)
├── data/rotas.ts
├── lib/{firebase.ts, validators.ts, useAuth.ts}
└── middleware.ts
```

- `app/firebase.ts` → `src/lib/firebase.ts` (refatorado).
- `components/MapComponent.tsx` → `src/components/features/MapComponent.tsx`,
  agora usa polyline, icone customizado de onibus e foi desacoplado do listener
  global de Firebase (a posicao chega via prop `origem`).
- Alias `@/*` apontando para `src/*` (`tsconfig.json` atualizado).
- `src/data/rotas.ts` criado com os dados das rotas (Aldeia Park, Buriti)
  copiados literalmente do legado.

## Fase 3 — Paginas e componentes

- Landing `/` reescrita: pesquisa de bairros + grid de cartoes (`RouteCard`),
  sem logica de login.
- `/login` extraido para pagina propria, ligada ao Firebase Auth + leitura do
  perfil em `usuarios/{uid}`. Gravacao do cookie `fluxbus_auth` para o
  middleware.
- `/cadastro` reescrito com validacao (nome, email, senha, confirmacao,
  tipo). Tipo de usuario gravado em `usuarios/{uid}`.
- `/aluno` preserva integralmente a logica de Firebase, debounce, calculo via
  ORS, atualizacao em tempo real e mapa. Bairro vem de `getBairrosUnicos()`.
  Substituido `<select>` hardcoded por seletor dinamico; query param `?rota=`
  pre-seleciona o bairro a partir do cartao da landing.
- `/motorista` preserva integralmente `iniciarViagem`, `pararViagem`,
  `verificarDesvioIA`, `watchPosition`, gravacao em `onibus/{rota}` e
  `historico/{rota}/{ts}`, `enviarJustificativa`, sair, `clearWatch` no
  unmount. Botao unico "Gravar Rota" / "Parar Gravacao" (azul/vermelho).
- `/sobre` criado com conteudo institucional estatico.
- Pagina de Perfil: nao existia no legado e nao foi criada (a Ideia-Base
  manda omitir).
- `frontend/login/page.tsx` (UI dummy fora do roteamento) foi descartada.
- `frontend/app/map.tsx` (pagina de teste) foi descartada.

## Fase 4 — API Routes

- Stubs criados em `src/app/api/...` retornando 501 com mensagem clara.
- Motivo: a configuracao do Firebase Admin SDK exige uma service account que
  nao consta do legado. Conforme a regra, **as chamadas continuam no cliente**
  (Firebase Web SDK). Para ativar as rotas, basta instalar `firebase-admin`,
  fornecer `GOOGLE_APPLICATION_CREDENTIALS` (ou JSON inline em variavel) e
  reimplementar os handlers.

## Fase 5 — Interface e estilizacao

- Estilos inline removidos; Tailwind v4 com tokens em `globals.css`
  (`--color-fluxbus-blue`, `--color-fluxbus-blue-600`, `--color-fluxbus-blue-50`,
  `--font-logo`).
- Paleta azul + branco em todo o app.
- Logo "fluxbus" em fonte Kaufmann BT (com fallback caso a fonte nao esteja
  instalada no SO).
- Avatar: 32x32, cor de fundo deterministica via hash do UID, iniciais brancas,
  dropdown "Sair".
- Menu overflow: dropdown branco com "Sobre nos" e submenu "Idioma" (pt/en
  salvos em `localStorage` + cookie).
- BottomNav: mobile fixo 56 px, desktop barra lateral 240 px. Visivel apenas
  para autenticados. Aluno = "Inicio". Motorista = "Inicio" + "Viagem".
- Botao "Voltar" reutilizavel (`BackButton`).
- Metadata atualizada: `title: "Fluxbus - Mobilidade Urbana"`, `lang="pt-BR"`.
- Nenhum emoji nos textos. Os emojis 🚌 / 🚪 / 🚨 / 📍 / 🤖 / 🕒 / 👨‍✈️ / 📝 do
  legado foram removidos ou substituidos por SVGs / texto.

## Fase 6 — Limpeza

- SVGs do template Next (`file.svg`, `globe.svg`, `next.svg`, `vercel.svg`,
  `window.svg`) removidos.
- Dependencias `@react-google-maps/api` e `leaflet-routing-machine` removidas
  do `package.json` (Leaflet eh o unico provedor de mapas).
- Codigo morto (`app/map.tsx`, `login/page.tsx` solto) removido.

## Middleware

- `src/middleware.ts` protege `/aluno/*` e `/motorista/*` exigindo o cookie
  `fluxbus_auth` (gravado em login/cadastro). Redireciona para `/login?next=...`
  caso ausente.
- Observacao: sem Firebase Admin SDK nao da para validar tokens de sessao no
  edge. O cookie funciona como flag "ha sessao client-side"; a validacao real
  do usuario continua via `onAuthStateChanged` nas paginas.

## Omissoes documentadas (sem chave / sem credencial)

1. **OpenRouteService API key**: nao existia no legado; `NEXT_PUBLIC_ORS_API_KEY`
   esta vazia em `.env.local`. Sem a chave, `/aluno` mostra paradas sem
   tempo/distancia e um aviso amigavel.
2. **Firebase Admin SDK**: nao havia service account no legado. API routes
   ficam como stubs 501. Funcionalidades dependentes (login/cadastro/leituras)
   permanecem no cliente.
3. **Internacionalizacao completa (pt/en)**: a especificacao pede deteccao em
   cascata e arquivos de traducao. Implementado apenas o seletor de idioma
   (UI + persistencia em `localStorage`/cookie). A troca real de strings nao
   foi feita por estar fora do escopo do legado e nao haver textos em ingles
   no codigo original — registrar como trabalho futuro.
4. **Fonte Kaufmann Bold BT**: nao incluida no repositorio (licenca
   comercial). Aplicada via `font-family` com fallback para fontes script
   instaladas no SO. Para ativar, hospede a fonte em `public/fonts/` e ajuste
   `globals.css`.

## Como rodar

```bash
npm install
cp .env.example .env.local   # ou edite o .env.local ja incluso
npm run dev
```

Abra http://localhost:3000.
