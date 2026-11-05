import { Injectable } from '@nestjs/common';
import { env } from '../config/env';
import { log } from '../common/logger';

const escapeHtml = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Team alerts through a Telegram bot (TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID, comma-separated for several recipients).
 * Each recipient must have pressed Start in the bot (Telegram does not let bots write first).
 * Best effort: a failed or slow Telegram call never fails the request that triggered it — the lead is already stored
 * and visible in the admin panel.
 */
@Injectable()
export class TelegramService {
  get chatIds() {
    return env.TELEGRAM_CHAT_ID.split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  get enabled() {
    return !!env.TELEGRAM_BOT_TOKEN && this.chatIds.length > 0;
  }

  /** `lines` are [label, value] pairs; values are escaped. Empty values are skipped. True if at least one chat got it. */
  async send(title: string, lines: [string, string | null | undefined][], link?: string): Promise<boolean> {
    if (!this.enabled) return false;
    const body = [`<b>${escapeHtml(title)}</b>`, ...lines.filter(([, v]) => v).map(([k, v]) => `<b>${escapeHtml(k)}:</b> ${escapeHtml(v!)}`)];
    if (link) body.push(`<a href="${escapeHtml(link)}">${escapeHtml(link)}</a>`);
    const text = body.join('\n');
    const results = await Promise.all(this.chatIds.map((chatId) => this.post(chatId, text)));
    return results.some(Boolean);
  }

  private async post(chatId: string, text: string): Promise<boolean> {
    try {
      const res = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) log('warn', 'telegram_send_failed', { status: res.status, chatId });
      return res.ok;
    } catch (e) {
      log('warn', 'telegram_send_failed', { chatId, error: e instanceof Error ? e.message : String(e) });
      return false;
    }
  }
}
