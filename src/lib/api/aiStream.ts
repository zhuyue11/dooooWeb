import { CONFIG, STORAGE_KEYS } from '../config';
import type { ChatMessage, StreamOptions, StreamCallbacks } from '@/types/ai';

/**
 * Streams an AI chat response via Server-Sent Events.
 *
 * Uses native fetch() (not Axios) because Axios does not support ReadableStream.
 * Matches dooooApp's aiService.ts streaming implementation.
 */
export async function streamAIChatResponse(
  messages: ChatMessage[],
  options: StreamOptions = {},
  callbacks: StreamCallbacks,
): Promise<void> {
  const token = localStorage.getItem(STORAGE_KEYS.AUTH_TOKEN);

  const apiMessages = messages.map(m => ({ role: m.role, text: m.text }));

  let response: Response;
  try {
    response = await fetch(`${CONFIG.API_BASE_URL}/api/ai/chat/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        targetId: options.targetId,
        targetName: options.targetName,
        targetDescription: options.targetDescription,
        messages: apiMessages,
        language: options.language,
        timezone: options.timezone,
        useHighQuality: options.useHighQuality,
        sessionId: options.sessionId,
      }),
      signal: options.signal,
    });
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') return;
    callbacks.onError('Failed to connect to AI service');
    return;
  }

  if (!response.ok) {
    const statusMap: Record<number, string> = {
      401: 'Unauthorized',
      429: 'Too many requests. Please wait a moment.',
      503: 'AI service is currently unavailable.',
      504: 'The AI is taking too long. Please try again.',
    };
    callbacks.onError(statusMap[response.status] || 'Failed to connect to AI service');
    return;
  }

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const event = JSON.parse(line.slice(6));
          if (event.type === 'text_delta') callbacks.onTextDelta(event.text);
          else if (event.type === 'generating_plan') callbacks.onGeneratingPlan();
          else if (event.type === 'updating_plan') callbacks.onUpdatingPlan();
          else if (event.type === 'plan') callbacks.onPlan(event.plan);
          else if (event.type === 'plan_update') callbacks.onPlanUpdate(event.plan);
          else if (event.type === 'recommended_plan') callbacks.onRecommendedPlan(event.plan);
          else if (event.type === 'target_proposal') callbacks.onTargetProposal?.(event.proposal);
          else if (event.type === 'base_plan_proposal') callbacks.onBasePlanProposal?.(event.proposal);
          else if (event.type === 'target_created') callbacks.onTargetCreated?.(event.target);
          else if (event.type === 'off_topic') callbacks.onOffTopic();
          else if (event.type === 'error') callbacks.onError(event.error);
          else if (event.type === 'done') callbacks.onDone();
        } catch {
          // Skip malformed SSE lines
        }
      }
    }
  } catch (err: unknown) {
    if (err instanceof DOMException && err.name === 'AbortError') return;
    throw err;
  }
}
