import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

// Carregar variáveis de ambiente do .env.local
dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Erro: NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY não encontradas no .env.local')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function seedAdmin() {
  const email = 'work.daviribeiro@gmail.com'
  const password = 'Admin@123'

  console.log(`Verificando existência do usuário: ${email}...`)

  const { data: listData, error: listError } = await supabase.auth.admin.listUsers()
  
  if (listError) {
    console.error('Erro ao listar usuários:', listError.message)
    process.exit(1)
  }

  const existingUser = listData.users.find(u => u.email === email)

  if (existingUser) {
    console.log(`Usuário encontrado (ID: ${existingUser.id}). Atualizando senha...`)
    const { error: updateError } = await supabase.auth.admin.updateUserById(existingUser.id, {
      password: password,
      email_confirm: true,
      user_metadata: { role: 'admin' }
    })

    if (updateError) {
      console.error('Erro ao atualizar usuário:', updateError.message)
    } else {
      console.log('✅ Usuário administrador atualizado com sucesso!')
    }
  } else {
    console.log('Usuário não encontrado. Criando novo...')
    const { data, error: createError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { role: 'admin' }
    })

    if (createError) {
      console.error('Erro ao criar usuário:', createError.message)
    } else {
      console.log('✅ Usuário administrador criado com sucesso!')
      console.log('ID:', data.user.id)
    }
  }
}

seedAdmin()
