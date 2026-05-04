# Rotation Checklist

> **Atenção:** todas as credenciais abaixo apareceram no arquivo `.env.local` deste repositório (que está no `.gitignore` e nunca foi commitado, mas existiu em disco e pode ter sido capturado por backups, sincronizações de cloud, dumps de IDE, ferramentas de busca de código etc.). Considere todas como **vazadas** e rotacione cada uma nos respectivos painéis dos providers antes de considerar este repositório seguro.
>
> Este checklist é específico das credenciais encontradas no momento da sanitização — não inclui credenciais que possam ter sido adicionadas posteriormente. Se você adicionar novas credenciais, mantenha este arquivo atualizado.

---

## 1. Supabase — Anon Key e Service Role Key

- **Project Ref vazado:** `fjaqodkjstiujnsrtkhz`
- **Project URL exposta:** `https://fjaqodkjstiujnsrtkhz.supabase.co`
- **Anon Key (truncada):** `eyJhbG...zyNk4`
- **Service Role Key (truncada):** `eyJhbG...BGFkU`  ← bypassa RLS, prioridade máxima

**Onde rotacionar:** [Supabase Dashboard → Project Settings → API](https://supabase.com/dashboard/project/fjaqodkjstiujnsrtkhz/settings/api)

**Passo a passo:**

1. Acesse o link acima (logado na conta dona do projeto)
2. Em **Project API keys**, clique em **Reset anon and service_role keys** (ou na engrenagem ao lado de cada chave)
3. Confirme — as chaves antigas são imediatamente invalidadas
4. Copie as novas chaves
5. Atualize em **Vercel → Project → Settings → Environment Variables**:
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
6. Atualize seu `.env.local` para desenvolvimento
7. Em **Vercel → Deployments → ⋯ → Redeploy** o último deploy de produção para o frontend pegar a nova anon key

> **Não é possível rotacionar a Project URL.** Se considerar que o ref `fjaqodkjstiujnsrtkhz` está comprometido demais (ex: foi enumerado por um atacante e terminou em bots), a única opção é criar um novo projeto Supabase, exportar/restaurar o banco e reapontar `NEXT_PUBLIC_SUPABASE_URL`.

---

## 2. Meta App Secret

- **App ID exposta:** `921865237497262` (público — ID não é segredo, mas o secret abaixo sim)
- **Config ID exposta:** `1913789925918859`
- **App Secret (truncada):** `44c6...fd74`

**Onde rotacionar:** [Meta for Developers → seu app → App Settings → Basic](https://developers.facebook.com/apps/921865237497262/settings/basic/)

**Passo a passo:**

1. Acesse o link (precisa de role admin no app)
2. Em **App Secret**, clique em **Show** → **Reset**
3. Confirme — pode pedir senha do Facebook
4. Copie o novo secret
5. Atualize `META_APP_SECRET` em **Vercel → Settings → Environment Variables**
6. Atualize seu `.env.local`
7. Redeploye na Vercel para o webhook validar HMAC com a nova chave

> **Atenção:** rotacionar o App Secret invalida assinaturas HMAC em tempo real. Se houver webhooks em voo no momento da rotação, eles serão rejeitados — aceitável (a Meta retransmite).

---

## 3. Meta Verify Token

- **Valor vazado:** `agentise_chat_verify_token`

**Onde rotacionar:** apenas no seu `.env.local` / `vercel env`

**Passo a passo:**

1. Gere um valor novo: `openssl rand -hex 24`
2. Atualize `META_VERIFY_TOKEN` em **Vercel → Settings → Environment Variables**
3. Atualize seu `.env.local`
4. Redeploye
5. No painel da Meta (Webhooks → Instagram), clique em **Edit** e cole o novo valor — a Meta vai chamar `GET /api/webhook/instagram?hub.verify_token=...` para revalidar

---

## 4. OpenAI API Key

- **Chave (truncada):** `sk-proj-WWZr...XroA`

**Onde rotacionar:** [platform.openai.com/api-keys](https://platform.openai.com/api-keys)

**Passo a passo:**

1. Acesse o link
2. Encontre a chave na lista (compare pelos últimos 4 chars: `XroA`)
3. Clique em **⋯** → **Revoke key** → confirme
4. Clique em **+ Create new secret key** → dê um nome → copie a chave (só aparece uma vez)
5. Atualize `OPENAI_API_KEY` em **Vercel → Settings → Environment Variables**
6. Atualize seu `.env.local`
7. Redeploye na Vercel

> **Custo:** se a chave vazada for usada por terceiros, vai cobrar na sua conta. Recomendado também conferir [platform.openai.com/usage](https://platform.openai.com/usage) por chamadas anômalas.

---

## 5. Token Encryption Key

- **Valor vazado:** `76d2eb...9ac8` (64 hex chars — usada em AES-256-GCM para cifrar tokens Meta no banco)

**Onde rotacionar:** apenas no seu `.env.local` / `vercel env`

> ⚠️ **Atenção crítica:** rotacionar `TOKEN_ENCRYPTION_KEY` **invalida todos os tokens já cifrados no banco** (`accounts.access_token`, `accounts.ig_access_token`). Não é uma rotação trivial — você terá que reconectar o Instagram em todas as contas. Avalie:
>
> - **Se o repo nunca saiu da sua máquina e você não compartilhou a chave:** rotação é menos urgente. Pode adiar e fazer junto com a próxima reconexão programada da conta.
> - **Se houve qualquer dúvida sobre exposição:** rote agora e reconecte.

**Passo a passo (se for rotacionar):**

1. Gere uma nova chave: `openssl rand -hex 32`
2. **Antes** de trocar a chave, prepare-se para reconectar todas as contas Meta após o deploy
3. Atualize `TOKEN_ENCRYPTION_KEY` em **Vercel → Settings → Environment Variables**
4. Atualize seu `.env.local`
5. Redeploye
6. As tentativas de descriptografia vão falhar — o frontend vai pedir reconexão na tela `/conexao`
7. Refaça o OAuth Meta para cada conta

---

## 6. Cron Secret

- **Valor vazado:** `65dca6e0...fae26b245`

**Onde rotacionar:** apenas no seu `.env.local` / `vercel env`

**Passo a passo:**

1. Gere um valor novo: `openssl rand -hex 32`
2. Atualize `CRON_SECRET` em **Vercel → Settings → Environment Variables**
3. Redeploye — a Vercel vai usar o novo segredo automaticamente nas próximas execuções dos crons declarados em `vercel.json`

> **Impacto baixo:** sem este segredo, um atacante consegue no máximo disparar os endpoints de cron à mão. Os endpoints fazem trabalho de reconciliação — re-executá-los é idempotente. Mesmo assim, rote por higiene.

---

## Verificação final

Após rotacionar todas as chaves:

1. Acesse a URL Vercel da sua instância e verifique que o login funciona (valida nova anon key)
2. Conecte/teste o Instagram em `/conexao` (valida nova `META_APP_SECRET` no OAuth)
3. Crie uma automação simples e dispare por comentário em um post de teste (valida HMAC no webhook + envio de DM)
4. Rode um cron à mão: `curl -H "Authorization: Bearer $CRON_SECRET" https://<seu-dominio>/api/cron/cleanup-runs` deve retornar JSON, não 401
5. Se usar step de IA, dispare uma automação que use IA (valida nova `OPENAI_API_KEY`)

Se algum passo falhar, releia a seção correspondente acima e confirme que o valor foi salvo nos 3 ambientes da Vercel (Production, Preview, Development conforme seu fluxo).
