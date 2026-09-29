# Pull vouchers from Tally

This workflow lists Tally-originated vouchers available through the Connector, fetches the full normalized representation of one voucher, and acknowledges it after successful processing.

> Response samples are provisional until the current status, `last_synced_at`, and identifier issues are fixed and retested.

## 1. List vouchers

```http
GET {{base_url}}/api/v1/pulled-vouchers?company_id={{company_id}}
Authorization: Bearer {{key_id}}:{{secret}}
Accept: application/json
```

Use `voucher_kind` for normalized filtering. `voucher_type` is the exact Tally type name and may be customized by the Tally user.

Useful query parameters include:

| Parameter | Purpose |
|---|---|
| `company_id` | Required Bizmitra Developer Company ID |
| `voucher_kind` | Normalized kind such as `sales`, `purchase`, or `receipt` |
| `voucher_type` | Exact Tally voucher-type name |
| `status` | Consumption status |
| `start_date`, `end_date` | Inclusive voucher-date window |
| `limit`, `offset` | Pagination |

Illustrative response:

```json
{
  "success": true,
  "count": 1,
  "total": 1,
  "limit": 50,
  "offset": 0,
  "invoices": [
    {
      "bizmitra_company_id": 123,
      "transaction_id": "00000000-0000-0000-0000-000000000001",
      "tally_voucher_guid": "00000000-0000-0000-0000-000000000001-00000001",
      "tally_master_id": "334",
      "tally_alter_id": 1254,
      "voucher_date": "20260601",
      "voucher_kind": "sales",
      "voucher_type": "Sales",
      "voucher_number": "INV-DEMO-001",
      "status": "pulled",
      "last_synced_at": null
    }
  ]
}
```

The response key `invoices` is a historical wire name and may contain any supported voucher type. Respect `total`, `limit`, and `offset`; one page is not guaranteed to contain all available vouchers.

## 2. Fetch one voucher

Use the `transaction_id` returned by the list endpoint:

```http
GET {{base_url}}/api/v1/pulled-vouchers/{{transaction_id}}?company_id={{company_id}}
Authorization: Bearer {{key_id}}:{{secret}}
Accept: application/json
```

Illustrative response excerpt:

```json
{
  "success": true,
  "invoice": {
    "bizmitra_company_id": 123,
    "transaction_id": "00000000-0000-0000-0000-000000000001",
    "voucher_kind": "sales",
    "voucher_type": "Sales",
    "voucher_number": "INV-DEMO-001",
    "invoice_json": {
      "date": "2026-06-01",
      "party_ledger": "Example Customer",
      "buyer": {
        "name": "Example Customer",
        "mailing_name": "Example Customer Pvt Ltd",
        "address": ["1st Road", "2nd Road"],
        "pincode": "444444",
        "country": "India"
      },
      "consignee": {
        "name": "Example Warehouse",
        "address": [],
        "pincode": "382110",
        "state": "Gujarat",
        "country": "India",
        "gstin": "24BBBBB0000B1Z5"
      },
      "dispatch": {
        "doc_no": "DC-9",
        "date": "2026-06-01",
        "through": "Blue Dart",
        "destination": "Ahmedabad",
        "place_of_receipt": "Gandhinagar",
        "vessel_flight_no": null,
        "order_reference": null,
        "payment_terms": "30 Days",
        "delivery_note_no": "DN-3",
        "delivery_note_date": "2026-05-31"
      },
      "inventory_entries": [
        {
          "stock_item": "Example Item",
          "qty": 100,
          "rate": 12,
          "amount": 1200,
          "unit": "Nos"
        }
      ],
      "totals": {
        "taxable": 1200,
        "tax": 216,
        "invoice_total": 1416
      }
    }
  }
}
```

### Bill-to, ship-to and dispatch

`buyer`, `consignee` and `dispatch` use the same field names the push side accepts, so a voucher read out of Tally can be written back without remapping — see [Create an invoice](push-invoice.md) for what each field means.

Each block is `null`, not an empty object, when the voucher carries no such data. That is the common case, and always true for a journal or a payment, so test the block before reading fields out of it. `buyer` is usually present even so: its `name` falls back to the party ledger and `address` comes back as an empty array.

`consignee.state` is the delivery state and is independent of the buyer's state in `gst`; on a "bill to one state, deliver to another" sale the two differ.

`consignee.address` comes back as an empty array — Tally holds consignee street lines in the party ledger's address book rather than on the voucher, so there is nothing to return. Read the ship-to street address from the ledger master.

## 3. Process idempotently

Use `transaction_id` as the external correlation key in your application. If the same voucher appears again, update or ignore the existing record according to its latest Tally identifiers rather than creating a duplicate.

## 4. Acknowledge successful consumption

After your application has stored and validated the voucher, acknowledge it using the endpoint in the Postman collection. Acknowledgement is idempotent and moves processed records out of the default pending queue.

Do not acknowledge a voucher before your own transaction commits successfully.
