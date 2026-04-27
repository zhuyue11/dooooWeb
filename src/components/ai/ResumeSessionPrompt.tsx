import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';

interface ResumeSessionPromptProps {
  message: string;
  onResume: () => void;
  onStartNew: () => void;
}

export function ResumeSessionPrompt({ message, onResume, onStartNew }: ResumeSessionPromptProps) {
  const { t } = useTranslation();

  return (
    <div className="flex gap-2.5" data-testid="resume-session-prompt">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
        <Icon name="auto_awesome" size={18} color="var(--color-primary)" />
      </div>
      <div className="max-w-[75%] rounded-2xl rounded-bl-sm bg-surface px-3.5 py-2.5">
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-foreground">{message}</p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onStartNew}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
            data-testid="resume-start-new"
          >
            {t('aiChat.startNew')}
          </button>
          <button
            type="button"
            onClick={onResume}
            className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
            data-testid="resume-continue"
          >
            {t('aiChat.resume')}
          </button>
        </div>
      </div>
    </div>
  );
}
