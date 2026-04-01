# CLAUDE.md — Agentise Chat

> Guia de contexto para o Claude Code trabalhar no projeto Agentise Chat.
> Leia este arquivo inteiro antes de qualquer tarefa de desenvolvimento.

---

## 🧭 O que é este projeto

**Agentise Chat** é uma plataforma SaaS de automação de Instagram — similar ao ManyChat — desenvolvida pela Agentise (Florianópolis, Brasil). Permite que criadores de conteúdo e PMEs criem automações de DM disparadas por comentários em posts e reels, com construção de fluxos por etapas, broadcast, gestão de contatos e IA integrada.

**Uso:** interno da Agentise + produto oferecido a clientes  
**Público:** infoprodutores, criadores de conteúdo, PMEs (clínicas, imobiliárias, etc.)  
**Mercado:** Brasil — toda a UX é em PT-BR

---

## 🗂️ Estrutura de Diretórios

```
agentise-chat/
├── app/                        # Next.js App Router
│   ├── (auth)/                 # Rotas de autenticação
│   ├── (dashboard)/            # Layout principal autenticado
│   │   ├── dashboard/          # Página inicial com métricas
│   │   ├── automacoes/         # Lista e criação de automações
│   │   │   └── [id]/editar/    # Step Builder
│   │   ├── broadcast/          # Módulo de broadcast
│   │   │   └── [id]/           # Resultado de broadcast
│   │   ├── contatos/           # Lista de contatos
│   │   │   └── [id]/           # Perfil do contato
│   │   ├── conexao/            # Status da conta Instagram
│   │   └── configuracoes/      # Configurações gerais
│   └── api/
│       ├── webhook/instagram/  # Receiver de eventos Meta
│       ├── auth/meta/          # OAuth Meta callback
│       └── cron/               # Jobs agendados (janela 24h, etc.)
├── components/
│   ├── ui/                     # Componentes base (shadcn/ui)
│   ├── step-builder/           # Componentes do Step Builder
│   ├── broadcast/              # Componentes de broadcast
│   ├── contacts/               # Componentes de contatos
│   └── dashboard/              # Widgets de dashboard
├── lib/
│   ├── meta/                   # Integração Meta Graph API
│   │   ├── client.ts           # Cliente HTTP Meta API
│   │   ├── webhook.ts          # Verificação HMAC + parsing
│   │   └── messages.ts         # Helpers de envio de DM
│   ├── automation/             # Motor de automações
│   │   ├── engine.ts           # Avaliação de triggers
│   │   ├── executor.ts         # Execução de steps
│   │   └── steps/              # Implementação de cada tipo de step
│   ├── ai/                     # Integração LLM
│   │   ├── client.ts           # Cliente OpenAI
│   │   └── context.ts          # Montagem de contexto de conversa
│   ├── queue/                  # Fila de processamento
│   │   └── broadcast.ts        # Fila de broadcast com rate limiting
│   └── supabase/
│       ├── client.ts           # Cliente browser
│       ├── server.ts           # Cliente server-side
│       └── types.ts            # Tipos gerados do schema
├── supabase/
│   ├── migrations/             # Migrations SQL ordenadas
│   └── functions/              # Edge Functions
├── .env.local                  # Variáveis de ambiente (nunca commitar)
└── CLAUDE.md                   # Este arquivo
```

---

## ⚙️ Stack Técnica

| Camada | Tecnologia |
|--------|-----------|
| Frontend | Next.js 14 (App Router) + React + TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| Banco de dados | Supabase (PostgreSQL) com RLS |
| Auth | Supabase Auth (para login na plataforma) |
| API Instagram | Meta Graph API — Instagram Messaging API |
| Webhook | Next.js API Route (`/api/webhook/instagram`) |
| IA / LLM | OpenAI GPT-4.1 e GPT-4.1-mini |
| Fila de jobs | Supabase queues ou BullMQ (a definir) |
| Infra | DigitalOcean + EasyPanel (self-hosted) |
| Package manager | pnpm |

---

## 🗄️ Schema do Banco de Dados

### Tabelas principais

```sql
-- Conta Instagram conectada
accounts (
  id uuid PRIMARY KEY,
  instagram_user_id text UNIQUE NOT NULL,
  instagram_username text NOT NULL,
  access_token text NOT NULL,          -- encriptado
  token_expires_at timestamptz,
  webhook_verified_at timestamptz,
  created_at timestamptz DEFAULT now()
)

-- Contatos (usuários que interagiram)
contacts (
  id uuid PRIMARY KEY,
  account_id uuid REFERENCES accounts,
  instagram_user_id text NOT NULL,
  username text,
  full_name text,
  profile_pic_url text,
  last_message_at timestamptz,         -- base para janela de 24h
  window_expires_at timestamptz,       -- last_message_at + 24h
  is_blocked boolean DEFAULT false,
  opted_out boolean DEFAULT false,
  tags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  UNIQUE(account_id, instagram_user_id)
)

-- Automações
automations (
  id uuid PRIMARY KEY,
  account_id uuid REFERENCES accounts,
  name text NOT NULL,
  status text DEFAULT 'draft',         -- draft | active | paused
  trigger_type text NOT NULL,          -- comment_keyword | dm_keyword (v2) | story_reply (v2)
  trigger_config jsonb NOT NULL,       -- { keywords: [], post_id: null, match_type: 'contains' }
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
)

-- Steps de uma automação (ordenados)
steps (
  id uuid PRIMARY KEY,
  automation_id uuid REFERENCES automations ON DELETE CASCADE,
  parent_step_id uuid REFERENCES steps,   -- para ramificações
  branch_value text,                       -- valor do botão que leva a este step
  position integer NOT NULL,
  type text NOT NULL,                      -- message | image_message | quick_reply | cta_button | delay | ai | condition | tag | end
  config jsonb NOT NULL,                   -- configuração específica do tipo
  created_at timestamptz DEFAULT now()
)

-- Broadcasts
broadcasts (
  id uuid PRIMARY KEY,
  account_id uuid REFERENCES accounts,
  name text NOT NULL,
  status text DEFAULT 'draft',             -- draft | scheduled | sending | sent | failed
  message_config jsonb NOT NULL,           -- tipo e conteúdo da mensagem
  segment_tags text[],                     -- filtro por tags (null = todos elegíveis)
  scheduled_at timestamptz,
  sent_at timestamptz,
  total_recipients integer DEFAULT 0,
  total_sent integer DEFAULT 0,
  total_failed integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
)

-- Execuções de automação por contato
automation_runs (
  id uuid PRIMARY KEY,
  automation_id uuid REFERENCES automations,
  contact_id uuid REFERENCES contacts,
  current_step_id uuid REFERENCES steps,
  status text DEFAULT 'running',           -- running | completed | failed | waiting
  trigger_event_id text,                   -- ID do evento Meta que disparou
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz
)

-- Todas as mensagens trocadas
messages (
  id uuid PRIMARY KEY,
  account_id uuid REFERENCES accounts,
  contact_id uuid REFERENCES contacts,
  direction text NOT NULL,                 -- inbound | outbound
  type text NOT NULL,                      -- text | image | quick_reply | button
  content jsonb NOT NULL,
  meta_message_id text,                    -- ID da mensagem na Meta API
  automation_run_id uuid REFERENCES automation_runs,
  broadcast_id uuid REFERENCES broadcasts,
  sent_at timestamptz DEFAULT now(),
  delivered_at timestamptz,
  read_at timestamptz
)

-- Eventos recebidos pelo webhook (log)
webhook_events (
  id uuid PRIMARY KEY,
  event_type text NOT NULL,
  payload jsonb NOT NULL,
  processed boolean DEFAULT false,
  processed_at timestamptz,
  error text,
  received_at timestamptz DEFAULT now()
)
```

### Regras críticas de RLS

```sql
-- Toda tabela deve ter RLS ativado
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
-- accounts: só o próprio usuário autenticado acessa
-- contacts, automations, steps, broadcasts, messages: sempre filtrar por account_id
```

---

## 🔌 Meta Graph API

### Permissões necessárias

```
instagram_manage_comments   — leitura de comentários
instagram_manage_messages   — envio e recebimento de DMs
instagram_basic             — dados básicos da conta
pages_manage_metadata       — gestão do webhook
```

### Variáveis de ambiente obrigatórias

```bash
META_APP_ID=
META_APP_SECRET=
META_VERIFY_TOKEN=           # token aleatório para verificação do webhook
META_WEBHOOK_URL=            # URL pública do endpoint /api/webhook/instagram
INSTAGRAM_ACCESS_TOKEN=      # token de longa duração (60 dias, renovar automaticamente)
```

### Webhook — verificação HMAC (CRÍTICO)

```typescript
// lib/meta/webhook.ts
import crypto from 'crypto';

export function verifyWebhookSignature(
  payload: string,
  signature: string
): boolean {
  const expected = crypto
    .createHmac('sha256', process.env.META_APP_SECRET!)
    .update(payload)
    .digest('hex');
  return `sha256=${expected}` === signature;
}
```

**Nunca processar um evento sem verificar a assinatura HMAC primeiro.**

### Envio de DM

```typescript
// lib/meta/messages.ts
const BASE_URL = 'https://graph.facebook.com/v19.0';

export async function sendTextMessage(recipientIgId: string, text: string) {
  return fetch(`${BASE_URL}/me/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.INSTAGRAM_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      recipient: { id: recipientIgId },
      message: { text },
    }),
  });
}

export async function sendQuickReplies(
  recipientIgId: string,
  text: string,
  buttons: Array<{ title: string; payload: string }>
) {
  return fetch(`${BASE_URL}/me/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.INSTAGRAM_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      recipient: { id: recipientIgId },
      message: {
        text,
        quick_replies: buttons.map(b => ({
          content_type: 'text',
          title: b.title,
          payload: b.payload,
        })),
      },
    }),
  });
}
```

### Rate limits Meta API

- Máximo de **200 mensagens por segundo** por conta (respeitar na fila de broadcast)
- Janela de 24h: nunca enviar DM proativa fora da janela — verificar sempre `window_expires_at > now()`
- Retry com backoff exponencial: 1s → 2s → 4s (máximo 3 tentativas)

---

## 🤖 Motor de Automações

### Fluxo de execução

```
webhook recebe evento de comentário
  → verifyWebhookSignature()
  → salvar em webhook_events
  → identificar tipo: COMMENT
  → buscar automações ativas com trigger_type = 'comment_keyword'
  → para cada automação: avaliar se comentário contém keyword
  → se match: criar automation_run
  → executor.runStep(run, firstStep)
    → switch(step.type):
        'message'     → sendTextMessage()
        'image_message' → sendImageMessage()
        'quick_reply' → sendQuickReplies()
        'cta_button'  → sendCtaButton()
        'delay'       → enfileirar próximo step com delay
        'ai'          → callLLM() → sendTextMessage(response)
        'condition'   → avaliar condição → executar branch correto
        'tag'         → aplicar tag ao contato
        'end'         → marcar run como completed
  → atualizar window_expires_at do contato
```

### Avaliação de keyword (trigger)

```typescript
function matchesKeyword(comment: string, config: TriggerConfig): boolean {
  const text = comment.toLowerCase().trim();
  return config.keywords.some(kw => {
    const keyword = kw.toLowerCase().trim();
    return config.match_type === 'exact'
      ? text === keyword
      : text.includes(keyword);
  });
}
```

### Proteção anti-spam (obrigatório)

```typescript
// Verificar antes de qualquer envio de DM
async function canSendToContact(contactId: string, automationId: string): Promise<boolean> {
  // 1. Contato não está bloqueado
  // 2. Contato não fez opt-out (respondeu PARAR/STOP)
  // 3. Não está em um run ativo da mesma automação
  // 4. Não recebeu mensagem desta automação nas últimas N horas (config)
}
```

---

## 🧠 Integração LLM (Step de IA)

```typescript
// lib/ai/client.ts
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function runAiStep(
  systemPrompt: string,
  conversationHistory: Array<{ role: 'user' | 'assistant'; content: string }>,
  model: 'gpt-4.1' | 'gpt-4.1-mini' = 'gpt-4.1-mini'
): Promise<string> {
  const response = await openai.chat.completions.create({
    model,
    messages: [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
    ],
    max_tokens: 500,
    temperature: 0.7,
  });
  return response.choices[0].message.content ?? '';
}
```

**Regras do step de IA:**
- Se a IA retornar string vazia ou lançar erro → aplicar tag `requer-humano` ao contato e encerrar o fluxo
- Nunca expor a chave OpenAI no frontend — sempre chamar via API Route server-side
- Registrar tokens consumidos em tabela `ai_usage` para controle de custos

---

## 📡 Janela de 24h — Regras Críticas

A janela de 24h é o conceito mais importante de conformidade com a Meta API.

```typescript
// Verificar elegibilidade antes de qualquer envio proativo
function isWithinWindow(contact: Contact): boolean {
  return contact.window_expires_at > new Date();
}

// Atualizar janela toda vez que o contato enviar uma mensagem
async function refreshContactWindow(contactId: string) {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await supabase
    .from('contacts')
    .update({ last_message_at: new Date(), window_expires_at: expiresAt })
    .eq('id', contactId);
}
```

**Regras absolutas:**
1. **NUNCA** enviar DM proativa para contato com `window_expires_at < now()`
2. Atualizar `window_expires_at` em **toda** mensagem inbound recebida
3. Broadcasts só enviam para contatos com janela ativa — filtrar no query antes de enfileirar
4. Se o contato responder `PARAR`, `STOP`, `CANCELAR` → setar `opted_out = true` imediatamente

---

## 📨 Broadcast — Fila e Rate Limiting

```typescript
// lib/queue/broadcast.ts

// Rate limit: 200 msgs/s por conta — usar delay entre lotes
const BATCH_SIZE = 50;
const DELAY_BETWEEN_BATCHES_MS = 500;

export async function processBroadcastQueue(broadcastId: string) {
  const recipients = await getEligibleContacts(broadcastId); // window ativa + tags

  for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
    const batch = recipients.slice(i, i + BATCH_SIZE);
    await Promise.all(batch.map(contact => sendBroadcastMessage(broadcastId, contact)));
    await sleep(DELAY_BETWEEN_BATCHES_MS);
  }
}
```

---

## 🛡️ Segurança — Checklist

- [ ] Verificação HMAC em **todo** request de webhook
- [ ] Tokens Meta armazenados **criptografados** (AES-256) — nunca em texto plano
- [ ] Chave OpenAI **nunca** exposta no client bundle
- [ ] RLS ativado em **todas** as tabelas Supabase
- [ ] Rate limiting no endpoint de webhook (max 100 req/s)
- [ ] Sanitizar todo conteúdo vindo do usuário antes de salvar
- [ ] Variáveis de ambiente: nunca commitar `.env.local`

---

## 🎨 Design System — Agentise Leads (referência visual obrigatória)

> O design system abaixo é extraído diretamente da plataforma Agentise Leads.
> **Toda** a UI da Agentise Chat deve seguir exatamente este padrão — cores, tipografia, espaçamentos e estrutura de layout.

---

### Paleta de Cores

```css
/* ─── CSS Variables — colar no globals.css ─────────────────────────── */
:root {
  /* Sidebar */
  --sidebar-bg:           #0F1729;   /* azul naval escuro — fundo da sidebar */
  --sidebar-bg-hover:     #1A2540;   /* hover dos itens da sidebar */
  --sidebar-active:       #1E3A5F;   /* item ativo na sidebar */
  --sidebar-text:         #8B9BB4;   /* texto inativo na sidebar */
  --sidebar-text-active:  #FFFFFF;   /* texto do item ativo */
  --sidebar-section:      #4A5568;   /* label de seção (ex: "INTEGRAÇÕES") */

  /* Background & Superfícies */
  --bg-page:              #F0F2F5;   /* fundo geral da página */
  --bg-card:              #FFFFFF;   /* cards e painéis */
  --bg-input:             #FFFFFF;   /* inputs e textareas */
  --bg-input-placeholder: #F8F9FB;   /* área de textarea com placeholder */

  /* Bordas */
  --border-default:       #E2E8F0;   /* borda padrão de cards e inputs */
  --border-input-focus:   #2B7FFF;   /* borda de input em foco */

  /* Accent — Azul Agentise */
  --accent:               #2B7FFF;   /* azul principal — botões, links, ativo */
  --accent-hover:         #1A6FEF;   /* hover do accent */
  --accent-light:         #EBF3FF;   /* fundo de badge/tag azul claro */
  --accent-text:          #2B7FFF;   /* texto em accent sobre fundo claro */

  /* Texto */
  --text-primary:         #1A202C;   /* títulos e texto principal */
  --text-secondary:       #4A5568;   /* texto secundário, subtítulos */
  --text-muted:           #718096;   /* texto de placeholder e dicas */
  --text-disabled:        #A0AEC0;   /* texto desabilitado */

  /* Status */
  --success:              #38A169;   /* verde — ativo, sucesso */
  --success-light:        #F0FFF4;   /* fundo de badge verde */
  --warning:              #D97706;   /* laranja — alerta */
  --warning-light:        #FFFBEB;   /* fundo de badge laranja */
  --danger:               #E53E3E;   /* vermelho — erro, exclusão */
  --danger-light:         #FFF5F5;   /* fundo de badge vermelho */

  /* Checkbox ativo */
  --checkbox-active-bg:   #2B7FFF;   /* fundo do checkbox marcado */
  --checkbox-active-border:#2B7FFF;  /* borda do checkbox marcado */

  /* Logo / Brand */
  --logo-bg:              #2B7FFF;   /* ícone circular do logo na sidebar */
  --logo-icon:            #FFFFFF;
}
```

---

### Tipografia

```css
/* Font: Nunito ou similar — sans-serif geométrica arredondada */
/* Import no layout.tsx: */
/* import { Nunito } from 'next/font/google' */
/* const nunito = Nunito({ subsets: ['latin'], weight: ['400','500','600','700'] }) */

--font-family: 'Nunito', 'Inter', sans-serif;

/* Escala tipográfica */
--text-xs:   11px;  /* labels de seção sidebar (uppercase, letter-spacing) */
--text-sm:   13px;  /* itens de menu, texto muted, badges */
--text-base: 14px;  /* corpo padrão, itens de lista */
--text-md:   16px;  /* rótulos de campo, texto de card */
--text-lg:   20px;  /* subtítulos de página */
--text-xl:   24px;  /* títulos de página (ex: "Consulta de CNPJ em Lote") */
--text-2xl:  28px;  /* títulos maiores */

/* Pesos */
--font-regular:  400;
--font-medium:   500;
--font-semibold: 600;
--font-bold:     700;
```

---

### Layout Base

```
┌─────────────────────────────────────────────────────────────┐
│  SIDEBAR (260px fixo, height: 100vh, overflow-y: auto)      │
│  bg: #0F1729                                                 │
│                                                              │
│  [Logo + nome do produto]  ← topo                           │
│  [Nav items]               ← lista de rotas                  │
│  [INTEGRAÇÕES label]       ← seção com indicadores coloridos │
│  [Modo Escuro toggle]                                        │
│  [Recolher]                ← bottom                          │
│  [Avatar + email + logout] ← sticky no bottom               │
├─────────────────────────────────────────────────────────────┤
│  MAIN CONTENT (flex-1, bg: #F0F2F5, padding: 32px)          │
│                                                              │
│  [Page Header]  ← título h1 + subtítulo muted               │
│  [Cards]        ← bg: white, border-radius: 12px, padding   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

### Componentes — Especificações

#### Sidebar

```tsx
// Sidebar item inativo
className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-[#8B9BB4]
           text-sm font-medium cursor-pointer hover:bg-[#1A2540] hover:text-white
           transition-colors duration-150"

// Sidebar item ativo
className="flex items-center gap-3 px-4 py-2.5 rounded-lg text-white
           bg-[#1E3A5F] text-sm font-semibold"

// Label de seção
className="text-[10px] font-semibold uppercase tracking-widest text-[#4A5568] px-4 mb-1"

// Logo
className="w-8 h-8 rounded-full bg-[#2B7FFF] flex items-center justify-center"

// Usuário no rodapé (sticky bottom)
className="flex items-center gap-2 px-4 py-3 border-t border-[#1A2540]"
// Avatar: w-7 h-7 rounded-full bg-[#2B7FFF] text-white text-xs font-bold
```

#### Cards / Painéis

```tsx
// Card padrão
className="bg-white rounded-xl border border-[#E2E8F0] p-6"

// Card com título interno
// Título: text-base font-semibold text-[#1A202C] mb-4
// Subtítulo/label de campo: text-sm font-medium text-[#1A202C] mb-1.5
```

#### Page Header

```tsx
// Título da página
<h1 className="text-2xl font-bold text-[#1A202C]">Consulta de CNPJ em Lote</h1>
// Subtítulo
<p className="text-sm text-[#718096] mt-0.5">Consulte múltiplos CNPJs de uma vez...</p>
```

#### Inputs e Textareas

```tsx
// Input padrão
className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm
           text-[#1A202C] bg-white placeholder:text-[#A0AEC0]
           focus:outline-none focus:ring-2 focus:ring-[#2B7FFF] focus:border-[#2B7FFF]
           transition-shadow duration-150"

// Textarea com placeholder de código
className="w-full border border-[#E2E8F0] rounded-lg px-4 py-3 text-sm
           font-mono text-[#718096] bg-[#F8F9FB] placeholder:text-[#A0AEC0]
           focus:outline-none focus:ring-2 focus:ring-[#2B7FFF] min-h-[140px] resize-y"
```

#### Botões

```tsx
// Primário (accent)
className="bg-[#2B7FFF] hover:bg-[#1A6FEF] text-white text-sm font-semibold
           px-4 py-2 rounded-lg transition-colors duration-150"

// Secundário (outline)
className="border border-[#E2E8F0] bg-white hover:bg-[#F8F9FB] text-[#4A5568]
           text-sm font-medium px-4 py-2 rounded-lg transition-colors duration-150
           flex items-center gap-2"

// Ghost (sidebar actions)
className="text-[#8B9BB4] hover:text-white text-sm px-2 py-1 rounded
           hover:bg-[#1A2540] transition-colors duration-150"
```

#### Checkboxes

```tsx
// Checkbox marcado: bg-[#2B7FFF] border-[#2B7FFF] com check icon branco
// Checkbox desmarcado: bg-white border-[#CBD5E0] rounded

// Label do checkbox
className="text-sm font-medium text-[#1A202C] select-none cursor-pointer"

// Grupo de checkboxes (layout de filtros)
className="grid grid-cols-2 gap-x-8 gap-y-3"
```

#### Badges / Status

```tsx
// Ativo (verde)
className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold
           bg-[#F0FFF4] text-[#38A169]"

// Janela 24h ativa (verde pulsante)
className="w-2 h-2 rounded-full bg-[#38A169] animate-pulse"

// Janela expirada (cinza)
className="w-2 h-2 rounded-full bg-[#A0AEC0]"

// Tag azul
className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium
           bg-[#EBF3FF] text-[#2B7FFF]"
```

#### Indicadores de Integração (sidebar)

```tsx
// Os 4 pontos coloridos de "INTEGRAÇÕES" na sidebar
// Renderizar como círculos de 8px: vermelho, laranja, verde, azul
<span className="w-2 h-2 rounded-full bg-red-500" />
<span className="w-2 h-2 rounded-full bg-orange-400" />
<span className="w-2 h-2 rounded-full bg-green-500" />
<span className="w-2 h-2 rounded-full bg-[#2B7FFF]" />
```

---

### Espaçamentos padrão

```
Page padding:       px-8 py-8  (32px em todos os lados)
Gap entre cards:    gap-6       (24px)
Card padding:       p-6         (24px)
Card border-radius: rounded-xl  (12px)
Input border-radius:rounded-lg  (8px)
Button border-radius:rounded-lg (8px)
Sidebar width:      w-64        (256px)
Sidebar item gap:   gap-3       (12px)
Section gap:        mb-6        (24px entre seções do formulário)
```

---

### Tailwind Config — extensões necessárias

```ts
// tailwind.config.ts
extend: {
  colors: {
    sidebar: {
      bg: '#0F1729',
      hover: '#1A2540',
      active: '#1E3A5F',
      text: '#8B9BB4',
    },
    accent: {
      DEFAULT: '#2B7FFF',
      hover: '#1A6FEF',
      light: '#EBF3FF',
    },
    surface: {
      page: '#F0F2F5',
      card: '#FFFFFF',
      input: '#F8F9FB',
    },
    ink: {
      primary: '#1A202C',
      secondary: '#4A5568',
      muted: '#718096',
      disabled: '#A0AEC0',
    },
  },
  fontFamily: {
    sans: ['Nunito', 'Inter', 'sans-serif'],
  },
}
```

---

### Convenções de UI

- Usar **shadcn/ui** como base — nunca reinventar componentes primitivos
- Tailwind CSS para estilização — sem CSS-in-JS
- Formulários com **react-hook-form** + **zod** para validação
- Toasts com **sonner**
- Ícones com **lucide-react**
- Tabelas com **@tanstack/react-table**
- Todo texto da interface em **PT-BR** — sem inglês para o usuário final
- Mensagens de erro em PT-BR, claras e acionáveis
- Loading states em **toda** operação assíncrona (skeleton ou spinner)
- Confirmar ações destrutivas com modal (deletar automação, pausar broadcast, etc.)

### Step Builder — componentes

```
<StepCard>           — container de cada step (drag handle, menu de ações)
<StepTypeSelector>   — modal para escolher tipo de step ao adicionar
<MessageStepForm>    — configuração de step de texto/imagem
<QuickReplyForm>     — configuração de botões e ramificações
<AiStepForm>         — system prompt + seleção de modelo
<DelayStepForm>      — configuração de delay em segundos/minutos
<ConditionStepForm>  — lógica if/else com branches
<DmPreview>          — preview em tempo real simulando o DM
```

---

## 📁 Convenções de Código

### TypeScript

```typescript
// Tipos principais — sempre em lib/types.ts ou colocalizados
type AutomationStatus = 'draft' | 'active' | 'paused';
type StepType = 'message' | 'image_message' | 'quick_reply' | 'cta_button' | 'delay' | 'ai' | 'condition' | 'tag' | 'end';
type Direction = 'inbound' | 'outbound';

// Nunca usar `any` — usar `unknown` se necessário e fazer type guard
// Sempre tipar retornos de funções assíncronas
```

### Estrutura de API Routes

```typescript
// app/api/webhook/instagram/route.ts
export async function GET(req: Request) {
  // Verificação do webhook (hub.challenge)
}

export async function POST(req: Request) {
  // 1. Verificar HMAC — retornar 200 imediatamente se inválido (não revelar erro)
  // 2. Salvar evento bruto em webhook_events
  // 3. Processar de forma assíncrona (não bloquear resposta)
  // 4. Retornar 200 OK em menos de 200ms
}
```

### Server Actions vs API Routes

- **Server Actions**: mutações de dados de formulários (criar automação, salvar step, etc.)
- **API Routes**: webhooks externos, endpoints que precisam de request/response bruto
- **nunca** fazer fetch para a própria API do Next.js de dentro de Server Components

### Erros e logging

```typescript
// Sempre logar erros com contexto suficiente
console.error('[AutomationEngine] Falha ao executar step', {
  automationId,
  stepId,
  contactId,
  error: err instanceof Error ? err.message : err,
});
```

---

## 🚫 Restrições Absolutas

Estas regras nunca podem ser violadas, independente da task:

1. **Janela de 24h**: nunca enviar DM proativa fora da janela
2. **HMAC**: nunca processar webhook sem verificar assinatura
3. **Opt-out**: se contato responder PARAR/STOP → `opted_out = true` imediatamente, não enviar mais nada
4. **Tokens**: chaves de API nunca no frontend ou em logs
5. **RLS**: toda query ao Supabase deve respeitar o `account_id` do usuário autenticado
6. **Rate limit**: broadcasts nunca sem controle de frequência — pode banir a conta Meta

---

## 🔄 Fluxo de Desenvolvimento

### Branches

```
main          — produção (protegida)
develop       — integração
feature/xxx   — novas features
fix/xxx       — correções
```

### Worktrees (Claude Code)

O projeto usa Git worktrees para desenvolvimento paralelo de módulos:

```bash
git worktree add ../agentise-chat-automations feature/automations-engine
git worktree add ../agentise-chat-broadcast feature/broadcast-module
git worktree add ../agentise-chat-contacts feature/contacts-module
```

### Antes de cada commit

```bash
pnpm lint        # ESLint
pnpm type-check  # tsc --noEmit
pnpm test        # testes unitários do módulo alterado
```

---

## 📋 Comandos Úteis

```bash
# Desenvolvimento
pnpm dev                          # servidor local

# Supabase
supabase start                    # emulador local
supabase db push                  # aplicar migrations
supabase gen types typescript     # gerar tipos TypeScript do schema

# Testes
pnpm test                         # Jest
pnpm test:watch                   # watch mode

# Build
pnpm build
pnpm start
```

---

## 🗺️ Roadmap de Implementação (Claude Code)

Sequência de prompts recomendada para o Claude Code:

| # | Módulo | Branch |
|---|--------|--------|
| 1 | Schema Supabase + migrations + tipos TypeScript | `feature/database-schema` |
| 2 | Webhook receiver + verificação HMAC + log de eventos | `feature/webhook-receiver` |
| 3 | OAuth Meta + módulo de conexão de conta Instagram | `feature/meta-oauth` |
| 4 | Motor de automações + avaliação de triggers por comentário | `feature/automation-engine` |
| 5 | Step Builder UI (React) + lógica de execução de fluxo | `feature/step-builder` |
| 6 | Integração LLM no step de IA + gestão de contexto | `feature/ai-step` |
| 7 | Módulo de Broadcast + fila de envio + rate limiting | `feature/broadcast` |
| 8 | Módulo de Contatos + sinalização de janela de 24h | `feature/contacts` |
| 9 | Dashboard + analytics + funil de conversão | `feature/dashboard` |

---

*Agentise Chat — Agentise · Florianópolis, Brasil*