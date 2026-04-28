import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';

interface OffTopicPromptProps {
  message: string;
  onStartOver: () => void;
}

export function OffTopicPrompt({ message, onStartOver }: OffTopicPromptProps) {
  const { t } = useTranslation();

  return (
    <div className="flex gap-2.5" data-testid="off-topic-prompt">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Icon name="auto_awesome" size={18} color="var(--color-primary)" />
      </div>
      <div className="max-w-[75%] rounded-(--radius-card) rounded-bl-sm bg-surface px-3.5 py-2.5">
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">{message}</p>
        <div className="mt-3">
          <button
            type="button"
            onClick={onStartOver}
            className="rounded-(--radius-btn) bg-primary px-(--spacing-btn-x) py-(--spacing-btn-y) text-xs font-medium text-primary-foreground hover:opacity-90"
            data-testid="off-topic-start-over"
          >
            {t('aiChat.startOver')}
          </button>
        </div>
      </div>
    </div>
  );
}
