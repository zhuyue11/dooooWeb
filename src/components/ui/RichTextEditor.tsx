import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { useEffect, useRef, useCallback } from 'react';
import { Icon } from '@/components/ui/Icon';

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
}

/** Normalize Quill-style empty content to empty string. */
function normalizeEmpty(html: string): string {
  const trimmed = html.trim();
  if (trimmed === '' || trimmed === '<p></p>' || trimmed === '<p><br></p>') return '';
  return html;
}

export function RichTextEditor({ value, onChange, placeholder, className }: RichTextEditorProps) {
  const isInternalChange = useRef(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: 'noopener noreferrer', target: '_blank' },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    onUpdate: ({ editor }) => {
      isInternalChange.current = true;
      onChange(normalizeEmpty(editor.getHTML()));
    },
  });

  // Sync external value changes (e.g., initial load from API)
  useEffect(() => {
    if (!editor) return;
    if (isInternalChange.current) {
      isInternalChange.current = false;
      return;
    }
    const current = normalizeEmpty(editor.getHTML());
    const incoming = normalizeEmpty(value);
    if (current !== incoming) {
      editor.commands.setContent(incoming || '');
    }
  }, [value, editor]);

  const handleLink = useCallback(() => {
    if (!editor) return;
    if (editor.isActive('link')) {
      editor.chain().focus().unsetLink().run();
      return;
    }
    const url = window.prompt('URL');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);

  if (!editor) return null;

  return (
    <div className={className}>
      {/* Toolbar */}
      <div className="mb-2 flex items-center gap-0.5">
        <ToolbarButton
          icon="format_bold"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          icon="format_italic"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <div className="mx-1 h-4 w-px bg-(--el-editor-field-label) opacity-30" />
        <ToolbarButton
          icon="format_list_bulleted"
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          icon="format_list_numbered"
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
        <div className="mx-1 h-4 w-px bg-(--el-editor-field-label) opacity-30" />
        <ToolbarButton
          icon="link"
          active={editor.isActive('link')}
          onClick={handleLink}
        />
        <ToolbarButton
          icon="format_clear"
          active={false}
          onClick={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}
        />
      </div>

      {/* Editor content */}
      <EditorContent
        editor={editor}
        className="rich-text min-h-[60px] text-sm leading-relaxed text-(--el-editor-field-value) focus-within:outline-none [&_.tiptap]:outline-none [&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none [&_.tiptap_p.is-editor-empty:first-child::before]:float-left [&_.tiptap_p.is-editor-empty:first-child::before]:h-0 [&_.tiptap_p.is-editor-empty:first-child::before]:text-(--el-editor-field-label) [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]"
      />
    </div>
  );
}

function ToolbarButton({ icon, active, onClick }: { icon: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex h-7 w-7 items-center justify-center rounded-(--radius-btn) transition-colors ${
        active
          ? 'bg-(--el-btn-primary-bg) text-(--el-btn-primary-text)'
          : 'text-(--el-editor-field-label) hover:bg-(--el-popover-item-hover)'
      }`}
    >
      <Icon name={icon} size={18} />
    </button>
  );
}
