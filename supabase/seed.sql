-- Seed de desenvolvimento — NÃO executar em produção
-- Usa CTEs encadeadas para manter referências sem UUIDs hardcoded

WITH
-- 1. Conta demo
account_insert AS (
  INSERT INTO accounts (
    user_id,
    instagram_user_id,
    instagram_username,
    instagram_name,
    instagram_pic_url,
    access_token,
    is_active
  ) VALUES (
    '00000000-0000-0000-0000-000000000001',  -- user_id fictício para dev local
    'test_ig_user_001',
    'agentise_demo',
    'Agentise Demo',
    'https://picsum.photos/seed/agentise/200',
    'EAADemo_access_token_placeholder',
    true
  )
  RETURNING id
),

-- 2. Contatos (3 dentro da janela de 24h, 2 expirados)
contacts_insert AS (
  INSERT INTO contacts (account_id, instagram_user_id, username, full_name, last_message_at)
  SELECT
    a.id,
    c.instagram_user_id,
    c.username,
    c.full_name,
    c.last_message_at
  FROM account_insert a
  CROSS JOIN (VALUES
    ('ig_contact_001', 'maria_silva',    'Maria Silva',    now() - interval '2 hours'),
    ('ig_contact_002', 'joao_santos',    'João Santos',    now() - interval '5 hours'),
    ('ig_contact_003', 'ana_costa',      'Ana Costa',      now() - interval '11 hours'),
    ('ig_contact_004', 'pedro_lima',     'Pedro Lima',     now() - interval '30 hours'),
    ('ig_contact_005', 'lucia_ferreira', 'Lúcia Ferreira', now() - interval '48 hours')
  ) AS c(instagram_user_id, username, full_name, last_message_at)
  RETURNING id, instagram_user_id
),

-- 3. Automação com fluxo: message → quick_reply → [message, end]
automation_insert AS (
  INSERT INTO automations (account_id, name, description, status, trigger_type, trigger_config)
  SELECT
    a.id,
    'Sequência Ebook Gratuito',
    'Disparada por comentário com palavra-chave EBOOK',
    'active',
    'comment_keyword',
    '{
      "keywords": ["EBOOK", "QUERO", "INFO"],
      "match_type": "contains",
      "post_id": null,
      "apply_to": "all_posts",
      "max_triggers_per_user_hours": 24,
      "reply_comment": false,
      "reply_comment_text": null
    }'::jsonb
  FROM account_insert a
  RETURNING id
),

-- 4. Step raiz: message de boas-vindas
step_root AS (
  INSERT INTO steps (automation_id, parent_step_id, position, type, config)
  SELECT
    aut.id,
    NULL,
    0,
    'message',
    '{"text": "Olá {{first_name}}! 👋 Vi que você se interessou pelo nosso ebook gratuito!"}'::jsonb
  FROM automation_insert aut
  RETURNING id
),

-- 5. Step 2: quick_reply com 2 opções
step_qr AS (
  INSERT INTO steps (automation_id, parent_step_id, position, type, config)
  SELECT
    aut.id,
    sr.id,
    0,
    'quick_reply',
    '{"text": "Você gostaria de receber o ebook agora?", "buttons": [{"title": "Sim, quero! 🎉", "payload": "YES"}, {"title": "Talvez depois", "payload": "NO"}]}'::jsonb
  FROM automation_insert aut, step_root sr
  RETURNING id
),

-- 6. Branch YES: mensagem com link
step_yes AS (
  INSERT INTO steps (automation_id, parent_step_id, branch_value, position, type, config)
  SELECT
    aut.id,
    sqr.id,
    'YES',
    0,
    'cta_button',
    '{"text": "Perfeito! Aqui está o seu ebook:", "button_title": "Baixar Ebook", "url": "https://example.com/ebook"}'::jsonb
  FROM automation_insert aut, step_qr sqr
  RETURNING id
),

-- 7. Branch NO: end
step_no AS (
  INSERT INTO steps (automation_id, parent_step_id, branch_value, position, type, config)
  SELECT
    aut.id,
    sqr.id,
    'NO',
    1,
    'end',
    '{"notify_operator": false}'::jsonb
  FROM automation_insert aut, step_qr sqr
  RETURNING id
),

-- 8. Broadcast enviado com métricas
broadcast_insert AS (
  INSERT INTO broadcasts (
    account_id, name, status, message_config,
    started_at, sent_at,
    total_recipients, total_sent, total_delivered, total_failed, total_opened
  )
  SELECT
    a.id,
    'Promoção Black Friday',
    'sent',
    '{"type": "cta_button", "text": "Oferta especial só hoje! 🔥 50% OFF em todos os planos.", "button": {"title": "Ver oferta", "url": "https://example.com/blackfriday"}}'::jsonb,
    now() - interval '2 days',
    now() - interval '2 days' + interval '5 minutes',
    3, 3, 2, 0, 1
  FROM account_insert a
  RETURNING id
),

-- 9. Automation run para o primeiro contato
run_insert AS (
  INSERT INTO automation_runs (automation_id, contact_id, status, trigger_event_id, started_at, completed_at)
  SELECT
    aut.id,
    con.id,
    'completed',
    'meta_event_001',
    now() - interval '3 hours',
    now() - interval '3 hours' + interval '2 minutes'
  FROM automation_insert aut, contacts_insert con
  WHERE con.instagram_user_id = 'ig_contact_001'
  RETURNING id, automation_id
)

-- 10. Mensagens de histórico para o primeiro contato
INSERT INTO messages (account_id, contact_id, direction, type, content, meta_message_id, sent_at)
SELECT
  a.id,
  con.id,
  m.direction,
  m.type,
  m.content::jsonb,
  m.meta_message_id,
  now() - m.offset_interval
FROM account_insert a
CROSS JOIN contacts_insert con
CROSS JOIN (VALUES
  ('inbound',  'text',        '{"text": "EBOOK"}',                                          'meta_in_001',  interval '6 hours'),
  ('outbound', 'text',        '{"text": "Olá Maria! 👋 Vi que você se interessou!"}',        'meta_out_001', interval '5 hours 59 minutes'),
  ('outbound', 'quick_reply', '{"text": "Você gostaria de receber o ebook agora?"}',         'meta_out_002', interval '5 hours 58 minutes'),
  ('inbound',  'quick_reply', '{"payload": "YES", "title": "Sim, quero! 🎉"}',               'meta_in_002',  interval '5 hours 55 minutes'),
  ('outbound', 'cta_button',  '{"text": "Perfeito! Aqui está o seu ebook:"}',                'meta_out_003', interval '5 hours 54 minutes'),
  ('inbound',  'text',        '{"text": "Obrigada! Já recebi 😊"}',                          'meta_in_003',  interval '5 hours 30 minutes'),
  ('outbound', 'text',        '{"text": "Que ótimo! Qualquer dúvida é só chamar."}',         'meta_out_004', interval '5 hours 29 minutes'),
  ('inbound',  'text',        '{"text": "Perfeito, vou ler agora!"}',                        'meta_in_004',  interval '4 hours'),
  ('inbound',  'text',        '{"text": "Muito bom o conteúdo!"}',                           'meta_in_005',  interval '2 hours 30 minutes'),
  ('outbound', 'text',        '{"text": "Fico feliz que tenha gostado! 🙌"}',                'meta_out_005', interval '2 hours 29 minutes')
) AS m(direction, type, content, meta_message_id, offset_interval)
WHERE con.instagram_user_id = 'ig_contact_001';
