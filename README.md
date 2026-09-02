# Bizmitra Tally API — Integration Examples

Connect a SaaS, ERP, mobile application, or AI product to TallyPrime through the Bizmitra Tally API and the Bizmitra Connector App.

> **Draft repository:** The documentation and example responses are being prepared for the first public release. Do not publish until every item in [the release checklist](docs/release-checklist.md) is complete.

## What Bizmitra provides

Your application communicates with the Bizmitra Tally API over HTTPS. The Bizmitra Connector App runs on a Windows computer that can access TallyPrime and carries authorized work between the API and Tally.

- Send sales invoices and other supported vouchers to TallyPrime.
- Read vouchers and reports made available through the Connector.
- Monitor Connector, Tally, and company connectivity.
- Provision applications, customers, companies, and pairing codes through API endpoints.
- Generate a branded Connector App for your application.

The examples in this repository are open source. The hosted Bizmitra API, developer platform, and Connector App are separate proprietary services and require a Bizmitra developer account.

## How it works

```mermaid
flowchart LR
    A["Your application"] -->|HTTPS API| B["Bizmitra Tally API"]
    B -->|Secure jobs| C["Bizmitra Connector App"]
    C -->|Local connection| D["TallyPrime"]
    D --> C
    C --> B
    B --> A
```

TallyPrime does not need to be publicly exposed to the internet. The Connector App must be online and able to access the relevant Tally company.

## Before you begin

You need:

1. A Bizmitra developer account.
2. An application and API key.
3. A customer and company created for testing.
4. The Connector App installed and paired on a Windows computer that can access TallyPrime.
5. The Developer Company ID returned by Bizmitra. This is not a Tally company GUID.

Use a dedicated Tally test company until your integration has been validated. Never commit API secrets or customer data to Git.

## Five-minute start

1. Download [`postman/bizmitra-tally-api.postman_collection.json`](postman/bizmitra-tally-api.postman_collection.json).
2. Import it into Postman.
3. Set the collection variables `key_id`, `secret`, and `company_id` with your own test values.
4. Send **Ping** to confirm authentication.
5. Send **Company connector health** to confirm that the Connector App and Tally are available.
6. Follow [Pull vouchers from Tally](docs/pull-vouchers.md) or [Create an invoice in Tally](docs/push-invoice.md).

Authentication uses:

```http
Authorization: Bearer {{key_id}}:{{secret}}
Accept: application/json
```

Treat both values as credentials. The secret is shown only when the key is created.

## Core examples

| Workflow | What it demonstrates |
|---|---|
| [Pull vouchers](docs/pull-vouchers.md) | List vouchers received through the Connector, fetch a complete voucher, and acknowledge consumption |
| [Create an invoice](docs/push-invoice.md) | Submit an invoice, retain the transaction ID, and verify the final Tally result |
| Postman collection | Explore the broader API using your own developer credentials and company |

## Important concepts

- `company_id` is the Bizmitra Developer Company ID.
- `transaction_id` is the stable identifier used to correlate an operation.
- `voucher_type` is the exact, user-configurable name in Tally.
- `voucher_kind` is Bizmitra's normalized category, such as `sales`, `purchase`, or `sales_order`.
- An initial `success: true` response means the request was accepted. For an asynchronous write, verify the final transaction status before treating it as created in Tally.
- Use pagination and filters when reading voucher lists. Do not assume a single response contains every voucher.

## API stability

All examples currently target `/api/v1`. Additive changes may be introduced within v1. Breaking changes require a new major API version and a documented migration path. See [API lifecycle](docs/api-lifecycle.md).

## Security

- Never commit `key_id`, `secret`, session cookies, pairing codes, webhook secrets, or production identifiers.
- Test with a dedicated developer key and Tally test company.
- Store secrets in a secret manager or protected environment variables in production.
- Validate webhook signatures before processing webhook events.
- Remove private data from Postman saved examples before committing them.

## Support and links

- Website: <https://bizmitra.io>
- Developer registration: **TODO: add final developer registration URL**
- API documentation: **TODO: add public API documentation URL**
- Connector overview: **TODO: add final Connector page URL**
- Support: **TODO: add developer support URL or email**

## License

The sample code and documentation in this repository are licensed under the [MIT License](LICENSE). Use of the Bizmitra API and Connector App is governed separately by Bizmitra's applicable commercial terms and policies.

## Acknowledgements

The Bizmitra Tally Connector API and integration workflows were developed with contributions from:

- [Vishal Bizmitra](https://github.com/vishalbizmitra) — API and Connector development