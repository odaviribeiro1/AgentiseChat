CREATE TABLE automation_runs (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id     uuid NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  contact_id        uuid NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  current_step_id   uuid REFERENCES steps(id) ON DELETE SET NULL,
  status            text NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'waiting_reply', 'completed', 'failed', 'cancelled')),
  trigger_event_id  text,
  trigger_payload   jsonb,
  error_message     text,
  started_at        timestamptz DEFAULT now(),
  completed_at      timestamptz,
  updated_at        timestamptz DEFAULT now()
);

CREATE TRIGGER update_automation_runs_updated_at
  BEFORE UPDATE ON automation_runs
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
