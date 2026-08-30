# Public release checklist

Do not publish the repository until every blocking item is complete.

## Blocking API fixes

- [ ] Pulled-voucher `status` values represent the documented lifecycle.
- [ ] `last_synced_at` is populated according to the documented lifecycle.
- [ ] The successful invoice result returns `transaction_id` and `tally_voucher_guid`.
- [ ] `tally_master_id` contains the Tally master ID, not a voucher GUID.
- [ ] The transaction-status endpoint accepts the identifier returned by invoice submission, and its documentation uses the same name.
- [ ] Detail endpoint documentation matches the actual `invoice_json`/XML response contract.

## End-to-end verification

- [ ] Test with a fresh developer API key and dedicated Tally test company.
- [ ] Verify Ping and company health.
- [ ] Pull a voucher list, fetch one voucher, process it, and acknowledge it.
- [ ] Submit an invoice and confirm it appears correctly in Tally.
- [ ] Capture the final successful transaction response.
- [ ] Confirm retries do not create duplicate vouchers.
- [ ] Verify pagination and at least one voucher-kind filter.
- [ ] Test without browser session cookies.

## Security and privacy

- [ ] Collection variables `key_id`, `secret`, `company_id`, and `application_id` are empty.
- [ ] No authorization values, cookies, Postman tokens, pairing codes, webhook secrets, private URLs, or customer identifiers are committed.
- [ ] Saved examples contain only fictional data.
- [ ] Run a secret scan across the complete repository.

## Documentation and branding

- [ ] Replace every TODO in the repository.
- [ ] Confirm terminology: Bizmitra Tally API, Bizmitra Connector App, Developer Company ID.
- [ ] Add final screenshots where they materially help onboarding.
- [ ] Confirm support, privacy, terms, and production-access links.
- [ ] Confirm the MIT licence applies only to repository examples and documentation.
