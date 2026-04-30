/**
 * itemMenuItems — shared builder for item context menu / 3-dots menu items.
 *
 * Ported from dooooApp/utils/taskMenuItems.ts.
 * Each consumer passes its own callbacks object — the builder only decides
 * WHICH items to show, not HOW to execute them.
 */

import type { TFunction } from 'i18next';

export interface ItemMenuItem {
  key: string;
  icon: string;
  label: string;
  onSelect: () => void;
  destructive?: boolean;
}

export interface ItemMenuContext {
  isEvent: boolean;
  isGroupActivity: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canComplete: boolean;
  isCompleted: boolean;
  isOrganizer: boolean;
  taskStarted: boolean;
  activityCanComplete: boolean;
  trackCompletion: boolean;
  isRecurring: boolean;
  isParticipatingAll: boolean;
  isParticipationCompleted: boolean;
  isParentCompleted: boolean;
  participationStatus?: 'NONE' | 'INVITED' | 'CONFIRMED' | 'DECLINED' | 'LEFT' | 'COMPLETED';
  canManuallyComplete: boolean;
}

export interface ItemMenuCallbacks {
  onEdit?: () => void;
  onComplete?: () => void;
  onParticipantComplete?: (complete: boolean) => void;
  onDelete?: () => void;
  onInvite?: () => void;
  onManualComplete?: () => void;
  onParticipate?: (scope: 'single' | 'next' | 'all') => void;
  onDecline?: () => void;
  onNotGoing?: () => void;
  onJoinAnyway?: () => void;
  onLeave?: (scope: 'single' | 'all') => void;
}

export function buildItemMenuItems(
  ctx: ItemMenuContext,
  callbacks: ItemMenuCallbacks,
  t: TFunction,
): ItemMenuItem[] {
  const items: (ItemMenuItem | false | undefined | null)[] = [];

  // ── Edit ──
  if (ctx.canEdit && callbacks.onEdit) {
    items.push({ key: 'edit', icon: 'edit', label: t('common.edit'), onSelect: callbacks.onEdit });
  }

  // ── Complete / Uncomplete (non-group tasks) ──
  if (!ctx.isEvent && !ctx.isGroupActivity && ctx.canComplete && !ctx.isCompleted && callbacks.onComplete) {
    items.push({ key: 'markComplete', icon: 'check_circle', label: t('tasks.markComplete'), onSelect: callbacks.onComplete });
  }
  if (!ctx.isEvent && !ctx.isGroupActivity && ctx.isCompleted && callbacks.onComplete) {
    items.push({ key: 'markIncomplete', icon: 'undo', label: t('tasks.markIncomplete'), onSelect: callbacks.onComplete });
  }

  // ── Group activity: participant completion ──
  if (ctx.isGroupActivity && ctx.participationStatus === 'CONFIRMED'
    && ctx.trackCompletion && ctx.activityCanComplete
    && !ctx.isParticipationCompleted && !ctx.isParentCompleted
    && callbacks.onParticipantComplete) {
    items.push({ key: 'participantComplete', icon: 'check_circle', label: t('tasks.markComplete'), onSelect: () => callbacks.onParticipantComplete!(true) });
  }

  // ── Group activity: invite (organizer only, before start) ──
  if (ctx.isGroupActivity && ctx.isOrganizer && !ctx.isCompleted && !ctx.taskStarted && callbacks.onInvite) {
    items.push({ key: 'invite', icon: 'person_add', label: t('tasks.panel.invite'), onSelect: callbacks.onInvite });
  }

  // ── Group activity: manual complete / end activity ──
  if (ctx.canManuallyComplete && callbacks.onManualComplete) {
    items.push({ key: 'endActivity', icon: 'stop_circle', label: t('tasks.panel.endActivity'), onSelect: callbacks.onManualComplete });
  }

  // ── Group activity: undo participant completion ──
  if (ctx.isGroupActivity && ctx.isParticipationCompleted && ctx.trackCompletion && callbacks.onParticipantComplete) {
    items.push({ key: 'undoComplete', icon: 'undo', label: t('groups.participate.markIncomplete'), onSelect: () => callbacks.onParticipantComplete!(false) });
  }

  // ── Group activity: leave actions ──
  if (ctx.isGroupActivity && ctx.participationStatus === 'CONFIRMED' && !ctx.isOrganizer && !ctx.taskStarted && callbacks.onLeave) {
    if (ctx.isRecurring && ctx.isParticipatingAll) {
      items.push({ key: 'leaveThis', icon: 'exit_to_app', label: t('groups.participate.leaveThis'), onSelect: () => callbacks.onLeave!('single'), destructive: true });
      items.push({ key: 'leaveAll', icon: 'exit_to_app', label: t('groups.participate.leaveAll'), onSelect: () => callbacks.onLeave!('all'), destructive: true });
    } else {
      items.push({ key: 'leave', icon: 'exit_to_app', label: t('groups.participate.leave'), onSelect: () => callbacks.onLeave!('all'), destructive: true });
    }
  }

  // ── Group activity: participate actions by status ──
  const addParticipateActions = (status: string) => {
    if (!callbacks.onParticipate || ctx.taskStarted) return;

    if (status === 'INVITED') {
      if (ctx.isRecurring) {
        items.push({ key: 'participate', icon: 'person_add', label: t('groups.participate.participateTitle'), onSelect: () => callbacks.onParticipate!('next') });
        items.push({ key: 'participateAll', icon: 'group_add', label: t('groups.participate.participateAllTitle'), onSelect: () => callbacks.onParticipate!('all') });
      } else {
        items.push({ key: 'confirm', icon: 'check', label: t('groups.participate.confirm'), onSelect: () => callbacks.onParticipate!('single') });
      }
    }

    if (status === 'DECLINED') {
      if (ctx.isRecurring) {
        items.push({ key: 'participate', icon: 'person_add', label: t('groups.participate.participateTitle'), onSelect: () => callbacks.onParticipate!('single') });
        items.push({ key: 'participateAll', icon: 'group_add', label: t('groups.participate.participateAllTitle'), onSelect: () => callbacks.onParticipate!('all') });
      } else if (callbacks.onJoinAnyway) {
        items.push({ key: 'joinAnyway', icon: 'person_add', label: t('groups.participate.joinAnyway'), onSelect: callbacks.onJoinAnyway });
      }
    }

    if (status === 'NONE' || status === 'LEFT') {
      if (ctx.isRecurring) {
        items.push({ key: 'participate', icon: 'person_add', label: t('groups.participate.participateTitle'), onSelect: () => callbacks.onParticipate!('next') });
        items.push({ key: 'participateAll', icon: 'group_add', label: t('groups.participate.participateAllTitle'), onSelect: () => callbacks.onParticipate!('all') });
      } else {
        items.push({ key: 'participate', icon: 'person_add', label: t('groups.participate.button'), onSelect: () => callbacks.onParticipate!('single') });
      }
      if (status === 'NONE' && callbacks.onNotGoing && !ctx.isOrganizer) {
        items.push({ key: 'notGoing', icon: 'event_busy', label: t('groups.participate.notGoing'), onSelect: callbacks.onNotGoing });
      }
    }
  };

  if (ctx.isGroupActivity && ctx.participationStatus === 'INVITED' && callbacks.onDecline) {
    addParticipateActions('INVITED');
    items.push({ key: 'decline', icon: 'close', label: t('groups.participate.decline'), onSelect: callbacks.onDecline, destructive: true });
  } else if (ctx.isGroupActivity && ctx.participationStatus && callbacks.onParticipate) {
    addParticipateActions(ctx.participationStatus);
  }

  // ── Delete ──
  if (ctx.canDelete && callbacks.onDelete) {
    items.push({ key: 'delete', icon: 'delete', label: t('common.delete'), onSelect: callbacks.onDelete, destructive: true });
  }

  return items.filter(Boolean) as ItemMenuItem[];
}
