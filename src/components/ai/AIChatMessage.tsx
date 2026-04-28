import type { ChatMessage } from '@/types/ai';

interface AIChatMessageProps {
  message: ChatMessage;
}

export function AIChatMessage({ message }: AIChatMessageProps) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end" data-testid="ai-chat-message">
        <div className="max-w-[75%] rounded-(--radius-card) rounded-br-sm bg-(--el-ai-user-bg) px-3.5 py-2.5 text-(--el-ai-user-text)">
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{message.text}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start" data-testid="ai-chat-message">
      <div className="max-w-[75%] rounded-(--radius-card) rounded-bl-sm bg-(--el-ai-msg-bg) px-3.5 py-2.5">
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-(--el-ai-msg-text)">{message.text}</p>
      </div>
    </div>
  );
}
