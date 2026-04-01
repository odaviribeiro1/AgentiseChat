CREATE TABLE messages (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id          uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  contact_id          uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  direction           text NOT NULL CHECK (direction IN ('inbound', 'outbound')),
  type                text NOT NULL CHECK (type IN ('text', 'image', 'quick_reply', 'cta_button', 'story_reply', 'unsupported')),
  content             jsonb NOT NULL DEFAULT '{}',
  meta_message_id     text UNIQUE,
  automation_run_id   uuid REFERENCES automation_runs(id) ON DELETE SET NULL,
  broadcast_id        uuid REFERENCES broadcasts(id) ON DELETE SET NULL,
  step_id             uuid REFERENCES steps(id) ON DELETE SET NULL,
  sent_at             timestamptz DEFAULT now(),
  delivered_at        timestamptz,
  read_at             timestamptz,
  failed_at           timestamptz,
  error_details       jsonb
);
