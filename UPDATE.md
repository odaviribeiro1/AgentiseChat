# UPDATE — Atualizar sua instância

> Use este arquivo sempre que quiser puxar a versão mais recente do projeto upstream e aplicá-la na sua instância.

## Como usar

1. No GitHub, vá no seu fork e clique em **"Sync fork"** (botão no topo) — isso traz os commits novos do upstream para a `main` do seu fork.
2. No terminal, dentro da pasta do projeto: `git pull`
3. Abra Claude Code: `claude`
4. Digite na sessão: **"Leia o arquivo UPDATE.md e execute tudo"**
5. Aguarde — Claude Code aplica migrations novas e valida.

A Vercel detecta o push na `main` do fork e redeploya o frontend automaticamente. Se houver Environment Variables novas (anunciadas em release notes ou novo `.env.example`), Claude Code vai te listar as que faltam e instruir como adicioná-las na Vercel.

---

## Instruções para Claude Code

> A partir daqui, este arquivo é lido pelo Claude Code do aluno e contém as instruções que você (Claude Code) deve executar quando o aluno disser "leia UPDATE.md e execute tudo".

Você está atualizando uma instância já configurada deste projeto (Agentise Chat — Next.js + Supabase + Vercel). Pré-requisitos: existe `.env.local` na raiz com `SUPABASE_ACCESS_TOKEN` e `SUPABASE_PROJECT_REF` válidos (criados no setup inicial via START.md).

### Pré-checagem

1. Confirmar que `.env.local` existe e contém `SUPABASE_ACCESS_TOKEN`, `SUPABASE_PROJECT_REF`, `NEXT_PUBLIC_SUPABASE_URL`. Se faltar qualquer um, instruir o aluno a rodar START.md primeiro.
2. `git status` deve estar limpo. Se tiver modificações locais fora de `customizations/`, alertar e pedir orientação.
3. Mostrar ao aluno o que vem de novo: `git log HEAD@{1}..HEAD --oneline` (commits puxados desde o último update).
4. Confirmar `supabase --version` (ou `npx supabase --version`) funciona.

### Sequência

1. **Aplicar migrations novas:**
   ```bash
   SUPABASE_ACCESS_TOKEN=$SUPABASE_ACCESS_TOKEN npx supabase db push
   ```
   Mostrar saída completa. Se nenhuma migration nova existir, o comando reporta "No new migrations to apply" — ok.

2. **Verificar Environment Variables novas:** ler `.env.example` atual e comparar com as variáveis presentes no `.env.local`. Se houver chaves novas em `.env.example` que não existem no `.env.local`:
   - Listar para o aluno cada chave faltante (nome, comentário, link para obter)
   - Perguntar uma a uma o valor
   - Acrescentar ao `.env.local`
   - Lembrar o aluno: "Para a Vercel pegar essas variáveis novas, você precisa adicioná-las em Vercel → Settings → Environment Variables e fazer um Redeploy"

3. **Rodar smoke test local opcional:** perguntar se o aluno quer rodar `pnpm build` localmente para validar que a versão nova compila. Se sim, rodar e mostrar últimas 30 linhas. Se não, pular.

4. **Resumo final:** listar:
   - Quantas migrations novas foram aplicadas
   - Quantas envs novas foram adicionadas (e quais)
   - Lembrete para abrir a Vercel e ver se o redeploy automático completou (https://vercel.com/dashboard)

### Tratamento de erros

- **Migration falha** → mostrar erro completo, NÃO continuar para envs, pedir orientação ao aluno (pode ser conflito de schema, falta de permissão, etc.).
- **Sem permissão na Management API** → instruir o aluno a verificar `SUPABASE_ACCESS_TOKEN` (escopo "All access") e `SUPABASE_PROJECT_REF`.
- **Build local falha** → mostrar últimas 30 linhas, sugerir abrir issue no upstream com os logs.

### Princípio

Você está mexendo em produção do aluno. Cuidado e transparência > velocidade. Em qualquer dúvida, parar e perguntar antes de seguir.
