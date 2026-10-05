# ADR 036: Verified SMS delivery callbacks

Twilio sends status callbacks to the exact configured public HTTPS URL with the
notification UUID. Verification uses HMAC-SHA1 of that URL and sorted form fields
with the Vault account token, per Twilio's protocol. Request Host headers cannot
choose the signed URL. Parameters and body are bounded; duplicates are rejected.

Receipts bind the claimed notification, unchanged configured target, account SID,
recipient, sender when present, and provider message SID. They are deduplicated and
audited transactionally. A callback may arrive before send acknowledgment; subsequent
acceptance updates cannot overwrite its status. Older/out-of-order callbacks cannot
downgrade delivered state. Unknown sends can be resolved by a verified callback.

Explicit flag `RYVIX_TWILIO_STATUS_ENABLED` controls callback registration/handling.
Keep the matching target and token available during the seven-day receipt window.
This records Twilio's delivery report, not a human read receipt. Slack acceptance and
PagerDuty event acceptance retain their separate meanings. Migration `20261005000002`
adds backend-only receipt records and allowed delivery states.

References: [Twilio signatures](https://www.twilio.com/docs/usage/security),
[outbound status](https://www.twilio.com/docs/messaging/guides/track-outbound-message-status).
