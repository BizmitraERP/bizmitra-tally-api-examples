# MCP server for Tally

A runnable [Model Context Protocol](https://modelcontextprotocol.io) server that exposes one customer's TallyPrime company to an AI agent through the Bizmitra Tally API.

The agent never touches Tally. It calls this server, this server calls `https://bizmitra.io/api/v1`, and the Bizmitra Connector App does the work inside the customer's network — so nothing has to be opened up on the customer's side.

Full walkthrough, including the reasoning behind the tool surface: **[Build an MCP server for Tally](https://docs.bizmitra.io/developer/examples/mcp-server)**.

## Run it

```bash
cd mcp-server
npm install
cp .env.example .env     # then fill in key_id, secret, company_id
npm run smoke            # handshake + list tools, no API calls
npm start                # serve over stdio
```

`npm run smoke` is the fast check. It boots the server, performs a real MCP handshake, and prints the tools it advertises — without calling the API or needing valid credentials:

```
ok    handshake with bizmitra-tally v0.1.0
      protocol 2025-11-25
ok    5 tools advertised
      - tally_connection_status()
      - tally_list_vouchers(voucher_kind, start_date, end_date, limit)
      - tally_get_voucher(transaction_id)
      - tally_find_ledger(contains)
      - tally_stock_summary()
ok    writes disabled (read-only)

PASS
```

Run it after every change to `server.js`. A stdio server that throws at startup simply exits, and the only symptom an agent reports is "no tools".

## Connect it to an agent

`npm start` serves over **stdio**, which is right when the agent runs on the same machine. Register it by command — the shape below works for Claude Code (`.mcp.json`) and Claude Desktop:

```json
{
  "mcpServers": {
    "tally": {
      "command": "node",
      "args": ["/absolute/path/to/mcp-server/server.js"],
      "env": {
        "BIZMITRA_KEY_ID": "...",
        "BIZMITRA_SECRET": "...",
        "BIZMITRA_COMPANY_ID": "123"
      }
    }
  }
}
```

For a hosted agent, serve the same `McpServer` over Streamable HTTP instead — `WebStandardStreamableHTTPServerTransport` and `createMcpHandler` are exported from `@modelcontextprotocol/server`. The tools do not change. Then reach it from the Claude API with `mcp_servers` + `mcp_toolset`, as shown in the [walkthrough](https://docs.bizmitra.io/developer/examples/mcp-server#remote-the-claude-api-mcp-connector).

## What it exposes

| Tool | Reads | Notes |
|---|---|---|
| `tally_connection_status` | `GET /companies/{id}/health` | Lets the agent tell "no data" from "the Tally computer is off" |
| `tally_list_vouchers` | `GET /pulled-vouchers` | Summary rows, filtered by kind and date. Returns `total` so the agent can see a page is not the whole book |
| `tally_get_voucher` | `GET /pulled-vouchers/{id}` | One voucher in full, including bill references |
| `tally_find_ledger` | `GET /pulled-masters/ledger` | Resolve a party name to its exact Tally spelling, with `is_billwise` |
| `tally_stock_summary` | `GET /stock-summary` | Quantities and values per item |
| `tally_create_invoice` | `POST /invoices` | **Only when `BIZMITRA_ENABLE_WRITES=true`.** See below |

## Three things this example is demonstrating

**`company_id` is not a tool parameter.** It comes from the environment, in [`bizmitra.js`](bizmitra.js). If the model could name the company, anything that influences the model — a voucher narration, a party name, a pasted email — could aim your API key at a different customer's books. Scope one server instance to one company.

**Reads are narrowed before they reach the model.** `tally_list_vouchers` drops the Tally GUIDs and alter-ids. They matter for your reconciliation and mean nothing to a model; a 50-row page of them is tokens spent on noise.

**The write tool is a control pattern, not a payload builder.** `tally_create_invoice` takes an invoice object your application composed and then: gates on company health, generates and persists its own `transaction_id` before submitting, submits, and polls until the transaction reaches a final state. Composing a correct invoice — the GST split, the signed `ledger_entries` that balance — is your application's job, not the model's. See [Create an invoice in Tally](../docs/push-invoice.md).

## Before you enable writes

Writes land in real books and Tally has no undo.

- Use a dedicated Tally **test** company.
- Require explicit human confirmation of the exact invoice in your client, every time.
- Resolve every ledger and stock-item name with `tally_find_ledger` first. Tally matches exactly, and a model will happily invent a party name that nearly matches.
- Do not add an acknowledgement tool. `POST /pulled-vouchers/ack` asserts that *your database* durably holds a voucher — that is not a claim an agent is in a position to make. Keep it in your own pipeline.

Submitted writes are appended to `writes.jsonl` in this directory (gitignored) so a crash between submitting and verifying still leaves you the `transaction_id`. In a real integration that belongs in your database, written before the request goes out.

## Keep in mind

Tally serves its gateway on the thread that draws its window: while it answers one request it answers nothing else. Agents parallelise by instinct, so don't fan out concurrent report calls, prefer date-bounded reads over full-book scans, and cache master lists that rarely change. A customer whose Tally stutters whenever someone uses your AI feature will switch the feature off.

## Links

- [Build an MCP server for Tally](https://docs.bizmitra.io/developer/examples/mcp-server) — the full walkthrough
- [Authentication](https://docs.bizmitra.io/developer/api/authentication)
- [Company health](https://docs.bizmitra.io/developer/tally/company-health)
- [Masters](https://docs.bizmitra.io/developer/tally/masters) — name matching, and `is_billwise`
- [Pull vouchers](../docs/pull-vouchers.md) · [Create an invoice](../docs/push-invoice.md)
- [MCP TypeScript SDK](https://ts.sdk.modelcontextprotocol.io/)
