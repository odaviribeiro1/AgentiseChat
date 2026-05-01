-- Migration 0003: Cria `automations` (fluxos disparados por triggers como
-- `comment_keyword`, `dm_keyword`, `story_reply` ou `story_reaction`).
-- O conteúdo do trigger (palavras-chave, post alvo, etc.) fica em `trigger_config`.
CREATE TABLE IF NOT EXISTS automations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id      uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name            text NOT NULL,
  description     text,
  status          text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'paused')),
  trigger_type    text NOT NULL
    CHECK (trigger_type IN ('comment_keyword', 'dm_keyword', 'story_reply', 'story_reaction')),
  trigger_config  jsonb NOT NULL DEFAULT '{}',
  total_runs      integer DEFAULT 0,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

DROP TRIGGER IF EXISTS update_automations_updated_at ON automations;
CREATE TRIGGER update_automations_updated_at
  BEFORE UPDATE ON automations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
