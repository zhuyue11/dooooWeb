import { useState, useCallback, useRef, useEffect } from 'react';
import { Icon } from '@/components/ui/Icon';
import type { ItemMenuItem } from '@/utils/itemMenuItems';

interface ItemActionsMenuProps {
  items: ItemMenuItem[];
}

export function ItemActionsMenu({ items }: ItemActionsMenuProps) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const handleToggle = useCallback(() => setOpen((v) => !v), []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open]);

  if (items.length === 0) return null;

  return (
    <div ref={menuRef} className="relative">
      <button
        data-testid="item-actions-menu-trigger"
        onClick={handleToggle}
        className="flex h-8 w-8 items-center justify-center rounded-(--radius-card) text-(--el-panel-icon-btn) hover:bg-(--el-panel-icon-hover-bg)"
      >
        <Icon name="more_vert" size={18} />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 min-w-[200px] rounded-(--radius-modal) border border-(--el-popover-border) bg-(--el-popover-bg) py-1 shadow-(--shadow-elevated)">
          {items.map((item) => (
            <button
              key={item.key}
              data-testid={`menu-item-${item.key}`}
              onClick={() => {
                setOpen(false);
                item.onSelect();
              }}
              className={`flex w-full items-center gap-3 px-3 py-2 text-left text-[13px] font-medium hover:bg-(--el-popover-item-hover) ${
                item.destructive ? 'text-(--el-view-delete-text)' : 'text-(--el-popover-text)'
              }`}
            >
              <Icon
                name={item.icon}
                size={16}
                color={item.destructive ? 'var(--el-view-delete-text)' : 'var(--el-popover-text)'}
              />
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
