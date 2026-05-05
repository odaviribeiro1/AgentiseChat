# Customizations

Este diretório é o local **único e seguro** para customizações de código que você quer fazer na sua instância sem causar conflitos com atualizações do upstream.

## Por que existe

Quando você puxa atualizações do upstream (via `UPDATE.md`), o Git tenta mesclar as mudanças do projeto principal com seu código local. Se você editar arquivos fora deste diretório, vai conflitar quando puxar atualizações.

**Regra simples:** o upstream nunca edita arquivos dentro de `customizations/`. Tudo aqui é seu.

## Como usar

- Crie hooks, componentes, helpers e server actions próprios aqui dentro (ex.: `customizations/hooks/useFoo.ts`, `customizations/components/MeuBotao.tsx`).
- Importe-os no resto da aplicação normalmente: `import { meuHook } from '@/customizations/hooks/useFoo'`.
- Para sobrescrever comportamento de um componente core: copie-o para cá e altere os imports do app para apontar para a versão de `customizations/`.

## Limites

Customizações que exigem editar arquivos de domínio (ex.: alterar um step do motor de automações, mudar a lógica de uma API Route existente, alterar uma migration aprovada) **não cabem aqui** — vão precisar de merge manual quando atualizar.

Para essas, recomendado: abra issue ou PR no upstream sugerindo a customização como feature opcional.

## Path alias

O `tsconfig.json` já mapeia `@/*` para a raiz do projeto, então `@/customizations/...` funciona out of the box.
