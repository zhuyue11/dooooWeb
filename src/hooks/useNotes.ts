import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getNotes, addNote, updateNote, deleteNote } from '@/lib/api';
import type { Note } from '@/lib/api';

type NoteItemType = 'TASK' | 'EVENT' | 'TASK_INSTANCE' | 'EVENT_INSTANCE';

export function useNotes(itemId: string | undefined, itemType: NoteItemType) {
  const queryClient = useQueryClient();
  const queryKey = ['notes', itemType, itemId];

  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => getNotes(itemType, itemId!),
    enabled: !!itemId,
    staleTime: 30 * 1000,
  });

  const addMutation = useMutation({
    mutationFn: (content: string) => addNote(itemType, itemId!, content),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ noteId, content }: { noteId: string; content: string }) => updateNote(noteId, content),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  const deleteMutation = useMutation({
    mutationFn: (noteId: string) => deleteNote(noteId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  });

  return {
    notes: data?.notes ?? [] as Note[],
    total: data?.total ?? 0,
    loading: isLoading,
    addNote: addMutation.mutateAsync,
    updateNote: (noteId: string, content: string) => updateMutation.mutateAsync({ noteId, content }),
    deleteNote: deleteMutation.mutateAsync,
    isAdding: addMutation.isPending,
  };
}
