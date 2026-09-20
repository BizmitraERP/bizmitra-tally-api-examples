# Changelog

All notable changes to this repository will be documented here.

## Unreleased

### Added

- Company-scoped pull statistics, including per-voucher-type counts and report freshness.
- Safe failed-transaction fields: `error_code`, `error_label`, and sanitized `error_message`.
- Transaction lookup by either the public job ID or the caller's transaction ID.
- Remote Connector business-hours read/update API, with machine ownership scoping and partial updates.
- Examples for transaction failures, report status, and remote business-hours scheduling.
- Initial README and architecture overview.
- Quick-start workflow.
- Pull-voucher list, detail, and acknowledgement workflow.
- Push-invoice and final-status workflow.
- Public Postman collection draft.
- API lifecycle and release-checklist documents.

### Security and behavior

- Raw Tally rejection XML, stack traces, secrets, and internal service details are not exposed through the transaction API.
- Connector business-hours access is limited to the authenticated developer's own machines.
- Business-hours updates preserve private support-level tuning and normally reach an online Connector within 10 minutes.

### Remaining preview verification

- Consistent Tally identifier semantics.
