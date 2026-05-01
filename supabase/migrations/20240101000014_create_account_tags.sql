-- Migration 0014: Registry de tags por conta. Permite que tags existam antes
-- de serem aplicadas a contatos (ex: criadas a partir da tela /tags) e cobre
-- a lista de sugestões no editor de automações. RLS segue o padrão owner-access.
CREATE TABLE IF NOT EXISTS account_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(account_id, name)
);

ALTER TABLE account_tags ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can manage their own account tags" ON account_tags;
CREATE POLICY "Users can manage their own account tags"
  ON account_tags FOR ALL
  USING (account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid()));
