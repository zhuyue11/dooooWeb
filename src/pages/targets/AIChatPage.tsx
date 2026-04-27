import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { AIChatInputBar } from '@/components/ai/AIChatInputBar';
import { AIChatMessageList } from '@/components/ai/AIChatMessageList';
import { ChatHistoryPanel } from '@/components/ai/ChatHistoryPanel';
import { useAIChat } from '@/hooks/useAIChat';

export function AIChatPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetId = searchParams.get('targetId') || undefined;
  const targetName = searchParams.get('targetName') || undefined;

  const chat = useAIChat({ targetId, targetName });

  if (chat.isLoadingSession) {
    return (
      <div className="-m-4 flex h-full items-center justify-center lg:-m-6" data-testid="ai-chat-page">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="-m-4 flex h-full flex-col overflow-hidden lg:-m-6" data-testid="ai-chat-page">
      {/* Header */}
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-border px-3">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          data-testid="ai-chat-back"
        >
          <Icon name="arrow_back" size={20} />
        </button>

        <div className="flex items-center gap-1">
          {/* Start Over button — only show when there are messages */}
          {chat.messages.length > 0 && (
            <button
              type="button"
              onClick={chat.handleStartOver}
              className="flex h-8 items-center gap-1 rounded-lg px-2 text-muted-foreground hover:bg-muted hover:text-foreground"
              data-testid="ai-chat-start-over"
            >
              <Icon name="refresh" size={18} />
              <span className="text-xs font-medium">{t('aiChat.startOver')}</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => chat.setShowChatHistory(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
            data-testid="ai-chat-history-button"
          >
            <Icon name="segment" size={20} />
          </button>
        </div>
      </div>

      {/* Message list */}
      <AIChatMessageList
        messages={chat.messages}
        isAwaitingGreeting={chat.isAwaitingGreeting}
        isThinking={chat.isThinking}
        isGeneratingPlan={chat.isGeneratingPlan}
        isUpdatingPlan={chat.isUpdatingPlan}
        needsInitialScrollRef={chat.needsInitialScrollRef}
        onResumeChoice={chat.handleResumeChoice}
        onStartOver={chat.confirmStartOver}
        onProposalResponse={chat.handleProposalResponse}
        isStreamingDisabled={chat.isThinking}
      />

      {/* Input bar */}
      <AIChatInputBar
        value={chat.inputText}
        onChange={chat.setInputText}
        onSend={chat.handleSend}
        disabled={chat.isThinking || chat.isLoadingSession}
      />

      {/* Start Over confirmation dialog */}
      <ConfirmDialog
        open={chat.showStartOverConfirm}
        title={t('aiChat.startOver')}
        description={t('aiChat.startOverConfirm')}
        confirmLabel={t('aiChat.startOver')}
        variant="destructive"
        onConfirm={chat.confirmStartOver}
        onCancel={chat.cancelStartOver}
      />

      {/* Chat History panel */}
      <ChatHistoryPanel
        open={chat.showChatHistory}
        onClose={() => chat.setShowChatHistory(false)}
        onSelectSession={chat.handleSelectSession}
        onStartNewChat={chat.handleStartNewChat}
        currentSessionId={chat.sessionId}
      />
    </div>
  );
}
