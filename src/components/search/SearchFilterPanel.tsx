import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useCategories } from '@/hooks/useCategories';
import { useGroups } from '@/hooks/useGroups';
import { usePlans } from '@/hooks/usePlans';
import { useTargets } from '@/hooks/useTargets';
import { FilterChip } from './FilterChip';
import { CalendarPopover } from '@/components/ui/CalendarPopover';
import { Icon } from '@/components/ui/Icon';

const PRIORITY_OPTIONS = [
  { label: 'Low', value: 'LOW', color: '#3B82F6' },
  { label: 'Medium', value: 'MEDIUM', color: '#FF9500' },
  { label: 'High', value: 'HIGH', color: '#9B59B6' },
  { label: 'Urgent', value: 'URGENT', color: '#FF3B30' },
] as const;

interface SearchFilterPanelProps {
  selectedPriority: string | null;
  selectedCategory: string | null;
  selectedGroup: string | null;
  selectedPlan: string | null;
  selectedTarget: string | null;
  overdueOnly: boolean;
  completedOnly: boolean;
  dateFrom: string | null;
  dateTo: string | null;
  onPriorityChange: (value: string | null) => void;
  onCategoryChange: (value: string | null) => void;
  onGroupChange: (value: string | null) => void;
  onPlanChange: (value: string | null) => void;
  onTargetChange: (value: string | null) => void;
  onOverdueChange: (value: boolean) => void;
  onCompletedChange: (value: boolean) => void;
  onDateFromChange: (value: string | null) => void;
  onDateToChange: (value: string | null) => void;
}

export function SearchFilterPanel({
  selectedPriority,
  selectedCategory,
  selectedGroup,
  selectedPlan,
  selectedTarget,
  overdueOnly,
  completedOnly,
  dateFrom,
  dateTo,
  onPriorityChange,
  onCategoryChange,
  onGroupChange,
  onPlanChange,
  onTargetChange,
  onOverdueChange,
  onCompletedChange,
  onDateFromChange,
  onDateToChange,
}: SearchFilterPanelProps) {
  const { t } = useTranslation();
  const { data: categories } = useCategories();
  const { data: groups } = useGroups();
  const { data: plans } = usePlans();
  const { data: targets } = useTargets();

  const [showDateFromPicker, setShowDateFromPicker] = useState(false);
  const [showDateToPicker, setShowDateToPicker] = useState(false);
  const dateFromRef = useRef<HTMLDivElement>(null);
  const dateToRef = useRef<HTMLDivElement>(null);

  const activeTargets = targets?.filter((t) => t.status === 'active') ?? [];

  return (
    <div className="max-h-[320px] space-y-4 overflow-y-auto rounded-xl border border-border bg-surface p-4">
      {/* Priority */}
      <div>
        <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {t('search.priorities')}
        </h4>
        <div className="flex flex-wrap gap-2">
          {PRIORITY_OPTIONS.map((p) => (
            <FilterChip
              key={p.value}
              label={t(`todoPage.priority${p.label}`)}
              color={p.color}
              isActive={selectedPriority === p.value}
              onClick={() => onPriorityChange(selectedPriority === p.value ? null : p.value)}
            />
          ))}
        </div>
      </div>

      {/* Categories */}
      {categories && categories.length > 0 && (
        <div>
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t('search.categories')}
          </h4>
          <div className="flex flex-wrap gap-2">
            {categories.map((c) => (
              <FilterChip
                key={c.id}
                label={c.name}
                color={c.color}
                isActive={selectedCategory === c.id}
                onClick={() => onCategoryChange(selectedCategory === c.id ? null : c.id)}
                dotColor={c.color}
              />
            ))}
          </div>
        </div>
      )}

      {/* Groups */}
      {groups && groups.length > 0 && (
        <div>
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t('search.groups')}
          </h4>
          <div className="flex flex-wrap gap-2">
            {groups.map((g) => (
              <FilterChip
                key={g.id}
                label={g.name}
                color={g.color || 'var(--color-primary)'}
                isActive={selectedGroup === g.id}
                onClick={() => onGroupChange(selectedGroup === g.id ? null : g.id)}
                dotColor={g.color || 'var(--color-primary)'}
              />
            ))}
          </div>
        </div>
      )}

      {/* Plans */}
      {plans && plans.length > 0 && (
        <div>
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t('search.plans')}
          </h4>
          <div className="flex flex-wrap gap-2">
            {plans.map((p) => (
              <FilterChip
                key={p.id}
                label={p.name}
                color="var(--color-secondary)"
                isActive={selectedPlan === p.id}
                onClick={() => onPlanChange(selectedPlan === p.id ? null : p.id)}
                icon="assignment"
              />
            ))}
          </div>
        </div>
      )}

      {/* Targets */}
      {activeTargets.length > 0 && (
        <div>
          <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {t('search.targets')}
          </h4>
          <div className="flex flex-wrap gap-2">
            {activeTargets.map((tgt) => (
              <FilterChip
                key={tgt.id}
                label={tgt.name}
                color="var(--color-info)"
                isActive={selectedTarget === tgt.id}
                onClick={() => onTargetChange(selectedTarget === tgt.id ? null : tgt.id)}
                icon="flag"
              />
            ))}
          </div>
        </div>
      )}

      {/* Status */}
      <div>
        <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {t('search.status')}
        </h4>
        <div className="flex flex-wrap gap-2">
          <FilterChip
            label={t('search.overdue')}
            color="var(--color-destructive)"
            isActive={overdueOnly}
            onClick={() => {
              const newVal = !overdueOnly;
              onOverdueChange(newVal);
              if (newVal) onCompletedChange(false);
            }}
            icon="warning"
          />
          <FilterChip
            label={t('search.completed')}
            color="var(--color-secondary)"
            isActive={completedOnly}
            onClick={() => {
              const newVal = !completedOnly;
              onCompletedChange(newVal);
              if (newVal) onOverdueChange(false);
            }}
            icon="check_circle"
          />
        </div>
      </div>

      {/* Date Range */}
      <div>
        <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          {t('search.dateRange')}
        </h4>
        <div className="flex items-center gap-2">
          {/* From */}
          <div className="relative" ref={dateFromRef}>
            <button
              onClick={() => setShowDateFromPicker(!showDateFromPicker)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] transition-colors ${
                dateFrom ? 'border-primary text-primary' : 'border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              <Icon name="event" size={16} color={dateFrom ? 'var(--color-primary)' : 'var(--color-muted-foreground)'} />
              <span>{dateFrom ? new Date(dateFrom + 'T00:00:00').toLocaleDateString() : t('search.from')}</span>
              {dateFrom && (
                <span
                  onClick={(e) => { e.stopPropagation(); onDateFromChange(null); }}
                  className="ml-1 cursor-pointer"
                >
                  <Icon name="close" size={14} color="var(--color-muted-foreground)" />
                </span>
              )}
            </button>
            {showDateFromPicker && (
              <div className="absolute left-0 top-full z-20 mt-1">
                <CalendarPopover
                  selectedDate={dateFrom ? new Date(dateFrom + 'T00:00:00') : null}
                  onSelect={(date) => {
                    onDateFromChange(date.toISOString().split('T')[0]);
                    setShowDateFromPicker(false);
                  }}
                  onClose={() => setShowDateFromPicker(false)}
                />
              </div>
            )}
          </div>

          <span className="text-muted-foreground">–</span>

          {/* To */}
          <div className="relative" ref={dateToRef}>
            <button
              onClick={() => setShowDateToPicker(!showDateToPicker)}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-[13px] transition-colors ${
                dateTo ? 'border-primary text-primary' : 'border-border text-muted-foreground hover:bg-muted'
              }`}
            >
              <Icon name="event" size={16} color={dateTo ? 'var(--color-primary)' : 'var(--color-muted-foreground)'} />
              <span>{dateTo ? new Date(dateTo + 'T00:00:00').toLocaleDateString() : t('search.to')}</span>
              {dateTo && (
                <span
                  onClick={(e) => { e.stopPropagation(); onDateToChange(null); }}
                  className="ml-1 cursor-pointer"
                >
                  <Icon name="close" size={14} color="var(--color-muted-foreground)" />
                </span>
              )}
            </button>
            {showDateToPicker && (
              <div className="absolute left-0 top-full z-20 mt-1">
                <CalendarPopover
                  selectedDate={dateTo ? new Date(dateTo + 'T00:00:00') : null}
                  onSelect={(date) => {
                    onDateToChange(date.toISOString().split('T')[0]);
                    setShowDateToPicker(false);
                  }}
                  onClose={() => setShowDateToPicker(false)}
                  minDate={dateFrom ? new Date(dateFrom + 'T00:00:00') : null}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
