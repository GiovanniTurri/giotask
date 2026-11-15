# Architecture rules
- Use a database owner predicate tied to the confirmed Auth user UUID for the single-owner app; never authorize by browser state or editable metadata.
- Validate private Edge Function requests with the shared owner guard; allow internal credentials only on scheduled or server-to-server functions.
- Expose Google connection metadata through column grants and explicit projections; access and refresh tokens remain service-only.
- Bind Google OAuth callbacks to an expiring, unpredictable, single-use database nonce created by an authenticated owner request to prevent unsolicited connections.
- Use managed authenticated HTTP schedules for calendar sync and reminders; check Rome delivery hours in the reminder handler because managed schedules run in UTC.