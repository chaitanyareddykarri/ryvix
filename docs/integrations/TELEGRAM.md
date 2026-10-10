# Telegram Assistant Integration Contract

## October 11, 2026 Implementation Update

Telegram Assistant integration is implemented, verified, and merged to `main` and `Testing_branch` (commits `3e11417`, `ae3e5d4`, `37d7021`, `9f1220a`, and `d0ad4bb`).

The bot runs under `@RyvixAiBot` (HTTP API via Telegram Bot API) and acts as an autonomous mobile interface for Ryvix, providing phone verification, project status, LLM reasoning, and coding workspace sandbox task dispatching.

---

## 1. Identity, Authentication & Phone Linking

### Verification Flows
Access to the assistant is gated by phone number matching against registered `user_profiles` in Supabase:

1. **Native Contact Sharing**:
   - The user taps `/start`.
   - The bot displays a persistent custom reply keyboard with the `request_contact: true` button (`[ 📱 Share Phone Number to Link ]`).
   - When tapped, Telegram shares the verified user phone number in the webhook payload.

2. **Direct Text Input**:
   - The user can type their phone number directly into the chat (e.g., `+1 555-0123`, `9876543210`).
   - The message is validated against an E.164-compatible pattern: `/^\+?[0-9\s\-\(\)]{7,20}$/`.

3. **Flexible Phone Number Normalization**:
   - Handles mismatched country code formatting (e.g., user profile saved with or without `+`, country code prefixes, or local format).
   - SQL matching uses both exact string lookup and last-10-digits suffix matching (`RIGHT(phone_number, 10)`).
   - Upon successful match, `telegram_chat_id` is updated in `user_profiles` (indexed via `supabase/migrations/20261011000001_telegram_assistant.sql`).

---

## 2. Webhook Architecture & Security

- **Webhook Endpoint**: `/api/webhooks/telegram` (`web/app/api/webhooks/telegram/route.ts`).
- **Signature Verification**: Validates the `X-Telegram-Bot-Api-Secret-Token` header against `TELEGRAM_WEBHOOK_SECRET`. Requests with invalid or missing tokens receive an immediate HTTP 401.
- **Commands**:
  - `/start`: Greeting message and phone linking prompt.
  - `/help`: Usage instructions and command reference.
  - `/status`: Current Ryvix system and workspace status.
  - `/repos`: Lists accessible repositories for the authenticated tenant.
- **Typing Indicators**: Inbound requests trigger `sendChatAction(chatId, 'typing')` to give immediate visual feedback in the Telegram client while the LLM or sandbox processes the task.

---

## 3. External LLM Reasoning & Sandbox Task Execution

- **Autonomous Reasoning Gateway**:
  - Unrecognized messages from authenticated users are routed to the central `modelGateway.generateChatCompletion`.
  - Prompts are grounded with repository context and instructions.
  - Generates conversational or architectural answers directly to the Telegram user.
  - Model usage is accounted for via `recordModelUsage`.
- **Coding Workspace Sandbox Dispatch**:
  - When the user sends a coding prompt or modification request, the assistant enqueues a background job using `RepositoryJobStore.enqueue`.
  - The job is dispatched into the secure worker container sandbox environment, and confirmation with the job ID is sent to the user via Telegram.

---

## 4. UI Branding & User Experience

- Web UI onboarding dialogs, buttons, and navigation links have been updated from WhatsApp to Telegram:
  - `web/components/PhoneOnboarding.tsx`: Updated to prompt for Telegram linking with `@RyvixAiBot`.
  - `web/components/PhoneContactForm.tsx`: Labels updated for Telegram phone association.
  - `web/app/profile/whatsapp/page.tsx`: Instructions updated with link to `t.me/RyvixAiBot`.
  - `web/components/WorkspaceNavigation.tsx`: Navigation link labeled `Phone / Telegram`.

---

## 5. Source Map & Testing

- `web/app/api/webhooks/telegram/route.ts`: Secure webhook handler, phone verification, LLM invocation, and sandbox enqueueing.
- `services/src/communication/telegram.ts`: Telegram client with `sendTelegramMessage` and `sendChatAction`.
- `supabase/migrations/20261011000001_telegram_assistant.sql`: `user_profiles.telegram_chat_id` column and index.
- `tests/telegram-assistant.test.ts`: Offline automated tests for webhook authorization, phone linking, LLM replies, and job queue dispatch.
- `tests/browser/phone-onboarding.spec.mjs`: Playwright browser tests verifying Telegram UI text and dialog behaviors.
