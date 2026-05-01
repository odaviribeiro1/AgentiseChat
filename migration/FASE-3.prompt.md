# FASE 3 — Documentação final + DX (README, LICENSE, CONTRIBUTING, .env.example, CLAUDE.md)

> Migração SaaS → Open Source Self-Hosted | Projeto: agentise-chat
> Pré-requisito: estar na branch `oss-self-hosted`. Fase 2 (`migration(fase2):`) deve estar commitada.
> Esforço estimado: 3–4h. Risco: Baixo.

---

## Prompt para Claude Code

Você está executando a **Fase 3** da migração deste projeto de SaaS multi-tenant para Open Source Self-Hosted. O contexto completo está em `MIGRATION_PLAN.md` na raiz do repositório.

### Pré-checagem obrigatória

Antes de qualquer modificação, execute:

1. `git rev-parse --abbrev-ref HEAD` — confirmar que está em `oss-self-hosted`
2. `git status --porcelain` — confirmar working directory limpo
3. `git log -1 --oneline` — confirmar que o último commit é `migration(fase2):` (roles 2-níveis)
4. `view AUDIT_REPORT.md` (seção 6 "Sequência sugerida de fases" itens 1, 6, 7 + seção 7 observações)
5. `view MIGRATION_PLAN.md` (seção "Observações específicas deste projeto")
6. `view README.md` — confirmar que ainda é o template default do create-next-app
7. `view .env.local.example` — referência para o novo `.env.example` (mesmo conteúdo, nome diferente para convenção self-hosted)
8. `cat .gitignore` — conferir se `.env.local` está ignorado e se `.claude/` NÃO está ignorado

Se qualquer pré-checagem falhar, **pare** e reporte ao usuário em vez de prosseguir.

### Escopo desta fase

Esta fase transforma o repositório em um **boilerplate distribuível** via fork. Reescreve o README do zero em PT-BR, adiciona LICENSE (MIT), CONTRIBUTING.md, atualiza `.env.example`, garante que `.claude/CLAUDE.md` está versionado, e corrige menções a "uso interno SaaS" no CLAUDE.md para refletir que o projeto agora é um boilerplate self-hosted.

### Lista de mudanças concretas

#### Migrations SQL a criar
- Nenhuma.

#### Edge Functions a modificar / deletar
- Nenhuma.

#### Arquivos TypeScript a modificar / deletar
- Nenhum.

#### Tipos a atualizar
- Nenhum.

#### Outros artefatos (foco desta fase)

##### A. `README.md` — **reescrever do zero em PT-BR**

Estrutura obrigatória:

```markdown
# Agentise Chat — Boilerplate Self-Hosted

> Plataforma open-source de automação de Instagram (estilo ManyChat) — fluxos de DM disparados por comentários, broadcast, gestão de contatos, step de IA. Self-hosted em Supabase + Vercel.

[Badge MIT] [Badge Next.js 16] [Badge Supabase]

## ✨ Features
- Automações disparadas por comentário em posts/reels
- Step Builder visual com 9 tipos de step (texto, imagem, quick reply, CTA, delay, IA, condição, tag, end)
- Broadcast em lote com janela 24h e rate limiting Meta API
- Gestão de contatos com tags e opt-out
- Step de IA via OpenAI (BYOK em .env)
- Roles admin + operator (primeiro user vira admin automaticamente)
- Tema dark glassmorphism (sem light mode)
- 100% PT-BR

## 🚀 Stack
- Next.js 16 (App Router) + React 19 + TypeScript 5
- Tailwind 4 + shadcn/ui
- Supabase (Postgres + Auth + RLS)
- Meta Graph API (Instagram Messaging)
- OpenAI
- Deploy: Vercel (recomendado)

> **Nota sobre arquitetura:** este projeto usa **API Routes do Next.js + Server Actions**, não Edge Functions Supabase. Cron via Vercel Cron, não pg_cron. Decisão consciente para simplificar deploy self-hosted em Vercel.

## 📋 Pré-requisitos
1. Node 20+ e pnpm 9+
2. Conta Supabase (free tier funciona)
3. Conta Meta Developer com app criado e em **Live Mode** (Instagram Basic Display + Instagram Messaging + páginas)
4. Chave OpenAI (para o step de IA — opcional se não usar)
5. Conta Vercel (ou outro host Next.js)

## ⚙️ Setup local

### 1. Clone + install
\`\`\`bash
git clone <seu-fork>.git agentise-chat
cd agentise-chat
pnpm install
\`\`\`

### 2. Configure Supabase
\`\`\`bash
cp .env.example .env.local
# Edite .env.local com as credenciais do seu projeto Supabase
\`\`\`

Aplique as migrations:
\`\`\`bash
pnpm supabase link --project-ref <seu-ref>
pnpm supabase db push
\`\`\`

### 3. Configure Meta App
- Crie app em https://developers.facebook.com
- Adicione produtos: Instagram Basic Display, Instagram, Webhooks, Facebook Login for Business
- Configure webhook URL: `https://seu-dominio.vercel.app/api/webhook/instagram`
- Verify token: o valor que você colocar em `META_VERIFY_TOKEN`
- Subscribe events: `comments`, `messages`, `messaging_postbacks`

### 4. Gere a chave de criptografia
\`\`\`bash
openssl rand -hex 32   # cole o resultado em TOKEN_ENCRYPTION_KEY no .env.local
\`\`\`

### 5. Rode local
\`\`\`bash
pnpm dev
\`\`\`

Abra http://localhost:3000 e crie a primeira conta — ela vira **admin** automaticamente.

## 🧠 Tokens Meta — EAA vs IGAA (importante!)

A Meta gera dois tokens diferentes:
- **EAA (Facebook Token):** lê comentários, posts, perfil. Salvo em `accounts.access_token`.
- **IGAA (Instagram Token):** envia DMs via `graph.instagram.com/me/messages`. Salvo em `accounts.ig_access_token`.

Ambos são cifrados em repouso via AES-256-GCM (`lib/crypto/tokens.ts`). Renovação automática via cron `/api/cron/{token-refresh,refresh-ig-token}`.

## 🏗️ Deploy em Vercel

\`\`\`bash
vercel link
vercel env pull .env.production
\`\`\`

Configure as mesmas variáveis do `.env.local` no dashboard Vercel. **`TOKEN_ENCRYPTION_KEY` deve ser a mesma usada local** se você quiser ler tokens já cifrados.

Configure crons em `vercel.json`:
\`\`\`json
{
  "crons": [
    { "path": "/api/cron/poll-comments", "schedule": "* * * * *" },
    { "path": "/api/cron/cleanup-runs", "schedule": "0 */6 * * *" },
    { "path": "/api/cron/token-refresh", "schedule": "0 0 * * *" },
    { "path": "/api/cron/refresh-ig-token", "schedule": "0 0 * * *" },
    { "path": "/api/cron/broadcast", "schedule": "*/5 * * * *" }
  ]
}
\`\`\`

## 🛠️ Modo Development da Meta API
Em **Development Mode**, webhooks de DM **não são entregues**. O cron `/api/cron/poll-comments` é workaround para comentários. Quando aprovar o app em **Live Mode**, webhooks de DM passam a chegar normalmente — nenhuma alteração de código necessária.

## 👥 Roles
- **admin:** primeiro user registrado. Pode desconectar Instagram, deletar automações/contatos.
- **operator:** demais users. Pode criar/editar fluxos, disparar broadcasts, ver dashboard.

Promover um user manualmente:
\`\`\`sql
UPDATE profiles SET role = 'admin' WHERE id = '<user-uuid>';
\`\`\`

## 📁 Estrutura
\`\`\`
app/                 — rotas Next.js (auth, dashboard, api/cron, api/webhook)
components/          — UI por feature (step-builder, contacts, broadcast, …)
lib/
  automation/        — engine, executor, anti-spam, 9 tipos de step
  meta/              — client, webhook HMAC, OAuth dual EAA/IGAA, mensagens
  ai/                — client OpenAI + montagem de contexto
  queue/             — fila de broadcast com rate limiting
  crypto/            — AES-256-GCM para tokens OAuth
  supabase/          — clients server/browser + types + helpers
supabase/migrations/ — 15 migrations idempotentes
__tests__/           — 4 suítes Jest (webhook, engine, anti-spam, variables)
\`\`\`

## 🧪 Testes e build
\`\`\`bash
pnpm type-check
pnpm test
pnpm build
\`\`\`

## 🤝 Contribuindo
Veja `CONTRIBUTING.md`.

## 📜 Licença
MIT — veja `LICENSE`.
```

> **Não copie literalmente o markdown acima.** Adapte os caminhos exatos verificando o repositório (algumas rotas de cron podem ter nomes ligeiramente diferentes — confira `app/api/cron/`).

##### B. `LICENSE` — criar com MIT padrão

Conteúdo: licença MIT clássica, copyright `2026 Agentise`. Ano + holder.

##### C. `CONTRIBUTING.md` — criar PT-BR

Conteúdo curto cobrindo:
- Como reportar bugs (issues no GitHub)
- Como propor features (discussions ou issues)
- Convenção de commits: `feat:`, `fix:`, `chore:`, `refactor:` (já é a convenção do projeto — confirmar via `git log --oneline | head -20`)
- Branches: `main`, `feature/*`, `fix/*`
- Antes de PR: `pnpm lint`, `pnpm type-check`, `pnpm test`
- Estilo de código: TypeScript strict, sem `any`, design system glassmorphism dark — não mexer em cores/tema

##### D. `.env.example` — criar (cópia de `.env.local.example`)

`.env.local.example` já existe e está correto. Criar `.env.example` (convenção mais comum em boilerplates) com **conteúdo idêntico** ao `.env.local.example`. Manter os dois arquivos é aceitável — não delete `.env.local.example`.

##### E. `.gitignore` — verificar

Confirmar que:
- `.env.local` está ignorado ✅ (já deve estar)
- `.claude/` NÃO está ignorado (boilerplate distribui o briefing). Se estiver, **remover a linha**.
- `node_modules/`, `.next/`, `*.tsbuildinfo` ignorados.

##### F. `.claude/CLAUDE.md` — atualizar

Editar **apenas** as partes que mencionam SaaS interno ou cliente único:

- Cabeçalho/visão geral: trocar "Uso: interno da Agentise + produto oferecido a clientes" por "Boilerplate open-source self-hosted distribuído via GitHub. Cada fork roda sua própria instância em Supabase + Vercel."
- Adicionar bullet sobre roles admin + operator (referenciando a Fase 2).
- **Não reescreva o arquivo inteiro.** Apenas ajustes pontuais. Total esperado: ~10-15 linhas modificadas.

##### G. `app/(dashboard)/configuracoes/page.tsx`

Trocar "Gerencie os detalhes da conta do Agentise." por algo mais neutro como "Gerencie a conexão com Instagram e configurações da instância." (mantém domínio, remove a marca "Agentise" no copy de UI — opcional, decidir caso queira manter neutralidade no boilerplate).

> **Nota:** isso é a única menção textual à marca "Agentise" no UI. Sidebar e logo já são genéricos? Conferir `components/layout/sidebar.tsx` antes — se houver "Agentise Chat" hardcoded, decidir manter (é o nome do projeto upstream) ou neutralizar. **Recomendação: manter "Agentise Chat" como nome do produto upstream**; quem fizer fork rebatiza facilmente.

### Ordem de execução recomendada

1. Inspecionar o estado atual: `view README.md`, `view .env.local.example`, `view .gitignore`, `view .claude/CLAUDE.md` (apenas as primeiras 50 linhas para localizar o cabeçalho).
2. Listar `app/api/cron/` para confirmar os caminhos exatos a usar no exemplo de `vercel.json` no README.
3. Reescrever `README.md` em PT-BR conforme template acima, ajustando para a realidade do repo.
4. Criar `LICENSE` (MIT 2026 Agentise).
5. Criar `CONTRIBUTING.md`.
6. Criar `.env.example` como cópia de `.env.local.example`.
7. Verificar e ajustar `.gitignore`.
8. Atualizar `.claude/CLAUDE.md` (ajustes pontuais).
9. (Opcional) Ajustar copy em `configuracoes/page.tsx`.
10. Rodar `pnpm type-check` (sanity check — não deve mudar nada porque não houve mudança de TS).
11. Validação (gate abaixo).
12. Commit.

### Restrições

- **Não modifique código de domínio** (`lib/`, `app/api/`, `app/actions/`, `components/`). Se descobrir necessidade, parar e reportar.
- **Não delete `.env.local.example`** — manter os dois arquivos `.env.example` e `.env.local.example` é OK.
- **Não rebatize o produto** — "Agentise Chat" é o nome upstream. Forks rebatizam por conta própria.
- **Não rode `pnpm install`**.
- Se descobrir que precisa modificar algo fora do escopo planejado, **pare** e reporte.

### 🚧 Gate de validação ANTES de concluir a fase

> **Bloqueante.**

#### 1. Testes funcionais
- [ ] `README.md` reescrito em PT-BR (>= 100 linhas, contém seções: Features, Stack, Pré-requisitos, Setup local, Tokens Meta EAA/IGAA, Deploy Vercel, Roles, Estrutura, Testes, Licença). Anexar `wc -l README.md`.
- [ ] `LICENSE` existe, é MIT, contém ano "2026" e holder "Agentise".
- [ ] `CONTRIBUTING.md` existe, em PT-BR, cobre: bugs, features, convenção de commits, branches, checklist pré-PR.
- [ ] `.env.example` existe e é byte-idêntico (ou semanticamente idêntico) ao `.env.local.example`. Comando: `diff .env.example .env.local.example` retorna vazio (ou apenas comentários reordenados).
- [ ] `.gitignore` ignora `.env.local`, `.env.production`, `.next/`, `node_modules/`, `*.tsbuildinfo`. **Não** ignora `.claude/`.
- [ ] `.claude/CLAUDE.md` foi ajustado: trecho "interno da Agentise + produto oferecido a clientes" foi neutralizado para o modelo boilerplate. Citar diff.

#### 2. Build e tipos
- [ ] `pnpm type-check` passa (sanity).
- [ ] `pnpm build` passa (sanity — nenhum import quebrado).

#### 3. Testes visuais
- [ ] N/A (nenhuma mudança de UI exceto possível ajuste de copy em `configuracoes/page.tsx`).
- [ ] Se ajustou `configuracoes/page.tsx`: descrever o trecho antes/depois.

#### 4. Testes responsivos
- [ ] N/A.

#### 5. Testes de integração
- [ ] `pnpm test` — 4 suítes continuam passando.
- [ ] **Re-leitura do README:** abrir e confirmar que todos os comandos `pnpm` mencionados existem em `package.json` (não inventar comandos como `pnpm db:push` se não existir — usar `pnpm supabase db push`).
- [ ] **Re-leitura do `vercel.json` exemplo:** confirmar que cada path em `crons[]` corresponde a um arquivo em `app/api/cron/<path>/route.ts`.

#### 6. Relatório de conclusão
Antes de declarar a fase concluída, escreva no chat:
- ✅ ou ❌ por **cada item**.
- Anexar `ls -la README.md LICENSE CONTRIBUTING.md .env.example`.
- Anexar primeiras 5 linhas de cada arquivo novo.
- Anexar diff de `.claude/CLAUDE.md` (apenas a parte modificada).
- Bugs/regressões — ou registrados como débito técnico explícito.

### Commit final

```bash
git add -A
git commit -m "migration(fase3): documentação final + DX para distribuição como boilerplate

Mudanças principais:
- README.md reescrito em PT-BR com setup completo Supabase + Vercel
- LICENSE MIT adicionada (2026 Agentise)
- CONTRIBUTING.md criado em PT-BR
- .env.example criado (espelha .env.local.example)
- .gitignore conferido (.env.local ignorado, .claude/ versionado)
- .claude/CLAUDE.md atualizado para refletir modelo boilerplate self-hosted

Refs: MIGRATION_PLAN.md fase 3"
```

Reporte ao usuário a conclusão e instrua: **próxima e última fase é `migration/FASE-4.prompt.md`** (smoke test manual end-to-end em fork limpo).
