import { useCallback, useRef, type KeyboardEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';

interface AIChatInputBarProps {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
}

const MAX_LENGTH = 500;

export function AIChatInputBar({ value, onChange, onSend, disabled }: AIChatInputBarProps) {
  const { t } = useTranslation();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const canSend = value.trim().length > 0 && !disabled;

  const handleSend = useCallback(() => {
    if (!canSend) return;
    onSend();
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  }, [canSend, onSend]);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend],
  );

  const handleInput = useCallback(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
  }, []);

  return (
    <div className="flex items-end gap-2 border-t border-(--el-card-border) bg-background px-3 py-2" data-testid="ai-chat-input-bar">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={(e) => onChange(e.target.value.slice(0, MAX_LENGTH))}
        onKeyDown={handleKeyDown}
        onInput={handleInput}
        placeholder={t('aiChat.typeMessage')}
        rows={1}
        disabled={disabled}
        className="flex-1 resize-none bg-transparent py-2 text-sm text-(--el-input-text) placeholder:text-(--el-input-placeholder) focus:outline-none"
        data-testid="ai-chat-input"
      />
      <button
        onClick={handleSend}
        disabled={!canSend}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-(--el-btn-primary-bg) text-(--el-btn-primary-text) transition-opacity disabled:opacity-40"
        data-testid="ai-chat-send-button"
      >
        <Icon name="send" size={20} />
      </button>
    </div>
  );
}
