import { useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { AIChatMessage } from './AIChatMessage';
import { PulsingDots } from './PulsingDots';
import { ResumeSessionPrompt } from './ResumeSessionPrompt';
import { OffTopicPrompt } from './OffTopicPrompt';
import { RESUME_PROMPT_ID, OFF_TOPIC_REPLY_ID } from '@/hooks/useAIChat';
import type { ChatMessage } from '@/types/ai';

interface AIChatMessageListProps {
  messages: ChatMessage[];
  isAwaitingGreeting: boolean;
  isThinking: boolean;
  isGeneratingPlan: boolean;
  isUpdatingPlan: boolean;
  needsInitialScrollRef: React.MutableRefObject<boolean>;
  onResumeChoice: (choice: 'resume' | 'start_new') => void;
  onStartOver: () => void;
  onProposalResponse: (messageId: string, choice: 'confirm' | 'decline') => void;
  onViewPlan?: (planId: string, type: 'generated' | 'recommended') => void;
  onStartPlan?: (planId: string, planName: string) => void;
  isStreamingDisabled: boolean;
}

export function AIChatMessageList({
  messages,
  isAwaitingGreeting,
  isThinking,
  isGeneratingPlan,
  isUpdatingPlan,
  needsInitialScrollRef,
  onResumeChoice,
  onStartOver,
  onProposalResponse,
  onViewPlan,
  onStartPlan,
  isStreamingDisabled,
}: AIChatMessageListProps) {
  const { t } = useTranslation();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const isUserScrolledUpRef = useRef(false);
  const prevMessageCountRef = useRef(0);

  // Track user scroll position
  const handleScroll = useCallback(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isUserScrolledUpRef.current = distFromBottom > 100;
  }, []);

  // Auto-scroll to bottom
  const scrollToBottom = useCallback((instant = false) => {
    const el = scrollContainerRef.current;
    if (!el) return;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: instant ? 'instant' : 'smooth',
    });
  }, []);

  // Scroll on messages change
  useEffect(() => {
    if (isUserScrolledUpRef.current) return;

    if (needsInitialScrollRef.current) {
      needsInitialScrollRef.current = false;
      // Use rAF to ensure DOM has updated
      requestAnimationFrame(() => scrollToBottom(true));
    } else {
      requestAnimationFrame(() => scrollToBottom(false));
    }
  }, [messages, isThinking, isGeneratingPlan, isUpdatingPlan, scrollToBottom, needsInitialScrollRef]);

  // Force scroll when new messages are added (not just text delta updates)
  useEffect(() => {
    const currentCount = messages.length;
    if (currentCount > prevMessageCountRef.current) {
      isUserScrolledUpRef.current = false;
      requestAnimationFrame(() => scrollToBottom(false));
    }
    prevMessageCountRef.current = currentCount;
  }, [messages.length, scrollToBottom]);

  // Filter out empty placeholder messages that have no special content
  const visibleMessages = messages.filter(
    m => m.text !== '' || m.planAction || m.proposal || m.id === RESUME_PROMPT_ID || m.id === OFF_TOPIC_REPLY_ID,
  );

  const showThinkingIndicator = isThinking || isGeneratingPlan || isUpdatingPlan;

  return (
    <div
      ref={scrollContainerRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-4 py-4"
      data-testid="ai-chat-message-list"
    >
      <div className="mx-auto flex max-w-2xl flex-col gap-3">
        {visibleMessages.map((message) => {
          // Resume prompt
          if (message.id === RESUME_PROMPT_ID) {
            return (
              <ResumeSessionPrompt
                key={message.id}
                message={message.text}
                onResume={() => onResumeChoice('resume')}
                onStartNew={() => onResumeChoice('start_new')}
              />
            );
          }

          // Off-topic reply
          if (message.id === OFF_TOPIC_REPLY_ID) {
            return (
              <OffTopicPrompt
                key={message.id}
                message={message.text}
                onStartOver={onStartOver}
              />
            );
          }

          // Proposal card (placeholder for step 4.9)
          if (message.proposal) {
            const { proposal } = message;
            const isPending = proposal.status === 'pending';
            return (
              <div key={message.id} className="flex justify-start" data-testid="ai-proposal-card">
                <div className="max-w-[75%] rounded-(--radius-card) rounded-bl-sm border border-(--el-card-border) bg-(--el-ai-msg-bg) px-3.5 py-2.5">
                  <div className="mb-1 flex items-center gap-1.5">
                    <Icon
                      name={proposal.kind === 'target' ? 'flag' : 'assignment'}
                      size={16}
                      color="var(--el-ai-session-text)"
                    />
                    <span className="text-xs font-semibold text-(--el-ai-session-text)">
                      {proposal.kind === 'target' ? 'Target' : 'Plan Scope'}
                    </span>
                  </div>
                  <p className="text-sm font-medium text-(--el-ai-msg-text)">{proposal.name}</p>
                  {proposal.description && (
                    <p className="mt-1 text-xs text-(--el-chat-timestamp)">{proposal.description}</p>
                  )}
                  {isPending ? (
                    <div className="mt-2.5 flex gap-2">
                      <button
                        type="button"
                        onClick={() => onProposalResponse(message.id, 'decline')}
                        disabled={isStreamingDisabled}
                        className="rounded-(--radius-card) border border-(--el-card-border) px-3 py-1.5 text-xs font-medium text-(--el-ai-msg-text) hover:bg-(--el-popover-item-hover) disabled:opacity-50"
                      >
                        Decline
                      </button>
                      <button
                        type="button"
                        onClick={() => onProposalResponse(message.id, 'confirm')}
                        disabled={isStreamingDisabled}
                        className="rounded-(--radius-btn) bg-(--el-btn-primary-bg) px-(--spacing-btn-x) py-(--spacing-btn-y) text-xs font-medium text-(--el-btn-primary-text) hover:opacity-90 disabled:opacity-50"
                      >
                        Confirm
                      </button>
                    </div>
                  ) : (
                    <div className="mt-2 flex items-center gap-1.5">
                      <Icon
                        name={proposal.status === 'confirmed' ? 'check_circle' : 'cancel'}
                        size={14}
                        color={proposal.status === 'confirmed' ? '#22c55e' : 'var(--el-chat-timestamp)'}
                      />
                      <span className={`text-xs font-medium ${proposal.status === 'confirmed' ? 'text-(--el-ai-session-text)' : 'text-(--el-chat-timestamp)'}`}>
                        {proposal.status === 'confirmed' ? 'Confirmed' : 'Declined'}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          }

          // Plan action buttons
          if (message.planAction) {
            return (
              <div key={message.id} className="flex justify-start" data-testid="ai-plan-action">
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => onViewPlan?.(message.planAction!.planId, message.planAction!.type)}
                    className="flex items-center gap-1.5 rounded-(--radius-card) border border-(--el-card-border) bg-(--el-ai-msg-bg) px-3 py-2 text-sm font-medium text-(--el-ai-msg-text) hover:bg-(--el-popover-item-hover)"
                  >
                    <Icon name="visibility" size={16} color="var(--el-ai-session-text)" />
                    {t('aiChat.viewPlan')}
                  </button>
                  <button
                    type="button"
                    onClick={() => onStartPlan?.(message.planAction!.planId, message.planAction!.planName)}
                    className="flex items-center gap-1.5 rounded-(--radius-btn) bg-(--el-btn-primary-bg) px-(--spacing-btn-x) py-(--spacing-btn-y) text-sm font-medium text-(--el-btn-primary-text) hover:opacity-90"
                  >
                    <Icon name="play_arrow" size={16} />
                    {t('aiChat.startPlan')}
                  </button>
                </div>
              </div>
            );
          }

          // Regular message
          return <AIChatMessage key={message.id} message={message} />;
        })}

        {/* Typing / thinking indicator */}
        {isAwaitingGreeting && visibleMessages.length === 0 && (
          <div className="flex items-center gap-2.5 py-2" data-testid="ai-greeting-loading">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--el-ai-session-bg)">
              <Icon name="auto_awesome" size={18} color="var(--el-ai-session-text)" />
            </div>
            <PulsingDots />
          </div>
        )}

        {showThinkingIndicator && (
          <div className="flex items-center gap-2.5 py-2" data-testid="ai-thinking-indicator">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--el-ai-session-bg)">
              <Icon name="auto_awesome" size={18} color="var(--el-ai-session-text)" />
            </div>
            {(isGeneratingPlan || isUpdatingPlan) ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-(--el-ai-session-text) border-t-transparent" />
                <span className="text-xs text-(--el-chat-timestamp)">
                  {isUpdatingPlan ? t('aiChat.updatingPlan') : t('aiChat.generatingPlan')}
                </span>
              </div>
            ) : (
              <PulsingDots />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
