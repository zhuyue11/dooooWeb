import { useTranslation } from 'react-i18next';
import { Icon } from '@/components/ui/Icon';
import { ParticipateCard } from './ParticipateCard';
import { useAuth } from '@/lib/contexts/auth-context';
import type { GroupMessage } from '@/types/api';

interface SystemMessageProps {
  message: GroupMessage;
  groupColor?: string;
}

export function SystemMessage({ message, groupColor }: SystemMessageProps) {
  const { t } = useTranslation();
  const { user } = useAuth();

  // Render ParticipateCard for "For All Members" group activities
  if (
    (message.content === 'system.task_created_all_members' ||
      message.content === 'system.recurring_task_created_all_members') &&
    message.attachments?.isForAllMembers
  ) {
    const a = message.attachments as Record<string, unknown>;
    return (
      <ParticipateCard
        message={message}
        taskId={a.taskId as string}
        taskTitle={(a.taskTitle as string) || 'Untitled'}
        taskDescription={a.taskDescription as string | null | undefined}
        isRecurring={!!a.repeat}
        taskDate={a.taskDate as string | undefined}
        groupColor={groupColor}
      />
    );
  }

  const content = getTranslatedContent(message, t, user?.id);
  const iconName = getIconForContent(message.content);
  const accentColor = groupColor || 'var(--el-chat-sender)';

  const time = new Date(message.createdAt).toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

  return (
    <div className="flex justify-center py-1" data-testid="system-message">
      <div
        className="flex max-w-[85%] items-center gap-2 rounded-(--radius-card) border px-3 py-1.5"
        style={{ borderColor: `color-mix(in srgb, ${accentColor} 30%, transparent)` }}
      >
        <Icon name={iconName} size={16} color={accentColor} />
        <span className="text-xs text-(--el-chat-timestamp)">{content}</span>
        <span className="shrink-0 text-[10px] text-(--el-chat-timestamp)">{time}</span>
      </div>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatParticipantsList(
  names: string[],
  ids: string[],
  currentUserId: string | undefined,
  youLabel: string,
): string {
  if (names.length === 0) return 'everyone';
  const display = names.map((name, i) =>
    currentUserId && ids[i] === currentUserId ? youLabel : name,
  );
  if (display.length === 1) return display[0];
  if (display.length === 2) return display.join(' and ');
  return `${display.slice(0, -1).join(', ')}, and ${display[display.length - 1]}`;
}

function formatRepeatPattern(
  repeat: { frequency?: string; interval?: number },
  t: (key: string) => string,
): string {
  if (!repeat?.frequency) return '';
  const freq = repeat.frequency.toLowerCase();
  const interval = repeat.interval ?? 1;
  if (interval === 1) return t(`common.${freq}`) || freq;
  const periodMap: Record<string, string> = { daily: 'days', weekly: 'weeks', monthly: 'months', yearly: 'years' };
  return `every ${interval} ${periodMap[freq] || freq}`;
}

function formatDate(iso: unknown): string {
  if (!iso || typeof iso !== 'string') return '';
  return new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(iso: unknown): string {
  if (!iso || typeof iso !== 'string') return '';
  return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}

function getTranslatedContent(
  message: GroupMessage,
  t: (key: string, params?: Record<string, unknown>) => string,
  currentUserId?: string,
): string {
  if (!message.content.startsWith('system.')) return message.content;

  const userName = message.user?.name || message.user?.email || 'Unknown';
  const a = (message.attachments as Record<string, unknown>) || {};
  const you = t('common.you');

  // Replace a name with "you" when the associated ID matches the current user
  const nameOrYou = (name: unknown, id: unknown) =>
    currentUserId && id === currentUserId ? you : (name as string) || 'Unknown';

  const key = message.content;

  // ── Group membership ──

  if (key === 'system.user_role_changed') {
    const newRole = (a.newRole as string) || 'MEMBER';
    const roleKey = `groups.inviteModalRole${newRole.charAt(0)}${newRole.slice(1).toLowerCase()}`;
    return t(key, { userName, targetUserName: nameOrYou(a.targetUserName, a.targetUserId), newRole: t(roleKey) });
  }

  if (key === 'system.user_removed_from_group') {
    return t(key, { userName, removedByName: a.removedByName || 'Unknown' });
  }

  // ── Task creation (single + all members) ──

  if (key === 'system.task_created_assigned') {
    return t(key, { userName, taskTitle: a.taskTitle || 'Untitled', assigneeName: nameOrYou(a.assigneeName, a.assigneeId) });
  }

  if (key === 'system.task_created_all_members') {
    return t(key, {
      userName,
      taskTitle: a.taskTitle || 'Untitled',
      participants: formatParticipantsList((a.participants as string[]) || [], (a.participantIds as string[]) || [], currentUserId, you),
    });
  }

  // ── Recurring task creation ──

  if (key === 'system.recurring_task_created_assigned') {
    return t(key, {
      userName,
      taskTitle: a.taskTitle || 'Untitled',
      assigneeName: nameOrYou(a.assigneeName, a.assigneeId),
      repeatPattern: formatRepeatPattern(a.repeat as { frequency?: string; interval?: number }, t),
    });
  }

  if (key === 'system.recurring_task_created_all_members') {
    return t(key, {
      userName,
      taskTitle: a.taskTitle || 'Untitled',
      participants: formatParticipantsList((a.participants as string[]) || [], (a.participantIds as string[]) || [], currentUserId, you),
      repeatPattern: formatRepeatPattern(a.repeat as { frequency?: string; interval?: number }, t),
    });
  }

  // ── Task removal / cancellation ──

  if (key === 'system.task_removed' || key === 'system.activity_canceled') {
    return t(key, { userName, taskTitle: a.taskTitle || 'Untitled' });
  }

  if (key === 'system.recurring_task_removed_all' || key === 'system.recurring_activity_canceled') {
    return t(key, {
      userName,
      taskTitle: a.taskTitle || 'Untitled',
      repeatPattern: formatRepeatPattern(a.repeat as { frequency?: string; interval?: number }, t),
    });
  }

  if (key === 'system.recurring_task_removed_future' || key === 'system.recurring_task_updated_future') {
    return t(key, { userName, taskTitle: a.taskTitle || 'Untitled', startDate: formatDate(a.startDate) });
  }

  if (key === 'system.recurring_task_instance_removed' || key === 'system.recurring_task_instance_updated') {
    return t(key, { userName, taskTitle: a.taskTitle || 'Untitled', instanceDate: formatDate(a.instanceDate) });
  }

  if (key === 'system.recurring_task_updated_all') {
    return t(key, { userName, taskTitle: a.taskTitle || 'Untitled' });
  }

  // ── Title changed ──

  if (key === 'system.task_title_changed' || key === 'system.recurring_task_title_changed') {
    return t(key, { userName, oldTitle: a.oldTitle || 'Untitled', newTitle: a.newTitle || 'Untitled' });
  }

  // ── Description changed/added/removed ──

  if (key.match(/^system\.(recurring_)?task_description_(changed|added|removed)$/)) {
    return t(key, { userName, taskTitle: a.taskTitle || 'Untitled' });
  }

  // ── Date changed/added/removed ──

  if (key.match(/^system\.(recurring_)?task_date_(changed|added|removed)$/)) {
    return t(key, {
      userName,
      taskTitle: a.taskTitle || 'Untitled',
      oldDate: formatDate(a.oldDate),
      newDate: formatDate(a.newDate),
    });
  }

  // ── Time changed/added/removed ──

  if (key.match(/^system\.(recurring_)?task_time_(changed|added|removed)$/)) {
    return t(key, {
      userName,
      taskTitle: a.taskTitle || 'Untitled',
      oldTime: formatTime(a.oldTime),
      newTime: formatTime(a.newTime),
    });
  }

  // ── Assignee changed/added/removed ──

  if (key.match(/^system\.(recurring_)?task_assignee_(changed|added|removed)$/)) {
    return t(key, {
      userName,
      taskTitle: a.taskTitle || 'Untitled',
      oldAssignee: nameOrYou(a.oldAssigneeName, a.oldAssigneeId) || 'Unassigned',
      newAssignee: nameOrYou(a.newAssigneeName, a.newAssigneeId) || 'Unassigned',
    });
  }

  // ── Priority changed/added/removed ──

  if (key.match(/^system\.(recurring_)?task_priority_(changed|added|removed)$/)) {
    const tr = (p: unknown) => (p ? t(`tasks.priorities.${String(p).toLowerCase()}`) : '');
    return t(key, {
      userName,
      taskTitle: a.taskTitle || 'Untitled',
      oldPriority: tr(a.oldPriority),
      newPriority: tr(a.newPriority),
    });
  }

  // ── Category changed/added/removed ──

  if (key.match(/^system\.(recurring_)?task_category_(changed|added|removed)$/)) {
    const tr = (c: unknown) => {
      if (!c) return '';
      const catKey = `tasks.categories.${String(c).toLowerCase()}`;
      const translated = t(catKey);
      return translated === catKey ? String(c) : translated;
    };
    return t(key, {
      userName,
      taskTitle: a.taskTitle || 'Untitled',
      oldCategory: tr(a.oldCategoryName),
      newCategory: tr(a.newCategoryName),
    });
  }

  // ── Fallback: pass userName and let i18next fill what it can ──

  const translated = t(key, { userName });
  if (translated === key) return key.replace('system.', '').replace(/_/g, ' ');
  return translated;
}

function getIconForContent(content: string): string {
  if (content.includes('created')) return 'add_circle';
  if (content.includes('deleted') || content.includes('removed')) return 'remove_circle';
  if (content.includes('updated') || content.includes('edited') || content.includes('changed')) return 'edit';
  if (content.includes('joined') || content.includes('accepted')) return 'group_add';
  if (content.includes('left') || content.includes('declined')) return 'group_remove';
  if (content.includes('role')) return 'admin_panel_settings';
  if (content.includes('canceled') || content.includes('cancelled')) return 'cancel';
  if (content.includes('completed')) return 'check_circle';
  return 'info';
}
