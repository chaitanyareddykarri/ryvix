/** Telegram's signed webhook must contain the sender's own shared contact. */
export function verifiedTelegramPhone(message:any):string|null{
  if(message?.chat?.type!=='private'||!Number.isSafeInteger(message.from?.id)||message.chat.id!==message.from.id||message.contact?.user_id!==message.from.id)return null;
  const phone=message.contact?.phone_number;
  if(typeof phone!=='string'||!/^\+?[1-9][0-9]{7,14}$/.test(phone))return null;
  return '+'+phone.replace(/^\+/,'');
}
