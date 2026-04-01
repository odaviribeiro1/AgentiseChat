-- accounts
CREATE INDEX idx_accounts_user_id ON accounts(user_id);
CREATE INDEX idx_accounts_instagram_user_id ON accounts(instagram_user_id);

-- contacts
CREATE INDEX idx_contacts_account_id ON contacts(account_id);
CREATE INDEX idx_contacts_window_expires ON contacts(account_id, window_expires_at)
  WHERE is_blocked = false AND opted_out = false;
CREATE INDEX idx_contacts_tags ON contacts USING gin(tags);

-- automations
CREATE INDEX idx_automations_account_id ON automations(account_id);
CREATE INDEX idx_automations_status ON automations(account_id, status);

-- steps
CREATE INDEX idx_steps_automation_id ON steps(automation_id);
CREATE INDEX idx_steps_parent ON steps(parent_step_id);

-- broadcasts
CREATE INDEX idx_broadcasts_account_id ON broadcasts(account_id);
CREATE INDEX idx_broadcasts_status ON broadcasts(account_id, status);
CREATE INDEX idx_broadcasts_scheduled ON broadcasts(scheduled_at)
  WHERE status = 'scheduled';

-- automation_runs
CREATE INDEX idx_runs_automation ON automation_runs(automation_id);
CREATE INDEX idx_runs_contact ON automation_runs(contact_id);
CREATE INDEX idx_runs_status ON automation_runs(status)
  WHERE status IN ('running', 'waiting_reply');

-- messages
CREATE INDEX idx_messages_contact ON messages(contact_id, sent_at DESC);
CREATE INDEX idx_messages_account ON messages(account_id, sent_at DESC);
CREATE INDEX idx_messages_broadcast ON messages(broadcast_id)
  WHERE broadcast_id IS NOT NULL;
CREATE INDEX idx_messages_meta_id ON messages(meta_message_id)
  WHERE meta_message_id IS NOT NULL;

-- webhook_events
CREATE INDEX idx_webhook_unprocessed ON webhook_events(received_at)
  WHERE processed = false;

-- ai_usage
CREATE INDEX idx_ai_usage_account ON ai_usage(account_id, created_at DESC);
