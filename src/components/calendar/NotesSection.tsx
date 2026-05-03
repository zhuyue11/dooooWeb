import { useState, useCallback } from 'react';
import { Icon } from '@/components/ui/Icon';
import { useTranslation } from 'react-i18next';
import { getAvatarColorVar } from '@/utils/avatarColor';
import type { Note } from '@/lib/api';

interface NotesSectionProps {
  notes: Note[];
  total: number;
  loading: boolean;
  currentUserId?: string;
  onAddNote: (content: string) => Promise<unknown>;
  onUpdateNote: (noteId: string, content: string) => Promise<unknown>;
  onDeleteNote: (noteId: string) => Promise<unknown>;
  isAdding?: boolean;
  isGroupTask?: boolean;
}

function MiniAvatar({ name }: { name: string }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <div
      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
      style={{ backgroundColor: getAvatarColorVar(name) }}
    >
      {initials}
    </div>
  );
}

function formatRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function NoteItem({
  note,
  currentUserId,
  onUpdate,
  onDelete,
}: {
  note: Note;
  currentUserId?: string;
  onUpdate: (noteId: string, content: string) => Promise<unknown>;
  onDelete: (noteId: string) => Promise<unknown>;
}) {
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(note.content);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isAuthor = note.user.id === currentUserId;

  const handleSave = useCallback(async () => {
    if (editContent.trim() && editContent.trim() !== note.content) {
      await onUpdate(note.id, editContent.trim());
    }
    setEditing(false);
  }, [editContent, note.id, note.content, onUpdate]);

  const handleDelete = useCallback(async () => {
    await onDelete(note.id);
    setConfirmDelete(false);
  }, [note.id, onDelete]);

  return (
    <div className="flex gap-2.5 py-2">
      <MiniAvatar name={note.user.name || note.user.email} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-(--el-group-title)">{note.user.name || note.user.email}</span>
          <span className="text-[10px] text-(--el-group-description)">{formatRelativeTime(note.createdAt)}</span>
          {isAuthor && !editing && (
            <div className="ml-auto flex items-center gap-1">
              <button
                onClick={() => { setEditContent(note.content); setEditing(true); }}
                className="flex h-5 w-5 items-center justify-center rounded text-(--el-group-description) hover:text-(--el-group-title)"
              >
                <Icon name="edit" size={12} />
              </button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="flex h-5 w-5 items-center justify-center rounded text-(--el-group-description) hover:text-(--el-view-delete-text)"
              >
                <Icon name="delete" size={12} />
              </button>
            </div>
          )}
        </div>
        {editing ? (
          <div className="mt-1 flex flex-col gap-1.5">
            <textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="w-full rounded-(--radius-input) border border-(--el-input-border) bg-(--el-input-bg) px-(--spacing-input-x) py-(--spacing-input-y) text-xs text-(--el-input-text) focus:border-(--el-input-focus-border) focus:outline-none"
              rows={2}
              autoFocus
            />
            <div className="flex gap-1.5">
              <button
                onClick={handleSave}
                className="rounded-(--radius-btn) bg-(--el-btn-primary-bg) px-(--spacing-btn-x-sm) py-(--spacing-btn-y-sm) text-[11px] font-medium text-(--el-btn-primary-text)"
              >
                Save
              </button>
              <button
                onClick={() => setEditing(false)}
                className="rounded-(--radius-btn) border border-(--el-btn-outline-border) px-(--spacing-btn-x-sm) py-(--spacing-btn-y-sm) text-[11px] font-medium text-(--el-btn-outline-text)"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="mt-0.5 text-xs text-(--el-panel-description) whitespace-pre-wrap">{note.content}</p>
        )}
        {confirmDelete && (
          <div className="mt-1.5 flex items-center gap-2 rounded-(--radius-card) bg-(--el-dialog-bg) p-2 border border-(--el-card-border)">
            <span className="text-[11px] text-(--el-panel-description)">Delete this note?</span>
            <button
              onClick={handleDelete}
              className="rounded-(--radius-btn) bg-(--el-dialog-confirm-bg) px-(--spacing-btn-x-sm) py-0.5 text-[11px] font-medium text-(--el-dialog-confirm-text)"
            >
              Delete
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="text-[11px] font-medium text-(--el-btn-outline-text)"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export function NotesSection({ notes, total, loading, currentUserId, onAddNote, onUpdateNote, onDeleteNote, isAdding, isGroupTask }: NotesSectionProps) {
  const { t } = useTranslation();
  const [showAll, setShowAll] = useState(false);
  const [newNote, setNewNote] = useState('');

  // Use group-specific labels for group tasks, personal labels otherwise
  const titleKey = isGroupTask ? 'notes.titleGroup' : 'notes.title';
  const addNoteKey = isGroupTask ? 'notes.addNoteGroup' : 'notes.addNote';
  const placeholderKey = isGroupTask ? 'notes.placeholderGroup' : 'notes.placeholder';
  const [showInput, setShowInput] = useState(false);

  const handleAdd = useCallback(async () => {
    if (!newNote.trim()) return;
    await onAddNote(newNote.trim());
    setNewNote('');
    setShowInput(false);
  }, [newNote, onAddNote]);

  const displayNotes = showAll ? notes : notes.slice(0, 3);

  if (loading && notes.length === 0) return null;

  return (
    <div className="px-4" data-testid="notes-section">
      {/* Header */}
      <div className="flex items-center justify-between py-2">
        <span className="text-xs font-semibold text-(--el-panel-detail-label)">
          {t(titleKey)}
          {total > 0 && ` (${total})`}
        </span>
        {!showInput && (
          <button
            onClick={() => setShowInput(true)}
            className="flex items-center gap-1 text-[11px] font-medium text-(--el-btn-primary-bg) hover:opacity-80"
          >
            <Icon name="add" size={14} color="var(--el-btn-primary-bg)" />
            {t(addNoteKey)}
          </button>
        )}
      </div>

      {/* Add note input */}
      {showInput && (
        <div className="mb-3 flex flex-col gap-1.5">
          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder={t(placeholderKey)}
            className="w-full rounded-(--radius-input) border border-(--el-input-border) bg-(--el-input-bg) px-(--spacing-input-x) py-(--spacing-input-y) text-xs text-(--el-input-text) placeholder:text-(--el-input-placeholder) focus:border-(--el-input-focus-border) focus:outline-none"
            rows={3}
            autoFocus
          />
          <div className="flex gap-1.5">
            <button
              onClick={handleAdd}
              disabled={!newNote.trim() || isAdding}
              className="rounded-(--radius-btn) bg-(--el-btn-primary-bg) px-(--spacing-btn-x-sm) py-(--spacing-btn-y-sm) text-[11px] font-semibold text-(--el-btn-primary-text) disabled:opacity-50"
            >
              {t(addNoteKey)}
            </button>
            <button
              onClick={() => { setShowInput(false); setNewNote(''); }}
              className="rounded-(--radius-btn) border border-(--el-btn-outline-border) px-(--spacing-btn-x-sm) py-(--spacing-btn-y-sm) text-[11px] font-medium text-(--el-btn-outline-text)"
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Notes list */}
      {displayNotes.length > 0 && (
        <div className="flex flex-col divide-y divide-(--el-panel-separator)">
          {displayNotes.map((note) => (
            <NoteItem
              key={note.id}
              note={note}
              currentUserId={currentUserId}
              onUpdate={onUpdateNote}
              onDelete={onDeleteNote}
            />
          ))}
        </div>
      )}

      {/* Show all toggle */}
      {notes.length > 3 && !showAll && (
        <button
          onClick={() => setShowAll(true)}
          className="mt-1 text-xs font-medium text-(--el-btn-primary-bg)"
        >
          {t('itemView.showMore')} ({notes.length - 3})
        </button>
      )}
      {showAll && notes.length > 3 && (
        <button
          onClick={() => setShowAll(false)}
          className="mt-1 text-xs font-medium text-(--el-btn-primary-bg)"
        >
          {t('itemView.showLess')}
        </button>
      )}
    </div>
  );
}
