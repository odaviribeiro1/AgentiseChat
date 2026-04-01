CREATE TABLE contacts (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id            uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  instagram_user_id     text NOT NULL,
  username              text,
  full_name             text,
  profile_pic_url       text,
  last_message_at       timestamptz,
  window_expires_at     timestamptz,
  is_blocked            boolean DEFAULT false,
  opted_out             boolean DEFAULT false,
  tags                  text[] DEFAULT '{}',
  notes                 text,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now(),
  UNIQUE(account_id, instagram_user_id)
);

-- Calcula window_expires_at = last_message_at + 24h automaticamente
CREATE OR REPLACE FUNCTION compute_contact_window()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.last_message_at IS NOT NULL THEN
    NEW.window_expires_at := NEW.last_message_at + interval '24 hours';
  ELSE
    NEW.window_expires_at := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_contact_window_expires_at
  BEFORE INSERT OR UPDATE OF last_message_at ON contacts
  FOR EACH ROW EXECUTE FUNCTION compute_contact_window();

CREATE TRIGGER update_contacts_updated_at
  BEFORE UPDATE ON contacts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
