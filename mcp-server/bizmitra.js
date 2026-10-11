// Thin Bizmitra Tally API client.
//
// Everything the MCP server does goes through here, so the API key and the
// company id live in exactly one place and are never reachable from a tool
// argument. See https://docs.bizmitra.io/developer/api/authentication

const BASE = (process.env.BIZMITRA_BASE_URL ?? 'https://bizmitra.io').replace(/\/+$/, '')

/**
 * The Bizmitra Developer Company ID this server is scoped to.
 *
 * Deliberately read from the environment, never from a tool argument: if the
 * model could name the company, anything that influences the model — a voucher
 * narration, a party name, a pasted email — could point this API key at a
 * different customer's books.
 */
export const COMPANY_ID = process.env.BIZMITRA_COMPANY_ID

/** Writes are off unless explicitly enabled. */
export const WRITES_ENABLED = process.env.BIZMITRA_ENABLE_WRITES === 'true'

export function assertConfigured() {
  const missing = ['BIZMITRA_KEY_ID', 'BIZMITRA_SECRET', 'BIZMITRA_COMPANY_ID'].filter(
    (k) => !process.env[k],
  )
  if (missing.length) {
    throw new Error(
      `Missing environment variables: ${missing.join(', ')}. ` +
        'Copy .env.example and fill it in — see this directory\'s README.',
    )
  }
}

function authHeader() {
  // Trim: a trailing newline from a copied secret produces a 401 that looks
  // inexplicable. https://docs.bizmitra.io/developer/api/authentication#testing-pitfalls
  const keyId = (process.env.BIZMITRA_KEY_ID ?? '').trim()
  const secret = (process.env.BIZMITRA_SECRET ?? '').trim()
  return `Bearer ${keyId}:${secret}`
}

class BizmitraError extends Error {
  constructor(status, body) {
    super(`Bizmitra API ${status}: ${body}`)
    this.status = status
    this.body = body
  }
}

async function request(method, path, { params, body } = {}) {
  const url = new URL(`${BASE}/api/v1/${path}`)
  for (const [k, v] of Object.entries(params ?? {})) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v))
  }

  const headers = { Authorization: authHeader(), Accept: 'application/json' }
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    // Writes identify the company by header; reads use the company_id query
    // parameter. That split is the API's own.
    headers['X-Bizmitra-Company'] = COMPANY_ID
  }

  const res = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  const text = await res.text()
  if (!res.ok) throw new BizmitraError(res.status, text.slice(0, 500))
  return text ? JSON.parse(text) : {}
}

/** GET, with company_id applied from the server's own configuration. */
export function get(path, params = {}) {
  return request('GET', path, { params: { company_id: COMPANY_ID, ...params } })
}

/** GET without the company_id parameter, for paths that carry the id inline. */
export function getRaw(path, params = {}) {
  return request('GET', path, { params })
}

export function post(path, body) {
  return request('POST', path, { body })
}

export { BizmitraError }
