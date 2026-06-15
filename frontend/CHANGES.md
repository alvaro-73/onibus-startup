# Fluxbus — Reformulação

Este documento registra todas as mudanças aplicadas ao projeto.

## Configuração inicial

1. Copie o arquivo de exemplo para o local definitivo:
   ```bash
   cp .env.example .env.local
   ```
2. Preencha em `.env.local` as variáveis do Firebase, do OpenRouteService e do
   endpoint da IA. Sem essas variáveis, a aplicação ainda inicia (`npm run dev`),
   mas as funcionalidades dependentes exibem mensagens informativas.
3. Instale dependências e rode em desenvolvimento:
   ```bash
   npm install
   npm run dev
   ```

## Estrutura de diretórios

Adotada a seguinte estrutura:

```
src/
├── app/                # App Router (Next.js)
│   ├── api/
│   │   ├── auth/{login,register}/route.ts
│   │   ├── onibus/[rota]/route.ts
│   │   └── historico/[rota]/route.ts
│   ├── aluno/page.tsx
│   ├── cadastro/page.tsx
│   ├── login/page.tsx
│   ├── motorista/page.tsx
│   ├── perfil/page.tsx
│   ├── sobre/page.tsx
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── features/{MapComponent,RotaCard,BarraPesquisaBairro}.tsx
│   ├── layout/{TopBar,BottomNav,Shell}.tsx
│   └── ui/{Avatar,BackButton,EnvWarning,Logo}.tsx
├── data/rotas.ts
├── lib/{firebase,validators,avatar,useAuthUser}.ts
└── middleware.ts
```

## Arquivos movidos / criados / removidos

### Movidos
- `app/firebase.ts` → `src/lib/firebase.ts` (refatorado para ler `process.env.NEXT_PUBLIC_*` e suportar ausência de configuração).
- `components/MapComponent.tsx` → `src/components/features/MapComponent.tsx` (atualizado para receber `rotaId` e desenhar a polyline).
- Páginas `app/{aluno,cadastro,motorista}/page.tsx` → `src/app/...` (refatoradas).
- `login/page.tsx` (fora de `app/`, sem efeito real) → substituído por `src/app/login/page.tsx` funcional.

### Criados
- `src/data/rotas.ts` — fonte única das rotas hardcoded (Aldeia Park, Buriti).
- `src/lib/validators.ts`, `src/lib/avatar.ts`, `src/lib/useAuthUser.ts`.
- `src/components/layout/{TopBar,BottomNav,Shell}.tsx`.
- `src/components/ui/{Avatar,BackButton,EnvWarning,Logo}.tsx`.
- `src/components/features/{RotaCard,BarraPesquisaBairro}.tsx`.
- `src/app/perfil/page.tsx`, `src/app/sobre/page.tsx`.
- API Routes: `auth/login`, `auth/register`, `onibus/[rota]`, `historico/[rota]`.
- `src/middleware.ts` (detecção de idioma e ponto de extensão futura).
- `.env.example`, `CHANGES.md`.

### Removidos
- `app/map.tsx` (protótipo solto que não era usado em produção).
- `login/page.tsx` na raiz (fora de `app/`).
- SVGs de template em `public/` (`file.svg`, `globe.svg`, `next.svg`, `vercel.svg`, `window.svg`).
- Dependências `@react-google-maps/api` e `leaflet-routing-machine` (não usadas; apenas Leaflet).
- Trechos de UI que usavam emojis — substituídos por ícones `lucide-react`.

## Segurança e configuração

- `firebaseConfig` hardcoded foi totalmente movido para variáveis de ambiente
  `NEXT_PUBLIC_FIREBASE_*`. Os valores originais foram preservados localmente
  no histórico do desenvolvedor; **rotacione essas chaves no console do
  Firebase** assim que possível.
- URL da IA hardcoded em `motorista/page.tsx` movida para
  `NEXT_PUBLIC_IA_ENDPOINT`.
- `NEXT_PUBLIC_ORS_API_KEY` já era lida do ambiente — apenas documentada em
  `.env.example`.
- `.env.local` está em `.gitignore`.
- Todos os pontos que dependem dessas variáveis tratam a ausência com mensagens
  amigáveis (componente `EnvWarning`, status "IA não configurada", etc.) em
  vez de quebrar a UI.

## Itens que deveriam mas não fora implementados(e por quê)

1. **API Routes com Firebase Admin SDK.**
   - As rotas `api/auth/login` e `api/auth/register` foram criadas como *stubs*
     que retornam HTTP 501. O fluxo real de autenticação continua sendo
     executado no cliente via Firebase Web SDK, conforme o legado.
   - Motivo: integrar `firebase-admin` exige *service account* (chave privada),
     que precisa ser provisionada pelo time. A classifica-se o uso do
     Admin SDK como recomendado, não obrigatório.
   - Para ativar: gere uma chave de service account no Firebase, adicione as
     variáveis `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`,
     `FIREBASE_PRIVATE_KEY`, instale `firebase-admin` e substitua os stubs.
   - As rotas `api/onibus/[rota]` e `api/historico/[rota]` funcionam usando o
     Firebase Web SDK no servidor (somente leitura, sujeitas às regras do RTDB).

2. **Middleware com gating de `/aluno`, `/motorista`, `/perfil`.**
   - O Firebase Web SDK mantém a sessão no navegador (IndexedDB), inacessível
     ao middleware do Next. O gating é feito nas páginas via `useAuthUser`,
     que redireciona para `/login` quando não há usuário.
   - O middleware permanece responsável pela detecção de idioma e fica pronto
     para receber um *session cookie* assinado quando o Admin SDK for adotado.

3. **Internacionalização completa (pt/en).**
   - O cookie `lang` é detectado e gravado pelo middleware, mas a tradução de
     strings (i18n) não foi implementada — todo o texto está em português.
     Implementação completa demandaria escolher e configurar uma lib (ex.:
     `next-intl`), fora do escopo conservador desta reformulação.

4. **Fonte Kaufmann Bold BT.**
   - Não está disponível como fonte web livre. Aplicada via fallback CSS
     (`"Kaufmann Bd BT", "Kaufmann BT", "Brush Script MT", cursive`).
     Para fidelidade total, adicione o arquivo da fonte e carregue via
     `next/font/local`.

## Pequenas mudanças funcionais

- `MapComponent` agora desenha uma polyline ligando origem → paradas e lê a
  posição do ônibus do nó correto `onibus/{rotaId}` (no legado havia um leitor
  em `onibus` raiz que nunca era acionado).
- No `motorista/page.tsx`, `clearWatch` é chamado tanto ao parar a viagem
  quanto na desmontagem do componente (correção de vazamento de GPS).
- Cálculo de rotas no `aluno/page.tsx` está envolto em `setTimeout`/`clearTimeout`
  para servir como debounce ao trocar de bairro rapidamente.
- A página `/` deixou de ser tela de login. Agora exibe pesquisa de bairros e
  cartões de rota. O login fica em `/login`.

## Cores e UI

- Paleta unificada em verde + branco usando `var(--fb-green)` e Tailwind.
- Nenhum emoji em texto da interface. Ícones via `lucide-react`.
- Menu bottom (`BottomNav`) só renderiza para usuários autenticados, com 2
  itens (alunos) ou 3 itens (motoristas), com largura proporcional em mobile e
  barra lateral em desktop (≥768px).
