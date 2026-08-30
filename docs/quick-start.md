# Quick start

> Draft: validate this workflow against the release candidate before publication.

## 1. Prepare the developer account

Create an application, API key, customer, and company in Bizmitra. Install and pair the generated Connector App on a Windows computer that can access the customer's TallyPrime company.

Large partners can perform provisioning from their own product through the Bizmitra API. Their end users do not need to operate the Bizmitra developer portal.

## 2. Configure Postman

Import the public collection and set:

| Variable | Value |
|---|---|
| `base_url` | `https://bizmitra.io` |
| `key_id` | Your developer API key ID |
| `secret` | The secret shown when the key was created |
| `company_id` | Your Bizmitra Developer Company ID |

Do not save real credentials into a file that will be committed.

## 3. Check connectivity

Call **Ping**, followed by **Company connector health**. Continue only when the company, Connector App, and Tally state meet the endpoint's documented readiness conditions.

## 4. Choose a direction

- To consume Tally-originated data, follow [Pull vouchers](pull-vouchers.md).
- To create an invoice in Tally, follow [Push invoice](push-invoice.md).

## 5. Verify the outcome

For an asynchronous write, retain the returned `transaction_id`, poll the transaction endpoint, and do not mark the operation successful in your application until the final Tally result is successful.
