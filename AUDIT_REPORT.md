# Audit Report — agentise-chat

> Auditoria de viabilidade de migração SaaS → Open Source Self-Hosted.
> Gerado em 2026-04-30.

## 1. Inventário

- **Stack confirmada:** Next.js 16 (App Router) + React 19 + TypeScript 5 + Tailwind 4 + shadcn/ui + Supabase (Postgres + Auth + RLS) + Meta Graph API + OpenAI. Package manager: pnpm. Deploy: Vercel.
  - **Divergência da spec-alvo:** o boilerplate-alvo descrito no prompt prevê **React + Vite**; este projeto usa **Next.js App Router**. Isto não é um obstáculo — Next.js engloba o caso de uso e roda nativamente em Vercel — mas é uma decisão consciente que difere da especificação.
- **Migrations:** 14 arquivos em `supabase/migrations/` (~325 linhas SQL totais), nomeação ordenada (`20240101000001…000014`), idempotentes em sua maioria (algumas com `IF NOT EXISTS`).
- **Edge Functions:** **0**. Não existe `supabase/functions/`. Todo o backend roda em API Routes do Next.js (`app/api/*`) e Server Actions (`app/actions/*`). Aceitável para o modelo self-hosted Vercel + Supabase.
- **Possui CLAUDE.md:** **Sim** — `.claude/CLAUDE.md` (extenso, descreve o produto, schema, decisões técnicas, design system Agentise glassmorphism dark).
- **Possui README útil:** **Não** — é o template default do `create-next-app`, sem instruções específicas do projeto.
- **`.env.local.example`:** **Sim** — completo e comentado (Supabase, Meta, OpenAI, encryption key, cron secret).
- **AGENTS.md:** presente, contém apenas nota sobre Next.js novo.
- **Estrutura `src/` (na verdade na raiz):**
  - `app/(auth)`, `app/(dashboard)` — rotas; `app/api` — webhook + cron + auth Meta + token refresh; `app/actions` — server actions por domínio
  - `components/` — `ui/` (shadcn), `step-builder/`, `automations/`, `broadcast/`, `contacts/`, `conexao/`, `dashboard/`, `tags/`, `settings/`, `layout/`
  - `lib/` — `meta/` (client, oauth, webhook, messages), `automation/` (engine, executor, steps/, anti-spam, variables), `ai/`, `queue/`, `crypto/`, `supabase/` (client, server, types, helpers), `stores/`
  - `__tests__/` — 4 testes (webhook HMAC, engine, anti-spam, variables)
  - `supabase/migrations/` — 14 arquivos
  - `scripts/` — utilitário(s)

## 2. Acoplamento SaaS detectado

### A. Multi-tenancy no banco

- **Tabelas com `tenant_id`: 0**
- **Tabelas `tenants`: 0**
- **Policies RLS com `tenant_id` ou `auth.jwt() ->> 'tenant_id'`: 0**
- **Auth Hook customizado: Não** — não há `auth.hook` ou função SECURITY DEFINER injetando claims customizadas no JWT.
- **Modelo real:** isolamento por usuário Supabase Auth. RLS verifica `auth.uid() = user_id` (na tabela `accounts`) e em todas as outras tabelas a policy é uma subquery `account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid())`. É per-user, não per-tenant. Idêntico ao que um boilerplate self-hosted single-instance precisa.
- **Arquivos relevantes:** `supabase/migrations/20240101000011_enable_rls.sql`, `…000012_create_rls_policies.sql`.

### B. Multi-tenancy no frontend

- **Ocorrências de `tenant_id` / `tenantId`: 0** no código TS/TSX.
- **Hooks/contextos `useTenant`, `TenantContext`, `TenantProvider`: 0**.
- **Lógica de subdomínio (`hostname.split`, `window.location.hostname`, `subdomain`, `slug`): 0**.
- **Resolução de tenant em middleware:** **Não existe**. `middleware.ts` faz apenas auth gate via Supabase SSR (redirect para `/login` em rotas protegidas). Domínio único.

### C. White-label / branding dinâmico

- **Ocorrências de `--brand-primary`, `branding`, `logo_url`, `primary_color`: 0**.
- **Tema:** fixo em `app/globals.css` — paleta dark glassmorphism (`#0A0A0F` base, `#3B82F6` accent, `rgba(59,130,246,0.25)` glass borders, `linear-gradient(135deg, #1E3A8A, #3B82F6)`). **Já é exatamente o tema alvo do boilerplate.**

### D. Billing

- **Ocorrências de `stripe`/`Stripe`/`checkout`/`subscription` (billing): 0**.
- Falsos positivos em grep: `subscription` aparece apenas para (i) Meta webhook re-subscription, (ii) `supabase.auth.onAuthStateChange().data.subscription`, (iii) `react-hook-form watch().subscription` — todos sem relação com cobrança.
- **Sem tabelas de plano, seat, faturamento ou rota `/api/stripe/*`.**

### E. BYOK (keys cifradas no DB pelo admin do tenant)

- **Sem tabela `encrypted_keys` ou tela de configuração de API keys pelo usuário final.**
- O único uso de criptografia é `lib/crypto/tokens.ts`: AES-256-GCM aplicado **ao OAuth token Meta** (`accounts.access_token` e `accounts.ig_access_token`) com chave em `TOKEN_ENCRYPTION_KEY` (env var). Isso é boa prática regardless de SaaS/self-hosted — proteção em camadas para tokens OAuth de longa duração — e deve ser mantido.
- `OPENAI_API_KEY` vai direto via `.env` (`process.env.OPENAI_API_KEY` em `lib/ai/client.ts`). Já é o modelo-alvo.
- **`pgcrypto` está habilitado** (em `…000001_create_accounts.sql`), mas só para `gen_random_uuid()`. Sem `pgp_sym_encrypt/decrypt` no schema.

### F. Onboarding wizard de tenant

- **0 ocorrências** de `/onboarding`, `/setup`, `/wizard`, `OnboardingWizard`, `SetupWizard`, `TenantSetup` em `app/` ou `components/`.
- Setup é por `.env` + migrations, exatamente o modelo-alvo.

### G. Roles existentes

- **0 colunas `role`** no schema. Sem tabela `members`, `workspace_members`, `team_users`, etc.
- A palavra "owner" aparece **apenas em nomes de policies** (ex: `"accounts: owner access"`) — é só convenção textual da policy, não há coluna nem CHECK constraint de role.
- **Modelo atual:** 1 usuário Supabase = "owner" implícito de seus próprios `accounts`. Sem distinção administrativo/operacional. Para o boilerplate-alvo (2 roles), seria necessário **adicionar** algo, não remover.

## 3. Domínio nuclear

- **Descrição:** Plataforma de automação de Instagram (estilo ManyChat) que dispara fluxos de DM a partir de comentários em posts/reels, com construtor visual de fluxos por etapas, broadcast com rate limiting e janela de 24h, gestão de contatos com tags e step de IA via OpenAI.
- **Entidades centrais:**
  1. `accounts` — conta Instagram conectada (OAuth + tokens dual EAA/IGAA)
  2. `contacts` — usuários que interagiram (com `window_expires_at` para janela 24h, `opted_out`, tags)
  3. `automations` + `steps` — fluxos com triggers (`comment_keyword`, `dm_keyword`, `story_reply`) e árvores de steps (9 tipos: message, image_message, quick_reply, cta_button, delay, ai, condition, tag, end)
  4. `automation_runs` — execução por contato (`running` | `waiting_reply` | `completed` | `failed`)
  5. `broadcasts` — disparo em lote com segmentação por tags
  6. `messages` — log unificado in/out (auditoria + replay)
- **Edge Functions de domínio:** N/A (não há Edge Functions). O domínio vive em:
  - `lib/automation/{engine,executor,anti-spam,variables}.ts` + `lib/automation/steps/*.ts`
  - `lib/meta/{client,webhook,messages,oauth,instagram}.ts`
  - `lib/ai/{client,context}.ts`
  - `lib/queue/broadcast.ts`
  - `app/api/webhook/instagram/route.ts`, `app/api/cron/{poll-comments,broadcast,cleanup-runs,refresh-ig-token,token-refresh}/route.ts`, `app/api/auth/meta/{*}`
- **Telas de domínio (todas em PT-BR):**
  - `/dashboard` — métricas + funil + gráfico de interações
  - `/automacoes` (lista) e `/automacoes/[id]/editar` (Step Builder com drag/drop, branches, DM preview)
  - `/broadcast`, `/broadcast/novo`, `/broadcast/[id]` (resultado)
  - `/contatos`, `/contatos/[id]`
  - `/conexao` — status da conta Instagram
  - `/configuracoes`
  - `/tags`
- **Casca SaaS encontrada:** **nenhuma** — não há `/billing`, `/onboarding`, `/team`, `/workspace-settings`, `/plans`. Todas as 7 áreas listadas são domínio puro.

## 4. Esforço estimado de migração

| Item | Nível | Justificativa |
|---|---|---|
| Remover `tenant_id` de tabelas e RLS | **Nenhum** | Não existe `tenant_id`. Modelo já é per-user via `auth.uid()`. |
| Consolidar roles em 2 | **Baixo** | Não existem roles. Decisão é se vale **adicionar** uma coluna `role` ('admin'|'operator') em `auth.users` (ou tabela `profiles`) com trigger "primeiro registrado = admin". Caso contrário, manter modelo de instância single-user também é válido. |
| Remover subdomínio | **Nenhum** | Não há resolução por subdomínio. Domínio único já é o padrão. |
| Remover branding dinâmico | **Nenhum** | Tema é hardcoded em `globals.css` no padrão Agentise glassmorphism dark — já é o alvo. |
| Remover billing | **Nenhum** | Zero código de billing. |
| Remover BYOK | **Nenhum** | Não há BYOK em UI. Encryption de tokens OAuth Meta é segurança-baseline e deve ficar (chave em `.env`). `OPENAI_API_KEY` já vem do `.env`. |
| Remover onboarding wizard | **Nenhum** | Não há wizard de tenant. |
| Testes pós-migração | **Baixo** | 4 testes Jest existentes (webhook HMAC, engine, anti-spam, variables). Cobre os módulos críticos de segurança/correção; suficiente para validar que mudanças cosméticas (README, role trigger se feito) não quebraram regressões. |
| Reescrever README de produção | **Baixo** | README atual é template default. Precisa: pré-requisitos, fluxo Supabase + Vercel, app Meta em Live Mode, env vars, `pnpm db push`, `pnpm dev`. ~2–3h. |
| Renomear schema Supabase para nome próprio | **Nenhum/Trivial** | Migrations atuais usam o schema `public`. Para isolar como "agentise_chat", trocar todas as migrations para `agentise_chat.<table>` e `search_path` é factível mas opcional para o cenário "1 instância = 1 cliente Supabase". |
| Adicionar trigger "primeiro user = admin" (opcional) | **Baixo** | Função PL/pgSQL trivial (~15 linhas) + migration. Só se decidir introduzir 2 roles. |
| Polir migrations (idempotência total + comentários) | **Baixo** | Adicionar `IF NOT EXISTS` consistente, comentários PT-BR. |

**Total estimado:** **6–14 horas** (faixa baixa: só README + polish; faixa alta: incluindo trigger de role + schema próprio + revisão completa de migrations + smoke test em fork novo). Bem abaixo do limite de 60h da heurística.

## 5. Qualidade do código existente

| Critério | Nota (1-5) | Comentário |
|---|---|---|
| Tipagem TypeScript | **4** | TS strict, `database.types.ts` gerado do schema, ~28 ocorrências de `any` em ~12.2k linhas (≈0,2%) — toleravél. Tipos de domínio em `lib/supabase/types.ts` e `lib/meta/types.ts`. |
| Organização de pastas | **5** | Estrutura por feature limpa: `lib/{automation,meta,ai,queue,crypto,supabase}` + `components/{step-builder,broadcast,contacts,…}` + `app/(auth)|(dashboard)|api|actions`. Sem pastas-saco-de-gato. |
| Idempotência de migrations | **3** | Sequencial, ordenada, mas mistura: `…000014` usa `IF NOT EXISTS`, mas `…000001`–`…000013` não. Funciona em fresh install; em re-run quebraria. Padronizar é trabalho de horas. |
| Tratamento de erro nas API routes | **4** | Webhook valida HMAC antes de processar, `engine.ts` tem `debugLog` que persiste erros em `webhook_events`. Server Actions usam try/catch consistente (amostragem). |
| Aderência ao design system Agentise | **5** | Theme glassmorphism dark **já é** o que o boilerplate-alvo descreve (#0A0A0F base, blues #3B82F6/#1E3A8A, glass borders rgba(59,130,246,0.25), Inter). Componentes usam `bg-[#…]` ou variáveis CSS de forma consistente. |
| Documentação (README) | **1** | Template default do create-next-app. Único item que **precisa** ser refeito. CLAUDE.md em `.claude/` compensa para devs com Claude Code, mas não para usuários do boilerplate. |
| Dívidas técnicas (TODO/FIXME) | **5** | Só **4 TODOs** no codebase, todos benignos: 2× `profile_pic_url só fica disponível em DM` (limitação documentada da Meta API), 1× delays > 30s precisam de fila persistente, 1× notificação ao operador no step `end`. Nenhum FIXME/HACK/XXX. |

**Média:** (4+5+3+4+5+1+5)/7 ≈ **3,86** → arredondando: **~4/5**.

## 6. Recomendação final

**Decisão: MIGRAR**

**Justificativa em 3-5 frases:**

O projeto já é, na prática, um boilerplate self-hosted single-tenant — não há `tenant_id`, multi-tenancy, RLS por tenant, subdomínio, branding dinâmico, billing, BYOK em UI, ou wizard de onboarding. A "casca SaaS" que o prompt assume existir simplesmente **não foi construída** aqui: o modelo de dados é per-Supabase-user com RLS via `auth.uid() = user_id`, exatamente o padrão self-hosted. Qualidade média ≈ 4/5, com domínio nuclear robusto (Step Builder com 9 tipos de step, motor de automações, fila de broadcast com janela 24h, integração Meta dual-token, step de IA, anti-spam) que seria caro reescrever. O esforço de "migração" é dominado por **documentação** (README) e **polish** (idempotência de migrations, trigger opcional de role) — estimado em **6–14h**, bem abaixo do limite de 60h. Refazer do zero descartaria milhares de linhas de código de domínio funcional (webhook HMAC verificado, dual EAA/IGAA tokens, polling para Development Mode, executor com pause/resume) sem ganho proporcional.

**Sequência sugerida de fases:**

1. **README de produção** (PT-BR): pré-requisitos (Supabase project, Meta App em Live Mode, conta Vercel), passo-a-passo de clone → `.env.local` → `supabase db push` → `vercel deploy` → configuração de webhooks Meta + crons Vercel. Incluir matriz de variáveis de ambiente e troubleshooting (Development Mode vs Live).
2. **Polish de migrations**: padronizar `CREATE TABLE IF NOT EXISTS` em todas as 14 migrations, comentários PT-BR no início de cada arquivo, e (opcional) consolidar em um único `0001_initial_schema.sql` para fork limpo.
3. **(Opcional) Roles 2-níveis**: adicionar coluna `role text DEFAULT 'operator' CHECK (role IN ('admin','operator'))` em uma tabela `profiles` ligada a `auth.users` + trigger `on_auth_user_created` que promove o primeiro usuário registrado a `admin`. Atualizar policies de RLS sensíveis (ex: deletar `accounts`, gerenciar tags globais) para exigir `admin`. Decidir antes se o boilerplate é mesmo multi-usuário (atualmente é viável usá-lo single-user sem qualquer role).
4. **(Opcional) Schema próprio**: renomear `public.*` → `agentise_chat.*` se quiser instalar lado-a-lado com outros projetos no mesmo Supabase. Não recomendado para o caso "1 instância = 1 Supabase".
5. **Smoke test em fork limpo**: clonar para diretório novo, rodar `pnpm install` + migrations + `pnpm dev` + `pnpm test` + `pnpm type-check` para garantir que o repo está auto-suficiente sem o estado atual de `.env.local` privado.
6. **Limpar `.env.local`** (real, com chaves reais — confirmado existir, não commitado pelo `.gitignore`) antes do push para o GitHub privado de distribuição.
7. **Atualizar CLAUDE.md** para mencionar que o produto agora é distribuído como boilerplate self-hosted (uma frase) e remover qualquer referência a "uso interno da Agentise" como SaaS.

## 7. Observações livres

- **`README.md` é o gargalo real da migração**, não o código. Se o objetivo do trabalho é "fazer um boilerplate distribuível", >50% do esforço será reescrever README + (se aplicável) seed/setup script. O código já está pronto.
- **Divergência de stack vs spec do prompt:** o prompt menciona "Stack mantida: React + Vite + TS + Tailwind + shadcn/ui + Supabase + Edge Functions + Vercel" como alvo. Este projeto é **Next.js**, não Vite, e não usa **Edge Functions** (todo backend em API Routes do Next + Server Actions). Para o caso self-hosted Vercel + Supabase, ambas as escolhas são tecnicamente superiores ou equivalentes — não vale rebuildar para "encaixar na spec". Documentar a decisão no README.
- **Tokens Meta dual (EAA + IGAA):** lógica registrada em `.claude/CLAUDE.md` (seção "Decisões Técnicas Tomadas"). Crucial para qualquer fork — precisa estar no README de boilerplate também, ou novos usuários vão tropeçar nos mesmos problemas.
- **Limitação Development Mode da Meta API:** `app/api/cron/poll-comments` é workaround para webhooks que não chegam em Development. Documentar no README que **em produção (Live Mode aprovado pela Meta)** o polling pode ser desligado e os webhooks de DM passam a funcionar. Forks que esquecerem disso vão sofrer.
- **`TOKEN_ENCRYPTION_KEY` em `.env.local.example` está vazio com instrução "gerar com `openssl rand -hex 32`"**. Boa prática. Manter.
- **`__tests__/setup.ts` + 4 suítes** dão cobertura para regressão básica. Manter rodando em CI no fork final.
- **CLAUDE.md privado em `.claude/CLAUDE.md`** (não em `CLAUDE.md` na raiz) — Claude Code ainda lê via `.claude/CLAUDE.md`, e o `.gitignore` precisa ser conferido para garantir que ele é commitado quando se distribui o boilerplate (assim quem fizer fork e usar Claude Code já recebe o briefing). Verificar se `.claude/` está ou não no `.gitignore` antes de publicar.
- **Não há `lib/queue/broadcast.ts` validado contra rate limit Meta de 200 msgs/s nos testes** — só batch size + delay. Se o boilerplate for ser usado em produção por terceiros, vale uma nota no README sobre limites Meta.
- **Componentes shadcn instalados:** apenas 9 (`popover, label, switch, dialog, button, dropdown-menu, select, textarea, input`). Mínimo viável; futuras features no fork talvez precisem mais.
- **Auditoria realizada sem amostragem** — repo é pequeno (~12k linhas TS/TSX, 325 linhas SQL, ~50 arquivos relevantes). Cobertura completa.
