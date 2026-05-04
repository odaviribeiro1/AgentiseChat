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

## 🚀 Como rodar (passo a passo)

Este é um boilerplate open source self-hosted. Siga estes **6 passos** para ter sua instância rodando em produção em ~30 minutos. Você não precisa editar uma única linha de código.

### 1. Crie um projeto no Supabase

1. Acesse [supabase.com](https://supabase.com) e crie um novo projeto
2. Escolha região, defina senha do banco e plano Free
3. Aguarde o provisionamento (~2 minutos)
4. Anote, em **Project Settings → API**:
   - **Project URL** (`https://xxxxx.supabase.co`)
   - **anon public key**
   - **service_role key** (mantenha em segredo — bypassa RLS)

### 2. Faça fork deste repositório e aplique as migrations

1. Clique em **Fork** no topo desta página
2. Aplique as 15 migrations idempotentes da pasta `supabase/migrations/` no seu projeto Supabase. Você tem três caminhos:
   - **Caminho A — Supabase Dashboard:** abra **SQL Editor** e cole o conteúdo de cada arquivo `.sql` em ordem (do `000001` ao `000015`).
   - **Caminho B — GitHub Actions (recomendado):** configure no fork (em **Settings → Secrets and variables → Actions**) os secrets `SUPABASE_ACCESS_TOKEN` ([gere aqui](https://supabase.com/dashboard/account/tokens)) e `SUPABASE_PROJECT_REF` (Supabase Dashboard → Project Settings → General). Em seguida vá na aba **Actions → Apply Supabase Migrations → Run workflow**. A partir daqui qualquer push em `supabase/migrations/**` redeploya automaticamente.
   - **Caminho C — CLI local:** `supabase login && supabase link --project-ref <seu-ref> && supabase db push`.

> A migration `000015_create_profiles_and_roles.sql` instala o trigger que promove o **primeiro usuário registrado a admin** automaticamente.

### 3. Configure seu app Meta (Facebook for Developers)

1. Acesse [developers.facebook.com/apps](https://developers.facebook.com/apps) e crie um novo app
2. Adicione os produtos: **Instagram**, **Facebook Login for Business**, **Webhooks**
3. Em **Settings → Basic**, anote o **App ID** e **App Secret**
4. Permissões necessárias para revisão (assessment): `instagram_basic`, `instagram_manage_comments`, `instagram_manage_messages`, `pages_manage_metadata`
5. Você vai voltar aqui no passo 5 para configurar o webhook após o deploy

### 4. Deploy do frontend na Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Em [vercel.com/new](https://vercel.com/new), importe seu fork
2. A Vercel detecta Next.js automaticamente (não precisa mudar build/install)
3. Na tela de configuração, preencha as **Environment Variables** (referência completa em `.env.example`):

   **Frontend (Group A — `NEXT_PUBLIC_*`)**
   - `NEXT_PUBLIC_SUPABASE_URL` — Project URL do passo 1
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` — anon key do passo 1
   - `NEXT_PUBLIC_APP_URL` — você ainda não tem; deixe em branco e preencha após o primeiro deploy com a URL gerada

   **Server-only (Group B)**
   - `SUPABASE_SERVICE_ROLE_KEY` — service_role do passo 1
   - `META_APP_ID` — passo 3
   - `META_APP_SECRET` — passo 3
   - `META_VERIFY_TOKEN` — gere com `openssl rand -hex 24`
   - `META_REDIRECT_URI` — preencha após o primeiro deploy: `https://<dominio-vercel>/api/auth/meta/callback`
   - `META_WEBHOOK_URL` — preencha após o primeiro deploy: `https://<dominio-vercel>/api/webhook/instagram`
   - `TOKEN_ENCRYPTION_KEY` — gere com `openssl rand -hex 32` (64 chars hex). **Guarde em local seguro** — perder esta chave invalida todos os tokens cifrados no banco
   - `CRON_SECRET` — gere com `openssl rand -hex 32`
   - `OPENAI_API_KEY` — obtenha em [platform.openai.com/api-keys](https://platform.openai.com/api-keys) (opcional, só necessário se usar o step de IA)

4. Clique em **Deploy** e aguarde (~2 minutos)
5. Anote a URL gerada (ex: `meu-projeto.vercel.app`) e:
   - Volte em **Settings → Environment Variables** e preencha `NEXT_PUBLIC_APP_URL`, `META_REDIRECT_URI` e `META_WEBHOOK_URL` com a URL real
   - Vá em **Deployments → ⋯ → Redeploy** para aplicar as novas variáveis
6. Os crons declarados em `vercel.json` são habilitados automaticamente — verifique em **Settings → Cron Jobs**

### 5. Configure o webhook no Meta App

De volta ao app no Meta for Developers:

1. Vá em **Webhooks → Instagram**
2. Configure:
   - **Callback URL:** o valor de `META_WEBHOOK_URL` (passo 4)
   - **Verify Token:** o mesmo valor de `META_VERIFY_TOKEN` (passo 4)
3. Clique em **Verify and Save** — a Meta vai chamar `GET /api/webhook/instagram` no seu deploy e validar o token
4. Inscreva-se nos eventos: `comments`, `messages`, `messaging_postbacks`
5. Em **Use Cases → Manage Permissions**, autorize as 4 permissões do passo 3

### 6. Crie sua conta de administrador

1. Acesse a URL gerada pela Vercel
2. Crie uma conta com email e senha
3. **O primeiro usuário cadastrado vira admin automaticamente** (via trigger SQL)
4. Conecte sua conta do Instagram em **Conexão → Conectar Instagram**
5. Pronto — crie sua primeira automação em **Automações**

---

## 🛠️ Modo dev (avançado)

Para desenvolvimento local com hot reload:

```bash
git clone https://github.com/<seu-usuario>/<seu-fork>.git agentise-chat
cd agentise-chat
cp .env.example .env.local      # preencha .env.local com seus valores
pnpm install
pnpm dev
```

Acesse http://localhost:3000.

Pré-requisitos:

- **Node 20+** e **pnpm 9+**
- (opcional) **Supabase CLI** se for aplicar migrations via CLI: `npm i -g supabase`

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

## 🏗️ Notas de deploy Vercel

Os crons já estão declarados em `vercel.json` na raiz do projeto e são habilitados automaticamente após o deploy. Cada cron é autenticado pelo header `Authorization: Bearer <CRON_SECRET>` — a Vercel injeta automaticamente nos crons declarados.

> **Atenção a `TOKEN_ENCRYPTION_KEY`:** ela cifra todos os tokens OAuth Meta no banco. Mudá-la invalida todos os tokens cifrados existentes — mantenha a mesma chave entre local e produção (e entre redeploys).

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
