# FASE 1 — Polish de migrations (idempotência consistente + comentários PT-BR)

> Migração SaaS → Open Source Self-Hosted | Projeto: agentise-chat
> Pré-requisito: estar na branch `oss-self-hosted`. Fase 0 deve estar commitada (commit do `MIGRATION_PLAN.md`).
> Esforço estimado: 1–2h. Risco: Baixo.

---

## Prompt para Claude Code

Você está executando a **Fase 1** da migração deste projeto de SaaS multi-tenant para Open Source Self-Hosted. O contexto completo está em `MIGRATION_PLAN.md` na raiz do repositório, e o levantamento do que precisa mudar está em `AUDIT_REPORT.md`.

### Pré-checagem obrigatória

Antes de qualquer modificação, execute:

1. `git rev-parse --abbrev-ref HEAD` — confirmar que está em `oss-self-hosted`
2. `git status --porcelain` — confirmar working directory limpo
3. `git log -1 --oneline` — confirmar que o último commit é `migration(fase0):` (criação do plano)
4. `view AUDIT_REPORT.md` (seção 5, item "Idempotência de migrations" — nota 3) e `MIGRATION_PLAN.md` (seção "Fase 1")
5. `ls supabase/migrations/` — confirmar que existem 14 arquivos numerados de `20240101000001_*` a `20240101000014_*`

Se qualquer pré-checagem falhar, **pare** e reporte ao usuário em vez de prosseguir.

### Escopo desta fase

Esta fase normaliza as 14 migrations existentes para que sejam **idempotentes** (re-execução seguro) e tenham **comentários em PT-BR no topo** explicando o propósito de cada arquivo. Nenhuma estrutura de tabela muda — só metadata e cláusulas `IF NOT EXISTS`. O objetivo é que um fork novo possa rodar `supabase db push` em uma base já parcialmente provisionada sem quebrar.

### Lista de mudanças concretas

#### Migrations SQL a editar (14 arquivos — somente polish, sem mudança estrutural)

Para cada arquivo abaixo, aplicar:
- Adicionar comentário-cabeçalho em PT-BR: `-- Migration <nº>: <propósito>` + 1–2 linhas explicando.
- Trocar `CREATE TABLE <nome> (` por `CREATE TABLE IF NOT EXISTS <nome> (`.
- Trocar `CREATE INDEX <nome>` por `CREATE INDEX IF NOT EXISTS <nome>`.
- Trocar `CREATE POLICY "<nome>"` por bloco `DROP POLICY IF EXISTS "<nome>" ON <tabela>; CREATE POLICY "<nome>" ...` (Postgres não tem `CREATE POLICY IF NOT EXISTS`).
- Trocar `CREATE TRIGGER <nome>` por bloco `DROP TRIGGER IF EXISTS <nome> ON <tabela>; CREATE TRIGGER <nome> ...`.
- Funções já usam `CREATE OR REPLACE FUNCTION` — manter.
- `ALTER TABLE ... ADD COLUMN` em `20240101000013_add_ig_token.sql` — trocar para `ADD COLUMN IF NOT EXISTS`.

Arquivos:

1. `supabase/migrations/20240101000001_create_accounts.sql` — Cabeçalho: "Cria a tabela `accounts` (conta Instagram conectada via OAuth) com tokens cifrados e trigger de updated_at." Aplicar `IF NOT EXISTS` em `CREATE TABLE accounts`. Função `update_updated_at_column()` já tem `CREATE OR REPLACE`. Trigger `update_accounts_updated_at` precisa de bloco `DROP TRIGGER IF EXISTS`.
2. `supabase/migrations/20240101000002_create_contacts.sql` — Cabeçalho: "Cria `contacts` (usuários do Instagram que interagiram). Inclui `window_expires_at` para janela 24h da Meta API e `opted_out` para conformidade." Aplicar `IF NOT EXISTS`. Trigger.
3. `supabase/migrations/20240101000003_create_automations.sql` — Cabeçalho: "Cria `automations` (fluxos disparados por triggers como `comment_keyword`, `dm_keyword`, `story_reply`)." Aplicar `IF NOT EXISTS`. Trigger.
4. `supabase/migrations/20240101000004_create_steps.sql` — Cabeçalho: "Cria `steps` (etapas ordenadas dentro de uma automação, com 9 tipos suportados e ramificações via `parent_step_id` + `branch_value`)." Aplicar `IF NOT EXISTS`.
5. `supabase/migrations/20240101000005_create_broadcasts.sql` — Cabeçalho: "Cria `broadcasts` (envios em lote com segmentação por tags e métricas de entrega)." Aplicar `IF NOT EXISTS`.
6. `supabase/migrations/20240101000006_create_automation_runs.sql` — Cabeçalho: "Cria `automation_runs` (instância de execução de uma automação para um contato específico)." Aplicar `IF NOT EXISTS`.
7. `supabase/migrations/20240101000007_create_messages.sql` — Cabeçalho: "Cria `messages` (log unificado de mensagens inbound/outbound, base para auditoria e replay)." Aplicar `IF NOT EXISTS`.
8. `supabase/migrations/20240101000008_create_webhook_events.sql` — Cabeçalho: "Cria `webhook_events` (log bruto de eventos recebidos da Meta + debug do engine)." Aplicar `IF NOT EXISTS`.
9. `supabase/migrations/20240101000009_create_ai_usage.sql` — Cabeçalho: "Cria `ai_usage` (rastreamento de tokens consumidos no step de IA para controle de custos)." Aplicar `IF NOT EXISTS`.
10. `supabase/migrations/20240101000010_create_indexes.sql` — Cabeçalho: "Cria índices secundários para queries frequentes (lookup por `user_id`, `instagram_user_id`, janela 24h, etc.)." Trocar `CREATE INDEX` por `CREATE INDEX IF NOT EXISTS` em todas as ~20 linhas.
11. `supabase/migrations/20240101000011_enable_rls.sql` — Cabeçalho: "Habilita Row Level Security em todas as tabelas de domínio." `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` é idempotente nativamente — apenas adicionar o cabeçalho.
12. `supabase/migrations/20240101000012_create_rls_policies.sql` — Cabeçalho: "Cria policies de RLS (acesso por `auth.uid() = user_id` em `accounts` e subquery em tabelas dependentes)." Cada `CREATE POLICY "<nome>" ON <tabela> ...` precisa virar `DROP POLICY IF EXISTS "<nome>" ON <tabela>;\nCREATE POLICY "<nome>" ON <tabela> ...`. São 8 policies.
13. `supabase/migrations/20240101000013_add_ig_token.sql` — Cabeçalho mantém o que já tem (já é em PT-BR). Trocar `ADD COLUMN` por `ADD COLUMN IF NOT EXISTS` (são 2 colunas: `ig_access_token`, `ig_token_expires_at`).
14. `supabase/migrations/20240101000014_create_account_tags.sql` — Cabeçalho: "Registry de tags por conta (tags podem existir antes de serem aplicadas a contatos)." Já usa `IF NOT EXISTS` em `CREATE TABLE`. Aplicar `DROP POLICY IF EXISTS` antes do `CREATE POLICY`.

#### Edge Functions a modificar
- Nenhuma. Projeto não usa Edge Functions Supabase.

#### Edge Functions a deletar
- Nenhuma.

#### Arquivos TypeScript a modificar
- Nenhum nesta fase. Polish é só SQL.

#### Arquivos TypeScript a deletar
- Nenhum.

#### Tipos a atualizar
- Nenhum. Estrutura de tabelas não muda — `lib/supabase/database.types.ts` continua válido.

#### Outros artefatos
- Nenhum.

### Ordem de execução recomendada

1. Editar os 14 arquivos `supabase/migrations/*.sql` na ordem numérica.
2. Rodar `pnpm type-check` para garantir que não houve regressão (deve passar — TS não toca SQL).
3. Validar (gate abaixo).
4. Commit.

### Restrições

- **Não execute `supabase db push`, `supabase db reset` ou qualquer comando que modifique o banco.**
- **Não altere a estrutura das tabelas** — sem `ADD COLUMN` novo, sem `DROP COLUMN`, sem renomeações. Apenas idempotência + comentários.
- **Não rode `pnpm install`** — não há nova dependência.
- Não toque em arquivos fora de `supabase/migrations/*.sql`.
- Se descobrir que precisa modificar algo fora do escopo planejado, **pare** e reporte ao usuário antes de fazer.

### 🚧 Gate de validação ANTES de concluir a fase

> **Bloqueante.** A Fase 1 NÃO pode ser declarada concluída enquanto todos os testes abaixo não forem executados e o resultado reportado explicitamente no chat.

#### 1. Testes funcionais
- [ ] Cada um dos 14 arquivos foi editado e tem cabeçalho-comentário PT-BR no topo (citar arquivo + primeira linha de cada cabeçalho).
- [ ] `grep -L "IF NOT EXISTS" supabase/migrations/0001*.sql supabase/migrations/0002*.sql ... 0009*.sql 0014*.sql` retorna **vazio** (todas as criações de tabela são idempotentes). Migrations puramente de policies/triggers/indexes/alters podem não ter `IF NOT EXISTS` em CREATE TABLE — anotar exceção.
- [ ] `grep -c "DROP POLICY IF EXISTS" supabase/migrations/20240101000012_create_rls_policies.sql` retorna **8** (uma por policy).
- [ ] `grep -c "DROP POLICY IF EXISTS" supabase/migrations/20240101000014_create_account_tags.sql` retorna **1**.
- [ ] `grep -c "DROP TRIGGER IF EXISTS" supabase/migrations/2024*.sql` retorna **>= número de triggers existentes** (pelo menos 4: accounts, contacts, automations, broadcasts).
- [ ] `grep "ADD COLUMN IF NOT EXISTS" supabase/migrations/20240101000013_add_ig_token.sql` retorna **2 linhas**.

#### 2. Build e tipos
- [ ] `pnpm type-check` executa sem erro (anexar última linha do output).
- [ ] Não há erros de TypeScript em arquivos modificados (nenhum TS foi modificado, mas confirmar mesmo assim).

#### 3. Testes visuais
- [ ] N/A — esta fase não toca UI.

#### 4. Testes responsivos
- [ ] N/A — esta fase não toca UI.

#### 5. Testes de integração
- [ ] **Re-leitura visual**: `view supabase/migrations/20240101000012_create_rls_policies.sql` — confirmar que cada policy ainda referencia `auth.uid() = user_id` ou subquery em `accounts`. Nenhuma referência foi acidentalmente quebrada por edit.
- [ ] **Sintaxe SQL**: rodar `pnpm test` para garantir que as 4 suítes existentes (webhook, engine, anti-spam, variables) continuam passando — embora não dependam de migrations, é um smoke check rápido.

#### 6. Relatório de conclusão
Antes de declarar a fase concluída, escreva no chat:
- ✅ ou ❌ por **cada item** acima (não agrupar como "tudo ok").
- Evidência objetiva: para os greps, anexar o número exato retornado. Para o type-check, anexar a última linha do log.
- Bugs/regressões encontrados e como foram resolvidos — ou registrados como débito técnico explícito com justificativa.

### Commit final

Quando os 6 itens do gate passarem, faça o commit:

```bash
git add -A
git commit -m "migration(fase1): idempotência e comentários PT-BR nas 14 migrations

Mudanças principais:
- IF NOT EXISTS em todos os CREATE TABLE/INDEX
- DROP POLICY IF EXISTS antes de CREATE POLICY (8 policies em 000012, 1 em 000014)
- DROP TRIGGER IF EXISTS antes de CREATE TRIGGER nas tabelas com updated_at
- ADD COLUMN IF NOT EXISTS em 000013_add_ig_token.sql
- Cabeçalho-comentário PT-BR no topo de cada migration

Refs: MIGRATION_PLAN.md fase 1"
```

Reporte ao usuário a conclusão e instrua: **próxima fase é `migration/FASE-2.prompt.md`** (introdução de roles 2-níveis + trigger first-user-becomes-admin).
