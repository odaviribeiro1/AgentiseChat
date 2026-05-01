# FASE 2 — Roles 2-níveis (admin + operator) com trigger first-user-becomes-admin

> Migração SaaS → Open Source Self-Hosted | Projeto: agentise-chat
> Pré-requisito: estar na branch `oss-self-hosted`. Fase 1 (`migration(fase1):`) deve estar commitada.
> Esforço estimado: 2–3h. Risco: Médio.

---

## Prompt para Claude Code

Você está executando a **Fase 2** da migração deste projeto de SaaS multi-tenant para Open Source Self-Hosted. O contexto completo está em `MIGRATION_PLAN.md` na raiz do repositório, e o levantamento do que precisa mudar está em `AUDIT_REPORT.md`.

### Pré-checagem obrigatória

Antes de qualquer modificação, execute:

1. `git rev-parse --abbrev-ref HEAD` — confirmar que está em `oss-self-hosted`
2. `git status --porcelain` — confirmar working directory limpo
3. `git log -1 --oneline` — confirmar que o último commit é `migration(fase1):` (idempotência das migrations)
4. `view AUDIT_REPORT.md` (seção 2.G "Roles existentes" e seção 6 item 3)
5. `view MIGRATION_PLAN.md` (seção "Fase 2" + observações sobre roles)
6. `ls supabase/migrations/` — confirmar que existem **14** migrations (não 15)
7. `grep -rn "role" lib/supabase/database.types.ts | head` — confirmar que NÃO existe campo `role` (esta fase introduz, não modifica)

Se qualquer pré-checagem falhar, **pare** e reporte ao usuário em vez de prosseguir.

### Escopo desta fase

Esta fase introduz o conceito de **2 roles** que o projeto não tem hoje, alinhando com o modelo-alvo do boilerplate self-hosted:

- `admin` — gestor da instância. Configurações, conexão Instagram, deletar automações/contatos, gerenciar tags.
- `operator` — operacional. Pode criar/editar automações, disparar broadcasts, ver dashboard. Não pode deletar conta nem desconectar Instagram.

**Trigger:** o **primeiro usuário registrado** vira `admin` automaticamente. Os subsequentes nascem `operator` e podem ser promovidos manualmente via SQL ou UI futura.

A implementação é **conservadora**: cria a tabela `profiles` ligada a `auth.users` por trigger `on_auth_user_created`, mas **não** quebra RLS existente. Policies novas são adicionadas em **camada extra** sobre as existentes para operações destrutivas (`DELETE` em `accounts`, etc.). Operações já cobertas pela RLS atual (`auth.uid() = user_id`) continuam funcionando para ambos os roles.

### Lista de mudanças concretas

#### Migrations SQL a criar
- `supabase/migrations/20240101000015_create_profiles_and_roles.sql` — Cabeçalho PT-BR. Conteúdo:
  - `CREATE TABLE IF NOT EXISTS profiles (id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE, role text NOT NULL DEFAULT 'operator' CHECK (role IN ('admin','operator')), created_at timestamptz DEFAULT now())`
  - `ALTER TABLE profiles ENABLE ROW LEVEL SECURITY` (idempotente)
  - Policies: cada user lê/atualiza próprio profile (SELECT/UPDATE WHERE id = auth.uid()); admin pode SELECT todos.
  - Função `public.is_admin()` `SECURITY DEFINER STABLE` que retorna `(SELECT role = 'admin' FROM profiles WHERE id = auth.uid())`.
  - Trigger `on_auth_user_created`: na criação de novo `auth.users`, INSERT em `profiles` com role = `'admin'` se for o primeiro user (`(SELECT count(*) FROM profiles) = 0`), `'operator'` caso contrário.
  - Policy adicional restritiva em `accounts`: `CREATE POLICY "accounts: only admin can delete" ON accounts FOR DELETE USING (public.is_admin())` (em CIMA da policy existente — RLS é AND entre policies de mesma operação, então esta só é avaliada para DELETE).

  **Atenção crítica sobre PERMISSIVE vs RESTRICTIVE:** policies normais são `PERMISSIVE` (OR). Para forçar `AND` (admin OR resto), criar a policy nova como `AS RESTRICTIVE`. Detalhe completo da sintaxe a aplicar:

  ```sql
  CREATE POLICY "accounts: delete restricted to admin"
    ON accounts AS RESTRICTIVE FOR DELETE
    USING (public.is_admin());
  ```

  Aplicar a mesma RESTRICTIVE em `automations` (DELETE), `account_tags` (DELETE).

#### Edge Functions a modificar
- Nenhuma (projeto não usa Edge Functions).

#### Edge Functions a deletar
- Nenhuma.

#### Arquivos TypeScript a modificar
- `lib/supabase/database.types.ts` — Após criar a migration, regenerar via `pnpm supabase gen types typescript --local > lib/supabase/database.types.ts` se o supabase CLI estiver instalado E o usuário rodou a migration localmente. **Se não puder regenerar agora**, adicionar manualmente o tipo `profiles` (Row, Insert, Update) e função `is_admin` em `Database['public']['Functions']` para destravar o frontend. Documentar a decisão no commit.
- `lib/supabase/types.ts` — Adicionar export `type ProfileRow = Database['public']['Tables']['profiles']['Row']` e `type UserRole = 'admin' | 'operator'`.
- `lib/supabase/helpers/` — criar `lib/supabase/helpers/role.ts` com:
  ```ts
  export async function getUserRole(): Promise<UserRole | null> { ... }
  export async function requireAdmin(): Promise<void> { /* throw se não-admin */ }
  ```
- `app/actions/settings.ts` — Antes de qualquer ação destrutiva (desconectar Instagram, regenerar token encryption etc.), chamar `requireAdmin()`. Hoje só tem `disconnectInstagram` — proteger essa.
- `app/actions/automations.ts` — Antes do `deleteAutomation` (se existir; conferir), chamar `requireAdmin()`.
- `app/actions/contacts.ts` — Antes do `deleteContact`/`bulkDelete` (se existir), chamar `requireAdmin()`.
- `components/layout/sidebar.tsx` — Esconder ou desabilitar itens admin-only (Configurações pode ficar visível, mas o botão "Desconectar Instagram" precisa de check de role no componente que o renderiza, ou seja `components/settings/DisconnectInstagram.tsx`).
- `components/settings/DisconnectInstagram.tsx` — Render condicional: se `getUserRole() !== 'admin'`, mostrar texto "Apenas administradores podem desconectar a conta Instagram." em vez do botão.

> **Importante:** identificar a lista exata de arquivos `app/actions/*` rodando `grep -l "delete\|Delete" app/actions/*.ts` no início da fase. Pode haver server actions destrutivas que não estão listadas aqui.

#### Arquivos TypeScript a deletar
- Nenhum.

#### Tipos a atualizar
- `lib/supabase/database.types.ts` — adicionar `profiles` table types + `is_admin` function (manual ou via codegen).
- `lib/supabase/types.ts` — adicionar `UserRole` e `ProfileRow`.

#### Outros artefatos
- `.claude/CLAUDE.md` — adicionar nota curta na seção de schema explicando que `profiles.role` existe e que o primeiro user vira admin via trigger. **Não reescrever** o arquivo — só adicionar 4-5 linhas.

### Ordem de execução recomendada

1. **Identificar superfície de impacto:** rodar `grep -l "delete\|Delete\|disconnect" app/actions/*.ts components/settings/*.tsx components/contacts/*.tsx` e listar antes de tocar em qualquer coisa.
2. **Criar migration** `supabase/migrations/20240101000015_create_profiles_and_roles.sql` com tabela, policies, função `is_admin`, trigger, e policies RESTRICTIVE em `accounts`/`automations`/`account_tags` para DELETE.
3. **Atualizar tipos** em `lib/supabase/database.types.ts` e `lib/supabase/types.ts`.
4. **Criar helper** `lib/supabase/helpers/role.ts`.
5. **Aplicar `requireAdmin()`** nas server actions destrutivas identificadas no passo 1.
6. **Render condicional** em `DisconnectInstagram.tsx` (e qualquer outro componente destrutivo de UI).
7. **Atualizar `.claude/CLAUDE.md`** com 4-5 linhas sobre o trigger.
8. Rodar `pnpm type-check`.
9. Rodar `pnpm test` (4 suítes existentes — não devem quebrar).
10. Rodar `pnpm build` para garantir que o boundary client/server foi respeitado.
11. Validação (gate abaixo).
12. Commit.

### Restrições

- **Não execute `supabase db push` nem qualquer comando que modifique o banco real.** Crie a migration e pare.
- **Não modifique RLS de tabelas existentes.** A regra é **adicionar** policies RESTRICTIVE; não remover nem reescrever as PERMISSIVE existentes (criadas na Fase 0 e Fase 1 polish).
- **Não introduza novas dependências npm.**
- Não toque em arquivos fora do escopo identificado no passo 1.
- Se descobrir que `getUserRole()` precisa ser cliente E servidor (provável), criar duas variantes: `lib/supabase/helpers/role.server.ts` (usa server client) e `lib/supabase/helpers/role.client.ts` (usa browser client). Não duplique lógica de SQL — só a chamada Supabase.
- Se descobrir que precisa modificar algo fora do escopo planejado, **pare** e reporte ao usuário antes de fazer.

### 🚧 Gate de validação ANTES de concluir a fase

> **Bloqueante.** A Fase 2 NÃO pode ser declarada concluída enquanto todos os testes abaixo não forem executados e o resultado reportado explicitamente no chat.

#### 1. Testes funcionais
- [ ] `supabase/migrations/20240101000015_create_profiles_and_roles.sql` existe e contém: tabela `profiles`, função `public.is_admin()`, trigger em `auth.users`, e ao menos 3 policies RESTRICTIVE para DELETE em `accounts`/`automations`/`account_tags`. Citar linha de cada.
- [ ] `lib/supabase/helpers/role.ts` (ou `.server.ts` + `.client.ts`) exporta `getUserRole()` e `requireAdmin()`. Citar linha das exportações.
- [ ] `lib/supabase/types.ts` exporta `UserRole = 'admin' | 'operator'` e `ProfileRow`.
- [ ] Server actions destrutivas identificadas chamam `requireAdmin()` antes da operação. Listar arquivo + linha.
- [ ] `components/settings/DisconnectInstagram.tsx` (e outros UI destrutivos identificados) tem render condicional baseado em role. Mostrar trecho antes/depois.
- [ ] `.claude/CLAUDE.md` ganhou nota explicando o trigger.

#### 2. Build e tipos
- [ ] `pnpm type-check` executa sem erro (anexar última linha).
- [ ] `pnpm build` executa sem erro (anexar tail do output, focar em "Compiled successfully" ou equivalente).
- [ ] Não há erros de TypeScript em arquivos modificados.

#### 3. Testes visuais
- [ ] **Render condicional:** screenshot mental ou descrição de como `DisconnectInstagram` aparece para operator (mensagem de bloqueio) vs admin (botão habilitado). Se possível, descrever via inspeção do JSX.
- [ ] Tema dark glassmorphism preservado nos novos states (mensagens de bloqueio devem usar `text-[#94A3B8]` ou similar do design system, não hardcoded preto/cinza).

#### 4. Testes responsivos
- [ ] Render condicional não quebra layout em 375/768/1280px (descrever via inspeção do markup).

#### 5. Testes de integração
- [ ] `pnpm test` — 4 suítes existentes continuam passando. Anexar resumo (ex: "Tests: 4 passed, 4 total").
- [ ] Verificação manual via `view`: `lib/supabase/database.types.ts` agora contém o tipo `profiles` (Row/Insert/Update) e a função `is_admin`. Citar linhas.
- [ ] Verificação manual via `view`: a policy RESTRICTIVE em `accounts` na nova migration de fato bloqueia DELETE para non-admin (revisar a cláusula `USING` e confirmar lógica).

#### 6. Relatório de conclusão
Antes de declarar a fase concluída, escreva no chat:
- ✅ ou ❌ por **cada item** acima.
- Evidência objetiva: arquivos + linhas modificados, log do build, tail do test, conteúdo dos novos types.
- Lista das server actions destrutivas que ganharam `requireAdmin()`.
- Bugs/regressões encontrados e como foram resolvidos — ou registrados como débito técnico explícito com justificativa.

### Commit final

Quando todos os 6 itens do gate passarem, faça o commit:

```bash
git add -A
git commit -m "migration(fase2): roles 2-níveis (admin + operator) + trigger first-user-becomes-admin

Mudanças principais:
- Migration 015 cria tabela profiles, função is_admin() e trigger on_auth_user_created
- Policies RESTRICTIVE para DELETE em accounts/automations/account_tags
- Helper requireAdmin() aplicado em server actions destrutivas
- Render condicional em UI destrutiva (DisconnectInstagram, etc.)
- CLAUDE.md atualizado com nota sobre o trigger

Refs: MIGRATION_PLAN.md fase 2"
```

Reporte ao usuário a conclusão e instrua: **próxima fase é `migration/FASE-3.prompt.md`** (documentação final + DX).
