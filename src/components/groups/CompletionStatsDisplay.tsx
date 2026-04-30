import { useQuery } from '@tanstack/react-query';
import { getTaskCompletionStats } from '@/lib/api';
import { ParticipantsList } from './ParticipantsList';

interface CompletionStatsDisplayProps {
  taskId: string;
  currentUserId?: string;
  organizerId: string;
  trackCompletion?: boolean;
}

export function CompletionStatsDisplay({ taskId, currentUserId, organizerId, trackCompletion }: CompletionStatsDisplayProps) {
  const { data: stats } = useQuery({
    queryKey: ['completion-stats', taskId],
    queryFn: () => getTaskCompletionStats(taskId),
    staleTime: 30 * 1000,
  });

  if (!stats) return null;

  const hasAny = (stats.participants?.length ?? 0) > 0
    || (stats.invitedParticipants?.length ?? 0) > 0
    || (stats.notGoingParticipants?.length ?? 0) > 0;

  if (!hasAny) return null;

  return (
    <div className="mx-4 my-2" data-testid="completion-stats">
      <ParticipantsList
        participants={stats.participants ?? []}
        invitedParticipants={stats.invitedParticipants}
        notGoingParticipants={stats.notGoingParticipants}
        totalParticipants={stats.totalParticipants}
        completedCount={stats.completedCount}
        currentUserId={currentUserId}
        organizerId={organizerId}
        trackCompletion={trackCompletion}
      />
    </div>
  );
}
