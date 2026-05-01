-- Migration 0011: Habilita Row Level Security em todas as tabelas de domínio.
-- ALTER TABLE ... ENABLE ROW LEVEL SECURITY é idempotente nativamente, então
-- esta migration pode ser re-executada com segurança. As policies em si são
-- criadas em 0012.
ALTER TABLE accounts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE automations       ENABLE ROW LEVEL SECURITY;
ALTER TABLE steps             ENABLE ROW LEVEL SECURITY;
ALTER TABLE broadcasts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_runs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages          ENABLE ROW LEVEL SECURITY;
ALTER TABLE webhook_events    ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_usage          ENABLE ROW LEVEL SECURITY;
