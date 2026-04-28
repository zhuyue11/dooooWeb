import { useState, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { listAISessions } from '@/lib/api';
import { formatTimeAgo } from '@/lib/timeAgo';
import type { PlanningSessionListItem } from '@/types/ai';

interface ChatHistoryPanelProps {
  open: boolean;
  onClose: () => void;
  onSelectSession: (sessionId: string) => void;
  onStartNewChat: () => void;
  currentSessionId: string | null;
}

export function ChatHistoryPanel({
  open,
  onClose,
  onSelectSession,
  onStartNewChat,
  currentSessionId,
}: ChatHistoryPanelProps) {
  const { t } = useTranslation();
  const [sessions, setSessions] = useState<PlanningSessionListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  // Fetch sessions when panel opens
  useEffect(() => {
    if (!open) return;
    setIsLoading(true);
    listAISessions()
      .then(setSessions)
      .catch(() => setSessions([]))
      .finally(() => setIsLoading(false));
  }, [open]);

  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [open, handleClose]);

  if (!open && !isClosing) return null;

  const getStatusBadge = (session: PlanningSessionListItem) => {
    if (session.status === 'PLAN_GENERATED' || session.status === 'PLAN_RECOMMENDED') {
      return (
        <span className="rounded-full bg-(--el-ai-session-bg) px-2 py-0.5 text-[10px] font-semibold text-(--el-ai-session-text)">
          {t('aiChat.planReady')}
        </span>
      );
    }
    if (session.status === 'COMPLETED') {
      return (
        <span className="rounded-full bg-(--el-ai-session-bg) px-2 py-0.5 text-[10px] font-semibold text-(--el-ai-session-text)">
          {t('targetPlan.completed')}
        </span>
      );
    }
    return null;
  };

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex justify-end"
      onClick={handleClose}
    >
      {/* Backdrop */}
      <div className={`absolute inset-0 bg-(--el-dialog-overlay) ${isClosing ? 'animate-backdrop-out' : 'animate-backdrop-in'}`} />

      {/* Panel */}
      <div
        className={`relative flex h-full w-80 max-w-full flex-col bg-(--el-card-bg) shadow-[-4px_0_16px_rgba(0,0,0,0.12)] ${isClosing ? 'animate-panel-out' : 'animate-panel-in'}`}
        style={{ borderLeft: '1px solid var(--el-card-border)' }}
        onClick={(e) => e.stopPropagation()}
        data-testid="chat-history-panel"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-(--el-card-border) px-4 py-3">
          <h2 className="text-base font-semibold text-(--el-page-text)">{t('aiChat.chatHistory')}</h2>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => { handleClose(); onStartNewChat(); }}
              className="flex h-8 w-8 items-center justify-center rounded-(--radius-card) text-(--el-chat-timestamp) hover:bg-(--el-popover-item-hover) hover:text-(--el-page-text)"
              title={t('aiChat.newChat')}
              data-testid="chat-history-new-chat"
            >
              <Icon name="edit_note" size={20} />
            </button>
            <button
              type="button"
              onClick={handleClose}
              className="flex h-8 w-8 items-center justify-center rounded-(--radius-card) text-(--el-chat-timestamp) hover:bg-(--el-popover-item-hover) hover:text-(--el-page-text)"
              data-testid="chat-history-close"
            >
              <Icon name="close" size={20} />
            </button>
          </div>
        </div>

        {/* Session list */}
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-(--el-ai-session-text) border-t-transparent" />
            </div>
          ) : sessions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Icon name="chat_bubble_outline" size={32} color="var(--el-chat-timestamp)" />
              <p className="mt-2 text-sm text-(--el-chat-timestamp)">{t('aiChat.noSessions')}</p>
            </div>
          ) : (
            sessions.map((session) => {
              const isCurrent = session.id === currentSessionId;
              const title = session.planName || session.targetName || t('aiChat.chatHistory');
              return (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => onSelectSession(session.id)}
                  className={`flex w-full flex-col gap-1 border-b border-(--el-card-border) px-4 py-3 text-left hover:bg-(--el-popover-item-hover) ${isCurrent ? 'border-l-2 border-l-(--el-ai-session-text) bg-(--el-ai-session-bg)' : ''}`}
                  data-testid="chat-history-item"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm font-medium text-(--el-page-text)">{title}</span>
                    <span className="shrink-0 text-[11px] text-(--el-chat-timestamp)">
                      {formatTimeAgo(session.updatedAt, t)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(session)}
                    {session.messagePreview && (
                      <span className="truncate text-xs text-(--el-chat-timestamp)">
                        {session.messagePreview}
                      </span>
                    )}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
