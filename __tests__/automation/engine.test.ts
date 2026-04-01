import { matchesKeyword } from '@/lib/automation/engine'
import type { TriggerConfig } from '@/lib/supabase/types'

const baseTrigger = (overrides: Partial<TriggerConfig> = {}): TriggerConfig => ({
  keywords: ['EBOOK', 'QUERO'],
  match_type: 'contains',
  post_id: null,
  apply_to: 'all_posts',
  max_triggers_per_user_hours: 24,
  reply_comment: false,
  reply_comment_text: null,
  ...overrides,
})

describe('matchesKeyword', () => {
  it('retorna true para match contains (case insensitive)', () => {
    expect(matchesKeyword('eu quero o ebook!', baseTrigger())).toBe(true)
    expect(matchesKeyword('EBOOK POR FAVOR', baseTrigger())).toBe(true)
    expect(matchesKeyword('Quero muito', baseTrigger())).toBe(true)
  })

  it('retorna false se nenhuma keyword bater', () => {
    expect(matchesKeyword('que legal esse post', baseTrigger())).toBe(false)
    expect(matchesKeyword('', baseTrigger())).toBe(false)
  })

  it('match_type exact exige correspondência exata', () => {
    const trigger = baseTrigger({ match_type: 'exact', keywords: ['EBOOK'] })
    expect(matchesKeyword('EBOOK', trigger)).toBe(true)
    expect(matchesKeyword('ebook', trigger)).toBe(true)     // case insensitive
    expect(matchesKeyword('quero o EBOOK', trigger)).toBe(false)
  })

  it('retorna false para keywords vazias', () => {
    expect(matchesKeyword('EBOOK', baseTrigger({ keywords: [] }))).toBe(false)
  })

  it('match contains detecta substring no meio da frase', () => {
    expect(matchesKeyword('preciso do ebook grátis', baseTrigger())).toBe(true)
  })
})
