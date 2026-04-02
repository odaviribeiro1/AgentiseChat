-- Adiciona colunas para armazenar o Instagram Token (IGAA)
-- separado do Facebook Token (EAA) que já existe em access_token.
-- O IGAA é necessário para a Instagram Messaging API (graph.instagram.com).
ALTER TABLE accounts
  ADD COLUMN IF NOT EXISTS ig_access_token text,
  ADD COLUMN IF NOT EXISTS ig_token_expires_at timestamptz;
