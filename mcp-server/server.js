// Example MCP server over the Bizmitra Tally API.
//
// Exposes one customer's TallyPrime company to an AI agent as MCP tools:
// five read tools always, and one write tool only when BIZMITRA_ENABLE_WRITES
// is set to "true".
//
// Walkthrough: https://docs.bizmitra.io/developer/examples/mcp-server

import { McpServer } from '@modelcontextprotocol/server'
import { StdioServerTransport } from '@modelcontextprotocol/server/stdio'
import * as z from 'zod/v4'
import { appendFile } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'

import {
  COMPANY_ID,
  WRITES_ENABLED,
  assertConfigured,
  get,
  getRaw,
  post,
  BizmitraError,
} from './bizmitra.js'

try {
  assertConfigured()
} catch (err) {
  // A stdio server that throws on startup just exits, and the agent reports
  // "no tools" with no reason. Say why, on stderr, and stop.
  console.error(`\n${err.message}\n`)
  process.exit(1)
}

const server = new McpServer({ name: 'bizmitra-tally', version: '0.1.0' })

/** Tool results are JSON text. Keep them compact — every field costs tokens. */
const ok = (data) => ({ content: [{ type: 'text', text: JSON.stringify(data) }] })

/**
 * Turn an API failure into something the agent can act on instead of a stack
 * trace. A 403 means a broken application-customer-company chain, not a bad
 * key: https://docs.bizmitra.io/developer/api/authentication#authorization-is-relational
 */
const failed = (err) => {
  const hint =
    err instanceof BizmitraError && err.status === 403
      ? 'This company is not reachable from this API key.'
      : err instanceof BizmitraError && err.status === 401
        ? 'Authentication failed. The API key is wrong or malformed.'
        : 'Call tally_connection_status to check whether Tally and the Connector are reachable.'
  return {
    isError: true,
    content: [{ type: 'text', text: JSON.stringify({ error: err.message, hint }) }],
  }
}

const tool = (name, config, handler) =>
  server.registerTool(name, config, async (args, extra) => {
    try {
      return await handler(args, extra)
    } catch (err) {
      return failed(err)
    }
  })

// ---------------------------------------------------------------- read tools

tool(
  'tally_connection_status',
  {
    title: 'Tally connection status',
    description:
      'Check whether this Tally company can be read from or written to right now. ' +
      'Call this first when another Tally tool returns nothing, and before any write. ' +
      'Reports three independent things: whether the company is paired, whether the ' +
      'Connector App on the customer\'s computer is online, and whether TallyPrime is ' +
      'running with the company open. "No data" and "nobody is home" are different ' +
      'answers and the user can act on each.',
    inputSchema: z.object({}),
  },
  async () => ok(await getRaw(`companies/${COMPANY_ID}/health`)),
)

tool(
  'tally_list_vouchers',
  {
    title: 'List Tally vouchers',
    description:
      'List vouchers that exist in the customer\'s Tally company. Call this when the ' +
      'user asks about sales, purchases, receipts or payments over a period. Returns ' +
      'summary rows only — use tally_get_voucher for line items, tax detail and bill ' +
      'references. Results are paginated: compare `total` with `returned` before ' +
      'concluding anything about totals for a period.',
    inputSchema: z.object({
      voucher_kind: z
        .enum(['sales', 'purchase', 'receipt', 'payment', 'credit_note', 'debit_note'])
        .optional()
        .describe(
          'Normalized kind. Prefer this over a Tally voucher-type name, which the ' +
            'customer configures and which differs between companies.',
        ),
      start_date: z.string().optional().describe('Inclusive voucher date, YYYY-MM-DD'),
      end_date: z.string().optional().describe('Inclusive voucher date, YYYY-MM-DD'),
      limit: z.number().int().min(1).max(100).default(25),
    }),
  },
  async ({ voucher_kind, start_date, end_date, limit }) => {
    const data = await get('pulled-vouchers', { voucher_kind, start_date, end_date, limit })
    // Drop the Tally GUIDs and alter-ids. They matter for your own
    // reconciliation and mean nothing to a model.
    return ok({
      total: data.total,
      returned: data.count,
      vouchers: (data.invoices ?? []).map((v) => ({
        transaction_id: v.transaction_id,
        date: v.voucher_date,
        kind: v.voucher_kind,
        type: v.voucher_type,
        number: v.voucher_number,
      })),
    })
  },
)

tool(
  'tally_get_voucher',
  {
    title: 'Get one Tally voucher',
    description:
      'Fetch one voucher in full: line items, tax detail, addresses, and the bills it ' +
      'opened or settled. Takes a transaction_id from tally_list_vouchers.',
    inputSchema: z.object({
      transaction_id: z.string().describe('From tally_list_vouchers'),
    }),
  },
  async ({ transaction_id }) => ok(await get(`pulled-vouchers/${transaction_id}`)),
)

tool(
  'tally_find_ledger',
  {
    title: 'Find a Tally ledger',
    description:
      'Look up ledgers — parties, tax ledgers, bank and cash accounts — as they are ' +
      'actually named in this Tally company. Call this before using any ledger name ' +
      'in another tool: Tally matches names exactly, including capitalisation and ' +
      'trailing spaces, and the customer\'s spelling is rarely the one the user typed. ' +
      'Also reports is_billwise, which says whether that ledger keeps bill-by-bill ' +
      'balances — a ledger with "No" silently drops any bill reference sent to it.',
    inputSchema: z.object({
      contains: z
        .string()
        .optional()
        .describe('Case-insensitive substring to match against the ledger name'),
    }),
  },
  async ({ contains }) => {
    const data = await get('pulled-masters/ledger', { limit: 200 })
    const needle = contains?.toLowerCase()
    const ledgers = (data.masters ?? [])
      .map((m) => ({
        name: m.master_name,
        parent: m.payload?.fields?.parent,
        is_billwise: m.payload?.fields?.is_billwise,
      }))
      .filter((m) => m.name && (!needle || m.name.toLowerCase().includes(needle)))
    return ok({
      total_in_company: data.total,
      matched: ledgers.length,
      ledgers: ledgers.slice(0, 50),
    })
  },
)

tool(
  'tally_stock_summary',
  {
    title: 'Tally stock summary',
    description:
      'Current stock position — quantity, rate and value per item — read from Tally. ' +
      'Use this for "how much stock do we have" questions rather than adding up ' +
      'vouchers, which double-counts.',
    inputSchema: z.object({}),
  },
  async () => ok(await get('stock-summary')),
)

// --------------------------------------------------------------- write tool

if (WRITES_ENABLED) {
  // Minimal shape check only. Composing a correct invoice — the GST split, the
  // signed ledger_entries that balance — is your application's job, not the
  // model's. See https://docs.bizmitra.io/developer/examples/push-invoice
  const InvoiceSchema = z.object({
    voucher_type: z.string(),
    date: z.string().describe('YYYY-MM-DD'),
    party_ledger: z.string().describe('Exact Tally ledger name — resolve with tally_find_ledger'),
    voucher_number: z.string().optional(),
    reference: z.string().optional(),
    gst: z.record(z.string(), z.unknown()).optional(),
    inventory_entries: z.array(z.record(z.string(), z.unknown())).optional(),
    ledger_entries: z
      .array(z.record(z.string(), z.unknown()))
      .min(2)
      .describe('Signed double-entry lines. The party line is negative on a sales invoice.'),
  })

  tool(
    'tally_create_invoice',
    {
      title: 'Create an invoice in Tally',
      description:
        'Write a sales invoice into the customer\'s real Tally company. There is no ' +
        'undo. Only call this after the user has seen the exact invoice and explicitly ' +
        'confirmed it, and after every ledger and stock item name has been resolved ' +
        'with tally_find_ledger. Returns the final verified transaction status.',
      inputSchema: z.object({ invoice: InvoiceSchema }),
    },
    async ({ invoice }) => {
      // 1. Gate on health. Without this, a write against an offline Connector
      //    fails in a way that looks like a payload problem, and an agent will
      //    "fix" the payload repeatedly.
      const health = await getRaw(`companies/${COMPANY_ID}/health`)
      if (health?.ready === false) {
        return ok({
          submitted: false,
          reason: 'not_ready',
          health,
          next_step: 'Tell the user what to fix, then try again. Nothing was written.',
        })
      }

      // 2. Idempotency is ours, not the model's. One id per logical invoice,
      //    persisted before submitting, so a retry lands on the same
      //    transaction instead of creating a second voucher.
      const transactionId = randomUUID()
      await appendFile(
        new URL('./writes.jsonl', import.meta.url),
        `${JSON.stringify({ at: new Date().toISOString(), transactionId, invoice })}\n`,
      )

      // 3. Submit.
      const submitted = await post('invoices', {
        event_type: 'invoice_create',
        request_type: 'in',
        transaction_id: transactionId,
        invoice,
      })

      // 4. Verify. An accepted write is not a completed write.
      let status = null
      for (let attempt = 0; attempt < 10; attempt++) {
        await new Promise((r) => setTimeout(r, 2000))
        const res = await getRaw(`transactions/${transactionId}`)
        status = res?.transaction ?? res
        if (status?.status && !['pending', 'processing', 'queued'].includes(status.status)) break
      }

      return ok({
        submitted: true,
        transaction_id: transactionId,
        accepted: submitted?.success ?? null,
        final_status: status?.status ?? 'unknown',
        tally_voucher_guid: status?.tally_voucher_guid ?? null,
        error_code: status?.error_code ?? null,
        error_message: status?.error_message ?? null,
        note:
          status?.status === 'completed'
            ? 'Written to Tally and verified.'
            : 'Not confirmed as written. Report the status and error to the user; do not resubmit — the transaction id above is the one to check.',
      })
    },
  )
}

await server.connect(new StdioServerTransport())
