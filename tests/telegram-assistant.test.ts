import assert from 'node:assert/strict';
import {
  sendTelegramMessage,
  sendTelegramContactPrompt,
  sendTelegramRemoveKeyboard,
  normalizePhoneNumber,
} from '../services/src/communication/telegram';

export async function testTelegramAssistant() {
  // 1. Phone number normalization checks
  assert.equal(normalizePhoneNumber('9876543210'), '+9876543210');
  assert.equal(normalizePhoneNumber('+91 98765-43210'), '+919876543210');
  assert.equal(normalizePhoneNumber('123'), '123'); // short string unchanged

  // 2. Mock fetch for Telegram API calls
  const originalFetch = globalThis.fetch;
  let calls: Array<{ url: string; body: any }> = [];

  try {
    globalThis.fetch = async (url: any, init: any) => {
      calls.push({
        url: String(url),
        body: JSON.parse(String(init?.body)),
      });
      return Response.json({ ok: true, result: { message_id: 101 } });
    };

    // 3. Test sending regular message
    const res1 = await sendTelegramMessage('test-token', 123456, 'Hello Developer');
    assert.equal(res1, true);
    assert.equal(calls[0].url, 'https://api.telegram.org/bottest-token/sendMessage');
    assert.equal(calls[0].body.chat_id, 123456);
    assert.equal(calls[0].body.text, 'Hello Developer');

    // 4. Test contact prompt keyboard
    const res2 = await sendTelegramContactPrompt('test-token', 123456, 'Share phone');
    assert.equal(res2, true);
    assert.equal(calls[1].body.reply_markup.keyboard[0][0].request_contact, true);

    // 5. Test remove keyboard
    const res3 = await sendTelegramRemoveKeyboard('test-token', 123456, 'Done');
    assert.equal(res3, true);
    assert.equal(calls[2].body.reply_markup.remove_keyboard, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
}
