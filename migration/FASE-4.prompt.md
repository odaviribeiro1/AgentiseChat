# FASE 4 — Smoke test manual end-to-end em fork limpo

> Migração SaaS → Open Source Self-Hosted | Projeto: agentise-chat
> Pré-requisito: estar na branch `oss-self-hosted`. Fase 3 (`migration(fase3):`) deve estar commitada.
> Esforço estimado: 1–2h. Risco: Médio (validação final — falhas aqui significam retrabalho em fases anteriores).

---

## Prompt para Claude Code

Você está executando a **última fase** da migração. O objetivo é validar que o repositório, do estado atual, é **clonável e executável** como boilerplate self-hosted, sem dependência de estado local privado.

### Pré-checagem obrigatória

1. `git rev-parse --abbrev-ref HEAD` — confirmar `oss-self-hosted`
2. `git status --porcelain` — working directory limpo
3. `git log -1 --oneline` — último commit é `migration(fase3):`
4. `git log --oneline v0-saas-final..HEAD` — listar todos os commits da migração (deve ter 4: fase0/plano, fase1/migrations, fase2/roles, fase3/docs)
5. `view MIGRATION_PLAN.md` (seção "Fase 4")
6. `view README.md` — confirmar que existe a versão reescrita

Se qualquer pré-checagem falhar, **pare** e reporte.

### Escopo desta fase

Esta fase **não modifica código de produção**. Ela executa um **roteiro de smoke test** e produz um **relatório de validação** (`migration/SMOKE_TEST_REPORT.md`). O foco é detectar problemas que só aparecem em fork limpo: instruções faltantes no README, dependências não declaradas, migrations quebrando em base nova, etc.

Como não temos acesso a um Supabase real para `db push`, esta fase faz **smoke test estático** rigoroso + simulação dos passos manuais que um usuário faria, sem efetivamente provisionar infra.

### Lista de mudanças concretas

#### Migrations SQL a criar / Edge Functions / TypeScript / Tipos
- Nenhuma. Esta fase é apenas validação.

#### Outros artefatos
- `migration/SMOKE_TEST_REPORT.md` — relatório final preenchido com resultados objetivos de cada teste abaixo.

### Roteiro de smoke test

Execute os passos abaixo em ordem. Para cada um, capture evidência objetiva (output, listagem, conteúdo). **Não pule passos.**

#### Passo 1 — Cleanliness do repositório

```bash
# Confirmar que .env.local NÃO está rastreado pelo git
git ls-files | grep -E "^\.env\.local$"      # deve não retornar nada
git ls-files .env.local 2>&1                  # deve estar vazio

# Confirmar que .env.example E .env.local.example ESTÃO rastreados
git ls-files | grep -E "^\.env\.(example|local\.example)$"

# Confirmar que .claude/CLAUDE.md está rastreado
git ls-files .claude/CLAUDE.md
```

Resultado esperado: `.env.local` ausente da lista; `.env.example` e `.env.local.example` presentes; `.claude/CLAUDE.md` presente.

#### Passo 2 — Estrutura do boilerplate

```bash
ls -la README.md LICENSE CONTRIBUTING.md MIGRATION_PLAN.md AUDIT_REPORT.md
ls supabase/migrations/   # esperar 15 arquivos (14 originais + 015_create_profiles_and_roles.sql)
ls migration/             # esperar 4 arquivos FASE-{1,2,3,4}.prompt.md
```

#### Passo 3 — Sanidade das migrations

```bash
# Cabeçalhos PT-BR
head -3 supabase/migrations/2024010100000{1,5,9}*.sql

# Idempotência
grep -L "IF NOT EXISTS" supabase/migrations/2024010100000{1..9}_create_*.sql

# Policies com DROP IF EXISTS
grep -c "DROP POLICY IF EXISTS" supabase/migrations/20240101000012_create_rls_policies.sql

# Migration 015 (roles)
grep -E "CREATE TABLE IF NOT EXISTS profiles|CREATE FUNCTION.*is_admin|CREATE TRIGGER.*on_auth_user_created|AS RESTRICTIVE" supabase/migrations/20240101000015_create_profiles_and_roles.sql
```

Resultado esperado: cabeçalhos PT-BR presentes; saída de `grep -L` vazia (todas as migrations CREATE TABLE com `IF NOT EXISTS`); `DROP POLICY IF EXISTS` aparece 8x na 012; migration 015 contém os 4 elementos.

#### Passo 4 — Build e tipos do zero

```bash
# Limpar cache de build (NÃO node_modules)
rm -rf .next

# Type check
pnpm type-check 2>&1 | tail -5

# Build completo
pnpm build 2>&1 | tail -20
```

Resultado esperado: type-check sem erros; build "Compiled successfully".

> Se `node_modules` não existir (execução em fork virgem), rodar `pnpm install` primeiro. Em sessão real, deve já existir — não rerodar à toa.

#### Passo 5 — Testes

```bash
pnpm test 2>&1 | tail -10
```

Resultado esperado: 4 suítes passando (webhook, engine, anti-spam, variables).

#### Passo 6 — Verificação cruzada README ↔ código

Para cada comando `pnpm <x>` mencionado no `README.md`, verificar que existe em `package.json scripts`:

```bash
grep -oE 'pnpm [a-z:-]+' README.md | sort -u
cat package.json | grep -A 20 '"scripts"'
```

Cada `pnpm <comando>` listado no README deve existir nos scripts. Se não existir, é bug do README.

Para cada `path` em `vercel.json crons[]` (se existir no README):
```bash
ls app/api/cron/
```
Cada path do exemplo deve corresponder a um diretório real.

#### Passo 7 — Verificação de menções residuais a multi-tenancy

```bash
# Sanity: não deve haver tenant_id no código nem na doc nova
grep -rn "tenant_id\|tenantId\|TenantContext\|workspace_id\|workspaceId" \
  --include="*.ts" --include="*.tsx" --include="*.sql" --include="*.md" \
  . 2>/dev/null | grep -v node_modules | grep -v .next | grep -v AUDIT_REPORT.md
```

Resultado esperado: vazio (ou apenas matches em `MIGRATION_PLAN.md` que MENCIONAM ausência — ler o contexto).

#### Passo 8 — Verificação de roles

```bash
# A migration 015 cria a estrutura
grep -E "role.*'admin'.*'operator'|CHECK \(role IN" supabase/migrations/20240101000015_create_profiles_and_roles.sql

# requireAdmin é importado em pelo menos 1 server action
grep -rln "requireAdmin" app/actions/ components/

# Tipos atualizados
grep -E "UserRole|ProfileRow" lib/supabase/types.ts
```

#### Passo 9 — Verificação de tema

```bash
# Tema dark glassmorphism preservado
grep -E "#0A0A0F|#3B82F6|rgba\(59, ?130, ?246" app/globals.css | head -5

# Não há vestígios de light mode
grep -in "light mode\|@media (prefers-color-scheme: light)" app/globals.css
```

Resultado esperado: cores presentes; light mode ausente.

#### Passo 10 — Validação manual de fluxo (descrição, sem execução)

Como não temos infra real, descrever cada um dos fluxos abaixo lendo o código e confirmando que a chain está intacta:

1. **OAuth Meta:** clicar "Conectar Instagram" em `/conexao` → `app/api/auth/meta/[start route]` → callback em `app/api/auth/meta/callback/route.ts` → `lib/meta/oauth.ts` faz token exchange → tokens cifrados via `lib/crypto/tokens.ts.encryptToken` → INSERT em `accounts`.
2. **Webhook de comentário:** Meta POST em `/api/webhook/instagram` → `lib/meta/webhook.ts.verifyWebhookSignature` → `lib/automation/engine.ts.processAutomationEvent` → match keyword → `lib/automation/executor.ts` roda steps.
3. **Step de DM proativa:** `lib/meta/messages.ts.sendTextMessage` usa IGAA token (`accounts.ig_access_token` decifrado).
4. **Anti-spam:** `lib/automation/anti-spam.ts.canSendToContact` checa `opted_out`, janela 24h, run ativo.
5. **Roles guard:** `app/actions/settings.ts` (ou equivalente destrutivo) chama `requireAdmin()` antes de desconectar.

Para cada fluxo, citar arquivo + função encontrados via `view`. Não precisa rodar — só confirmar que a cadeia existe no código.

#### Passo 11 — Conferir `.env.local` real (segurança)

```bash
ls -la .env.local 2>&1                # local existe (com chaves reais)
git status .env.local                  # mostra "ignored" ou similar — nunca tracked
```

Resultado esperado: `.env.local` existe localmente mas não rastreado. Confirmar **antes de qualquer eventual `git push`**.

### Geração do `migration/SMOKE_TEST_REPORT.md`

Após executar todos os 11 passos, criar `migration/SMOKE_TEST_REPORT.md` com a estrutura:

```markdown
# Smoke Test Report — Fase 4

> Validação final da migração SaaS → Open Source Self-Hosted.
> Executado em: <data>
> Branch: oss-self-hosted | Commits desde v0-saas-final: <N>

## Resultado consolidado

✅ APROVADO  /  ❌ REPROVADO (escolher e justificar)

## Resultados por passo

### Passo 1 — Cleanliness
- Status: ✅ / ❌
- Evidência: [output]

### Passo 2 — Estrutura
- Status: ✅ / ❌
- Evidência: [output de ls]

### Passo 3 — Migrations
- Status: ✅ / ❌
- Evidência: [outputs de grep + head]

### Passo 4 — Build e tipos
- Status: ✅ / ❌
- Evidência: [tail de pnpm type-check + pnpm build]

### Passo 5 — Testes
- Status: ✅ / ❌
- Evidência: [tail de pnpm test]

### Passo 6 — README ↔ código
- Status: ✅ / ❌
- Comandos pnpm mencionados: [lista]
- Comandos pnpm existentes: [lista]
- Discrepâncias: [nenhuma | lista]

### Passo 7 — Sem multi-tenancy residual
- Status: ✅ / ❌

### Passo 8 — Roles
- Status: ✅ / ❌

### Passo 9 — Tema
- Status: ✅ / ❌

### Passo 10 — Fluxos de domínio
- OAuth Meta: ✅ / ❌ — arquivos visitados
- Webhook: ✅ / ❌
- Envio de DM: ✅ / ❌
- Anti-spam: ✅ / ❌
- Roles guard: ✅ / ❌

### Passo 11 — Segurança .env.local
- Status: ✅ / ❌

## Bugs/regressões encontrados
[lista | "nenhum"]

## Débitos técnicos registrados
[lista | "nenhum"]

## Próximos passos sugeridos ao usuário
1. Revisar este relatório.
2. Se ✅ APROVADO: fazer merge `oss-self-hosted` → `main` (`git checkout main && git merge --no-ff oss-self-hosted`).
3. Push da branch + tag (`git push origin main && git push origin v0-saas-final`).
4. Criar GitHub release marcada como `v1.0.0-oss` apontando para o commit de merge.
5. Limpar a branch local: `git branch -d oss-self-hosted` (após merge).
```

### Restrições

- **Não rode `supabase db push` nem `supabase db reset`.** Smoke test é estático.
- **Não rode `npm publish` nem `git push`.** Smoke test só observa.
- **Não modifique código de produção.** Se identificar bug, registre no relatório como débito ou interrompa para ajuste em fase anterior (raro — fases anteriores deveriam ter pego).
- **Não delete `.env.local`** local do usuário.
- Se um passo falhar e o motivo for ambíguo, marcar ❌ e seguir os demais — não cascade-fail.

### 🚧 Gate de validação ANTES de concluir a fase

Esta fase **é** a validação. O gate é o próprio `SMOKE_TEST_REPORT.md`.

#### Critério de aprovação
- ✅ APROVADO se 10 dos 11 passos saírem ✅ (margem para falsos positivos em greps).
- ❌ REPROVADO se qualquer passo crítico (4, 5, 8, 9) falhar — exigem correção em fase anterior.

#### Critério de reprovação → ação
- Se REPROVADO em Passo 4 (build/types): voltar à Fase 2 (provavelmente tipo `profiles` não foi adicionado em `database.types.ts`).
- Se REPROVADO em Passo 5 (testes): investigar causa raiz, fixar fase responsável.
- Se REPROVADO em Passo 6 (README ↔ código): voltar à Fase 3 e ajustar README.
- Se REPROVADO em Passo 8 (roles): voltar à Fase 2.

### Commit final

```bash
git add migration/SMOKE_TEST_REPORT.md
git commit -m "migration(fase4): smoke test final aprovado | reprovado

Mudanças principais:
- migration/SMOKE_TEST_REPORT.md gerado com resultado de 11 passos
- <APROVADO/REPROVADO> — boilerplate <pronto/precisa de ajustes>

Refs: MIGRATION_PLAN.md fase 4"
```

### Reporte final ao usuário

Em uma única mensagem, informe:

1. ✅/❌ Resultado consolidado.
2. Lista de passos com status.
3. Caminho do `SMOKE_TEST_REPORT.md`.
4. Se APROVADO: comandos para merge e push (ver "Próximos passos sugeridos" no relatório).
5. Se REPROVADO: a fase anterior recomendada para retorno e o motivo objetivo.

**Pare aqui. A migração está concluída (ou identificada como reprovada).**
