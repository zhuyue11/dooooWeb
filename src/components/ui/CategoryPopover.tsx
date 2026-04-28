import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { createCategory } from '@/lib/api';
import { Icon } from '@/components/ui/Icon';
import { PopoverWrapper } from '@/components/ui/PopoverWrapper';

const CATEGORY_COLOR_PRESETS = [
  '#3B82F6', '#EF4444', '#F59E0B', '#10B981',
  '#8B5CF6', '#EC4899', '#F97316', '#06B6D4',
  '#6366F1', '#14B8A6', '#F43F5E', '#84CC16',
];

interface CategoryPopoverProps {
  categories: { id: string; name: string; color: string }[];
  selected: string;
  onSelect: (id: string) => void;
  onClear: () => void;
  onClose: () => void;
  groupId?: string;
}

export function CategoryPopover({ categories, selected, onSelect, onClear, onClose, groupId }: CategoryPopoverProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newName, setNewName] = useState('');
  const [selectedColor, setSelectedColor] = useState(CATEGORY_COLOR_PRESETS[0]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreate = async () => {
    const trimmed = newName.trim();
    if (!trimmed || isCreating) return;

    setIsCreating(true);
    setError(null);
    try {
      const created = await createCategory({ name: trimmed, color: selectedColor, groupId });
      await queryClient.invalidateQueries({ queryKey: groupId ? ['categories', 'group', groupId] : ['categories'] });
      onSelect(created.id);
      onClose();
    } catch (err: unknown) {
      const status = (err as any)?.response?.status;
      if (status === 400) {
        setError(t('categories.duplicateName'));
      } else {
        setError(t('errors.genericError'));
      }
    } finally {
      setIsCreating(false);
    }
  };

  if (showCreateForm) {
    return (
      <PopoverWrapper onClose={onClose} className="w-[260px] p-3">
        {/* Header */}
        <div className="mb-3 flex items-center gap-2">
          <button type="button" onClick={() => { setShowCreateForm(false); setError(null); }} className="rounded-(--radius-btn) p-0.5 hover:bg-muted/50">
            <Icon name="arrow_back" size={18} color="var(--color-muted-foreground)" />
          </button>
          <span className="text-sm font-medium text-foreground">{t('categories.newCategory')}</span>
        </div>

        {/* Name input */}
        <input
          type="text"
          value={newName}
          onChange={(e) => { setNewName(e.target.value); setError(null); }}
          placeholder={t('categories.namePlaceholder')}
          autoFocus
          maxLength={50}
          className="mb-3 w-full rounded-(--radius-input) border border-border bg-background px-(--spacing-input-x) py-(--spacing-input-y) text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none"
          onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); }}
        />

        {/* Color swatches */}
        <div className="mb-3 grid grid-cols-6 gap-2">
          {CATEGORY_COLOR_PRESETS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => setSelectedColor(color)}
              className="flex h-7 w-7 items-center justify-center rounded-full transition-transform hover:scale-110"
              style={{ backgroundColor: color }}
            >
              {selectedColor === color && <Icon name="check" size={14} color="#fff" />}
            </button>
          ))}
        </div>

        {/* Error */}
        {error && <p className="mb-2 text-xs text-destructive">{error}</p>}

        {/* Create button */}
        <button
          type="button"
          onClick={handleCreate}
          disabled={!newName.trim() || isCreating}
          className="w-full rounded-(--radius-btn) bg-primary px-(--spacing-btn-x) py-(--spacing-btn-y) text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isCreating ? t('categories.creating') : t('categories.newCategory')}
        </button>
      </PopoverWrapper>
    );
  }

  return (
    <PopoverWrapper onClose={onClose} className="w-[220px] flex max-h-[280px] flex-col p-1">
      {/* Scrollable category list */}
      <div className="overflow-y-auto">
        {categories.map((cat) => (
          <button
            key={cat.id}
            type="button"
            onClick={() => onSelect(cat.id)}
            className={`flex w-full items-center gap-3 rounded-(--radius-card) px-3 py-2 text-sm transition-colors hover:bg-muted/50 ${selected === cat.id ? 'bg-muted font-medium' : ''}`}
          >
            <span className="h-3 w-3 shrink-0 rounded-full" style={{ backgroundColor: cat.color }} />
            <span className="truncate">{cat.name}</span>
          </button>
        ))}
      </div>

      {/* Fixed footer */}
      <div className="shrink-0">
        <div className="mx-2 my-1 border-t border-border" />
        <button
          type="button"
          onClick={() => setShowCreateForm(true)}
          className="flex w-full items-center gap-3 rounded-(--radius-card) px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/50"
        >
          <Icon name="add" size={16} />
          <span>{t('categories.createNew')}</span>
        </button>

        {selected && (
          <>
            <div className="mx-2 my-1 border-t border-border" />
            <button
              type="button"
              onClick={onClear}
              className="flex w-full items-center gap-3 rounded-(--radius-card) px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-muted/50"
            >
              <Icon name="close" size={16} />
              <span>{t('itemEditor.clear')}</span>
            </button>
          </>
        )}
      </div>
    </PopoverWrapper>
  );
}
