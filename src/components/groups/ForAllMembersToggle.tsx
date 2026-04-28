import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useTranslation } from 'react-i18next';

interface ForAllMembersToggleProps {
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

export function ForAllMembersToggle({ value, onChange, disabled = false }: ForAllMembersToggleProps) {
  const { t } = useTranslation();
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div data-testid="for-all-members-toggle">
      <div
        role="button"
        tabIndex={0}
        onClick={() => !disabled && onChange(!value)}
        onKeyDown={(e) => { if (!disabled && (e.key === 'Enter' || e.key === ' ')) onChange(!value); }}
        className={`flex w-full items-center gap-3.5 px-4 py-2.5 text-left transition-colors hover:bg-(--el-popover-item-hover) ${disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
      >
        <Icon name="people" size={20} color="var(--el-group-status-text)" />
        <span className="flex-1 text-sm font-medium text-(--el-group-title)">{t('tasks.input.forAllGroupMembers')}</span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setShowInfo((v) => !v); }}
          className="mr-2 flex h-5 w-5 items-center justify-center rounded-full text-(--el-group-description) hover:bg-(--el-popover-item-hover)"
          data-testid="for-all-members-info-btn"
        >
          <Icon name="info" size={16} color="var(--el-group-description)" />
        </button>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); if (!disabled) onChange(!value); }}
          className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${value ? 'bg-(--el-switch-active)' : 'bg-(--el-group-radio-inactive-border)'}`}
          data-testid="for-all-members-switch"
        >
          <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${value ? 'translate-x-[18px]' : 'translate-x-0.5'}`} />
        </button>
      </div>

      {showInfo && (
        <div className="mx-4 mb-2 rounded-(--radius-card) bg-(--el-editor-tag-bg) px-4 py-3">
          <p className="text-xs font-medium text-(--el-group-title)">{t('fab.activity')}</p>
          <p className="mt-1 text-xs text-(--el-group-description)">{t('fab.activityInfo')}</p>
        </div>
      )}
    </div>
  );
}
