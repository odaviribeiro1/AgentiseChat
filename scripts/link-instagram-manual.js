const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
const crypto = require('node:crypto');

// Carregar .env.local
dotenv.config({ path: '.env.local' });

const KEY_HEX = process.env.TOKEN_ENCRYPTION_KEY || '0'.repeat(64);
const KEY = Buffer.from(KEY_HEX.padEnd(64, '0'), 'hex');

function encryptToken(plaintext) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

async function main() {
  const token = process.argv[2];
  const username = process.argv[3];
  const instagramUserId = process.argv[4];

  if (!token || !username || !instagramUserId) {
    console.error('Uso: node scripts/link-instagram-manual.js <TOKEN> <USERNAME> <IG_USER_ID>');
    process.exit(1);
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  const email = 'work.daviribeiro@gmail.com';
  console.log('--- Vínculo Manual Forçado ---');

  const { data: { users }, error } = await supabase.auth.admin.listUsers();
  const user = users.find(u => u.email === email);

  if (!user) {
    console.error('Usuário não encontrado');
    process.exit(1);
  }

  console.log(`Forçando conexão do @${username} (ID: ${instagramUserId}) ao usuário ${email}`);

  const { error: dbError } = await supabase.from('accounts').upsert({
    user_id: user.id,
    instagram_user_id: instagramUserId,
    instagram_username: username.replace('@', ''),
    instagram_name: username.replace('@', ''),
    instagram_pic_url: null,
    access_token: encryptToken(token),
    token_expires_at: new Date(Date.now() + 5184000000).toISOString(),
    is_active: true
  }, { onConflict: 'instagram_user_id' });

  if (dbError) {
    console.error('Erro no banco:', dbError);
  } else {
    console.log('✅ ACONTECEU! Instagram vinculado com sucesso manual.');
    console.log('Pode atualizar seu dashboard na Vercel agora!');
  }
}

main();
