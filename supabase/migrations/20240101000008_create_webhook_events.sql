-- Migration 0008: Cria `webhook_events` (log bruto de eventos recebidos da
-- Meta Graph API + saída de debug do engine). Armazena o payload completo
-- para replay e investigação de incidentes. Acesso restrito ao service role.
CREATE TABLE IF NOT EXISTS webhook_events (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type          text NOT NULL,
  instagram_user_id   text,
  payload             jsonb NOT NULL,
  processed           boolean DEFAULT false,
  processed_at        timestamptz,
  error               text,
  received_at         timestamptz DEFAULT now()
);
