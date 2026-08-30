# Create an invoice in Tally

This workflow submits a normalized sales invoice and then verifies the final Tally result.

> The final success response shown here is the intended API contract and remains provisional until the production response is fixed and retested.

## 1. Submit the invoice

```http
POST {{base_url}}/api/v1/invoices
Authorization: Bearer {{key_id}}:{{secret}}
X-Bizmitra-Company: {{company_id}}
Accept: application/json
Content-Type: application/json
```

Example body:

```json
{
  "event_type": "invoice_create",
  "request_type": "in",
  "invoice": {
    "voucher_type": "Sales",
    "voucher_number": "INV-DEMO-002",
    "date": "2026-06-01",
    "reference": "PO-DEMO-001",
    "party_ledger": "Example Customer",
    "gst": {
      "registration_type": "Regular",
      "place_of_supply": "Gujarat",
      "state": "Gujarat",
      "party_gstin": "24AAAAA0000A1Z5"
    },
    "inventory_entries": [
      {
        "stock_item": "Example Item",
        "qty": 100,
        "rate": 12,
        "amount": 1200,
        "unit": "Nos",
        "godown": "Main Location",
        "hsn": "33345",
        "taxability": "Taxable",
        "gst_rates": [
          { "duty_head": "CGST", "rate": 9 },
          { "duty_head": "SGST/UTGST", "rate": 9 }
        ],
        "accounting_allocations": [
          { "ledger_name": "Sales", "amount": 1200 }
        ]
      }
    ],
    "ledger_entries": [
      {
        "ledger_name": "Example Customer",
        "amount": -1416,
        "is_party": true
      },
      { "ledger_name": "CGST", "amount": 108, "is_tax": true },
      { "ledger_name": "SGST", "amount": 108, "is_tax": true }
    ]
  }
}
```

Ledger, item, godown, unit, voucher-type, and tax names must match the target Tally company or be handled according to the API's supported master-creation workflow.

## 2. Retain the accepted transaction

Illustrative accepted response:

```json
{
  "success": true,
  "transaction_id": "11111111-1111-1111-1111-111111111111",
  "company_id": 123,
  "request_type": "in"
}
```

This means Bizmitra accepted the request. It is not yet proof that Tally created the voucher.

## 3. Verify the final result

Fetch the transaction using the final documented lookup endpoint and the returned `transaction_id`.

Expected successful outcome:

```json
{
  "success": true,
  "status": "completed",
  "transaction_id": "11111111-1111-1111-1111-111111111111",
  "tally_voucher_guid": "22222222-2222-2222-2222-222222222222-00000001",
  "tally_master_id": "335"
}
```

The exact envelope must be replaced with the verified production response before publication. A successful result must expose the `transaction_id` and Tally voucher GUID. Preserve them in your application so later updates target the same voucher instead of producing duplicates.

If the status fails, inspect the documented error and Tally response, correct the payload or target masters, and retry according to your integration's idempotency policy.
