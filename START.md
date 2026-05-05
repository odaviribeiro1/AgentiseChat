# START — Setup da sua instância

> Bem-vindo! Este arquivo configura sua instância deste projeto na sua infraestrutura **Supabase + Vercel**.
>
> 1. Crie um projeto novo no Supabase em https://supabase.com/dashboard (anote URL, anon key, service_role key e Project Reference em Project Settings → API e General).
> 2. Crie um Personal Access Token Supabase em https://supabase.com/dashboard/account/tokens (escopo "All access").
> 3. Crie um app Meta em https://developers.facebook.com/apps com produtos Instagram, Facebook Login for Business e Webhooks (anote App ID e App Secret em Settings → Basic).
> 4. Tenha em mãos uma OpenAI API key (https://platform.openai.com/api-keys) — opcional, só necessária se for usar o step de IA.
> 5. Tenha **Node 20+**, **pnpm 9+** e **Supabase CLI** (`npm i -g supabase`) instalados.
> 6. Abra um terminal na raiz deste repositório clonado.
> 7. Execute `claude` (Claude Code precisa estar instalado e autorizado).
> 8. Digite na sessão: **"Leia o arquivo START.md e execute tudo"**
> 9. Responda às perguntas conforme Claude Code as faz.
>
> Em ~10 minutos, sua instância estará configurada: migrations aplicadas no Supabase, conta de admin criada, e Claude Code te entrega a lista exata de Environment Variables para colar na Vercel.

---

## Credenciais que serão pedidas

- **Supabase URL** — `https://xxxxxxxxxxxxxxxxxxxxxx.supabase.co`. Em Project Settings → API → Project URL.
- **Supabase anon key** — JWT longo que começa com `eyJ`. Em Project Settings → API → `anon` `public`.
- **Supabase service_role key** — JWT longo (sigiloso). Em Project Settings → API → `service_role` `secret`.
- **Supabase Project Reference** — código curto tipo `xhznjliwxbosunwrcaut`. Em Project Settings → General → Reference ID.
- **Supabase Personal Access Token** — formato `sbp_...`. Em https://supabase.com/dashboard/account/tokens.
- **Meta App ID e App Secret** — em developers.facebook.com → seu app → Settings → Basic.
- **OpenAI API Key** (opcional) — em platform.openai.com/api-keys.
- **Email e senha** que você vai usar como admin desta instância.

---

## Instruções para Claude Code

> A partir daqui, este arquivo é lido e executado pelo Claude Code do aluno quando ele disser "leia START.md e execute tudo". Siga rigorosamente.

Você é responsável por configurar este projeto self-hosted (Agentise Chat — Next.js + Supabase + Vercel) na infraestrutura Supabase do usuário (aluno). O fluxo é interativo: pergunte uma credencial por vez, valide imediatamente, e só ao final aplique mudanças.

### Princípios

1. **Interativo, uma pergunta por vez.** Não pedir bloco gigante de credenciais.
2. **Validar antes de prosseguir.** Toda credencial recebida deve ser testada (URL responde, anon key autentica, access token tem permissão).
3. **Nada fica em arquivo permanente até validar.** Manter credenciais em variáveis da sessão até a confirmação final.
4. **Resumo antes de aplicar.** No final, listar tudo que vai ser feito e pedir confirmação ("digite SIM para prosseguir").
5. **Mensagens curtas e claras** em pt-BR. Sem postâmbulos longos.
6. **Erros são oportunidade de retry**, não de abandono. Se uma credencial falhar validação, peça de novo com explicação clara do que está errado.

### Pré-checagem

1. Confirmar `node --version` retorna 20+.
2. Confirmar `pwd` está na raiz do repositório (existe `package.json` com `name: "agentise-chat"` + pasta `supabase/migrations/`).
3. `git status` deve estar limpo (não obrigatório, mas alertar se sujo).
4. Confirmar que `supabase --version` (ou `npx supabase --version`) funciona. Se não, avisar o aluno e pedir para rodar `npm i -g supabase`.
5. Ler `.env.example` na raiz e listar as variáveis agrupadas em 3 grupos: Frontend Vercel (`NEXT_PUBLIC_*`), Server-only Vercel, GitHub Actions/Scripts (opcional).

### Sequência interativa

#### Passo 1 — Apresentação

Em uma única mensagem, mostrar:
- Nome do projeto detectado em `package.json`: `agentise-chat`
- Stack: Next.js 16 + Supabase (Postgres + Auth + RLS) + Vercel (deploy + crons). Sem Edge Functions — toda a lógica server vive em API Routes Next.js.
- O que vai ser feito: validar credenciais → criar `.env.local` → aplicar 15 migrations → criar admin → entregar checklist Vercel.
- Aviso: "Vou pedir cada credencial uma por vez. Você pode pausar e retomar depois — nada é gravado até a confirmação final."

Aguarde "ok" / "vai" / "pode" do aluno antes de prosseguir.

#### Passo 2 — Supabase URL

Perguntar: "Cole sua Supabase URL (formato `https://xxxx.supabase.co`)."

Validar:
- Regex `^https://[a-z0-9]{20,}\.supabase\.co$`
- `curl -sI {URL}/rest/v1/ -H "apikey: dummy"` deve retornar `401` (existe URL, falta auth válido). DNS error ou 404 = inválido.

#### Passo 3 — Supabase anon key

Perguntar: "Cole sua Supabase anon key (JWT longo, começa com `eyJ`)."

Validar:
- Começa com `eyJ`
- `curl -s {URL}/rest/v1/ -H "apikey: {ANON_KEY}"` retorna `200` ou JSON válido.

#### Passo 4 — Supabase service_role key

Perguntar: "Cole sua Supabase service_role key. Esta chave bypassa RLS — mantenha em sigilo."

Validar:
- Começa com `eyJ`
- Decodificar payload do JWT e checar `role === 'service_role'`:
  ```bash
  echo "{KEY}" | cut -d. -f2 | base64 -d 2>/dev/null
  ```

#### Passo 5 — Supabase Project Reference

Perguntar: "Cole o Project Reference do seu projeto Supabase (código curto, ~20 letras)."

Validar:
- Regex `^[a-z]{20}$`
- A URL do passo 2 deve conter esse ref como subdomínio (`https://{REF}.supabase.co`).

#### Passo 6 — Supabase Personal Access Token

Perguntar: "Cole seu Personal Access Token Supabase (formato `sbp_...`). Crie em https://supabase.com/dashboard/account/tokens com escopo 'All access' se ainda não tem."

Validar:
- Começa com `sbp_`
- `curl -s https://api.supabase.com/v1/projects/{PROJECT_REF} -H "Authorization: Bearer {ACCESS_TOKEN}"` retorna JSON com dados do projeto.

Se 401, explicar: "Token sem acesso ao projeto. Confirme escopo 'All access' e Project Ref correto."

#### Passo 7 — Meta App ID e Secret

Perguntar separadamente:

**7a.** "Cole o META_APP_ID (somente dígitos, ~15 chars). Em developers.facebook.com → seu app → Settings → Basic."
- Validar regex `^[0-9]{10,20}$`.

**7b.** "Cole o META_APP_SECRET (32 hex chars). Mesmo lugar, clique em 'Show'."
- Validar regex `^[a-f0-9]{32}$`.

Permitir o aluno digitar `pular` se ainda não tem o app Meta — anotar para configurar depois manualmente na Vercel.

#### Passo 8 — OpenAI API Key (opcional)

Perguntar: "Cole sua OPENAI_API_KEY (`sk-proj-...` ou `sk-...`). Em https://platform.openai.com/api-keys. Digite `pular` se não for usar o step de IA."

Validar (se não pulou):
- Começa com `sk-`

#### Passo 9 — Conta admin

Perguntar:

**9a.** "Email do admin desta instância:" — validar formato email.
**9b.** "Senha do admin (mínimo 8 caracteres):" — validar comprimento.

#### Passo 10 — Resumo e confirmação

Em uma mensagem única, mostrar:

```
Pronto pra aplicar:

✅ Supabase URL: https://xxxx...co
✅ Anon key: eyJhbGci... (truncada)
✅ Service role: eyJhbGci... (truncada)
✅ Project ref: xxxx
✅ Access token: sbp_xxxx... (truncado)
✅ Meta App: 921... / 44c6... (ou: pulado)
✅ OpenAI: sk-... (ou: pulado)
✅ Admin: email@example.com

Vou executar:
1. Gerar TOKEN_ENCRYPTION_KEY (openssl rand -hex 32), CRON_SECRET (openssl rand -hex 32) e META_VERIFY_TOKEN (openssl rand -hex 24)
2. Criar .env.local na raiz com todas as variáveis
3. Rodar `pnpm install` se node_modules/ não existir
4. Linkar este projeto ao seu Supabase: `npx supabase link --project-ref {REF}`
5. Aplicar as 15 migrations: `npx supabase db push`
6. Criar usuário admin via Supabase Auth Admin API
7. Confirmar que o trigger on_auth_user_created promoveu o admin para role 'admin' em user_profiles

Digite SIM (em maiúsculas) para executar. Qualquer outra coisa cancela e nada é tocado.
```

Apenas se aluno responder exatamente `SIM`, prosseguir.

#### Passo 11 — Execução

**11.1 — Gerar segredos locais**

```bash
TOKEN_ENCRYPTION_KEY=$(openssl rand -hex 32)
CRON_SECRET=$(openssl rand -hex 32)
META_VERIFY_TOKEN=$(openssl rand -hex 24)
```

**11.2 — Escrever `.env.local`**

Criar `.env.local` na raiz com:

```
NEXT_PUBLIC_SUPABASE_URL={URL}
NEXT_PUBLIC_SUPABASE_ANON_KEY={ANON_KEY}
NEXT_PUBLIC_APP_URL=http://localhost:3000

SUPABASE_SERVICE_ROLE_KEY={SERVICE_ROLE}
META_APP_ID={META_APP_ID}              # ou vazio se pulado
META_APP_SECRET={META_APP_SECRET}      # ou vazio se pulado
META_VERIFY_TOKEN={META_VERIFY_TOKEN}
META_REDIRECT_URI=http://localhost:3000/api/auth/meta/callback
META_WEBHOOK_URL=http://localhost:3000/api/webhook/instagram
TOKEN_ENCRYPTION_KEY={TOKEN_ENCRYPTION_KEY}
CRON_SECRET={CRON_SECRET}
OPENAI_API_KEY={OPENAI_API_KEY}        # ou vazio se pulado

SUPABASE_ACCESS_TOKEN={ACCESS_TOKEN}
SUPABASE_PROJECT_REF={PROJECT_REF}
```

Avisar: "`.env.local` está no `.gitignore` — nunca será commitado."

**11.3 — `pnpm install` se necessário**

Se `node_modules/` não existe, rodar `pnpm install` e mostrar saída resumida (últimas 10 linhas).

**11.4 — Linkar projeto Supabase**

```bash
SUPABASE_ACCESS_TOKEN={ACCESS_TOKEN} npx supabase link --project-ref {PROJECT_REF}
```

Pode pedir senha do banco — instruir aluno a obter em Supabase Dashboard → Project Settings → Database → Database Password (ou redefinir se esqueceu).

**11.5 — Aplicar migrations**

```bash
SUPABASE_ACCESS_TOKEN={ACCESS_TOKEN} npx supabase db push
```

Mostrar saída completa. Confirmar que terminou sem erro.

Se falhar com conflito (ex: tabela já existe), oferecer 3 opções: retry, pular, abortar.

**11.6 — Criar admin via Auth Admin API**

```bash
curl -s -X POST "{SUPABASE_URL}/auth/v1/admin/users" \
  -H "apikey: {SERVICE_ROLE}" \
  -H "Authorization: Bearer {SERVICE_ROLE}" \
  -H "Content-Type: application/json" \
  -d '{"email":"{EMAIL}","password":"{SENHA}","email_confirm":true}'
```

Validar resposta com `id` e status 200. Se 422 (already registered), oferecer login com a senha existente ou recriar.

**11.7 — Confirmar trigger de admin**

Aguardar 2 segundos. Consultar:

```bash
curl -s "{SUPABASE_URL}/rest/v1/user_profiles?select=id,role&limit=5" \
  -H "apikey: {SERVICE_ROLE}" \
  -H "Authorization: Bearer {SERVICE_ROLE}"
```

Confirmar que existe registro com `role: 'admin'` (o que acabou de ser criado). Se vier `operator`, alertar mas não falhar.

#### Passo 12 — Relatório final

Mostrar ao aluno em uma única mensagem:

```
✅ Setup local concluído!

📊 Aplicado no seu Supabase:
- 15 migrations: ✅
- Admin criado: {EMAIL} (role: admin)

📁 Arquivo gerado:
- .env.local na raiz (gitignored)

🚀 Para colocar em produção, deploy do frontend na Vercel:

1. Acesse https://vercel.com/new e importe seu fork
2. A Vercel detecta Next.js automaticamente
3. Na tela de Environment Variables, cole exatamente:

   FRONTEND (NEXT_PUBLIC_*):
   NEXT_PUBLIC_SUPABASE_URL = {URL}
   NEXT_PUBLIC_SUPABASE_ANON_KEY = {ANON_KEY}
   NEXT_PUBLIC_APP_URL = (deixe em branco — preenche após primeiro deploy)

   SERVER-ONLY (sem prefixo NEXT_PUBLIC_):
   SUPABASE_SERVICE_ROLE_KEY = {SERVICE_ROLE}
   META_APP_ID = {META_APP_ID ou "configure depois"}
   META_APP_SECRET = {META_APP_SECRET ou "configure depois"}
   META_VERIFY_TOKEN = {META_VERIFY_TOKEN}
   META_REDIRECT_URI = (preenche após primeiro deploy: https://<dominio-vercel>/api/auth/meta/callback)
   META_WEBHOOK_URL = (preenche após primeiro deploy: https://<dominio-vercel>/api/webhook/instagram)
   TOKEN_ENCRYPTION_KEY = {TOKEN_ENCRYPTION_KEY}
   CRON_SECRET = {CRON_SECRET}
   OPENAI_API_KEY = {OPENAI_API_KEY ou "configure depois"}

4. Clique em Deploy e aguarde ~2 minutos
5. Anote a URL gerada e volte em Settings → Environment Variables para preencher
   NEXT_PUBLIC_APP_URL, META_REDIRECT_URI e META_WEBHOOK_URL com a URL real
6. Faça Redeploy do último deployment
7. Configure o webhook no Meta App (developers.facebook.com → Webhooks → Instagram):
   - Callback URL = META_WEBHOOK_URL
   - Verify Token = META_VERIFY_TOKEN
   - Eventos: comments, messages, messaging_postbacks
8. Acesse a URL Vercel e faça login com {EMAIL}

⚠️ Importante:
- TOKEN_ENCRYPTION_KEY tem que ser idêntica entre local e produção (cifra os tokens Meta no banco)
- Os crons da Vercel são habilitados automaticamente (declarados em vercel.json)

Para desenvolvimento local com hot reload: `pnpm dev` e abre http://localhost:3000
```

### Tratamento de erros gerais

- Em qualquer falha, mostrar erro completo e oferecer 3 opções: retry, pular esta etapa, abortar tudo.
- Se abortar antes do passo 11.2: nenhuma mudança foi feita, pode rodar de novo do zero.
- Se abortar entre 11.2 e 11.5: pode ter `.env.local` criado e link Supabase ativo. Avisar o aluno; nada destrutivo no banco ainda.
- Se abortar depois de 11.5: migrations parcialmente aplicadas. Recomendar continuar manualmente ou recriar projeto Supabase do zero.

### Princípio final

Você está tocando na infra de produção do aluno. **Cuidado, transparência e confirmação explícita** importam mais que velocidade.
