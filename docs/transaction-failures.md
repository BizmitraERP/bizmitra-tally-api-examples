# Handle a failed Tally transaction

Submitting an invoice or order is asynchronous. An initial `success: true` means Bizmitra accepted the request; it does not mean Tally created the voucher.

Poll the transaction using either its public `job_id` or your own `transaction_id`:

```http
GET {{base_url}}/api/v1/transactions/{{transaction_id}}
Authorization: Bearer {{key_id}}:{{secret}}
Accept: application/json
```

A failed write looks like this:

```json
{
  "success": true,
  "transaction": {
    "job_id": "11111111-1111-1111-1111-111111111111",
    "transaction_id": "invoice-2026-0042",
    "bizmitra_company_id": 42,
    "job_type": "invoice_sync",
    "event_type": "invoice_create",
    "status": "failed",
    "retry_count": 1,
    "max_retries": 5,
    "tally_voucher_guid": null,
    "error_code": "TALLY_IMPORT_FAILED",
    "error_label": "Tally import failed",
    "error_message": "Ledger 'Online Sales' does not exist!",
    "payload": {
      "voucher_number": "INV-0042",
      "voucher_type": "Sales"
    },
    "created_at": "2026-09-20T10:20:00Z",
    "updated_at": "2026-09-20T10:20:08Z",
    "completed_at": null
  }
}
```

Check `transaction.status`, not the top-level `success`. Use `error_code` for program logic, `error_label` for a short UI label, and `error_message` to tell the operator what must be corrected.

Bizmitra extracts the meaningful rejection text from Tally's response. It intentionally does not expose raw Tally XML, stack traces, credentials, or internal service details.

Do not blindly retry a Tally validation failure. Correct the missing master or invalid payload, then resubmit according to your idempotency policy.

For aggregate pull and report visibility, call:

```http
GET {{base_url}}/api/v1/pulled-vouchers/statistics?company_id={{company_id}}
```

The response includes voucher totals and a `reports` collection with each report's enabled state, availability, row count, and latest snapshot time. Individual pushed-transaction failures remain authoritative in the transaction API; Sync History is an operational feed and may not contain every failed transaction.
