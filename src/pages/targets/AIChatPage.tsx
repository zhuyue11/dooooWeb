import { useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import { AIChatInputBar } from '@/components/ai/AIChatInputBar';
import { AIChatMessageList } from '@/components/ai/AIChatMessageList';
import { ChatHistoryPanel } from '@/components/ai/ChatHistoryPanel';
import { PlanPreviewPanel } from '@/components/ai/PlanPreviewPanel';
import { useAIChat } from '@/hooks/useAIChat';
import { getPlan, getPlanTemplates, getPublicPlan } from '@/lib/api';
import type { Plan, PlanTemplate } from '@/types/target';

export function AIChatPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const targetId = searchParams.get('targetId') || undefined;
  const targetName = searchParams.get('targetName') || undefined;

  const chat = useAIChat({ targetId, targetName });

  // Plan preview state
  const [planPreviewData, setPlanPreviewData] = useState<{ plan: Plan; templates: PlanTemplate[] } | null>(null);
  const [planPreviewLoading, setPlanPreviewLoading] = useState(false);
  const [showPlanPreview, setShowPlanPreview] = useState(false);

  const loadPlanPreview = useCallback(async (planId: string, type: 'generated' | 'recommended') => {
    // Cache hit — same planId already loaded, just show
    if (planPreviewData?.plan?.id === planId) {
      setShowPlanPreview(true);
      return;
    }
    setPlanPreviewLoading(true);
    setShowPlanPreview(true);
    try {
      if (type === 'recommended') {
        const planData = await getPublicPlan(planId);
        // Public plans include a flat templates array from the backend controller
        const templates: PlanTemplate[] = ((planData as Record<string, unknown>).templates as Array<Record<string, unknown>> || []).map((tmpl) => ({
          ...tmpl,
          type: (tmpl.type as string) || 'task',
          repeat: tmpl.repeat ?? undefined,
          description: tmpl.description ?? undefined,
        })) as PlanTemplate[];
        setPlanPreviewData({
          plan: {
            id: planData.id,
            name: planData.name,
            description: planData.description ?? undefined,
            isAiGenerated: planData.isAiGenerated,
            archetype: planData.archetype ?? null,
            createdAt: planData.createdAt,
            updatedAt: planData.updatedAt,
          },
          templates,
        });
      } else {
        const [planData, templateData] = await Promise.all([
          getPlan(planId),
          getPlanTemplates(planId),
        ]);
        setPlanPreviewData({ plan: planData, templates: templateData });
      }
    } catch (error) {
      console.error('Failed to load plan preview:', error);
      setShowPlanPreview(false);
    } finally {
      setPlanPreviewLoading(false);
    }
  }, [planPreviewData]);

  const handleStartPlan = useCallback((planId: string, _planName: string) => {
    navigate(`/plans/${planId}/start${targetId ? `?targetId=${targetId}` : ''}`);
  }, [navigate, targetId]);

  const handleStartPlanFromPreview = useCallback(() => {
    if (!planPreviewData) return;
    setShowPlanPreview(false);
    navigate(`/plans/${planPreviewData.plan.id}/start${targetId ? `?targetId=${targetId}` : ''}`);
  }, [planPreviewData, navigate, targetId]);

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
        onViewPlan={loadPlanPreview}
        onStartPlan={handleStartPlan}
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

      {/* Plan Preview panel */}
      <PlanPreviewPanel
        open={showPlanPreview}
        onClose={() => setShowPlanPreview(false)}
        plan={planPreviewData?.plan ?? null}
        templates={planPreviewData?.templates ?? []}
        loading={planPreviewLoading}
        onStartPlan={handleStartPlanFromPreview}
      />
    </div>
  );
}
