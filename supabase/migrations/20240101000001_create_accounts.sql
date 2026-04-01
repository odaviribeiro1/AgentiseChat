CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE accounts (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id               uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  instagram_user_id     text UNIQUE NOT NULL,
  instagram_username    text NOT NULL,
  instagram_name        text,
  instagram_pic_url     text,
  access_token          text NOT NULL,
  token_expires_at      timestamptz,
  webhook_verified_at   timestamptz,
  is_active             boolean DEFAULT true,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_accounts_updated_at
  BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
