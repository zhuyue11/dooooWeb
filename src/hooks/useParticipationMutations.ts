import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  participateInTask,
  declineParticipation,
  leaveTask,
  markNotGoing,
  inviteParticipants,
  completeParticipantTask,
} from '@/lib/api';

export function useParticipationMutations(taskId: string) {
  const queryClient = useQueryClient();

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['completion-stats', taskId] });
    queryClient.invalidateQueries({ queryKey: ['participation-status', taskId] });
    // Calendar and todo queries
    queryClient.invalidateQueries({ queryKey: ['calendar-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['calendar-assigned-group-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['calendar-recurring-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['todo-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['todo-assigned-group-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-assigned-group-tasks'] });
  };

  const participateMutation = useMutation({
    mutationFn: (args: { participationType: 'next' | 'all' | 'single'; date?: string }) =>
      participateInTask(taskId, args.participationType, args.date),
    onSuccess: invalidateAll,
  });

  const declineMutation = useMutation({
    mutationFn: () => declineParticipation(taskId),
    onSuccess: invalidateAll,
  });

  const leaveMutation = useMutation({
    mutationFn: (args: { leaveType?: 'single' | 'all'; date?: string }) =>
      leaveTask(taskId, args.leaveType, args.date),
    onSuccess: invalidateAll,
  });

  const notGoingMutation = useMutation({
    mutationFn: (args: { date: string; taskInstanceId?: string }) =>
      markNotGoing(taskId, args.date, args.taskInstanceId),
    onSuccess: invalidateAll,
  });

  const inviteMutation = useMutation({
    mutationFn: (args: { userIds: string[]; taskDate?: string }) =>
      inviteParticipants(taskId, args.userIds, args.taskDate),
    onSuccess: invalidateAll,
  });

  const completeMutation = useMutation({
    mutationFn: (args: { isCompleted: boolean; date?: string }) =>
      completeParticipantTask(taskId, args.isCompleted, args.date),
    onSuccess: invalidateAll,
  });

  return {
    participateMutation,
    declineMutation,
    leaveMutation,
    notGoingMutation,
    inviteMutation,
    completeMutation,
  };
}
