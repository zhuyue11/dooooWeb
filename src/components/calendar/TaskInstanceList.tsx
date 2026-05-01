/**
 * TaskInstanceList — renders a list of recurring task occurrences with
 * status icons, formatted dates, and a "Load more" button.
 *
 * Ported from dooooApp/components/TaskInstanceList.tsx.
 */

import { useCallback } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useTranslation } from 'react-i18next';
import i18n from '@/lib/i18n';
import type { MergedInstance } from '@/utils/instanceGenerator';

interface TaskInstanceListProps {
  instances: MergedInstance[];
  parentTitle: string;
  isLoading: boolean;
  hasMore: boolean;
  onLoadMore: () => void;
  onInstancePress: (instance: MergedInstance) => void;
}

function getStatusIcon(status: MergedInstance['status']): { name: string; color: string } {
  switch (status) {
    case 'COMPLETED': return { name: 'check_circle', color: 'var(--el-btn-primary-bg)' };
    case 'REMOVED': return { name: 'remove_circle', color: 'var(--el-dialog-confirm-bg)' };
    case 'MODIFIED': return { name: 'edit', color: 'var(--el-panel-priority-high-text)' };
    case 'VIRTUAL':
    case 'PENDING':
    default: return { name: 'radio_button_unchecked', color: 'var(--el-panel-detail-label)' };
  }
}

function formatDate(isoDate: string): string {
  const date = new Date(isoDate);
  const now = new Date();
  return date.toLocaleDateString(i18n.language, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined,
  });
}

export function TaskInstanceList({
  instances,
  parentTitle,
  isLoading,
  hasMore,
  onLoadMore,
  onInstancePress,
}: TaskInstanceListProps) {
  const { t } = useTranslation();

  const handlePress = useCallback((instance: MergedInstance) => {
    if (instance.status === 'REMOVED') return;
    onInstancePress(instance);
  }, [onInstancePress]);

  return (
    <div>
      {instances.map((item) => {
        const icon = getStatusIcon(item.status);
        const isModifiedTitle = item.title !== parentTitle;
        const isRemoved = item.status === 'REMOVED';

        return (
          <button
            key={item.dateStr + (item.instanceId || 'virtual')}
            type="button"
            onClick={() => handlePress(item)}
            disabled={isRemoved}
            className={`flex w-full items-center gap-3 border-b border-(--el-panel-separator) px-4 py-2.5 text-left transition-colors ${
              isRemoved ? 'cursor-default opacity-50' : 'hover:bg-(--el-popover-item-hover)'
            }`}
          >
            <Icon name={icon.name} size={20} color={icon.color} className="shrink-0" />
            <div className="min-w-0 flex-1">
              <span
                className={`text-sm font-medium text-(--el-panel-title) ${
                  isRemoved ? 'line-through text-(--el-panel-detail-label)' : ''
                }`}
              >
                {formatDate(item.date)}
              </span>
              {isModifiedTitle && (
                <span
                  className={`mt-0.5 block truncate text-xs text-(--el-panel-detail-label) ${
                    isRemoved ? 'line-through' : ''
                  }`}
                >
                  {item.title}
                </span>
              )}
            </div>
            {!isRemoved && (
              <Icon name="chevron_right" size={20} color="var(--el-panel-detail-label)" className="shrink-0" />
            )}
          </button>
        );
      })}

      {isLoading && (
        <div className="flex items-center justify-center py-4">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-(--el-btn-primary-bg) border-t-transparent" />
        </div>
      )}

      {hasMore && !isLoading && (
        <button
          type="button"
          onClick={onLoadMore}
          className="w-full py-3 text-center text-sm font-medium text-(--el-btn-primary-bg) transition-colors hover:opacity-80"
        >
          {t('tasks.panel.loadMore')}
        </button>
      )}
    </div>
  );
}
