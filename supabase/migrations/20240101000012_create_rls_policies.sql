-- ─── accounts ────────────────────────────────────────────────────────────────
CREATE POLICY "accounts: owner access"
  ON accounts FOR ALL
  USING (auth.uid() = user_id);

-- ─── contacts ────────────────────────────────────────────────────────────────
CREATE POLICY "contacts: owner access"
  ON contacts FOR ALL
  USING (
    account_id IN (
      SELECT id FROM accounts WHERE user_id = auth.uid()
    )
  );

-- ─── automations ─────────────────────────────────────────────────────────────
CREATE POLICY "automations: owner access"
  ON automations FOR ALL
  USING (
    account_id IN (
      SELECT id FROM accounts WHERE user_id = auth.uid()
    )
  );

-- ─── steps ───────────────────────────────────────────────────────────────────
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
CREATE POLICY "broadcasts: owner access"
  ON broadcasts FOR ALL
  USING (
    account_id IN (
      SELECT id FROM accounts WHERE user_id = auth.uid()
    )
  );

-- ─── automation_runs ─────────────────────────────────────────────────────────
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
CREATE POLICY "messages: owner access"
  ON messages FOR ALL
  USING (
    account_id IN (
      SELECT id FROM accounts WHERE user_id = auth.uid()
    )
  );

-- ─── webhook_events ──────────────────────────────────────────────────────────
-- Acesso bloqueado para anon/authenticated; usar apenas via service_role
CREATE POLICY "webhook_events: service role only"
  ON webhook_events FOR ALL
  USING (false);

-- ─── ai_usage ────────────────────────────────────────────────────────────────
CREATE POLICY "ai_usage: owner access"
  ON ai_usage FOR ALL
  USING (
    account_id IN (
      SELECT id FROM accounts WHERE user_id = auth.uid()
    )
  );
