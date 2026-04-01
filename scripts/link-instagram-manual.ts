import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { getInstagramProfile } from '../lib/meta/instagram'
import { encryptToken } from '../lib/crypto/tokens'
import { calculateTokenExpiry } from '../lib/meta/oauth'

// Carregar variáveis de ambiente do .env.local
dotenv.config({ path: '.env.local' })

async function main() {
  const token = process.argv[2]
  if (!token) {
    console.error('Uso: npx ts-node scripts/link-instagram-manual.ts <ACCESS_TOKEN>')
    process.exit(1)
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Erro: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não configuradas no .env.local')
    process.exit(1)
  }

  // Usar createClient padrão do supabase-js para scripts Node
  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })

  console.log('\n--- 🛠 Iniciando Vínculo Manual do Instagram ---')

  const email = 'work.daviribeiro@gmail.com'

  // 1. Buscar usuário via Admin API
  const { data: { users }, error: userError } = await supabase.auth.admin.listUsers()
  
  if (userError || !users) {
    console.error('❌ Falha ao listar usuários do Auth:', userError.message)
    process.exit(1)
  }

  const user = users.find(u => u.email?.toLowerCase() === email.toLowerCase())

  if (!user) {
    console.error(`❌ Usuário ${email} não encontrado no sistema.`)
    process.exit(1)
  }

  console.log(`✅ Usuário encontrado: ${email} (ID: ${user.id})`)

  // 2. Buscar perfil do Instagram usando o token fornecido
  const profile = await getInstagramProfile(token)
  if (!profile) {
    console.error('❌ Não foi possível carregar o perfil do Instagram. Verifique se o token é válido e tem as permissões corretas.')
    process.exit(1)
  }

  console.log(`✅ Perfil Instagram: @${profile.username} (ID: ${profile.id})`)

  // 3. Salvar na tabela accounts
  const { error: dbError } = await supabase
    .from('accounts')
    .upsert(
      {
        user_id: user.id,
        instagram_user_id: profile.id,
        instagram_username: profile.username,
        instagram_name: profile.name,
        instagram_pic_url: profile.profile_picture_url ?? null,
        access_token: encryptToken(token),
        token_expires_at: calculateTokenExpiry(5184000).toISOString(),
        is_active: true,
      },
      { onConflict: 'instagram_user_id' }
    )

  if (dbError) {
    console.error('❌ Erro ao salvar no banco de dados:', dbError.message)
    process.exit(1)
  }

  console.log('\n--- 🎉 Sucesso! Conta vinculada manualmente. ---')
  console.log('Agora você pode atualizar seu dashboard na Vercel.\n')
}

main().catch(err => {
  console.error('💥 Erro fatal:', err)
  process.exit(1)
})
