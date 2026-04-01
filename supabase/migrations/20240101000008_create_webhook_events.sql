CREATE TABLE webhook_events (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type          text NOT NULL,
  instagram_user_id   text,
  payload             jsonb NOT NULL,
  processed           boolean DEFAULT false,
  processed_at        timestamptz,
  error               text,
  received_at         timestamptz DEFAULT now()
);
