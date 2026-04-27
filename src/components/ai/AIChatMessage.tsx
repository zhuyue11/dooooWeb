import type { ChatMessage } from '@/types/ai';

interface AIChatMessageProps {
  message: ChatMessage;
}

export function AIChatMessage({ message }: AIChatMessageProps) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end" data-testid="ai-chat-message">
        <div className="max-w-[75%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2.5 text-primary-foreground">
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.text}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start" data-testid="ai-chat-message">
      <div className="max-w-[75%] rounded-2xl rounded-bl-sm bg-surface px-3.5 py-2.5">
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">{message.text}</p>
      </div>
    </div>
  );
}
