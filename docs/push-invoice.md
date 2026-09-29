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

### Bill-to, ship-to and dispatch details

Three optional blocks sit beside `gst`: `buyer` (bill-to), `consignee` (ship-to) and `dispatch` (how the goods travelled).

```json
{
  "invoice": {
    "party_ledger": "Example Customer",
    "gst": {
      "registration_type": "Regular",
      "place_of_supply": "Rajasthan",
      "state": "Rajasthan",
      "party_gstin": "24AAAAA0000A1Z5"
    },
    "buyer": {
      "name": "Example Customer",
      "mailing_name": "Example Customer Pvt Ltd",
      "address": ["1st Road", "2nd Road"],
      "pincode": "444444",
      "country": "India"
    },
    "consignee": {
      "name": "Example Warehouse",
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
      "delivery_note_no": "DN-3",
      "delivery_note_date": "2026-05-31",
      "payment_terms": "30 Days"
    }
  }
}
```

Every block and every field inside it is optional. Omit a block and Tally infers those fields from the party ledger master, as it did before these blocks existed; a field sent as `null` or `""` is treated as absent rather than as an instruction to clear the stored value.

`consignee.state` is the **delivery** state, held independently of the buyer's state in `gst` — it is what makes a "bill to one state, deliver to another" sale representable, and what an e-way bill and any ship-to GST determination read. The consignee block does not default to the buyer, so omit it when goods go to the buyer's own address.

> **A consignee has no street address on the voucher.** Tally keeps consignee street lines in the party ledger's address book and stores only a reference to the chosen entry, so `consignee` carries `name`, `pincode`, `state`, `country` and `gstin` and no usable address lines. A `consignee.address` you send is accepted rather than rejected, but it does not reach Tally and reads back as an empty array. Put the ship-to street address on the ledger master.

Dates in `dispatch` are ISO `YYYY-MM-DD` (`DD-MM-YYYY` is also accepted). An unparseable date drops that one field rather than failing the push.

`buyer.state` and `buyer.gstin` are the same voucher fields as `gst.state` and `gst.party_gstin`; send them in either block, and `gst` wins if both are set.

The same three blocks come back on the pull side under the same names — see [Pull vouchers](pull-vouchers.md).

### The same body shape covers the other trading vouchers

`POST /api/v1/purchases`, `/credit-notes` and `/debit-notes` take this identical body — including the `gst`, `buyer`, `consignee` and `dispatch` blocks — under `voucher` instead of `invoice`. They differ only in accounting direction, which the endpoint applies for you: send positive magnitudes and do not encode signs yourself.

`POST /api/v1/orders` accepts the three blocks as well, keyed `order`. On an order the consignee is often the point of the block: the delivery address is agreed when the order is placed and carries through to the invoice that follows.

On a purchase, the `gst` block carries the **supplier's** registration type, state and GSTIN. It is party and place-of-supply context only; it does not decide input-credit eligibility. Whether ITC is claimed follows from the ledgers you post to — the purchase or expense ledger in each item's `accounting_allocations`, and the tax ledgers in `ledger_entries`. An ITC-ineligible purchase is expressed by posting to a ledger configured that way, not by omitting `gst`.

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
