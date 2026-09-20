> [!IMPORTANT]
> This repository is currently in public preview. Some response examples and fields may change before the first stable release.
# Bizmitra Tally API — Integration Examples

Connect a SaaS, ERP, mobile application, or AI product to TallyPrime through the Bizmitra Tally API and the Bizmitra Connector App.

[Documentation](https://docs.bizmitra.io/developer/) ·
[Create a developer account](https://bizmitra.io/developer-portal/register) ·
[Learn about the Tally Connector](https://bizmitra.io/tally-connector)

This repository holds **runnable examples**. The reference documentation lives at
**[docs.bizmitra.io](https://docs.bizmitra.io/developer/)** — begin with
[Your first request](https://docs.bizmitra.io/developer/getting-started/first-request)
and [Authentication](https://docs.bizmitra.io/developer/api/authentication).

> **Draft repository:** The documentation and example responses are being prepared for the first public release. Do not publish until every item in [the release checklist](docs/release-checklist.md) is complete.

## What Bizmitra provides

Your application communicates with the Bizmitra Tally API over HTTPS. The Bizmitra Connector App runs on a Windows computer that can access TallyPrime and carries authorized work between the API and Tally.

- Send sales invoices and other supported vouchers to TallyPrime — [Voucher kinds and types](https://docs.bizmitra.io/developer/tally/voucher-kinds)
- Read vouchers and reports made available through the Connector — [Data model](https://docs.bizmitra.io/developer/platform-concepts/data-model)
- Monitor Connector, Tally, and company connectivity — [Company health](https://docs.bizmitra.io/developer/tally/company-health)
- Provision applications, customers, companies, and pairing codes through API endpoints — [Platform concepts](https://docs.bizmitra.io/developer/platform-concepts/)
- Generate a branded Connector App for your application — [Applications](https://docs.bizmitra.io/developer/platform-concepts/applications#branded-connectors)
- Receive events instead of polling — [Webhooks](https://docs.bizmitra.io/developer/webhooks/)

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

TallyPrime does not need to be publicly exposed to the internet. The Connector App must be online and able to access the relevant Tally company. See [Connectors — why it exists](https://docs.bizmitra.io/developer/platform-concepts/connectors#why-it-exists) for the reasoning behind this architecture.

## Before you begin

You need:

1. A Bizmitra developer account — [Create a developer account](https://docs.bizmitra.io/developer/getting-started/registration)
2. An application and API key — [Applications](https://docs.bizmitra.io/developer/platform-concepts/applications), [Authentication](https://docs.bizmitra.io/developer/api/authentication)
3. A customer and company created for testing — [Customers and companies](https://docs.bizmitra.io/developer/platform-concepts/customers-and-companies)
4. The Connector App installed and paired on a Windows computer that can access TallyPrime — [Pairing a company](https://docs.bizmitra.io/developer/tally/pairing)
5. The Developer Company ID returned by Bizmitra. This is not a Tally company GUID — [Identifying the company](https://docs.bizmitra.io/developer/api/authentication#identifying-the-company)

Use a dedicated Tally test company until your integration has been validated — [Sandbox and test data](https://docs.bizmitra.io/developer/getting-started/sandbox). Never commit API secrets or customer data to Git.

## Five-minute start

1. Download [`postman/bizmitra-tally-api.postman_collection.json`](postman/bizmitra-tally-api.postman_collection.json).
2. Import it into Postman.
3. Set the collection variables `key_id`, `secret`, and `company_id` with your own test values.
4. Send **Ping** to confirm authentication.
5. Send **Company connector health** to confirm that the Connector App and Tally are available.
6. Follow [Pull vouchers from Tally](docs/pull-vouchers.md) or [Create an invoice in Tally](docs/push-invoice.md).

The same walkthrough with full explanations: [Postman collection](https://docs.bizmitra.io/developer/examples/postman) and [Your first request](https://docs.bizmitra.io/developer/getting-started/first-request).

Authentication uses:

```http
Authorization: Bearer {{key_id}}:{{secret}}
Accept: application/json
```

Treat both values as credentials. The secret is shown only when the key is created. See [Authentication](https://docs.bizmitra.io/developer/api/authentication) for storage and [rotation](https://docs.bizmitra.io/developer/api/authentication#rotation).

## Core examples

Each example here is the runnable version of a documented workflow. The example shows the requests; the documentation explains the decisions.

| Workflow | What it demonstrates | Documentation |
|---|---|---|
| [Pull vouchers](docs/pull-vouchers.md) | List vouchers received through the Connector, fetch a complete voucher, and acknowledge consumption | [Pull vouchers from Tally](https://docs.bizmitra.io/developer/examples/pull-vouchers) |
| [Create an invoice](docs/push-invoice.md) | Submit an invoice, retain the transaction ID, and verify the final Tally result | [Create an invoice in Tally](https://docs.bizmitra.io/developer/examples/push-invoice) |
| [Handle transaction failures](docs/transaction-failures.md) | Interpret safe Tally rejection fields and check aggregate report status | [Jobs and transactions](https://docs.bizmitra.io/developer/platform-concepts/jobs-and-transactions) |
| [Manage business hours](docs/connector-business-hours.md) | Remotely defer heavy sync while accounts staff use Tally | [Connectors](https://docs.bizmitra.io/developer/platform-concepts/connectors#remote-business-hours) |
| [Quick start](docs/quick-start.md) | Account to first successful call | [Getting started](https://docs.bizmitra.io/developer/getting-started/) |
| [Architecture](docs/architecture.md) | How your application, the API, the Connector and Tally fit together | [Platform concepts](https://docs.bizmitra.io/developer/platform-concepts/) |
| Postman collection | Explore the broader API using your own developer credentials and company | [API reference](https://docs.bizmitra.io/developer/api/reference) |

## Important concepts

- `company_id` is the Bizmitra Developer Company ID — [Customers and companies](https://docs.bizmitra.io/developer/platform-concepts/customers-and-companies#company)
- `transaction_id` is the stable identifier used to correlate an operation — [Identifiers, and which one to keep](https://docs.bizmitra.io/developer/platform-concepts/jobs-and-transactions#identifiers-and-which-one-to-keep)
- `voucher_type` is the exact, user-configurable name in Tally; `voucher_kind` is Bizmitra's normalized category, such as `sales`, `purchase`, or `sales_order` — [Voucher kinds and types](https://docs.bizmitra.io/developer/tally/voucher-kinds)
- An initial `success: true` response means the request was **accepted**. For an asynchronous write, verify the final transaction status before treating it as created in Tally — [Two responses, not one](https://docs.bizmitra.io/developer/platform-concepts/jobs-and-transactions#two-responses-not-one)
- Use pagination and filters when reading voucher lists. Do not assume a single response contains every voucher — [Pagination](https://docs.bizmitra.io/developer/api/conventions#pagination)
- Master names must match Tally exactly, and this causes most first-integration failures — [Masters](https://docs.bizmitra.io/developer/tally/masters)

## API stability

All examples currently target `/api/v1`. Additive changes may be introduced within v1. Breaking changes require a new major API version and a documented migration path. See [API lifecycle](docs/api-lifecycle.md) here, and [Versioning and lifecycle](https://docs.bizmitra.io/developer/api/lifecycle) for the authoritative policy.

## Security

- Never commit `key_id`, `secret`, session cookies, pairing codes, webhook secrets, or production identifiers — [If a secret leaks](https://docs.bizmitra.io/developer/production/security#if-a-secret-leaks)
- Test with a dedicated developer key and Tally test company.
- Store secrets in a secret manager or protected environment variables in production — [Credentials](https://docs.bizmitra.io/developer/production/security#credentials)
- Validate webhook signatures before processing webhook events — [Verifying signatures](https://docs.bizmitra.io/developer/webhooks/signatures)
- Remove private data from Postman saved examples before committing them — [Before sharing or committing an export](https://docs.bizmitra.io/developer/examples/postman#before-sharing-or-committing-an-export)

Before you put an integration in front of real customers, work through the [go-live checklist](https://docs.bizmitra.io/developer/production/go-live-checklist).

## Support and links

- Documentation: <https://docs.bizmitra.io>
- Developer platform documentation: <https://docs.bizmitra.io/developer/>
- API reference: <https://docs.bizmitra.io/developer/api/reference>
- Errors and troubleshooting: <https://docs.bizmitra.io/developer/api/errors>
- Developer registration: <https://bizmitra.io/developer-portal/register>
- Connector overview: <https://bizmitra.io/tally-connector>
- Website: <https://bizmitra.io>
- Support: open a GitHub issue, or contact <https://bizmitra.io/contact>

## License

The sample code and documentation in this repository are licensed under the [MIT License](LICENSE). Use of the Bizmitra API and Connector App is governed separately by Bizmitra's applicable commercial terms and policies.

## Acknowledgements

The Bizmitra Tally Connector API and integration workflows were developed with contributions from:

- [Vishal Bizmitra](https://github.com/vishalbizmitra) — API and Connector development


## Get started

Create a Bizmitra developer account to generate sandbox credentials, configure a company and test the API using the included Postman collection.

- [Create a developer account](https://bizmitra.io/developer-portal/register)
- [Bizmitra Tally Connector](https://bizmitra.io/tally-connector)
- [Bizmitra website](https://bizmitra.io)

## Support

For integration questions, open a GitHub issue.  
For production access or partnership enquiries, contact [Bizmitra](https://bizmitra.io/contact).
