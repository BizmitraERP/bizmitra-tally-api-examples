# Manage Connector business hours

Business-hours mode keeps incremental voucher sync and imports running while accounts staff use Tally, but defers full synchronization and heavy reports until outside the configured window.

## Read the current remote overrides

```http
GET {{base_url}}/api/v1/connectors/{{machine}}/business-hours
Authorization: Bearer {{key_id}}:{{secret}}
Accept: application/json
```

## Update the schedule

```http
PATCH {{base_url}}/api/v1/connectors/{{machine}}/business-hours
Authorization: Bearer {{key_id}}:{{secret}}
Content-Type: application/json
```

```json
{
  "sync_mode": "business_hours",
  "business_hours_start": "10:00",
  "business_hours_end": "17:00",
  "business_days": [0, 1, 2, 3, 4, 5],
  "business_timezone": "Asia/Kolkata",
  "off_hours_full_sync_enabled": true
}
```

This is a partial update. Send only fields that should change:

- `sync_mode`: `normal` or `business_hours`.
- `business_hours_start` and `business_hours_end`: 24-hour `HH:MM`.
- `business_days`: Monday `0` through Sunday `6`.
- `business_timezone`: IANA timezone, for example `Asia/Kolkata`.
- `off_hours_full_sync_enabled`: whether deferred heavy work may run outside business hours.

Set one field to `null` to remove its remote override and return that setting to the Connector's local configuration.

An online Connector normally receives the change on its next settings poll, within 10 minutes. No restart is required. The machine must belong to the authenticated developer; another developer's machine returns `404`.

Business-hours mode is not a pause control. Use the connector disable endpoint if the machine must stop processing work.
