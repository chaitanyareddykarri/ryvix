export interface TelegramSendMessageOptions {
  replyMarkup?: Record<string, unknown>;
  parseMode?: 'Markdown' | 'MarkdownV2' | 'HTML';
}

export async function sendTelegramMessage(
  token: string,
  chatId: number | string,
  text: string,
  options?: TelegramSendMessageOptions
): Promise<boolean> {
  if (!token) throw new Error('Telegram bot token required');
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text: text.slice(0, 4000),
  };
  if (options?.replyMarkup) body.reply_markup = options.replyMarkup;
  if (options?.parseMode) body.parse_mode = options.parseMode;

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  return res.ok;
}

export async function sendTelegramContactPrompt(
  token: string,
  chatId: number | string,
  text: string
): Promise<boolean> {
  return sendTelegramMessage(token, chatId, text, {
    replyMarkup: {
      keyboard: [
        [
          {
            text: '📱 Share Phone Number to Link',
            request_contact: true,
          },
        ],
      ],
      resize_keyboard: true,
      one_time_keyboard: true,
    },
  });
}

export async function sendTelegramRemoveKeyboard(
  token: string,
  chatId: number | string,
  text: string
): Promise<boolean> {
  return sendTelegramMessage(token, chatId, text, {
    replyMarkup: {
      remove_keyboard: true,
    },
  });
}

export function normalizePhoneNumber(rawPhone: string): string {
  const digits = rawPhone.replace(/\D/g, '');
  return digits.length >= 10 ? `+${digits}` : rawPhone.trim();
}
