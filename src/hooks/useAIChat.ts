import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useQueryClient } from '@tanstack/react-query';
import { useLanguage } from '@/lib/contexts/language-context';
import { streamAIChatResponse } from '@/lib/api/aiStream';
import {
  getActiveAISession,
  getAISession,
  createAISession,
  saveAISessionMessages,
  deleteAISession,
  getTargets,
} from '@/lib/api';
import type {
  ChatMessage,
  AISavedPlan,
  AIRecommendedPlan,
  ProposalPayload,
  PlanningSession,
} from '@/types/ai';

const RESUME_PROMPT_ID = '__resume_prompt__';
const OFF_TOPIC_REPLY_ID = '__off_topic_reply__';

export { RESUME_PROMPT_ID, OFF_TOPIC_REPLY_ID };

interface UseAIChatOptions {
  targetId?: string;
  targetName?: string;
}

export function useAIChat({ targetId, targetName }: UseAIChatOptions) {
  const { t } = useTranslation();
  const { language: resolvedLanguage } = useLanguage();
  const queryClient = useQueryClient();
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  // Chat state
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [isGeneratingPlan, setIsGeneratingPlan] = useState(false);
  const [isUpdatingPlan, setIsUpdatingPlan] = useState(false);
  const [planGenerated, setPlanGenerated] = useState(false);
  const [isAwaitingGreeting, setIsAwaitingGreeting] = useState(true);
  const [isOffTopic, setIsOffTopic] = useState(false);

  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);
  const [showStartOverConfirm, setShowStartOverConfirm] = useState(false);
  const [showChatHistory, setShowChatHistory] = useState(false);

  // Refs
  const messagesRef = useRef<ChatMessage[]>([]);
  const pendingResumeSessionRef = useRef<PlanningSession | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const needsInitialScrollRef = useRef(true);

  // Keep messagesRef in sync
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Abort in-progress stream on unmount
  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  // Save messages to backend (fire-and-forget)
  const saveMessagesToBackend = useCallback((currentSessionId: string, msgs: ChatMessage[]) => {
    if (!currentSessionId || msgs.length === 0) return;
    const persistable = msgs.filter(
      m => (m.text !== '' || m.planAction || m.proposal) &&
        m.id !== RESUME_PROMPT_ID &&
        m.id !== OFF_TOPIC_REPLY_ID,
    );
    if (persistable.length === 0) return;
    saveAISessionMessages(currentSessionId, persistable).catch((err) => {
      console.error('Failed to save session messages:', err);
    });
  }, []);

  // Context matching — does the existing session match current navigation params?
  const contextMatches = useCallback((session: PlanningSession): boolean => {
    if (targetId) return session.targetId === targetId;
    if (!targetId && !targetName) return !session.targetId;
    if (targetName) return session.targetName === targetName;
    return false;
  }, [targetId, targetName]);

  // Resume an existing session
  const resumeSession = useCallback((session: PlanningSession) => {
    setSessionId(session.id);
    setMessages(session.messages as ChatMessage[]);
    setPlanGenerated(session.planGenerated || session.planRecommended);
    setIsAwaitingGreeting(false);
    setIsLoadingSession(false);
    needsInitialScrollRef.current = true;
  }, []);

  // Helper: stream an AI response and update a placeholder message progressively
  const streamResponse = useCallback(async (
    chatMessages: ChatMessage[],
    placeholderId: string,
    options: {
      targetId?: string;
      targetName?: string;
      language?: string;
      timezone?: string;
      useHighQuality?: boolean;
      sessionId?: string;
    },
  ) => {
    // Abort any previous stream
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    let accumulatedText = '';
    let turnEmittedStructuredEvent = false;

    await streamAIChatResponse(chatMessages, { ...options, signal: controller.signal }, {
      onTextDelta: (text) => {
        accumulatedText += text;
        const currentText = accumulatedText;
        setMessages(prev => prev.map(m =>
          m.id === placeholderId ? { ...m, text: currentText } : m,
        ));
        setIsThinking(false);
      },
      onGeneratingPlan: () => {
        setIsGeneratingPlan(true);
        setIsUpdatingPlan(false);
      },
      onUpdatingPlan: () => {
        setIsUpdatingPlan(true);
        setIsGeneratingPlan(false);
      },
      onPlan: (plan: AISavedPlan) => {
        turnEmittedStructuredEvent = true;
        setIsGeneratingPlan(false);
        const confirmSuffix = `\n\n✅ "${plan.planName}" — ${plan.templateCount} tasks`;
        setMessages(prev => {
          const updated = prev.map(m =>
            m.id === placeholderId ? { ...m, text: (m.text || accumulatedText) + confirmSuffix } : m,
          );
          return [...updated, {
            id: `plan_${Date.now()}`,
            role: 'assistant' as const,
            text: '',
            planAction: { type: 'generated' as const, planName: plan.planName, planId: plan.planId },
          }];
        });
        setPlanGenerated(true);
        queryClient.invalidateQueries({ queryKey: ['plans'] });
        queryClient.invalidateQueries({ queryKey: ['planExecutions'] });
      },
      onPlanUpdate: (plan: AISavedPlan) => {
        turnEmittedStructuredEvent = true;
        setIsUpdatingPlan(false);
        const confirmSuffix = `\n\n🔄 "${plan.planName}" — ${plan.templateCount} tasks`;
        setMessages(prev => {
          const updated = prev.map(m =>
            m.id === placeholderId ? { ...m, text: (m.text || accumulatedText) + confirmSuffix } : m,
          );
          return [...updated, {
            id: `plan_${Date.now()}`,
            role: 'assistant' as const,
            text: '',
            planAction: { type: 'generated' as const, planName: plan.planName, planId: plan.planId },
          }];
        });
        queryClient.invalidateQueries({ queryKey: ['plans'] });
      },
      onRecommendedPlan: (plan: AIRecommendedPlan) => {
        turnEmittedStructuredEvent = true;
        setIsThinking(false);
        setPlanGenerated(true);
        setMessages(prev => [...prev, {
          id: `plan_${Date.now()}`,
          role: 'assistant' as const,
          text: '',
          planAction: { type: 'recommended' as const, planName: plan.name, planId: plan.id },
        }]);
      },
      onTargetProposal: (proposal: ProposalPayload) => {
        turnEmittedStructuredEvent = true;
        setIsThinking(false);
        setMessages(prev => [...prev, {
          id: `target_proposal_${Date.now()}`,
          role: 'assistant' as const,
          text: '',
          proposal: {
            kind: 'target' as const,
            name: proposal.name,
            description: proposal.description,
            status: 'pending' as const,
          },
        }]);
      },
      onBasePlanProposal: (proposal: ProposalPayload) => {
        turnEmittedStructuredEvent = true;
        setIsThinking(false);
        setMessages(prev => [...prev, {
          id: `base_plan_proposal_${Date.now()}`,
          role: 'assistant' as const,
          text: '',
          proposal: {
            kind: 'base_plan' as const,
            name: proposal.name,
            description: proposal.description,
            status: 'pending' as const,
          },
        }]);
      },
      onTargetCreated: async () => {
        // Web is online-only — no local SQLite to mirror.
        // Just invalidate React Query cache so target list refreshes.
        turnEmittedStructuredEvent = true;
        await queryClient.invalidateQueries({ queryKey: ['targets'] });
      },
      onOffTopic: () => {
        turnEmittedStructuredEvent = true;
        setIsOffTopic(true);
      },
      onError: (error) => {
        turnEmittedStructuredEvent = true;
        setMessages(prev => prev.map(m =>
          m.id === placeholderId ? { ...m, text: error } : m,
        ));
        setIsThinking(false);
        setIsGeneratingPlan(false);
        setIsUpdatingPlan(false);
      },
      onDone: () => {
        setIsThinking(false);
        setIsGeneratingPlan(false);
        setIsUpdatingPlan(false);
        // Greeting fallback — only when no text AND no structured events
        if (!accumulatedText && !turnEmittedStructuredEvent) {
          setMessages(prev => prev.map(m =>
            m.id === placeholderId && !m.text
              ? { ...m, text: t('aiChat.aiGreetingFallback') }
              : m,
          ));
        }
      },
    });
  }, [t, queryClient]);

  // Start a fresh conversation — stream greeting, no backend session yet
  const startFreshSession = useCallback(async () => {
    const placeholderId = Date.now().toString();
    setMessages([{ id: placeholderId, role: 'assistant', text: '' }]);
    try {
      await streamResponse([], placeholderId, {
        targetId,
        targetName,
        language: resolvedLanguage,
        timezone,
      });
    } catch {
      setMessages([{
        id: placeholderId,
        role: 'assistant',
        text: t('aiChat.aiGreetingFallback'),
      }]);
    } finally {
      setIsAwaitingGreeting(false);
      setIsLoadingSession(false);
    }
  }, [targetId, targetName, resolvedLanguage, timezone, streamResponse, t]);

  // Lazy session creation (first user message)
  const ensureSession = useCallback(async (): Promise<string | null> => {
    if (sessionId) return sessionId;
    try {
      const newSession = await createAISession({
        targetId,
        targetName,
        language: resolvedLanguage,
        timezone,
      });
      setSessionId(newSession.id);
      return newSession.id;
    } catch (error) {
      console.error('Failed to create session:', error);
      return null;
    }
  }, [sessionId, targetId, targetName, resolvedLanguage, timezone]);

  // Check for targets helper (web uses API, not SQLite)
  const checkHasTargets = useCallback(async (): Promise<boolean> => {
    try {
      const targets = await getTargets();
      return targets.length > 0;
    } catch {
      return false;
    }
  }, []);

  // Session initialization
  useEffect(() => {
    const initSession = async () => {
      setIsLoadingSession(true);
      try {
        const existingSession = await getActiveAISession();

        if (existingSession) {
          if (existingSession.isOffTopic) {
            deleteAISession(existingSession.id).catch(() => {});
            startFreshSession();
          } else if (contextMatches(existingSession)) {
            resumeSession(existingSession);
          } else {
            // Context differs — show inline resume prompt
            pendingResumeSessionRef.current = existingSession;
            const promptText = existingSession.targetName
              ? t('aiChat.resumeSessionMessage', { target: existingSession.targetName })
              : t('aiChat.resumeSessionMessageNoTarget');
            setMessages([{
              id: RESUME_PROMPT_ID,
              role: 'assistant',
              text: promptText,
            }]);
            setIsAwaitingGreeting(false);
            setIsLoadingSession(false);
          }
        } else {
          const hasTargets = await checkHasTargets();
          if (!hasTargets) {
            setMessages([{
              id: Date.now().toString(),
              role: 'assistant',
              text: t('aiChat.aiWelcomeNoTarget'),
            }]);
            setIsAwaitingGreeting(false);
            setIsLoadingSession(false);
          } else {
            startFreshSession();
          }
        }
      } catch {
        startFreshSession();
      }
    };
    initSession();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Send user message
  const handleSend = useCallback(async () => {
    const text = inputText.trim();
    if (!text || isThinking) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text,
    };

    // Off-topic: show canned reply, no backend call
    if (isOffTopic) {
      const offTopicReply: ChatMessage = {
        id: OFF_TOPIC_REPLY_ID,
        role: 'assistant',
        text: t('aiChat.offTopicReply'),
      };
      setMessages(prev => [...prev.filter(m => m.id !== OFF_TOPIC_REPLY_ID), userMessage, offTopicReply]);
      setInputText('');
      return;
    }

    const placeholderId = (Date.now() + 1).toString();
    const placeholder: ChatMessage = {
      id: placeholderId,
      role: 'assistant',
      text: '',
    };

    const updatedMessages = [...messages, userMessage];
    setMessages([...updatedMessages, placeholder]);
    setInputText('');

    const currentSessionId = await ensureSession();
    if (currentSessionId) {
      saveMessagesToBackend(currentSessionId, updatedMessages);
    }

    setIsThinking(true);
    try {
      // High-quality retry detection
      const lastMsg = text.toLowerCase();
      const isRetryRequest = planGenerated && /\b(try again|retry|better|not good|redo|regenerate|improve)\b/i.test(lastMsg);

      await streamResponse(updatedMessages, placeholderId, {
        targetId,
        targetName,
        language: resolvedLanguage,
        timezone,
        useHighQuality: isRetryRequest,
        sessionId: currentSessionId || undefined,
      });

      // Save after stream completes
      if (currentSessionId) {
        setTimeout(() => {
          saveMessagesToBackend(currentSessionId, messagesRef.current);
        }, 100);
      }
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === placeholderId
          ? { ...m, text: t('aiChat.aiError') }
          : m,
      ));
      setIsThinking(false);
    }
  }, [inputText, isThinking, isOffTopic, messages, planGenerated, targetId, targetName, resolvedLanguage, timezone, t, ensureSession, streamResponse, saveMessagesToBackend]);

  // Proposal response (confirm/decline)
  const handleProposalResponse = useCallback(async (
    proposalMessageId: string,
    choice: 'confirm' | 'decline',
  ) => {
    if (isThinking) return;

    let proposalSnapshot: { kind: 'target' | 'base_plan'; name: string; description?: string } | null = null;
    const nextMessages = messagesRef.current.map(m => {
      if (m.id === proposalMessageId && m.proposal) {
        proposalSnapshot = {
          kind: m.proposal.kind,
          name: m.proposal.name,
          description: m.proposal.description,
        };
        return { ...m, proposal: { ...m.proposal, status: choice === 'confirm' ? 'confirmed' as const : 'declined' as const } };
      }
      return m;
    });

    if (!proposalSnapshot) return;
    const snapshot = proposalSnapshot as { kind: 'target' | 'base_plan'; name: string; description?: string };

    let syntheticText: string;
    if (choice === 'confirm' && snapshot.kind === 'target') {
      const descPart = snapshot.description ? ` description="${snapshot.description}"` : '';
      syntheticText = `[Confirm] Create the target with name="${snapshot.name}"${descPart}`;
    } else if (choice === 'confirm' && snapshot.kind === 'base_plan') {
      syntheticText = `[Confirm] Proceed with the base plan "${snapshot.name}"`;
    } else if (choice === 'decline' && snapshot.kind === 'target') {
      syntheticText = `[Decline] I don't want to save "${snapshot.name}" as a target. Ask me what I'd like to do instead — I might want a different target, no target at all, or a completely different goal.`;
    } else {
      syntheticText = `[Decline] The base plan scope "${snapshot.name}" doesn't work for me. Ask me what I'd like to adjust.`;
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: syntheticText,
    };

    const placeholderId = (Date.now() + 1).toString();
    const placeholder: ChatMessage = {
      id: placeholderId,
      role: 'assistant',
      text: '',
    };

    const updatedMessages = [...nextMessages, userMessage];
    setMessages([...updatedMessages, placeholder]);

    const currentSessionId = await ensureSession();
    if (currentSessionId) {
      saveMessagesToBackend(currentSessionId, updatedMessages);
    }

    setIsThinking(true);
    try {
      await streamResponse(updatedMessages, placeholderId, {
        targetId,
        targetName,
        language: resolvedLanguage,
        timezone,
        sessionId: currentSessionId || undefined,
      });
      if (currentSessionId) {
        setTimeout(() => {
          saveMessagesToBackend(currentSessionId, messagesRef.current);
        }, 100);
      }
    } catch {
      setMessages(prev => prev.map(m =>
        m.id === placeholderId
          ? { ...m, text: t('aiChat.aiError') }
          : m,
      ));
      setIsThinking(false);
    }
  }, [isThinking, targetId, targetName, resolvedLanguage, timezone, t, ensureSession, streamResponse, saveMessagesToBackend]);

  // Start Over
  const handleStartOver = useCallback(() => {
    setShowStartOverConfirm(true);
  }, []);

  const confirmStartOver = useCallback(() => {
    setShowStartOverConfirm(false);
    setMessages([]);
    setPlanGenerated(false);
    setIsAwaitingGreeting(true);
    setIsOffTopic(false);
    setSessionId(null);
    needsInitialScrollRef.current = true;
    startFreshSession();
  }, [startFreshSession]);

  const cancelStartOver = useCallback(() => {
    setShowStartOverConfirm(false);
  }, []);

  // Resume prompt choice
  const handleResumeChoice = useCallback((choice: 'resume' | 'start_new') => {
    const session = pendingResumeSessionRef.current;
    pendingResumeSessionRef.current = null;
    setMessages([]);

    if (choice === 'resume' && session) {
      resumeSession(session);
    } else {
      setIsAwaitingGreeting(true);
      startFreshSession();
    }
  }, [resumeSession, startFreshSession]);

  // Select session from history
  const handleSelectSession = useCallback(async (selectedSessionId: string) => {
    setShowChatHistory(false);
    if (selectedSessionId === sessionId) return;

    setIsLoadingSession(true);
    try {
      const session = await getAISession(selectedSessionId);
      if (session) {
        resumeSession(session);
      } else {
        setIsLoadingSession(false);
      }
    } catch {
      setIsLoadingSession(false);
    }
  }, [sessionId, resumeSession]);

  // Start new chat from history panel
  const handleStartNewChat = useCallback(async () => {
    setShowChatHistory(false);
    setMessages([]);
    setPlanGenerated(false);
    setIsAwaitingGreeting(true);
    setIsOffTopic(false);
    setSessionId(null);
    needsInitialScrollRef.current = true;

    const hasTargets = await checkHasTargets();
    if (!hasTargets) {
      setMessages([{
        id: Date.now().toString(),
        role: 'assistant',
        text: t('aiChat.aiWelcomeNoTarget'),
      }]);
      setIsAwaitingGreeting(false);
      setIsLoadingSession(false);
    } else {
      startFreshSession();
    }
  }, [checkHasTargets, startFreshSession, t]);

  return {
    // State
    messages,
    inputText,
    setInputText,
    isThinking,
    isGeneratingPlan,
    isUpdatingPlan,
    isAwaitingGreeting,
    isLoadingSession,
    isOffTopic,
    planGenerated,
    sessionId,
    showStartOverConfirm,
    showChatHistory,
    setShowChatHistory,
    needsInitialScrollRef,

    // Handlers
    handleSend,
    handleStartOver,
    confirmStartOver,
    cancelStartOver,
    handleResumeChoice,
    handleSelectSession,
    handleStartNewChat,
    handleProposalResponse,
  };
}
