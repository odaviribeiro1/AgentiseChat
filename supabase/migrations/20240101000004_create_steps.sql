CREATE TABLE steps (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  automation_id   uuid NOT NULL REFERENCES automations(id) ON DELETE CASCADE,
  parent_step_id  uuid REFERENCES steps(id) ON DELETE CASCADE,
  branch_value    text,
  position        integer NOT NULL DEFAULT 0,
  type            text NOT NULL
    CHECK (type IN ('message', 'image_message', 'quick_reply', 'cta_button', 'delay', 'ai', 'condition', 'tag', 'end')),
  config          jsonb NOT NULL DEFAULT '{}',
  created_at      timestamptz DEFAULT now()
);
