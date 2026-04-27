import type { Target } from './target';

// ===== Chat Message Types =====

export type ProposalStatus = 'pending' | 'confirmed' | 'declined';

export interface ChatProposal {
  kind: 'target' | 'base_plan';
  name: string;
  description?: string;
  status: ProposalStatus;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  planAction?: {
    type: 'generated' | 'recommended';
    planName: string;
    planId: string;
  };
  proposal?: ChatProposal;
}

// ===== AI Plan Types =====

export interface AISavedPlan {
  planId: string;
  planName: string;
  templateCount: number;
}

export interface AIRecommendedPlan {
  id: string;
  name: string;
  description?: string | null;
  taskTemplates?: Array<{
    id: string;
    planId: string;
    title: string;
    description?: string | null;
    priority?: string;
    duration?: number | null;
    time?: string | null;
    repeat?: string | null;
    orderIndex: number;
    gapDays: number;
    createdAt: string;
    updatedAt: string;
  }>;
}

export interface ProposalPayload {
  name: string;
  description?: string;
}

// ===== Streaming Types =====

export interface StreamCallbacks {
  onTextDelta: (text: string) => void;
  onGeneratingPlan: () => void;
  onUpdatingPlan: () => void;
  onPlan: (plan: AISavedPlan) => void;
  onPlanUpdate: (plan: AISavedPlan) => void;
  onRecommendedPlan: (plan: AIRecommendedPlan) => void;
  onTargetProposal?: (proposal: ProposalPayload) => void;
  onBasePlanProposal?: (proposal: ProposalPayload) => void;
  onTargetCreated?: (target: Target) => void;
  onOffTopic: () => void;
  onError: (error: string) => void;
  onDone: () => void;
}

export interface StreamOptions {
  targetId?: string;
  targetName?: string;
  targetDescription?: string;
  language?: string;
  timezone?: string;
  useHighQuality?: boolean;
  sessionId?: string;
  signal?: AbortSignal;
}

// ===== Planning Session Types =====

export interface PlanningSessionMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
}

export type PlanningSessionStatus =
  | 'ACTIVE'
  | 'PLAN_GENERATED'
  | 'PLAN_RECOMMENDED'
  | 'COMPLETED'
  | 'SUPERSEDED';

export interface PlanningSessionListItem {
  id: string;
  status: 'ACTIVE' | 'PLAN_GENERATED' | 'PLAN_RECOMMENDED' | 'COMPLETED';
  targetId: string | null;
  targetName: string | null;
  planGenerated: boolean;
  planRecommended: boolean;
  planName: string | null;
  messagePreview: string | null;
  messageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface PlanningSession {
  id: string;
  userId: string;
  status: PlanningSessionStatus;
  targetId: string | null;
  targetName: string | null;
  activeTargets: Array<{ id: string; name: string }> | null;
  messages: PlanningSessionMessage[];
  planGenerated: boolean;
  generatedPlanId: string | null;
  planRecommended: boolean;
  recommendedPlanId: string | null;
  isOffTopic: boolean;
  language: string | null;
  timezone: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateSessionRequest {
  targetId?: string;
  targetName?: string;
  language?: string;
  timezone?: string;
}

export interface SaveMessagesRequest {
  messages: Array<{ id: string; role: string; text: string }>;
}
