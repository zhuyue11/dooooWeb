/**
 * Compute participant completion stats from local CalendarItem data.
 *
 * Matches dooooApp's useDooooPanelLogic completionStats useMemo (lines 232-312).
 * Uses participantInstances for one-off activities, participants for recurring "Join All".
 */

interface ParticipantInstance {
  id: string;
  participantUserId: string;
  status: string;
  completedAt?: string;
  participantUser?: { id: string; name?: string; avatar?: string | null };
}

interface TaskParticipant {
  id: string;
  taskId: string;
  userId: string;
  status: string;
  user?: { id: string; name: string; avatar?: string | null };
}

export interface ComputedParticipant {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  isCompleted: boolean;
  completedAt?: string;
}

export interface ComputedCompactParticipant {
  id: string;
  name: string;
  avatar?: string;
}

export interface ComputedParticipantStats {
  totalParticipants: number;
  completedCount: number;
  participants: ComputedParticipant[];
  notGoingParticipants: ComputedCompactParticipant[];
  invitedParticipants: ComputedCompactParticipant[];
}

export function computeParticipantStats(
  participantInstances?: ParticipantInstance[],
  participants?: TaskParticipant[],
): ComputedParticipantStats | null {
  // One-off activities: use participantInstances
  if (participantInstances?.length) {
    const confirmed = participantInstances.filter(i => i.status === 'CONFIRMED' || i.status === 'COMPLETED');
    const notGoing = participantInstances.filter(i => i.status === 'DECLINED' || i.status === 'LEFT');
    const invited = participantInstances.filter(i => i.status === 'INVITED');
    if (!confirmed.length && !notGoing.length && !invited.length) return null;
    const completedCount = confirmed.filter(i => i.status === 'COMPLETED').length;
    return {
      totalParticipants: confirmed.length,
      completedCount,
      participants: confirmed.map(i => ({
        id: i.participantUserId,
        name: i.participantUser?.name || 'Unknown',
        email: '',
        avatar: i.participantUser?.avatar ?? undefined,
        isCompleted: i.status === 'COMPLETED',
        completedAt: i.completedAt,
      })),
      notGoingParticipants: notGoing.map(i => ({
        id: i.participantUserId,
        name: i.participantUser?.name || 'Unknown',
        avatar: i.participantUser?.avatar ?? undefined,
      })),
      invitedParticipants: invited.map(i => ({
        id: i.participantUserId,
        name: i.participantUser?.name || 'Unknown',
        avatar: i.participantUser?.avatar ?? undefined,
      })),
    };
  }

  // Recurring "Join All" activities: use participants
  if (participants?.length) {
    const confirmed = participants.filter(p => p.status === 'CONFIRMED');
    const notGoing = participants.filter(p => p.status === 'DECLINED' || p.status === 'LEFT');
    const invited = participants.filter(p => p.status === 'INVITED');
    if (!confirmed.length && !notGoing.length && !invited.length) return null;
    return {
      totalParticipants: confirmed.length,
      completedCount: 0,
      participants: confirmed.map(p => ({
        id: p.userId,
        name: p.user?.name || 'Unknown',
        email: '',
        avatar: p.user?.avatar ?? undefined,
        isCompleted: false,
      })),
      notGoingParticipants: notGoing.map(p => ({
        id: p.userId,
        name: p.user?.name || 'Unknown',
        avatar: p.user?.avatar ?? undefined,
      })),
      invitedParticipants: invited.map(p => ({
        id: p.userId,
        name: p.user?.name || 'Unknown',
        avatar: p.user?.avatar ?? undefined,
      })),
    };
  }

  return null;
}
