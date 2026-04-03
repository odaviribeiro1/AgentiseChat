import type { Database } from './database.types'

// ─── Row types ────────────────────────────────────────────────────────────────
export type AccountRow        = Database['public']['Tables']['accounts']['Row']
export type ContactRow        = Database['public']['Tables']['contacts']['Row']
export type AutomationRow     = Database['public']['Tables']['automations']['Row']
export type StepRow           = Database['public']['Tables']['steps']['Row']
export type BroadcastRow      = Database['public']['Tables']['broadcasts']['Row']
export type AutomationRunRow  = Database['public']['Tables']['automation_runs']['Row']
export type MessageRow        = Database['public']['Tables']['messages']['Row']
export type WebhookEventRow   = Database['public']['Tables']['webhook_events']['Row']
export type AiUsageRow        = Database['public']['Tables']['ai_usage']['Row']

// ─── Insert types ─────────────────────────────────────────────────────────────
export type AccountInsert     = Database['public']['Tables']['accounts']['Insert']
export type ContactInsert     = Database['public']['Tables']['contacts']['Insert']
export type AutomationInsert  = Database['public']['Tables']['automations']['Insert']
export type StepInsert        = Database['public']['Tables']['steps']['Insert']
export type BroadcastInsert   = Database['public']['Tables']['broadcasts']['Insert']
export type MessageInsert     = Database['public']['Tables']['messages']['Insert']

// ─── Enums de domínio ─────────────────────────────────────────────────────────
export type AutomationStatus  = 'draft' | 'active' | 'paused'
export type TriggerType       = 'comment_keyword' | 'dm_keyword' | 'story_reply' | 'story_reaction'
export type StepType          = 'message' | 'image_message' | 'quick_reply' | 'cta_button' | 'delay' | 'ai' | 'condition' | 'tag' | 'end'
export type BroadcastStatus   = 'draft' | 'scheduled' | 'sending' | 'sent' | 'failed' | 'cancelled'
export type RunStatus         = 'running' | 'waiting_reply' | 'completed' | 'failed' | 'cancelled'
export type MessageDirection  = 'inbound' | 'outbound'
export type MessageType       = 'text' | 'image' | 'quick_reply' | 'cta_button' | 'story_reply' | 'unsupported'
export type AiModel           = 'gpt-4.1' | 'gpt-4.1-mini'

// ─── Configs tipadas de Step ──────────────────────────────────────────────────
export interface MessageStepConfig {
  text: string
}

export interface ImageMessageStepConfig {
  image_url: string
  caption?: string
}

export interface QuickReplyButton {
  title: string
  payload: string
  next_step_id?: string   // ID do step a executar quando clicar
  apply_tag?: string      // tag a aplicar ao contato quando clicar
}

export interface QuickReplyStepConfig {
  text: string
  buttons: QuickReplyButton[]
}

export interface CtaButtonButton {
  title: string
  url: string
  apply_tag?: string
}

export interface CtaButtonStepConfig {
  text: string
  buttons: CtaButtonButton[]
  next_step_id?: string        // ID do step a executar após enviar o CTA
  // Retrocompat: campos antigos (singular) — convertidos no executor
  button_title?: string
  url?: string
}

export interface DelayStepConfig {
  seconds: number
}

export interface AiStepConfig {
  system_prompt: string
  model: AiModel
  context_messages: number
}

export interface ConditionStepConfig {
  field: 'tag' | 'window_active' | 'opted_out'
  operator: 'has' | 'not_has' | 'is' | 'is_not'
  value: string
}

export interface TagStepConfig {
  action: 'add' | 'remove'
  tag: string
}

export interface EndStepConfig {
  notify_operator: boolean
  notification_message?: string
}

export type StepConfig =
  | MessageStepConfig
  | ImageMessageStepConfig
  | QuickReplyStepConfig
  | CtaButtonStepConfig
  | DelayStepConfig
  | AiStepConfig
  | ConditionStepConfig
  | TagStepConfig
  | EndStepConfig

// ─── Config do Trigger ────────────────────────────────────────────────────────
export interface TriggerConfig {
  keywords: string[]
  match_type: 'contains' | 'exact' | 'any'
  post_id: string | null
  apply_to: 'specific_post' | 'all_posts'
  max_triggers_per_user_hours: number
  reply_comment: boolean
  reply_comment_text: string | null
}

// ─── Config de mensagem de Broadcast ─────────────────────────────────────────
export interface BroadcastMessageConfig {
  type: 'text' | 'image' | 'cta_button'
  text: string
  image_url?: string
  button?: {
    title: string
    url: string
  }
}

// ─── Tipos de domínio compostos ───────────────────────────────────────────────
export interface ContactWithWindow extends ContactRow {
  is_within_window: boolean
  window_minutes_remaining: number | null
}

export interface AutomationWithSteps extends AutomationRow {
  steps: StepRow[]
}

export interface StepWithChildren extends Omit<StepRow, 'config'> {
  children: StepWithChildren[]
  config: StepConfig
}
