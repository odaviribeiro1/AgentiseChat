import { isOptOutMessage } from '@/lib/automation/anti-spam'

describe('isOptOutMessage', () => {
  it('detecta mensagens de opt-out', () => {
    expect(isOptOutMessage('parar')).toBe(true)
    expect(isOptOutMessage('STOP')).toBe(true)
    expect(isOptOutMessage('Cancelar')).toBe(true)
    expect(isOptOutMessage('PARE')).toBe(true)
    expect(isOptOutMessage('sair')).toBe(true)
    expect(isOptOutMessage('remover')).toBe(true)
    expect(isOptOutMessage('descadastrar')).toBe(true)
  })

  it('não detecta mensagens normais como opt-out', () => {
    expect(isOptOutMessage('quero o ebook')).toBe(false)
    expect(isOptOutMessage('obrigado!')).toBe(false)
    expect(isOptOutMessage('')).toBe(false)
  })

  it('ignora espaços extras', () => {
    expect(isOptOutMessage('  parar  ')).toBe(true)
    expect(isOptOutMessage('  STOP  ')).toBe(true)
  })

  it('não faz match parcial (palavra deve ser exata)', () => {
    expect(isOptOutMessage('parar de mandar')).toBe(false)
    expect(isOptOutMessage('não quero parar')).toBe(false)
  })
})
