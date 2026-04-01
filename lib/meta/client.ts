const GRAPH_API_VERSION = 'v21.0'
const BASE_URL = `https://graph.facebook.com/${GRAPH_API_VERSION}`

interface GraphApiRequestOptions {
  method?: 'GET' | 'POST' | 'DELETE'
  body?: Record<string, unknown>
  accessToken?: string              // se null, usa INSTAGRAM_ACCESS_TOKEN do env
}

interface GraphApiResult<T> {
  data: T | null
  error: string | null
  status: number
}

/**
 * Wrapper de fetch para a Meta Graph API com:
 * - Autenticação automática via Bearer token
 * - Retry com backoff exponencial (3 tentativas)
 * - Logging de erros estruturado
 * - Tipagem genérica do retorno
 */
export async function graphApi<T>(
  path: string,
  options: GraphApiRequestOptions = {}
): Promise<GraphApiResult<T>> {
  const { method = 'GET', body, accessToken } = options
  const token = accessToken ?? process.env.INSTAGRAM_ACCESS_TOKEN

  if (!token) {
    console.error('[GraphAPI] INSTAGRAM_ACCESS_TOKEN não configurado')
    return { data: null, error: 'Token não configurado', status: 500 }
  }

  const url = path.startsWith('http') ? path : `${BASE_URL}/${path}`
  const maxRetries = 3

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: body ? JSON.stringify(body) : undefined,
      })

      const json = await response.json()

      if (!response.ok) {
        const errMsg = json?.error?.message ?? `HTTP ${response.status}`
        console.error(`[GraphAPI] Erro na tentativa ${attempt}/${maxRetries}`, {
          path,
          status: response.status,
          error: errMsg,
          fbtrace: json?.error?.fbtrace_id,
        })

        // Não fazer retry em erros 4xx (são erros permanentes)
        if (response.status >= 400 && response.status < 500) {
          return { data: null, error: errMsg, status: response.status }
        }

        // Retry em erros 5xx com backoff exponencial
        if (attempt < maxRetries) {
          await sleep(Math.pow(2, attempt) * 1000)
          continue
        }

        return { data: null, error: errMsg, status: response.status }
      }

      return { data: json as T, error: null, status: response.status }
    } catch (err) {
      console.error(`[GraphAPI] Falha de rede na tentativa ${attempt}/${maxRetries}`, {
        path,
        error: err instanceof Error ? err.message : err,
      })
      if (attempt < maxRetries) {
        await sleep(Math.pow(2, attempt) * 1000)
      }
    }
  }

  return { data: null, error: 'Falha após 3 tentativas', status: 500 }
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}
