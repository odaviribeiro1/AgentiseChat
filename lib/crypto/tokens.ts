import crypto from 'node:crypto'

const KEY_HEX = process.env.TOKEN_ENCRYPTION_KEY ?? ''

// Valida na carga do módulo — falha em produção se a chave estiver ausente/incorreta
if (!KEY_HEX || KEY_HEX.length !== 64) {
  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      '[crypto/tokens] TOKEN_ENCRYPTION_KEY deve ter exatamente 64 caracteres hexadecimais (32 bytes). ' +
      'Gere com: openssl rand -hex 32'
    )
  }
}

// Em desenvolvimento, usa uma chave padrão se não configurada (não segura para produção)
const KEY = Buffer.from(KEY_HEX.padEnd(64, '0'), 'hex')

/**
 * Cifra um token usando AES-256-GCM.
 * Formato armazenado: "<iv_hex>:<authTag_hex>:<ciphertext_hex>"
 */
export function encryptToken(plaintext: string): string {
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-gcm', KEY, iv)
  const encrypted = cipher.update(plaintext, 'utf8')
  cipher.final() // necessário para gerar o authTag, mas não retorna dados
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`
}

/**
 * Decifra um token previamente cifrado por encryptToken.
 * Migração graceful: se o valor não estiver no formato cifrado, retorna o plaintext diretamente.
 */
export function decryptToken(encrypted: string): string {
  if (!isEncrypted(encrypted)) {
    // Migração graceful: token ainda em plaintext — retorna como está
    return encrypted
  }
  const parts = encrypted.split(':')
  const iv       = Buffer.from(parts[0], 'hex')
  const authTag  = Buffer.from(parts[1], 'hex')
  const ciphertext = Buffer.from(parts[2], 'hex')

  const decipher = crypto.createDecipheriv('aes-256-gcm', KEY, iv)
  decipher.setAuthTag(authTag)
  return decipher.update(ciphertext).toString('utf8') + decipher.final('utf8')
}

/**
 * Verifica se um valor está no formato cifrado (iv:authTag:ciphertext em hex).
 * Usado para migração graceful de tokens ainda em plaintext no banco.
 */
export function isEncrypted(value: string): boolean {
  const parts = value.split(':')
  // IV = 16 bytes = 32 hex chars; authTag = 16 bytes = 32 hex chars
  return (
    parts.length === 3 &&
    parts[0].length === 32 &&
    parts[1].length === 32 &&
    /^[0-9a-f]+$/i.test(parts[0]) &&
    /^[0-9a-f]+$/i.test(parts[1]) &&
    parts[2].length > 0
  )
}
