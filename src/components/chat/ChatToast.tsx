import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { useUnreadMessages } from '@/lib/contexts/unread-messages-context';
import { useAuth } from '@/lib/contexts/auth-context';

export function ChatToast() {
  const { t } = useTranslation();
  const { toast, dismissToast } = useUnreadMessages();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!toast) return null;

  const handleClick = () => {
    dismissToast();
    navigate(`/groups/${toast.groupId}/chat`);
  };

  const isSystem = toast.isSystemMessage;

  // For system messages, show group name as title; for user messages, show "sender from group"
  const title = isSystem
    ? toast.groupName
    : toast.groupName
      ? t('chat.messageFrom', { sender: toast.senderName, group: toast.groupName })
      : toast.senderName;

  // For system messages, translate the content key with basic attachment data
  let content = toast.content;
  if (isSystem && toast.content.startsWith('system.')) {
    const a = (toast.attachments as Record<string, unknown>) || {};
    const you = t('common.you');
    const nameOrYou = (name: unknown, id: unknown) =>
      user?.id && id === user.id ? you : String(name || '');
    const translated = t(toast.content, {
      userName: a.userName || toast.senderName || '',
      taskTitle: a.taskTitle || '',
      assigneeName: nameOrYou(a.assigneeName, a.assigneeId),
      targetUserName: nameOrYou(a.targetUserName, a.targetUserId),
      newRole: a.newRole || '',
    });
    if (translated !== toast.content) content = translated;
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex justify-center">
    <div
      className="pointer-events-auto w-96 max-w-[calc(100vw-2rem)] animate-[slide-in-down_0.3s_ease-out] cursor-pointer rounded-(--radius-card) border border-(--el-card-border) bg-(--el-card-bg) shadow-(--shadow-elevated) transition-opacity hover:opacity-95"
      onClick={handleClick}
      data-testid="chat-toast"
    >
      <div className="flex items-start gap-3 p-3">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${isSystem ? 'bg-secondary text-secondary-foreground' : 'bg-(--el-chat-avatar-bg) text-(--el-chat-avatar-text)'}`}>
          <Icon name={isSystem ? 'notifications' : 'chat'} size={18} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-(--el-page-text)">{title}</p>
          <p className="line-clamp-2 text-sm text-(--el-chat-timestamp)">{content}</p>
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            dismissToast();
          }}
          className="shrink-0 rounded p-0.5 text-(--el-chat-timestamp) hover:text-(--el-page-text)"
        >
          <Icon name="close" size={16} />
        </button>
      </div>
    </div>
    </div>
  );
}
