/**
 * OccurrencesList — collapsible "View All Occurrences" section for recurring tasks.
 * Shows a toggle button and a paginated list of merged (real + virtual) instances.
 *
 * Currently supports tasks only. Event occurrence support to be added when
 * event instance generation is implemented.
 */

import { useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { TaskInstanceList } from './TaskInstanceList';
import { useTaskInstances } from '@/hooks/useTaskInstances';
import { useTranslation } from 'react-i18next';
import type { MergedInstance } from '@/utils/instanceGenerator';

interface OccurrencesListProps {
  /** Parent item ID */
  itemId: string;
  itemType: 'TASK' | 'EVENT';
  /** Parent item's start date (ISO string) */
  date: string;
  /** Repeat pattern from the parent item */
  repeat?: unknown;
  /** Parent item's title (for comparison with modified instance titles) */
  parentTitle: string;
  /** Called when user clicks an occurrence row */
  onInstancePress: (instance: MergedInstance) => void;
}

export function OccurrencesList({
  itemId,
  itemType,
  date,
  repeat,
  parentTitle,
  onInstancePress,
}: OccurrencesListProps) {
  const { t } = useTranslation();
  const [showOccurrences, setShowOccurrences] = useState(false);

  // TODO: add event instance support (useEventInstances hook)
  const taskInstances = useTaskInstances(
    itemType === 'TASK' && repeat ? { id: itemId, date, repeat } : null,
    showOccurrences,
  );

  if (!repeat) return null;
  // Event occurrences not yet supported
  if (itemType === 'EVENT') return null;

  return (
    <div className="rounded-(--radius-card) border border-(--el-panel-border)">
      <button
        type="button"
        onClick={() => setShowOccurrences(!showOccurrences)}
        className="flex w-full items-center gap-2 px-4 py-3 text-sm font-medium text-(--el-btn-primary-bg) transition-colors hover:opacity-80"
      >
        <Icon
          name={showOccurrences ? 'expand_less' : 'expand_more'}
          size={20}
          color="var(--el-btn-primary-bg)"
        />
        <span>
          {showOccurrences
            ? t('tasks.panel.hideOccurrences')
            : t('tasks.panel.viewAllOccurrences')}
        </span>
      </button>
      {showOccurrences && (
        <TaskInstanceList
          instances={taskInstances.instances}
          parentTitle={parentTitle}
          isLoading={taskInstances.isLoading}
          hasMore={taskInstances.hasMore}
          onLoadMore={taskInstances.loadMore}
          onInstancePress={onInstancePress}
        />
      )}
    </div>
  );
}
