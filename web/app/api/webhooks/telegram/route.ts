import {verifiedTelegramPhone} from '../../../../../services/src/communication/telegram-identity';
import { NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { getDirectDbPool } from '@/utils/direct-db';
import { RepositoryJobStore } from '../../../../../backend/src/services/repository-job-store';
import { modelGateway } from '../../../../../ai/src/model-gateway';
import {
  sendTelegramMessage,
  sendTelegramContactPrompt,
  sendTelegramRemoveKeyboard,
  normalizePhoneNumber,
} from '../../../../../services/src/communication/telegram';

export async function POST(request: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;

  if (!token) {
    return NextResponse.json({ error: 'Telegram bot token is not configured.' }, { status: 503 });
  }

  if(!expectedSecret)return NextResponse.json({error:'Telegram webhook authentication is not configured.'},{status:503});

  // Require webhook authentication before processing identities or jobs.
  if (expectedSecret) {
    const suppliedSecret = request.headers.get('x-telegram-bot-api-secret-token') || '';
    if (
      Buffer.byteLength(expectedSecret) !== Buffer.byteLength(suppliedSecret) ||
      !timingSafeEqual(Buffer.from(expectedSecret), Buffer.from(suppliedSecret))
    ) {
      return NextResponse.json({ error: 'Unauthorized webhook request.' }, { status: 401 });
    }
  }

  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON payload.' }, { status: 400 });
  }

  const message = payload?.message;
  if (!message || !message.chat?.id) {
    return NextResponse.json({ ok: true });
  }

  if(message.chat.type!=='private'||message.chat.id!==message.from?.id)return NextResponse.json({ok:true});
  const chatId = message.chat.id;
  const pool = getDirectDbPool();

  try {
    const text = message.text?.trim() || '';
    const rawContactPhone = message.contact?.phone_number || '';
    const cleanTextPhone = text.replace(/[\s()-]/g, '');
    const isDirectPhoneInput = /^\+?[0-9]{8,15}$/.test(cleanTextPhone);
    const phoneInputToLink = verifiedTelegramPhone(message);
    if((rawContactPhone||isDirectPhoneInput)&&!phoneInputToLink){
      await sendTelegramContactPrompt(token,chatId,'Use Share Phone Number to share your own Telegram contact. Typed numbers cannot verify account ownership.');
      return NextResponse.json({ok:true});
    }

    // 1. Link only an authenticated private-chat sender sharing their own contact.
    if (phoneInputToLink) {
      const rawPhone = phoneInputToLink;
      const normalized = normalizePhoneNumber(rawPhone);
      const digitsOnly = rawPhone.replace(/\D/g, '');

      // Match the complete international number; ambiguous profiles fail closed.
      const profileResult = await pool.query(
        `SELECT id, full_name, phone_number, organization_id FROM public.profiles
         WHERE regexp_replace(phone_number, '[^0-9]', '', 'g') = $1 LIMIT 2`, [digitsOnly]);
      const profile = profileResult.rows.length===1?profileResult.rows[0]:null;
      if (profile) {
        // Link this Telegram chat_id to the user's profile
        await pool.query(
          `UPDATE public.profiles 
           SET telegram_chat_id = $1, 
               telegram_username = $2, 
               telegram_linked_at = NOW() 
           WHERE id = $3`,
          [chatId, message.from?.username || null, profile.id]
        );

        // Fetch their connected repositories
        const reposRes = await pool.query(
          `SELECT r.full_name, r.default_branch 
           FROM public.repositories r 
           JOIN public.projects p ON p.id = r.project_id 
           WHERE p.organization_id = $1 
           LIMIT 5`,
          [profile.organization_id]
        );

        let repoListText = '';
        if (reposRes.rows.length > 0) {
          repoListText = '\n\n📂 Connected Repositories:\n' + 
            reposRes.rows.map((r: any, idx: number) => `${idx + 1}. ${r.full_name} (${r.default_branch})`).join('\n') +
            '\n\n💬 Send me any instruction, for example:\n• "Fix the navbar on ' + reposRes.rows[0].full_name + '"\n• "Update title to My New App"';
        } else {
          repoListText = '\n\n⚠️ No GitHub repositories connected yet.\n👉 Go to https://ryvix.co.in/dashboard to link a GitHub repo!';
        }

        await sendTelegramRemoveKeyboard(
          token,
          chatId,
          `🎉 Connected Successfully!\n\nWelcome ${profile.full_name || 'Developer'}! Your Telegram is now linked to your Ryvix account (+${digitsOnly}).${repoListText}`
        );
      } else {
        await sendTelegramMessage(
          token,
          chatId,
          `❌ User Not Found!\n\nNo Ryvix account was found matching phone number ${normalized}.\n\n👉 What to do:\n1. Go to https://ryvix.co.in\n2. Sign in and enter your phone number under Profile settings\n3. Return here and tap "Share Phone Number" again to link!`
        );
      }

      return NextResponse.json({ ok: true });
    }

    // 2. /start or /repos command
    if (text.startsWith('/start') || text.startsWith('/repos')) {
      const existing = await pool.query(
        `SELECT id, full_name, organization_id FROM public.profiles WHERE telegram_chat_id = $1 LIMIT 1`,
        [chatId]
      );

      if (existing.rows[0]) {
        const user = existing.rows[0];
        const reposRes = await pool.query(
          `SELECT r.full_name, r.default_branch 
           FROM public.repositories r 
           JOIN public.projects p ON p.id = r.project_id 
           WHERE p.organization_id = $1 
           LIMIT 5`,
          [user.organization_id]
        );

        let repoListText = '';
        if (reposRes.rows.length > 0) {
          repoListText = '\n\n📂 Your Repositories:\n' + 
            reposRes.rows.map((r: any, idx: number) => `• ${r.full_name} (branch: ${r.default_branch})`).join('\n') +
            '\n\n💬 Send any instruction to modify your code!';
        } else {
          repoListText = '\n\n⚠️ No GitHub repositories connected yet. Connect one on your Ryvix dashboard!';
        }

        await sendTelegramMessage(
          token,
          chatId,
          `👋 Welcome back, ${user.full_name || 'Developer'}!${repoListText}`
        );
      } else {
        await sendTelegramContactPrompt(
          token,
          chatId,
          `👋 Welcome to Ryvix AI!\n\nYou are not linked yet. Tap the button below to share your phone number so we can find your Ryvix account and repositories:`
        );
      }

      return NextResponse.json({ ok: true });
    }

    // 3. Regular chat message / Coding prompt
    if (text) {
      const userRes = await pool.query(
        `SELECT p.id, p.organization_id, p.full_name 
         FROM public.profiles p 
         WHERE p.telegram_chat_id = $1 
         LIMIT 1`,
        [chatId]
      );

      const user = userRes.rows[0];
      if (!user) {
        await sendTelegramContactPrompt(
          token,
          chatId,
          `🔒 Access Denied: You must link your account first.\n\nTap the button below to share your phone number:`
        );
        return NextResponse.json({ ok: true });
      }

      // Find user repositories
      const reposRes = await pool.query(
        `SELECT r.id, r.full_name, r.default_branch 
         FROM public.repositories r 
         JOIN public.projects p ON p.id = r.project_id 
         WHERE p.organization_id = $1 
         ORDER BY r.updated_at DESC 
         LIMIT 1`,
        [user.organization_id]
      );
      const targetRepo = reposRes.rows[0];

      // 1. Analyze prompt with External LLM (Gemini / Groq / OpenAI)
      let aiUnderstanding = '';
      try {
        const onAttempt = async () => {};
        const completion = await modelGateway.complete([
          {
            role: 'system',
            content: `You are Ryvix AI, an autonomous software engineering assistant connected via Telegram. ` +
              (targetRepo ? `Target connected GitHub repository: "${targetRepo.full_name}" (branch: ${targetRepo.default_branch}).` : 'No GitHub repository connected yet.') +
              ` Provide a clear, helpful 2-4 sentence answer explaining your engineering plan or answering their question directly.`,
          },
          { role: 'user', content: text },
        ], { onAttempt, signal: AbortSignal.timeout(25000) });
        aiUnderstanding = completion.content?.trim() || '';
      } catch (llmErr) {
        console.warn('[Telegram LLM Notice] Model completion fallback:', llmErr);
      }

      // 2. Determine if the user message is an actionable code change vs conversational greeting/question
      const cleanPrompt = text.trim().toLowerCase();
      const isConversational = /^(hi|hello|hey|greetings|good\s+(morning|afternoon|evening)|yo|sup|who\s+are\s+you|what\s+can\s+you\s+do.*|wt\s+u\s+can\s+do.*|how\s+does\s+this\s+work.*|help|capabilities)[\s!.,?]*$/i.test(cleanPrompt);
      const isActionableCode = !isConversational && cleanPrompt.length >= 3;

      let taskEnqueued = false;
      let taskId = '';
      let enqueueNotice = '';

      if (targetRepo && isActionableCode) {
        try {
          const jobStore = new RepositoryJobStore(pool);
          const task = await jobStore.enqueue(
            targetRepo.id,
            user.organization_id,
            user.id,
            text
          );
          taskEnqueued = true;
          taskId = task.id;
        } catch (enqueueErr: any) {
          enqueueNotice = enqueueErr?.message || 'Queuing unavailable.';
        }
      }

      // 3. Craft response back to Telegram
      if (taskEnqueued) {
        await sendTelegramMessage(
          token,
          chatId,
          `🤖 *Ryvix AI Plan:*\n${aiUnderstanding || 'Analyzing repository and queuing sandbox build...'}\n\n` +
          `🚀 *Coding Task Queued!* (\`#${taskId.slice(0, 8)}\`)\n` +
          `📂 *Repo:* \`${targetRepo.full_name}\` (\`${targetRepo.default_branch}\`)\n` +
          `⚙️ Sandbox container will pull code, apply changes, and update preview.\n\n` +
          `📊 Track live: https://ryvix.co.in/dashboard`,
          { parseMode: 'Markdown' }
        );
      } else if (targetRepo) {
        // Conversational response or informational query
        await sendTelegramMessage(
          token,
          chatId,
          `🤖 *Ryvix AI:*\n${aiUnderstanding || 'I received your message.'}\n\n` +
          (enqueueNotice ? `ℹ️ *Status:* ${enqueueNotice}\n\n` : '') +
          `💡 *Tip:* Send a code instruction (e.g. \`Make my homepage modern\` or \`Add a dark theme\`) to run sandbox builds in Docker!`,
          { parseMode: 'Markdown' }
        );
      } else {
        // No repo connected yet
        await sendTelegramMessage(
          token,
          chatId,
          `🤖 *Ryvix AI:*\n${aiUnderstanding || 'I received your request.'}\n\n` +
          `⚠️ *No GitHub repository connected yet.*\n` +
          `Connect your repo on https://ryvix.co.in/dashboard to let me build and edit code directly in your sandbox!`
        );
      }

      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[Telegram Webhook Error]', error);
    return NextResponse.json({ error: 'Internal webhook error' }, { status: 500 });
  }
}
