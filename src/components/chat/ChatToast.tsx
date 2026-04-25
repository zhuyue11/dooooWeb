import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { useUnreadMessages } from '@/lib/contexts/unread-messages-context';

export function ChatToast() {
  const { t } = useTranslation();
  const { toast, dismissToast } = useUnreadMessages();
  const navigate = useNavigate();

  if (!toast) return null;

  const handleClick = () => {
    dismissToast();
    navigate(`/groups/${toast.groupId}/chat`);
  };

  const title = toast.groupName
    ? t('chat.messageFrom', { sender: toast.senderName, group: toast.groupName })
    : toast.senderName;

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex justify-center">
    <div
      className="pointer-events-auto w-96 max-w-[calc(100vw-2rem)] animate-[slide-in-down_0.3s_ease-out] cursor-pointer rounded-xl border border-border bg-surface shadow-lg transition-opacity hover:opacity-95"
      onClick={handleClick}
      data-testid="chat-toast"
    >
      <div className="flex items-start gap-3 p-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
          <Icon name="chat" size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{title}</p>
          <p className="line-clamp-2 text-sm text-muted-foreground">{toast.content}</p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            dismissToast();
          }}
          className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
        >
          <Icon name="close" size={16} />
        </button>
      </div>
    </div>
    </div>
  );
}
