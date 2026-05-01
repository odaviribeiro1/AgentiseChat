# Smoke Test Report — Fase 4

> Validação final da migração SaaS → Open Source Self-Hosted.
> Executado em: 2026-05-01
> Branch: `oss-self-hosted` | Commits desde `v0-saas-final`: 4
> Repositório: `agentise-chat`

## Resultado consolidado

✅ **APROVADO**

Todos os 11 passos do roteiro saíram ✅. Build, type-check e suíte de testes
(4 suítes / 27 testes) passam sem warnings relevantes. Migrations idempotentes,
roles 2-níveis (admin/operator) ativas, tema dark glassmorphism preservado,
fluxos de domínio (OAuth Meta, webhook HMAC, envio de DM via IGAA, anti-spam,
roles guard) intactos. `.env.local` existe localmente mas está corretamente
ignorado pelo `.gitignore`. Boilerplate pronto para distribuição.

## Resultados por passo

### Passo 1 — Cleanliness
- Status: ✅
- Evidência:
  - `git ls-files | grep ^\.env\.local$` → vazio (não rastreado)
  - `git ls-files` listou: `.env.example`, `.env.local.example` (rastreados)
  - `git ls-files .claude/CLAUDE.md` → `.claude/CLAUDE.md` (rastreado)

### Passo 2 — Estrutura
- Status: ✅
- Evidência:
  - Raiz contém: `README.md` (10494 bytes), `LICENSE` (1065 bytes), `CONTRIBUTING.md` (3388 bytes), `MIGRATION_PLAN.md` (9657 bytes), `AUDIT_REPORT.md` (17459 bytes)
  - `supabase/migrations/`: 15 arquivos (`20240101000001…000015`), inclui `20240101000015_create_profiles_and_roles.sql`
  - `migration/`: `FASE-1.prompt.md`, `FASE-2.prompt.md`, `FASE-3.prompt.md`, `FASE-4.prompt.md`

### Passo 3 — Migrations
- Status: ✅
- Evidência:
  - Cabeçalhos PT-BR confirmados em 0001 (`-- Migration 0001: Cria a tabela accounts...`), 0005 (`broadcasts`) e 0009 (`ai_usage`)
  - `grep -L "IF NOT EXISTS" supabase/migrations/*_create_*.sql` → vazio (todos têm)
  - `grep -c "DROP POLICY IF EXISTS" 20240101000012_create_rls_policies.sql` → **10** (esperado ≥ 8)
  - Migration 015 contém os 4 elementos: `CREATE TABLE IF NOT EXISTS user_profiles`, `CREATE OR REPLACE FUNCTION public.is_admin()`, `CREATE TRIGGER on_auth_user_created`, e 3 policies `AS RESTRICTIVE FOR DELETE` em `accounts`, `automations`, `account_tags`

### Passo 4 — Build e tipos
- Status: ✅
- Evidência:
  - `pnpm type-check` → `tsc --noEmit` sem saída (zero erros)
  - `pnpm build` → `Compiled successfully`, geração estática 27/27, todas as rotas listadas (incluindo `/api/cron/{poll-comments,broadcast,cleanup-runs,refresh-ig-token,token-refresh}` e Middleware ativo)

### Passo 5 — Testes
- Status: ✅
- Evidência:
  - `pnpm test` → **Test Suites: 4 passed, 4 total / Tests: 27 passed, 27 total** em 0.374s
  - Suítes cobrem: webhook HMAC, engine, anti-spam, variables (e adicionais)

### Passo 6 — README ↔ código
- Status: ✅
- Comandos pnpm mencionados no README: `pnpm build`, `pnpm dev`, `pnpm install`, `pnpm lint`, `pnpm test`, `pnpm type-check`
- Comandos pnpm existentes em `package.json scripts`: `dev`, `build`, `start`, `lint`, `test`, `test:watch`, `type-check`
- Discrepâncias: nenhuma (`install` é built-in do pnpm)
- Crons mencionados em README ↔ `app/api/cron/`:
  - `/api/cron/poll-comments` ✅
  - `/api/cron/cleanup-runs` ✅
  - `/api/cron/token-refresh` ✅
  - `/api/cron/refresh-ig-token` ✅
  - `/api/cron/broadcast` ✅
- Observação: `vercel.json` atual contém apenas `buildCommand`/`installCommand`. O bloco `crons[]` está documentado no README como exemplo a ser **adicionado pelo usuário do fork** durante o deploy — comportamento intencional do boilerplate.

### Passo 7 — Sem multi-tenancy residual
- Status: ✅
- Evidência: `grep -rn "tenant_id|tenantId|TenantContext|workspace_id|workspaceId"` em `*.ts|*.tsx|*.sql|*.md` retornou apenas 2 matches em `migration/FASE-4.prompt.md` (o próprio texto do passo 7 do roteiro, falando *sobre* o grep). Zero ocorrências em código de produção, schema SQL ou docs novos.

### Passo 8 — Roles
- Status: ✅
- Evidência:
  - Migration 015 linha: `role text NOT NULL DEFAULT 'operator' CHECK (role IN ('admin', 'operator'))`
  - `requireAdmin` importado em **3 server actions**: `app/actions/settings.ts`, `app/actions/automations.ts`, `app/actions/tags.ts`
  - `lib/supabase/types.ts` exporta: `ProfileRow = Database['public']['Tables']['user_profiles']['Row']` e `UserRole = 'admin' | 'operator'`

### Passo 9 — Tema
- Status: ✅
- Evidência (`app/globals.css`):
  - `--bg-main: #0A0A0F`
  - `--blue-primary: #3B82F6`
  - `--glass-border: rgba(59, 130, 246, 0.25)`
  - `--glass-bg: linear-gradient(135deg, rgba(59, 130, 246, 0.08), rgba(59, 130, 246, 0.02))`
  - Light mode: único match na linha 53 é o comentário `Dark mode ONLY — light mode removed` (confirma remoção, não vestígio)

### Passo 10 — Fluxos de domínio
- **OAuth Meta** ✅ — `app/api/auth/meta/callback/route.ts:55,63,70,85,96`: `getLongLivedToken` → `getInstagramProfile` → `getUserPages` → `subscribeAppToPage` → `encryptToken` (importado de `@/lib/crypto/tokens`) → INSERT em `accounts` com `access_token` cifrado. `app/api/auth/meta/route.ts` faz o `start` do fluxo.
- **Webhook** ✅ — `app/api/webhook/instagram/route.ts:2,4,54,158`: importa `verifyWebhookSignature` (`lib/meta/webhook.ts:14`) e `processAutomationEvent` (`lib/automation/engine.ts:15`). Verifica HMAC antes de processar; chama engine após persistir o evento.
- **Envio de DM (IGAA)** ✅ — `lib/meta/messages.ts:122,157,199,223`: `sendQuickReplies`, `sendCtaButton`, `sendImageMessage` usam `https://graph.instagram.com/v21.0/me/messages` com `igAccessToken` (parâmetro explícito). `sendTextMessage` na linha 10 + reuse na linha 66.
- **Anti-spam** ✅ — `lib/automation/anti-spam.ts:13`: `canSendToContact` consulta `is_blocked`, `opted_out` (linhas 23, 35) e `automation_runs` ativos (linhas 41, 59).
- **Roles guard** ✅ — `app/actions/settings.ts:4,15`: importa `requireAdmin` de `@/lib/supabase/helpers/role.server` e invoca antes de operações destrutivas.

### Passo 11 — Segurança .env.local
- Status: ✅
- Evidência:
  - `ls -la .env.local` → existe localmente (2196 bytes, modificado em 2026-04-07)
  - `git status --ignored --porcelain .env.local` → `!! .env.local` (status "ignored")
  - `git check-ignore -v .env.local` → ignorado por `.gitignore:34:.env*`
  - **Seguro para `git push` público**

## Bugs/regressões encontrados

Nenhum.

## Débitos técnicos registrados

1. **`vercel.json` mínimo:** o arquivo na raiz contém apenas `buildCommand`/`installCommand`. O bloco `crons[]` é documentado no README como exemplo a ser copiado pelo usuário durante o deploy. Decisão consciente — evita commitar config de cron em fork virgem que ainda não tem domínio Vercel próprio. Caso preferível, mover o exemplo para `vercel.example.json` versionado.
2. **Warning irrelevante do Jest:** `Warning: --localstorage-file was provided without a valid path` aparece em `pnpm test`. Provém de plugin de mock de localStorage; não afeta execução nem resultado. Pode ser limpado em futura iteração se for ruído para usuários do fork.

## Próximos passos sugeridos ao usuário

1. Revisar este relatório.
2. ✅ APROVADO — fazer merge `oss-self-hosted` → `main`:
   ```bash
   git checkout main
   git merge --no-ff oss-self-hosted
   ```
3. Push da branch + tag:
   ```bash
   git push origin main
   git push origin v0-saas-final
   ```
4. Criar GitHub release marcada como `v1.0.0-oss` apontando para o commit de merge.
5. Limpar a branch local após merge: `git branch -d oss-self-hosted`.
