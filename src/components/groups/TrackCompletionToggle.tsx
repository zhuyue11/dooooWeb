import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useTranslation } from 'react-i18next';

interface TrackCompletionToggleProps {
  value: boolean;
  onChange: (value: boolean) => void;
}

export function TrackCompletionToggle({ value, onChange }: TrackCompletionToggleProps) {
  const { t } = useTranslation();
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div data-testid="track-completion-toggle">
      <div
        role="button"
        tabIndex={0}
        onClick={() => onChange(!value)}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onChange(!value); }}
        className="flex w-full cursor-pointer items-center gap-3.5 px-4 py-2.5 text-left transition-colors hover:bg-muted/50"
      >
        <Icon name="check_circle" size={20} color="var(--color-primary)" />
        <span className="flex-1 text-sm font-medium text-foreground">{t('tasks.input.trackCompletion')}</span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setShowInfo((v) => !v); }}
          className="mr-2 flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
          data-testid="track-completion-info-btn"
        >
          <Icon name="info" size={16} color="var(--color-muted-foreground)" />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onChange(!value); }}
          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${value ? 'bg-primary' : 'bg-muted-foreground/30'}`}
          data-testid="track-completion-switch"
        >
          <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
        </button>
      </div>

      {showInfo && (
        <div className="mx-4 mb-2 rounded-(--radius-card) bg-muted/50 px-4 py-3">
          <p className="text-xs font-medium text-foreground">{t('tasks.input.trackCompletionInfoTitle')}</p>
          <p className="mt-1 whitespace-pre-line text-xs text-muted-foreground">{t('tasks.input.trackCompletionInfoContent')}</p>
        </div>
      )}
    </div>
  );
}
