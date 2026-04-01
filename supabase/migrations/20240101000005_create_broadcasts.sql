CREATE TABLE broadcasts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id        uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  name              text NOT NULL,
  status            text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'failed', 'cancelled')),
  message_config    jsonb NOT NULL DEFAULT '{}',
  segment_tags      text[],
  scheduled_at      timestamptz,
  started_at        timestamptz,
  sent_at           timestamptz,
  total_recipients  integer DEFAULT 0,
  total_sent        integer DEFAULT 0,
  total_delivered   integer DEFAULT 0,
  total_failed      integer DEFAULT 0,
  total_opened      integer DEFAULT 0,
  created_at        timestamptz DEFAULT now(),
  updated_at        timestamptz DEFAULT now()
);

CREATE TRIGGER update_broadcasts_updated_at
  BEFORE UPDATE ON broadcasts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
