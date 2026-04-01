CREATE TABLE ai_usage (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id          uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  automation_run_id   uuid REFERENCES automation_runs(id) ON DELETE SET NULL,
  step_id             uuid REFERENCES steps(id) ON DELETE SET NULL,
  model               text NOT NULL,
  prompt_tokens       integer DEFAULT 0,
  completion_tokens   integer DEFAULT 0,
  total_tokens        integer DEFAULT 0,
  cost_usd            numeric(10, 6) DEFAULT 0,
  created_at          timestamptz DEFAULT now()
);
