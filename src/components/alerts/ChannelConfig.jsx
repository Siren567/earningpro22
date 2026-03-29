import React, { useState } from 'react';
import { ChevronDown, ChevronUp, ExternalLink } from 'lucide-react';

const DISCORD_CONFIGURED = !!import.meta.env.VITE_DISCORD_WEBHOOK_URL;

export default function ChannelConfig({ discordConfigured, telegramConfigured }) {
  const [expanded, setExpanded] = useState(false);

  const anyMissing = !discordConfigured || !telegramConfigured;
  if (!anyMissing) return null;

  return (
    <div className="rounded-xl dark:bg-amber-500/[0.06] bg-amber-50 border dark:border-amber-500/20 border-amber-200 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="text-sm font-semibold dark:text-amber-400 text-amber-700">
          Setup required to receive notifications
        </span>
        {expanded
          ? <ChevronUp className="w-4 h-4 dark:text-amber-400 text-amber-600" />
          : <ChevronDown className="w-4 h-4 dark:text-amber-400 text-amber-600" />
        }
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-4 border-t dark:border-amber-500/10 border-amber-200 pt-3">
          {!discordConfigured && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide dark:text-gray-400 text-gray-600">Discord</p>
              <p className="text-xs dark:text-gray-400 text-gray-600">
                Add a secret named <code className="dark:bg-white/10 bg-gray-200 px-1.5 py-0.5 rounded text-xs font-mono">DISCORD_WEBHOOK_URL</code> in your app settings.
              </p>
              <p className="text-xs dark:text-gray-500 text-gray-500">
                Create one at: Discord channel → Edit → Integrations → Webhooks → New Webhook → Copy URL
              </p>
            </div>
          )}
          {!telegramConfigured && (
            <div className="space-y-1.5">
              <p className="text-xs font-semibold uppercase tracking-wide dark:text-gray-400 text-gray-600">Telegram</p>
              <p className="text-xs dark:text-gray-400 text-gray-600">
                Add two secrets:{' '}
                <code className="dark:bg-white/10 bg-gray-200 px-1.5 py-0.5 rounded text-xs font-mono">TELEGRAM_BOT_TOKEN</code>
                {' '}and{' '}
                <code className="dark:bg-white/10 bg-gray-200 px-1.5 py-0.5 rounded text-xs font-mono">TELEGRAM_CHAT_ID</code>
              </p>
              <p className="text-xs dark:text-gray-500 text-gray-500">
                Create a bot via @BotFather on Telegram, then get your chat ID from @userinfobot.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}