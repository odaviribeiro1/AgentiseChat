# Migration Plan — agentise-chat

> Plano de migração de SaaS multi-tenant para Open Source Self-Hosted.
> Gerado em 2026-04-30 com base em `AUDIT_REPORT.md`.
> Branch de trabalho: `oss-self-hosted` | Tag de snapshot: `v0-saas-final`.

## Resumo da auditoria

- **Decisão:** MIGRAR
- **Esforço total estimado:** 7–11 horas (somando apenas as fases incluídas neste plano)
- **Qualidade média do código atual:** ~3,86 / 5 (≈ 4)
- **Acoplamento crítico identificado:** **Praticamente inexistente**. O projeto nunca foi de fato multi-tenant: não há `tenant_id`, tabelas `tenants`, RLS por tenant, lógica de subdomínio, billing, BYOK em UI ou wizard de onboarding. RLS já usa `auth.uid() = user_id` direto na tabela `accounts`. O tema `globals.css` já é o glassmorphism dark Agentise alvo. A "migração" é, em > 80%, **documentação** + **polish de DX** + (opcional) introdução de 2 roles que o modelo atual não tem.

## Domínio nuclear a preservar

**Plataforma de automação de Instagram (estilo ManyChat)** que dispara fluxos de DM a partir de comentários em posts/reels. Construtor visual de fluxos por etapas, broadcast com rate limiting + janela 24h, gestão de contatos com tags, step de IA via OpenAI.

- **Entidades centrais (preservar intactas):**
  - `accounts` — conta Instagram conectada (OAuth dual EAA/IGAA, tokens cifrados via `lib/crypto/tokens.ts`)
  - `contacts` — usuários que interagiram (`window_expires_at` para janela 24h, `opted_out`, tags)
  - `automations` + `steps` — fluxos com triggers (`comment_keyword`, `dm_keyword`, `story_reply`) e árvores com 9 tipos de step
  - `automation_runs` — execução por contato (`running` | `waiting_reply` | `completed` | `failed`)
  - `broadcasts` — disparo em lote com segmentação por tags
  - `messages` — log unificado in/out
  - `account_tags` — registro de tags por conta
- **Backend de domínio (preservar):**
  - `lib/automation/{engine,executor,anti-spam,variables}.ts` + `lib/automation/steps/*.ts`
  - `lib/meta/{client,webhook,messages,oauth,instagram,types}.ts`
  - `lib/ai/{client,context}.ts`
  - `lib/queue/broadcast.ts`
  - `lib/crypto/tokens.ts` (AES-256-GCM para tokens OAuth — manter)
  - `app/api/webhook/instagram/route.ts`
  - `app/api/cron/{poll-comments,broadcast,cleanup-runs,refresh-ig-token,token-refresh}/route.ts`
  - `app/api/auth/meta/callback/route.ts`, `app/api/instagram/token/{refresh,status}/route.ts`
  - `app/actions/{automations,broadcasts,contacts,settings,step-builder,tags}.ts`
- **Telas de domínio (preservar, todas em PT-BR):**
  - `/dashboard`, `/automacoes` (+ `/[id]/editar`), `/broadcast` (+ `/novo`, `/[id]`), `/contatos` (+ `/[id]`), `/conexao`, `/configuracoes`, `/tags`
- **Tema (preservar):** dark glassmorphism em `app/globals.css` (`#0A0A0F` base, `#3B82F6` accent, glass borders `rgba(59,130,246,0.25)`, gradient `linear-gradient(135deg, #1E3A8A, #3B82F6)`, fonte Inter).

## Fases incluídas neste plano

| # | Fase | Esforço estimado | Risco | Status |
|---|---|---|---|---|
| 0 | Branch e snapshot | 0,1h | Baixo | ✅ Concluída |
| 1 | Polish de migrations (idempotência + comentários PT-BR) | 1–2h | Baixo | ⏳ Pendente |
| 2 | Roles 2-níveis (admin + operator) com trigger first-user-becomes-admin | 2–3h | Médio | ⏳ Pendente |
| 3 | Documentação final + DX (README, LICENSE, CONTRIBUTING, .env.example, CLAUDE.md) | 3–4h | Baixo | ⏳ Pendente |
| 4 | Smoke test manual end-to-end em fork limpo | 1–2h | Médio | ⏳ Pendente |

## Fases excluídas e justificativa

| Fase do catálogo | Por que não se aplica |
|---|---|
| Remover BYOK | `AUDIT_REPORT` seção 2.E confirmou ausência de tabela `tenant_credentials`/`encrypted_keys` ou tela de configuração de keys. `lib/crypto/tokens.ts` cifra apenas tokens OAuth Meta — segurança-baseline que deve permanecer. `OPENAI_API_KEY` já vem de `.env`. |
| Remover white-label dinâmico | `AUDIT_REPORT` seção 2.C: 0 ocorrências de `--brand-primary`, `branding`, `logo_url`, `primary_color`. Tema já é fixo em `globals.css` no padrão Agentise glassmorphism dark — exatamente o alvo do boilerplate. |
| Remover `tenant_id` | `AUDIT_REPORT` seção 2.A/B: 0 ocorrências de `tenant_id`/`tenantId` em SQL, TS ou TSX. Modelo nunca foi multi-tenant; RLS já usa `auth.uid() = user_id`. |
| Achatar onboarding wizard | `AUDIT_REPORT` seção 2.F: 0 ocorrências de `OnboardingPage`/`SetupWizard`/rota `/onboarding`. Setup já é via clone + `.env` + migrations. |
| Remover billing | `AUDIT_REPORT` seção 2.D: 0 código Stripe/checkout/subscription (falsos positivos foram webhook subscription, RHF watch subscription e Supabase auth subscription). |
| Remover subdomain dinâmico | `AUDIT_REPORT` seção 2.B: 0 ocorrências de `hostname.split`, `window.location.hostname`, `subdomain`. `middleware.ts` é apenas auth gate. Domínio único já é o padrão. |
| Decidir `/setup` vs `.env` | `AUDIT_REPORT`: não existe rota `/setup`. Setup já é 100% via `.env.local` + `supabase db push`. Decisão já implementada. |
| Renomear schema Supabase para nome próprio | `AUDIT_REPORT` seção 4 / 6 recomenda **não fazer**: cenário-alvo é "1 instância = 1 cliente Supabase", e migrar `public.*` → `agentise_chat.*` adicionaria fricção sem ganho. |

## Ordem de execução e dependências

Decisão de ordenação (do mais barato/menos arriscado para o mais caro):

1. **Fase 1 (Polish de migrations)** vem primeiro porque é a única que mexe em SQL, e mexer em SQL antes de adicionar a Fase 2 (roles) evita conflitos de migration ordering. Fase 1 só normaliza o que já existe (`IF NOT EXISTS`, comentários) — risco baixo.
2. **Fase 2 (Roles 2-níveis)** vem depois da Fase 1 porque ela introduz **uma nova migration** (`015_create_profiles_and_roles.sql`) que precisa ser a última no diretório. Se feita antes da Fase 1, qualquer renumeração causaria retrabalho.
3. **Fase 3 (Documentação)** vem depois das Fases 1 e 2 porque o README precisa documentar o esquema final de migrations e o trigger de role. Se documentado antes, ficaria desatualizado em 1 dia.
4. **Fase 4 (Smoke test)** sempre por último — é a validação de que tudo encaixa em fork limpo.

Dependências cruzadas:
- Fase 2 → Fase 3: Fase 3 documenta a Fase 2 (papel admin vs operator no README).
- Fase 1 → Fase 4: smoke test faz `supabase db push` em projeto novo, depende de migrations idempotentes.
- Fase 2 → Fase 4: smoke test valida que primeiro user vira admin automaticamente.

## Como executar

Cada fase tem um arquivo correspondente em `migration/FASE-N.prompt.md`. Para executar:

1. Abra Claude Code numa nova sessão na raiz deste repositório.
2. Confirme que está na branch `oss-self-hosted`.
3. Confirme que a fase anterior está commitada (mensagem do commit segue padrão `migration(faseN): <descrição>`).
4. Cole o conteúdo de `migration/FASE-N.prompt.md`.
5. Aguarde a execução completa, incluindo o gate de validação no final.
6. Revise as mudanças. Se aprovar, faça merge em `main` apenas no final de todas as fases. Entre fases, mantém-se em `oss-self-hosted`.
7. Cada fase termina com commit feito por Claude Code com mensagem padrão.

Se uma fase falhar:
- Não abandone a branch. Use `git reset --hard` para voltar ao último commit válido.
- Releia o `FASE-N.prompt.md` e ajuste manualmente se for caso.
- Ou abra issue / converse com o autor do plano antes de prosseguir.

## Observações específicas deste projeto

- **Stack diverge da spec do prompt-mestre:** projeto é **Next.js 16** (App Router), não React + Vite. Toda a documentação (README, CLAUDE.md, CONTRIBUTING) deve refletir isso. Não tente "regredir" para Vite — Next.js é superset funcional para o caso self-hosted Vercel + Supabase. Documentar a decisão na seção "Stack" do README.
- **Não há Edge Functions Supabase.** Todo backend roda em **API Routes do Next.js** + **Server Actions**. Cron é via Vercel Cron, não pg_cron + pg_net. README precisa explicar como configurar `vercel.json` com `crons[]`.
- **Tokens Meta dual EAA + IGAA:** documentado em `.claude/CLAUDE.md` seção "Decisões Técnicas Tomadas". README de boilerplate **deve** repetir essa explicação — é a fonte mais comum de confusão para quem clona o projeto.
- **Limitação Development Mode:** o cron `/api/cron/poll-comments` existe como workaround para Meta App em Development. README deve explicar que **em Live Mode aprovado** o polling pode ser desligado (mas é seguro deixar — não duplica eventos por causa do anti-spam em `lib/automation/anti-spam.ts`).
- **`TOKEN_ENCRYPTION_KEY` em `.env.local.example`** vem vazio com instrução `openssl rand -hex 32`. Manter assim — é a melhor prática.
- **Modelo de roles atual = nenhum.** Hoje cada usuário Supabase é "owner" implícito de seus `accounts`. A Fase 2 introduz `profiles.role` ('admin' | 'operator') + trigger. O usuário pode escolher não rodar a Fase 2 se quiser manter o modelo atual single-user — nesse caso, pular direto para a Fase 3 e ajustar o README para refletir "instância single-user". **Default: rodar Fase 2** porque o prompt-mestre da migração pede 2 roles.
- **`__tests__/setup.ts` + 4 suítes Jest** existem. Smoke test (Fase 4) inclui rodar `pnpm test` para confirmar zero regressão.
- **`.claude/` deve ficar versionado** no boilerplate distribuído (forks com Claude Code recebem o briefing automaticamente). Conferir `.gitignore` na Fase 3.
- **`.env.local` (real)** existe com chaves reais e **está no `.gitignore`** (`.env.local.example` é o que vai pro repo). Confirmar antes de qualquer push público.
