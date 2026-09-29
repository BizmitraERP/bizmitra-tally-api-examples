# Settle invoices with a receipt

This workflow records money received against the specific invoices it pays, so the customer's outstanding position moves rather than just the ledger balance.

> The final success response shown here is the intended API contract and remains provisional until the production response is fixed and retested.

## Why the allocations matter

A receipt is two facts, not one.

The money — cash up ten thousand, the customer's ledger down ten thousand — is the part you cannot omit. Post only that and Tally accepts it, the day book shows it, and the ledger balance is correct.

**Which invoices it paid** is the second fact, and Tally does not infer it. Without it the amount sits unallocated and Bills Outstanding still lists every invoice as open. Nothing errors. The first person to notice is whoever chases the debtors.

That second fact is `bill_allocations`.

## 0. Know which bills are open

An allocation names a bill, and the name must match a bill **actually outstanding for that party** in Tally. It is a reference to an existing record, not free text.

Usually you already hold it: it is the `voucher_number` of the invoice you pushed, which Tally used as the bill reference when it opened the bill. Otherwise read it back from the pulled voucher — an invoice that opened a bill carries it under `bill_allocations` with `bill_type` `New Ref`.

Send a name Tally cannot find and it does not post a partial voucher; it parks the whole thing as an import exception.

## 1. Submit the receipt

```http
POST {{base_url}}/api/v1/receipts
Authorization: Bearer {{key_id}}:{{secret}}
X-Bizmitra-Company: {{company_id}}
Accept: application/json
Content-Type: application/json
```

Example body:

```json
{
  "event_type": "receipt_create",
  "request_type": "in",
  "voucher": {
    "voucher_type": "Receipt",
    "voucher_number": "1",
    "date": "2026-04-01",
    "party_ledger": "Acme Pvt Ltd",
    "narration": "Part payment, two invoices",
    "ledger_entries": [
      { "ledger_name": "Cash", "amount": 10000, "is_debit": true },
      {
        "ledger_name": "Acme Pvt Ltd", "amount": 10000, "is_debit": false, "is_party": true,
        "bill_allocations": [
          { "name": "Bm/26-27/1", "bill_type": "Agst Ref", "amount": 5000 },
          { "name": "Bm/26-27/2", "bill_type": "Agst Ref", "amount": 5000 }
        ]
      }
    ]
  }
}
```

`ledger_entries` is the money, with `is_debit` carrying the direction per line — cash debited, the customer credited. A receipt has no inventory block.

`bill_allocations` goes on the **party** line, never the cash line. The bank or cash side of a receipt has no bills; that is where `bank_allocations` goes when you are recording a cheque.

The allocations should add up to the line. Tally does not object to a shortfall — it leaves the remainder unallocated, which is the same silent failure as omitting the block, just smaller.

### Settling one bill in full

One allocation with no amount takes the whole line:

```json
"bill_allocations": [{ "name": "Bm/26-27/1" }]
```

`bill_type` defaults to `Agst Ref` when a name is given, so this reads as "this receipt clears that invoice". An amount is only required when a line is split across several bills, where guessing a split would be worse than refusing one.

### The four reference types

| `bill_type` | Use when |
|---|---|
| `Agst Ref` | Settling an invoice that already exists. The default when a `name` is given |
| `New Ref` | Opening a new bill — what a sales or purchase voucher does |
| `Advance` | Money taken before the invoice exists |
| `On Account` | Deliberately unallocated. The only type with no `name` |

`On Account` is worth using deliberately rather than by omission. Both leave the money unallocated; one of them says you meant it.

Payments work identically. `POST /api/v1/payments` takes the same `bill_allocations` on the supplier line, settling purchase bills instead of sales ones — the direction lives in `is_debit`, not in the shape. A line may carry both lists: `bank_allocations` says how the money moved, `bill_allocations` says which bills it cleared.

There is no credit-period or due-date field. Tally accepts one on import, reports no error, and ignores it, and does not export the value on the voucher either. Rather than offer a key that quietly does nothing, the payload omits it.

## 2. Retain the transaction

```json
{
  "success": true,
  "transaction_id": "11111111-1111-1111-1111-111111111111",
  "company_id": 123,
  "voucher_type": "Receipt",
  "job_type": "receipt_sync",
  "request_type": "in"
}
```

This means Bizmitra accepted the request. It is not yet proof that Tally created the voucher — a bill name Tally cannot match is rejected later, not here.

Persist `transaction_id` against your record before doing anything else.

## 3. Verify the final result

Fetch the transaction using the documented lookup endpoint and the returned `transaction_id`, exactly as in [Create an invoice in Tally](push-invoice.md#3-verify-the-final-result), and persist `tally_voucher_guid`.

A receipt whose allocations Tally could not match fails at this step, which is why it is not optional.

## 4. Confirm the allocation landed

The ledger balance moving is not evidence the allocation worked; that happens either way. Pull the voucher back and read the party line:

```json
"bill_allocations": [
  { "name": "Bm/26-27/1", "bill_type": "Agst Ref", "amount": 5000 },
  { "name": "Bm/26-27/2", "bill_type": "Agst Ref", "amount": 5000 }
]
```

Same field name and shape as you sent, so a pulled voucher can be pushed back unchanged. Pulled amounts carry Tally's sign, matching the ledger line they hang off; on the way in the sign is ignored and taken from the line, so a round-trip needs no correction. See [Pull vouchers from Tally](pull-vouchers.md#which-bills-a-voucher-opened-or-settled).
