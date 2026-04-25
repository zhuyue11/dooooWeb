import { useTranslation } from 'react-i18next';
import type { GroupMessage } from '@/types/api';

interface MessageBubbleProps {
  message: GroupMessage;
  isOwnMessage: boolean;
  groupColor?: string;
}

export function MessageBubble({ message, isOwnMessage, groupColor }: MessageBubbleProps) {
  const { t } = useTranslation();

  const time = new Date(message.createdAt).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

  const senderName = message.user?.name || message.user?.email || '';
  const initial = senderName.charAt(0).toUpperCase();

  if (isOwnMessage) {
    return (
      <div className="flex justify-end" data-testid="message-bubble">
        <div className="max-w-[70%] rounded-2xl rounded-br-md bg-primary px-3.5 py-2 text-primary-foreground">
          <p className="whitespace-pre-wrap break-words text-sm">{message.content}</p>
          <div className="mt-1 flex items-center justify-end gap-1.5">
            {message.isEdited && (
              <span className="text-[10px] italic opacity-70">{t('chat.edited')}</span>
            )}
            <span className="text-[10px] opacity-70">{time}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2" data-testid="message-bubble">
      <div
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
        style={{ backgroundColor: groupColor || 'var(--color-primary)' }}
      >
        {initial}
      </div>
      <div className="max-w-[70%] rounded-2xl rounded-bl-md bg-muted px-3.5 py-2">
        <p
          className="text-xs font-semibold"
          style={{ color: groupColor || 'var(--color-primary)' }}
        >
          {senderName}
        </p>
        <p className="whitespace-pre-wrap break-words text-sm text-foreground">{message.content}</p>
        <div className="mt-1 flex items-center gap-1.5">
          {message.isEdited && (
            <span className="text-[10px] italic text-muted-foreground">{t('chat.edited')}</span>
          )}
          <span className="text-[10px] text-muted-foreground">{time}</span>
        </div>
      </div>
    </div>
  );
}
