# API lifecycle and compatibility

The public examples target `/api/v1`.

## Compatible changes within v1

Bizmitra may add endpoints, optional request fields, response fields, voucher kinds, filters, and non-breaking capabilities within v1. Integrations must ignore response fields they do not recognize.

## Breaking changes

A change is breaking when an existing valid integration would need code changes, including removing or renaming a field, changing its type or meaning, changing authentication, removing an endpoint, or materially changing error semantics.

Breaking changes require a new major API version unless an urgent security or legal issue makes that impossible.

## Deprecation process

For a normal deprecation, Bizmitra will:

1. Mark the endpoint or field deprecated.
2. Document the supported replacement and migration path.
3. Announce a planned retirement date through appropriate developer channels.
4. Maintain the old contract during the announced transition period.
5. Monitor remaining use before removal where practical.

The final minimum notice period and notification channels must be approved before this policy is published.

## Documentation updates

The API specification is the intended source of truth. Public documentation, the Postman collection, and examples should be regenerated or checked against it. Each public repository release must pass the release checklist and include a changelog entry.
