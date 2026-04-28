import { Icon } from '@/components/ui/Icon';
import { useTranslation } from 'react-i18next';

export interface ActiveFilterChip {
  key: string;
  label: string;
  color: string;
  onRemove: () => void;
}

interface SearchFilterChipsProps {
  chips: ActiveFilterChip[];
  onClearAll: () => void;
}

export function SearchFilterChips({ chips, onClearAll }: SearchFilterChipsProps) {
  const { t } = useTranslation();

  if (chips.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((chip) => (
        <button
          key={chip.key}
          onClick={chip.onRemove}
          className="flex items-center gap-1 rounded-2xl px-3 py-1 text-[12px] font-medium text-white transition-opacity hover:opacity-80"
          style={{ backgroundColor: chip.color }}
        >
          <span className="max-w-[120px] truncate">{chip.label}</span>
          <Icon name="close" size={12} color="#fff" />
        </button>
      ))}
      <button
        onClick={onClearAll}
        className="text-[12px] font-medium text-primary hover:underline"
      >
        {t('search.clearAll')}
      </button>
    </div>
  );
}
