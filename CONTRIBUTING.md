# Contribuindo com o Agentise Chat

Obrigado pelo interesse em contribuir! Este projeto é um **boilerplate open-source self-hosted** distribuído sob licença MIT. Forks são bem-vindos e contribuições upstream também.

## Reportando bugs

- Abra uma **issue no GitHub** descrevendo:
  - O que você esperava
  - O que aconteceu
  - Passos para reproduzir
  - Versão do Node, pnpm e do Next.js
  - Logs relevantes (sem expor tokens, secrets ou dados de contatos reais)
- Se o bug envolve a Meta API, indique se seu app está em **Development Mode** ou **Live Mode** — isso afeta vários comportamentos (ver `README.md`).

## Propondo features

- Para mudanças pequenas: abra uma **issue** descrevendo o problema e a solução proposta.
- Para mudanças grandes (novos tipos de step, integrações): abra uma **GitHub Discussion** primeiro para alinhar.

## Convenção de commits

O projeto segue **Conventional Commits**. Prefixos aceitos:

- `feat:` — nova funcionalidade
- `fix:` — correção de bug
- `chore:` — manutenção, build, deps
- `refactor:` — refatoração sem mudança de comportamento
- `docs:` — apenas documentação
- `test:` — adição ou ajuste de testes

Exemplos válidos:

```
feat: add Telegram broadcast adapter
fix: handle expired IGAA token on refresh
refactor: extract anti-spam check into separate module
docs: update Vercel cron schedule examples
```

## Branches

- `main` — produção (protegida).
- `feature/<nome-curto>` — novas features.
- `fix/<nome-curto>` — correções.
- `oss-self-hosted` — branch de migração SaaS → boilerplate (upstream apenas, não criar similares em forks).

## Checklist antes de abrir um Pull Request

- [ ] `pnpm lint` passa (zero warnings novos)
- [ ] `pnpm type-check` passa (sem `any`, sem erros de tipo)
- [ ] `pnpm test` passa (suítes existentes continuam verdes)
- [ ] Se mudou schema: nova migration numerada em `supabase/migrations/`, idempotente (`IF NOT EXISTS`), com comentário PT-BR no topo
- [ ] Se mexeu em UI: respeitou o **design system glassmorphism dark** (não criar light mode, não introduzir novas cores fora da paleta `#0A0A0F` / `#3B82F6` / glass borders)
- [ ] Toda string de UI em **PT-BR**
- [ ] Nenhum token, secret ou chave em commits ou logs
- [ ] Descrição do PR explica o **porquê** da mudança (não apenas o quê)

## Estilo de código

- **TypeScript strict.** Nunca usar `any` — preferir `unknown` + type guard.
- **Server Actions** para mutações de formulários; **API Routes** apenas para webhooks externos e crons.
- **RLS** em toda nova tabela com `account_id`.
- **Verificação HMAC** obrigatória em qualquer novo webhook receiver.
- **Janela de 24h** verificada antes de qualquer DM proativa (ver `lib/automation/anti-spam.ts`).
- **Tema fixo** — não introduzir branding dinâmico, white-label ou multi-tenant.

## Customizando sem conflitos

Toda customização que você fizer no seu fork deve ficar em `customizations/`. Esse diretório é "zona livre" — o upstream nunca edita arquivos lá. Garante que `git pull` (após Sync fork) não gere conflito.

Para detalhes, leia [`customizations/README.md`](./customizations/README.md).

## Distribuição em fork

Se você fez fork e quer rebatizar o produto:

1. Edite o título no `README.md`, copy em `app/(dashboard)/configuracoes/page.tsx` e nome do produto no sidebar (`components/layout/`).
2. Substitua o `LICENSE` mantendo MIT (recomendado) ou outra licença compatível.
3. Atualize `.claude/CLAUDE.md` com o nome novo se você usa Claude Code.
4. Não há obrigação de manter referência ao upstream, mas é apreciado.

---

*Em caso de dúvida: abra uma issue. Respondemos em PT-BR ou inglês.*
