# Agentise Chat — Boilerplate Self-Hosted

> Plataforma open-source de automação de Instagram (estilo ManyChat). Fluxos de DM disparados por comentários em posts/reels, broadcast com janela 24h, gestão de contatos com tags e step de IA via OpenAI. Self-hosted em **Supabase + Vercel**.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black)](https://nextjs.org)
[![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ECF8E)](https://supabase.com)
[![pnpm](https://img.shields.io/badge/pnpm-9-F69220)](https://pnpm.io)

---

## ✨ Features

- **Automações disparadas por comentário** em posts e reels do Instagram
- **Step Builder visual** com 9 tipos de step (texto, imagem, quick reply, CTA, delay, IA, condição, tag, end)
- **Broadcast em lote** com segmentação por tags, janela de 24h e rate limiting Meta API (200 msgs/s)
- **Gestão de contatos** com tags, opt-out automático (PARAR/STOP) e janela de 24h por contato
- **Step de IA** via OpenAI (GPT-4.1 / GPT-4.1-mini) — chave em `.env`, sem BYOK em UI
- **Roles 2-níveis** (`admin` + `operator`) — primeiro user registrado vira `admin` automaticamente
- **Tema dark glassmorphism** fixo (sem light mode, sem white-label)
- **100% PT-BR** — toda a UI e mensagens de erro

## 🚀 Stack

| Camada | Tecnologia |
|---|---|
| Frontend | Next.js 16 (App Router) + React 19 + TypeScript 5 |
| UI | Tailwind 4 + shadcn/ui + lucide-react |
| Banco / Auth | Supabase (Postgres + Auth + RLS) |
| API Instagram | Meta Graph API (Instagram Messaging) |
| LLM | OpenAI GPT-4.1 / GPT-4.1-mini |
| Deploy | Vercel (recomendado) |
| Package manager | pnpm 9 |

> **Nota sobre arquitetura:** este projeto usa **API Routes do Next.js + Server Actions**, não Edge Functions Supabase. Cron via **Vercel Cron**, não `pg_cron`. Decisão consciente para simplificar deploy self-hosted em Vercel.

## 📋 Pré-requisitos

1. **Node 20+** e **pnpm 9+**
2. Conta **Supabase** (free tier funciona) — projeto criado, URL e keys em mãos
3. Conta **Meta Developer** com app criado — recomendado em **Live Mode** (ver seção [Modo Development](#-modo-development-da-meta-api))
4. Chave **OpenAI** (opcional — apenas se usar o step de IA)
5. Conta **Vercel** (ou outro host Next.js compatível com Vercel Cron)
6. **Supabase CLI** instalado globalmente: `npm i -g supabase`

## ⚙️ Setup local

### 1. Clone e instale dependências

```bash
git clone <seu-fork>.git agentise-chat
cd agentise-chat
pnpm install
```

### 2. Configure variáveis de ambiente

```bash
cp .env.example .env.local
```

Edite `.env.local` com as credenciais do seu projeto Supabase e Meta App.

| Variável | Onde obter |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase Dashboard → Project Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase Dashboard → Project Settings → API (**nunca expor no frontend**) |
| `META_APP_ID` | Meta for Developers → seu app → Settings → Basic |
| `META_APP_SECRET` | Meta for Developers → seu app → Settings → Basic (**nunca expor**) |
| `META_VERIFY_TOKEN` | Token aleatório de sua escolha (usado na verificação do webhook) |
| `META_REDIRECT_URI` | `https://seu-dominio.vercel.app/api/auth/meta/callback` |
| `TOKEN_ENCRYPTION_KEY` | Gerar com `openssl rand -hex 32` |
| `OPENAI_API_KEY` | OpenAI Platform → API keys |
| `CRON_SECRET` | Token aleatório (autentica chamadas dos crons Vercel) |
| `NEXT_PUBLIC_APP_URL` | URL pública da sua instância |

### 3. Aplique as migrations no Supabase

```bash
supabase login
supabase link --project-ref <seu-project-ref>
supabase db push
```

Isso aplica as 15 migrations idempotentes em `supabase/migrations/` e cria a trigger que promove o primeiro user registrado a `admin`.

### 4. Configure o Meta App

- Crie o app em https://developers.facebook.com
- Adicione produtos: **Instagram**, **Facebook Login for Business**, **Webhooks**
- Configure o webhook:
  - **Callback URL:** `https://seu-dominio.vercel.app/api/webhook/instagram`
  - **Verify Token:** mesmo valor de `META_VERIFY_TOKEN` no `.env.local`
  - **Eventos:** `comments`, `messages`, `messaging_postbacks`
- Permissões necessárias: `instagram_manage_comments`, `instagram_manage_messages`, `instagram_basic`, `pages_manage_metadata`

### 5. Rode local

```bash
pnpm dev
```

Abra http://localhost:3000 e crie a primeira conta — ela vira **admin** automaticamente via trigger SQL.

## 🧠 Tokens Meta — EAA vs IGAA (importante!)

A Meta gera **dois tokens diferentes** durante o OAuth, e cada um serve a um endpoint diferente:

| Token | Coluna | Domínio | Uso |
|---|---|---|---|
| **EAA** (Facebook Token) | `accounts.access_token` | `graph.facebook.com` | Leitura: posts, comentários, perfil, pages |
| **IGAA** (Instagram Token) | `accounts.ig_access_token` | `graph.instagram.com` | Envio de DMs (`/me/messages`) |

Ambos são cifrados em repouso via **AES-256-GCM** (`lib/crypto/tokens.ts`) usando `TOKEN_ENCRYPTION_KEY`. A renovação automática roda em dois crons separados:

- `/api/cron/token-refresh` — renova o EAA
- `/api/cron/refresh-ig-token` — renova o IGAA

Esquecer dessa distinção é a fonte mais comum de confusão para quem clona o projeto: usar o EAA para enviar DM falha silenciosamente.

## 🏗️ Deploy em Vercel

```bash
vercel link
vercel env pull .env.production
```

Configure as **mesmas variáveis** do `.env.local` no dashboard Vercel (Project → Settings → Environment Variables). **`TOKEN_ENCRYPTION_KEY` deve ser idêntica entre local e produção** se você quiser ler tokens já cifrados — mudar a chave invalida todos os tokens existentes.

Configure os crons em `vercel.json` na raiz do projeto:

```json
{
  "crons": [
    { "path": "/api/cron/poll-comments",     "schedule": "* * * * *" },
    { "path": "/api/cron/cleanup-runs",      "schedule": "0 */6 * * *" },
    { "path": "/api/cron/token-refresh",     "schedule": "0 0 * * *" },
    { "path": "/api/cron/refresh-ig-token",  "schedule": "0 0 * * *" },
    { "path": "/api/cron/broadcast",         "schedule": "*/5 * * * *" }
  ]
}
```

Cada cron deve ser autenticado pelo header `Authorization: Bearer <CRON_SECRET>` — Vercel injeta automaticamente.

## 🛠️ Modo Development da Meta API

Em **Development Mode**, webhooks de DM (`dm_text`, `dm_quick_reply`) **não são entregues** pela Meta — nem para testers. Workaround embutido:

- O cron `/api/cron/poll-comments` busca comentários recentes via Graph API a cada minuto
- `processAutomationEvent()` é disparado para cada comentário novo
- O anti-spam em `lib/automation/anti-spam.ts` previne duplicatas

**Em Live Mode** (após assessment aprovado pela Meta), os webhooks de DM voltam a funcionar normalmente. Você pode desligar o `poll-comments` ou deixá-lo rodando — o anti-spam impede execução duplicada. **Nenhuma alteração de código é necessária.**

> **Limitação conhecida em Development Mode:** após o usuário clicar em um botão de Quick Reply, o fluxo fica em `waiting_reply` e é cancelado pelo cleanup cron após 24h (porque o webhook de `dm_quick_reply` não chega). Botões CTA com link **não são afetados**.

## 👥 Roles

| Role | Permissões |
|---|---|
| `admin` | Tudo. Pode desconectar Instagram, deletar automações/contatos, gerenciar tags globais. |
| `operator` | Criar/editar fluxos, disparar broadcasts, ver dashboard, gerenciar contatos. **Não pode** deletar contas, automações ou tags. |

O **primeiro user registrado** vira `admin` automaticamente via trigger `on_auth_user_created` (migration `015_create_profiles_and_roles.sql`). Os subsequentes nascem `operator`.

Promover um user manualmente (via Supabase SQL Editor):

```sql
UPDATE user_profiles SET role = 'admin' WHERE id = '<user-uuid>';
```

> **Por que `user_profiles` e não `profiles`?** A base Supabase compartilhada deste projeto upstream já tem outra tabela `profiles` (perfis Instagram). Em fork limpo o nome pode ser alterado na migration 015.

## 📁 Estrutura

```
app/
  (auth)/                    rotas públicas (login, signup)
  (dashboard)/               rotas autenticadas (dashboard, automacoes, broadcast, …)
  api/
    webhook/instagram/       receiver Meta com verificação HMAC
    auth/meta/callback/      OAuth callback Meta
    cron/{broadcast,cleanup-runs,poll-comments,refresh-ig-token,token-refresh}/
    instagram/token/{refresh,status}/
  actions/                   server actions por domínio
components/
  ui/                        shadcn/ui base
  step-builder/              editor visual de fluxos (drag/drop, branches, DM preview)
  {automations,broadcast,contacts,conexao,dashboard,tags,settings,layout}/
lib/
  automation/                engine, executor, anti-spam, variables + 9 tipos de step
  meta/                      client, webhook HMAC, OAuth dual EAA/IGAA, mensagens
  ai/                        client OpenAI + montagem de contexto
  queue/                     fila de broadcast com rate limiting
  crypto/                    AES-256-GCM para tokens OAuth
  supabase/                  clients server/browser + types + helpers (incl. role.server.ts)
supabase/migrations/         15 migrations idempotentes (numeradas 000001–000015)
__tests__/                   4 suítes Jest (webhook HMAC, engine, anti-spam, variables)
```

## 🧪 Testes e build

```bash
pnpm lint         # ESLint
pnpm type-check   # tsc --noEmit
pnpm test         # Jest (4 suítes)
pnpm build        # Next.js production build
```

## 🛡️ Segurança — pontos-chave

- **HMAC** verificado em **todo** request do webhook Instagram (`lib/meta/webhook.ts`)
- **Tokens Meta cifrados em repouso** com AES-256-GCM (`lib/crypto/tokens.ts`)
- **Chave OpenAI nunca exposta no client bundle** (uso server-side em API Routes / Server Actions)
- **RLS** ativado em todas as tabelas com `account_id`
- **Janela de 24h** verificada antes de qualquer DM proativa
- **Opt-out** automático ao receber `PARAR`, `STOP` ou `CANCELAR`
- **Rate limiting** Meta de 200 msgs/s respeitado na fila de broadcast (`lib/queue/broadcast.ts`)

## 🤝 Contribuindo

Veja [`CONTRIBUTING.md`](CONTRIBUTING.md).

## 📜 Licença

MIT — veja [`LICENSE`](LICENSE).

---

*Agentise Chat — boilerplate self-hosted distribuído sob licença MIT. Cada fork roda sua própria instância em Supabase + Vercel.*
