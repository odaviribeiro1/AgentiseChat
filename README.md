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

Este projeto é self-hosted. Cada usuário roda sua própria instância em **Supabase + Vercel**. Setup completo em ~15 minutos.

### Caminho recomendado: setup automático via Claude Code

Se você tem [Claude Code](https://claude.com/claude-code) instalado, esse é o caminho mais simples — Claude Code lê o [`START.md`](./START.md) deste repositório, te pergunta cada credencial, valida tudo, aplica as migrations e cria seu admin sozinho.

1. Crie um projeto novo no Supabase em https://supabase.com/dashboard
2. Faça fork deste repositório no GitHub
3. Clone seu fork: `git clone https://github.com/<seu-usuario>/agentise-chat.git`
4. Entre na pasta: `cd agentise-chat`
5. Abra Claude Code: `claude`
6. Digite na sessão: **"Leia o arquivo START.md e execute tudo"**
7. Responda às perguntas — Claude Code valida cada credencial, cria `.env.local`, aplica as 15 migrations e cria o admin
8. Ao final, Claude Code te entrega a lista exata de Environment Variables para colar na Vercel
9. Faça o deploy na Vercel seguindo o checklist do passo 8 e configure o webhook Meta

Veja [`START.md`](./START.md) para a lista de credenciais que você precisa ter em mãos antes de começar.

### Caminho manual (sem Claude Code)

Se prefere fazer tudo no terminal:

```bash
git clone https://github.com/<seu-usuario>/agentise-chat.git
cd agentise-chat
cp .env.example .env.local
# edite .env.local preenchendo cada variável (veja comentários no arquivo)
pnpm install

# linka este projeto ao seu Supabase e aplica migrations
npx supabase login
npx supabase link --project-ref <seu-project-ref>
npx supabase db push
```

Depois faça o deploy do frontend na Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new)

1. Importe seu fork em [vercel.com/new](https://vercel.com/new)
2. Na tela de Environment Variables, preencha todas as variáveis do seu `.env.local` (omitindo as do grupo "GitHub Actions / Scripts", que são opcionais)
3. Clique em Deploy
4. Após o primeiro deploy, volte em Settings → Environment Variables e ajuste `NEXT_PUBLIC_APP_URL`, `META_REDIRECT_URI` e `META_WEBHOOK_URL` com o domínio real, e Redeploye
5. Configure o webhook no Meta App: Callback URL = `META_WEBHOOK_URL`, Verify Token = `META_VERIFY_TOKEN`, eventos `comments`, `messages`, `messaging_postbacks`
6. Acesse a URL Vercel e crie sua primeira conta — ela vira **admin** automaticamente via trigger SQL

### Valores que você precisa gerar

- `TOKEN_ENCRYPTION_KEY` → `openssl rand -hex 32` (64 hex chars, idêntica entre local e produção)
- `CRON_SECRET` → `openssl rand -hex 32`
- `META_VERIFY_TOKEN` → `openssl rand -hex 24` (token aleatório de sua escolha)

Pré-requisitos do caminho manual: Node 20+, pnpm 9+, Supabase CLI (`npm i -g supabase`).

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
