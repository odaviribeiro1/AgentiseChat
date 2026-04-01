import { interpolateVariables } from '@/lib/automation/variables'

describe('interpolateVariables', () => {
  const contact = { full_name: 'João Silva', username: 'joaosilva' }

  it('substitui {{first_name}}', () => {
    expect(interpolateVariables('Olá {{first_name}}!', { contact }))
      .toBe('Olá João!')
  })

  it('substitui {{username}}', () => {
    expect(interpolateVariables('Seu @ é {{username}}', { contact }))
      .toBe('Seu @ é joaosilva')
  })

  it('substitui {{post_title}}', () => {
    expect(interpolateVariables('Post: {{post_title}}', { contact, postTitle: 'Dica de Marketing' }))
      .toBe('Post: Dica de Marketing')
  })

  it('substitui {{current_date}} com data formatada em PT-BR', () => {
    const result = interpolateVariables('Hoje é {{current_date}}', { contact })
    expect(result).toMatch(/Hoje é \d{2} de .+ de \d{4}/)
  })

  it('usa username como fallback quando full_name não existe', () => {
    const contactSemNome = { full_name: null, username: 'teste123' }
    expect(interpolateVariables('Oi {{first_name}}', { contact: contactSemNome }))
      .toBe('Oi teste123')
  })

  it('não quebra com variáveis desconhecidas', () => {
    expect(interpolateVariables('Olá {{nome_desconhecido}}!', { contact }))
      .toBe('Olá {{nome_desconhecido}}!')
  })

  it('é case insensitive nas variáveis', () => {
    expect(interpolateVariables('Oi {{FIRST_NAME}}!', { contact }))
      .toBe('Oi João!')
  })
})
