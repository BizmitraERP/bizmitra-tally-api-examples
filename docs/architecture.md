# Architecture

Your application never needs to open TallyPrime to the public internet.

1. Your application authenticates with the Bizmitra Tally API.
2. Bizmitra authorizes the application, customer, and company relationship.
3. The paired Connector App collects authorized work.
4. The Connector App communicates with the locally accessible TallyPrime instance.
5. Results return through Bizmitra to your application.

The Connector is an installed component, not a standalone product. It requires an application created under a Bizmitra developer account and a paired customer environment.

## Responsibility boundaries

| Component | Primary responsibility |
|---|---|
| Partner application | Business workflow, user experience, source records, and final reconciliation |
| Bizmitra API | Authentication, authorization, provisioning, job routing, status, and integration surface |
| Connector App | Secure communication with Tally and execution of supported operations |
| TallyPrime | Accounting data, voucher validation, and final voucher identifiers |

Partners may manage applications, customers, companies, branding, pairing, status, and Connector lifecycle through their own portal using Bizmitra APIs.
