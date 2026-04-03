-- Tags registry per account (allows tags to exist before being assigned to contacts)
CREATE TABLE IF NOT EXISTS account_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(account_id, name)
);

ALTER TABLE account_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own account tags"
  ON account_tags FOR ALL
  USING (account_id IN (SELECT id FROM accounts WHERE user_id = auth.uid()));
