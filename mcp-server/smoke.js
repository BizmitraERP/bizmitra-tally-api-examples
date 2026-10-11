// Smoke test: boots server.js, performs the MCP handshake over stdio, and
// lists the tools it advertises.
//
// Makes no API calls and needs no real credentials — tools/list never runs a
// tool handler. Run it after changing server.js, and before wiring the server
// into an agent, so that "the agent sees no tools" is never the first signal
// that something is wrong.
//
//   npm run smoke
//   BIZMITRA_ENABLE_WRITES=true npm run smoke   # should list the write tool too

import { spawn } from 'node:child_process'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'
import { LATEST_PROTOCOL_VERSION } from '@modelcontextprotocol/server'

const EXPECTED_READ_TOOLS = [
  'tally_connection_status',
  'tally_list_vouchers',
  'tally_get_voucher',
  'tally_find_ledger',
  'tally_stock_summary',
]

const writesEnabled = process.env.BIZMITRA_ENABLE_WRITES === 'true'

// fileURLToPath, not URL.pathname — the latter yields "/D:/..." on Windows.
const serverPath = fileURLToPath(new URL('./server.js', import.meta.url))

const child = spawn(process.execPath, [serverPath], {
  stdio: ['pipe', 'pipe', 'pipe'],
  env: {
    ...process.env,
    // Placeholders: enough to pass the config check, never sent anywhere.
    BIZMITRA_KEY_ID: process.env.BIZMITRA_KEY_ID ?? 'smoke-key-id',
    BIZMITRA_SECRET: process.env.BIZMITRA_SECRET ?? 'smoke-secret',
    BIZMITRA_COMPANY_ID: process.env.BIZMITRA_COMPANY_ID ?? '0',
  },
})

let stderr = ''
child.stderr.on('data', (d) => {
  stderr += d.toString()
})

const send = (msg) => child.stdin.write(`${JSON.stringify(msg)}\n`)
const pending = new Map()

createInterface({ input: child.stdout }).on('line', (line) => {
  if (!line.trim()) return
  let msg
  try {
    msg = JSON.parse(line)
  } catch {
    return // not JSON-RPC; ignore
  }
  const resolve = pending.get(msg.id)
  if (resolve) {
    pending.delete(msg.id)
    resolve(msg)
  }
})

const call = (id, method, params = {}) =>
  new Promise((resolve, reject) => {
    pending.set(id, resolve)
    send({ jsonrpc: '2.0', id, method, params })
    setTimeout(() => reject(new Error(`Timed out waiting for ${method}`)), 10_000)
  })

const fail = (message) => {
  console.error(`FAIL  ${message}`)
  if (stderr.trim()) console.error(`\nServer stderr:\n${stderr.trim()}`)
  child.kill()
  process.exit(1)
}

try {
  const init = await call(1, 'initialize', {
    protocolVersion: LATEST_PROTOCOL_VERSION,
    capabilities: {},
    clientInfo: { name: 'bizmitra-smoke', version: '0.1.0' },
  })
  if (init.error) fail(`initialize returned an error: ${JSON.stringify(init.error)}`)

  const serverInfo = init.result?.serverInfo
  console.log(`ok    handshake with ${serverInfo?.name} v${serverInfo?.version}`)
  console.log(`      protocol ${init.result?.protocolVersion}`)

  send({ jsonrpc: '2.0', method: 'notifications/initialized' })

  const listed = await call(2, 'tools/list')
  if (listed.error) fail(`tools/list returned an error: ${JSON.stringify(listed.error)}`)

  const names = (listed.result?.tools ?? []).map((t) => t.name).sort()
  const missing = EXPECTED_READ_TOOLS.filter((t) => !names.includes(t))
  if (missing.length) fail(`missing expected tools: ${missing.join(', ')}`)

  const hasWrite = names.includes('tally_create_invoice')
  if (writesEnabled && !hasWrite) fail('BIZMITRA_ENABLE_WRITES=true but no write tool registered')
  if (!writesEnabled && hasWrite) fail('write tool registered without BIZMITRA_ENABLE_WRITES')

  console.log(`ok    ${names.length} tools advertised`)
  for (const t of listed.result.tools) {
    const args = Object.keys(t.inputSchema?.properties ?? {})
    console.log(`      - ${t.name}(${args.join(', ')})`)
  }
  console.log(`ok    writes ${writesEnabled ? 'enabled (write tool present)' : 'disabled (read-only)'}`)
  console.log('\nPASS')
  child.kill()
  process.exit(0)
} catch (err) {
  fail(err.message)
}
