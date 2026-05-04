// Helpers para leitura de variáveis de ambiente com mensagens de erro claras em pt-BR.
// Use no início de módulos que dependem de uma env var específica.

type EnvLocation = 'vercel' | 'local' | 'github-actions'

const LOCATION_HINT: Record<EnvLocation, string> = {
  vercel:
    'Vercel Dashboard → Project → Settings → Environment Variables (lembre-se de redeployar após adicionar).',
  local:
    'arquivo .env.local na raiz do projeto (use .env.example como referência).',
  'github-actions':
    'GitHub repo → Settings → Secrets and variables → Actions → New repository secret.',
}

/**
 * Lê uma variável de ambiente e lança erro amigável em pt-BR se ausente.
 * Use em código de servidor (Server Actions, API Routes, módulos importados por eles).
 */
export function requireEnv(name: string, where: EnvLocation = 'vercel'): string {
  const value = process.env[name]
  if (!value || value.trim().length === 0) {
    throw new Error(
      `Variável de ambiente "${name}" não configurada. Defina em: ${LOCATION_HINT[where]}`
    )
  }
  return value
}

/**
 * Lê uma variável de ambiente opcional. Retorna undefined se ausente.
 */
export function optionalEnv(name: string): string | undefined {
  const value = process.env[name]
  return value && value.trim().length > 0 ? value : undefined
}
