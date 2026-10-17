# Changelog

All notable changes to this repository will be documented here.

## Unreleased

### Added

- **Every report in the Postman collection.** The Balance Sheet, Trial Balance, Profit & Loss statement and Ledger, each as a refresh and a read. These four change only when you call their `POST …/refresh`: each refresh request says how to follow the job (`GET /api/v1/transactions/{job_id}`) before reading. Also added: the reads the Connector keeps current on its own (cash flow, cash/bank book, bank reconciliation, GST returns, GST periods held, bills receivable and payable). Reference: [Reports](https://docs.bizmitra.io/developer/api/reference#reports).
- **An MCP server for Tally** ([`mcp-server/`](mcp-server/)). A runnable Model Context Protocol server that exposes one customer's Tally company to an AI agent: read tools for connection status, vouchers, voucher detail, ledger lookup and stock, plus an invoice write tool that is registered only when `BIZMITRA_ENABLE_WRITES=true`. Includes `npm run smoke`, which performs a real MCP handshake and lists the advertised tools without calling the API — a stdio server that throws at startup otherwise just exits, and the only symptom the agent reports is "no tools". Three patterns are deliberate: `company_id` comes from the environment and is never a tool argument, so nothing that influences the model can point the API key at another customer's books; voucher rows are narrowed before they reach the model; and the write tool gates on company health, persists its own `transaction_id` before submitting, and polls to a final transaction status. Walkthrough: [Build an MCP server for Tally](https://docs.bizmitra.io/developer/examples/mcp-server).
- **Bill-wise allocations on receipts and payments.** `ledger_entries[].bill_allocations` names the invoices a receipt or payment settles, so Tally's Bills Outstanding moves rather than only the ledger balance. One line can clear several bills. Covered by a new [Settle invoices with a receipt](docs/push-receipt.md) walkthrough, an updated `Sync receipt` request in the Postman collection, and the pull-side field on every voucher kind.
- `List pulled masters` (`GET /api/v1/pulled-masters/{type}`) in the Postman collection — read the masters that exist in the customer's Tally company, including each voucher type's `numbering_method`.
- Company-scoped pull statistics, including per-voucher-type counts and report freshness.
- Safe failed-transaction fields: `error_code`, `error_label`, and sanitized `error_message`.
- Transaction lookup by either the public job ID or the caller's transaction ID.
- Remote Connector business-hours read/update API, with machine ownership scoping and partial updates.
- Examples for transaction failures, report status, and remote business-hours scheduling.
- Initial README and architecture overview.
- Quick-start workflow.
- Pull-voucher list, detail, and acknowledgement workflow.
- Push-invoice and final-status workflow.
- Public Postman collection draft.
- API lifecycle and release-checklist documents.

### Fixed

- `Refresh Profit & Loss`, `Refresh TDS bills (one party)` and `Acknowledge pulled vouchers` sent `"company_id": xx`, which is not JSON. The two refreshes now take the company from `X-Bizmitra-Company`; the acknowledgement sends `{{company_id}}`.
- The full-period Profit & Loss pair is now named `(full period)`, because it is a different report from the new Profit & Loss statement: it ignores dates and always covers the whole company period.
- Voucher-type numbering was described as a Manual-or-not check. `Automatic (Manual Override)` — Tally's default on a new voucher type — also keeps the voucher number you post, so that check warned on correctly configured types. `List pulled masters` now documents all five of Tally's numbering methods, which of them keep your number, and the `numbering_sub_method` / `numbering_series` fields.
- The `Sync purchase` example was missing the `gst` block, which made it look as though purchase vouchers took a different body from invoices. They do not — all trading vouchers share one shape. The block is now shown on the purchase example and documented on the push-invoice walkthrough.

### Security and behavior

- Raw Tally rejection XML, stack traces, secrets, and internal service details are not exposed through the transaction API.
- Connector business-hours access is limited to the authenticated developer's own machines.
- Business-hours updates preserve private support-level tuning and normally reach an online Connector within 10 minutes.

### Remaining preview verification

- Consistent Tally identifier semantics.
