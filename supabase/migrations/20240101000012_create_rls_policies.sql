-- Migration 0012: Cria as policies de RLS para todas as tabelas de domínio.
-- O modelo é per-user via `auth.uid() = user_id` em `accounts` e subquery em
-- todas as tabelas dependentes (`account_id IN (SELECT id FROM accounts WHERE
-- user_id = auth.uid())`). Postgres não suporta CREATE POLICY IF NOT EXISTS,
-- então usamos DROP POLICY IF EXISTS antes de cada CREATE para idempotência.

-- ─── accounts ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "accounts: owner access" ON accounts;
CREATE POLICY "accounts: owner access"
  ON accounts FOR ALL
  USING (auth.uid() = user_id);

-- ─── contacts ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "contacts: owner access" ON contacts;
CREATE POLICY "contacts: owner access"
  ON contacts FOR ALL
  USING (
    account_id IN (
      SELECT id FROM accounts WHERE user_id = auth.uid()
    )
  );

-- ─── automations ─────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "automations: owner access" ON automations;
CREATE POLICY "automations: owner access"
  ON automations FOR ALL
  USING (
    account_id IN (
      SELECT id FROM accounts WHERE user_id = auth.uid()
    )
  );

-- ─── steps ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "steps: owner access" ON steps;
CREATE POLICY "steps: owner access"
  ON steps FOR ALL
  USING (
    automation_id IN (
      SELECT a.id FROM automations a
      JOIN accounts acc ON acc.id = a.account_id
      WHERE acc.user_id = auth.uid()
    )
  );

-- ─── broadcasts ──────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "broadcasts: owner access" ON broadcasts;
CREATE POLICY "broadcasts: owner access"
  ON broadcasts FOR ALL
  USING (
    account_id IN (
      SELECT id FROM accounts WHERE user_id = auth.uid()
    )
  );

-- ─── automation_runs ─────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "automation_runs: owner access" ON automation_runs;
CREATE POLICY "automation_runs: owner access"
  ON automation_runs FOR ALL
  USING (
    automation_id IN (
      SELECT a.id FROM automations a
      JOIN accounts acc ON acc.id = a.account_id
      WHERE acc.user_id = auth.uid()
    )
  );

-- ─── messages ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "messages: owner access" ON messages;
CREATE POLICY "messages: owner access"
  ON messages FOR ALL
  USING (
    account_id IN (
      SELECT id FROM accounts WHERE user_id = auth.uid()
    )
  );

-- ─── webhook_events ──────────────────────────────────────────────────────────
-- Acesso bloqueado para anon/authenticated; usar apenas via service_role
DROP POLICY IF EXISTS "webhook_events: service role only" ON webhook_events;
CREATE POLICY "webhook_events: service role only"
  ON webhook_events FOR ALL
  USING (false);

-- ─── ai_usage ────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "ai_usage: owner access" ON ai_usage;
CREATE POLICY "ai_usage: owner access"
  ON ai_usage FOR ALL
  USING (
    account_id IN (
      SELECT id FROM accounts WHERE user_id = auth.uid()
    )
  );
