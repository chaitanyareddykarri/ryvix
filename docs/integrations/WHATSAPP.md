# WhatsApp integration contract

## October 7 implementation update

Dashboard phone onboarding and profile controls match the application styling.
A number can be saved without a Meta connector. Saved profile contact is not a
verified WhatsApp identity; OTP send/verify/unlink are explicit actions. Reminders
recur on visits until a number is saved. Meta delivery remains unverified.

Implemented at d81b281 with migrations through 20261003000004. See the
[complete setup and limits](../infrastructure/WHATSAPP_ASSISTANT.md) and
[recorded checks](../verification/WHATSAPP_ASSISTANT_2026_10_03.md).

## Identity and ingestion

Meta Cloud API is the implemented adapter. An owner/admin connects the business
number and Vault token. Users link a personal E.164 number at /profile/whatsapp
using an authentication-template OTP. Challenges use keyed digests, ten-minute
expiry, five attempts, resend cooldown and durable hourly send limits.

/api/webhooks/whatsapp checks the signature and deduplicates provider message IDs.
Identity is scoped to user, organization and business connector; membership is
rechecked. Phone possession does not grant project or operational permissions.

## Assistant and execution

Enable the assistant at /channels/assistant after verification. Owner/admin/developer
membership is required. Disabled/unlinked messages retain the reviewed inbox path.
The separate worker calls the existing LLM gateway with authorized repository,
task, server and reviewed-lesson context. The model proposes; backend code authorizes.

Private history retains 30 days, with six prior turns in context. The request quota
is 30 per user/organization/hour, output limit 1,600 tokens and model deadline 90s.
Coding proposals show the exact repository and bounded full request. CONFIRM or
REJECT plus the proposal UUID acts within 15 minutes. Atomic creation rechecks
membership, credentials, queue capacity and replay state.

Release/server actions link to authenticated pages with existing exact target,
reviewed-head and independent-approval requirements. Bare YES does not merge,
deploy or reboot. GitHub connection also remains an authenticated web flow.

## Delivery and lifecycle

Durable replies track the signed inbound service window and delivery receipts.
Unknown sends are not automatically retried. Task updates reflect persisted
checks, preview, PR, release and matching deployment state; merge is not deployment.
Outside the service window, opted-in updates require the approved utility template.
Otherwise the outbox records window_closed. P1 alerts use their separate template.
Unlink/re-verification removes assistant session data; sent messages cannot be recalled.

## Source map and live prerequisites

- backend/src/services/whatsapp-phone.ts: OTP and scoped phone identity.
- backend/src/services/whatsapp-assistant.ts: history, quotas, proposals and outbox.
- ai/src/whatsapp-router.ts: structured LLM routing.
- services/src/communication/whatsapp-replies.ts: reply transport.
- scripts/whatsapp-assistant-worker.ts: background processing and notifications.

Provide the Meta account/token, approved authentication/P1/update templates,
public HTTPS webhook, existing LLM key and opted-in test recipient. Then verify
OTP, signed inbound, AI reply, delivered receipt, confirmed task and browser handoff.
These real-provider checks remain unverified. No free OTP allowance or fixed
per-conversation price is promised; streaming billing usage is currently unknown.
