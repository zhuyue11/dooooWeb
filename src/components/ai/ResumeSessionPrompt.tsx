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
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-(--el-ai-session-bg)">
        <Icon name="auto_awesome" size={18} color="var(--el-ai-session-text)" />
      </div>
      <div className="max-w-[75%] rounded-(--radius-card) rounded-bl-sm bg-(--el-ai-msg-bg) px-3.5 py-2.5">
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-(--el-ai-msg-text)">{message}</p>
        <div className="mt-3 flex gap-2">
          <button
            type="button"
            onClick={onStartNew}
            className="rounded-(--radius-card) border border-(--el-card-border) px-3 py-1.5 text-xs font-medium text-(--el-ai-msg-text) hover:bg-(--el-popover-item-hover)"
            data-testid="resume-start-new"
          >
            {t('aiChat.startNew')}
          </button>
          <button
            type="button"
            onClick={onResume}
            className="rounded-(--radius-btn) bg-(--el-btn-primary-bg) px-(--spacing-btn-x) py-(--spacing-btn-y) text-xs font-medium text-(--el-btn-primary-text) hover:opacity-90"
            data-testid="resume-continue"
          >
            {t('aiChat.resume')}
          </button>
        </div>
      </div>
    </div>
  );
}
