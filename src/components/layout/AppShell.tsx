import { useState, useCallback, useMemo } from 'react';
import { Outlet, useMatch } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Sidebar } from './Sidebar';
import type { GroupContext } from './Sidebar';
import { Header } from './Header';
import { getGroup } from '@/lib/api';

const COLLAPSED_KEY = 'sidebar-collapsed';

export function AppShell() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(() => localStorage.getItem(COLLAPSED_KEY) === 'true');

  const handleToggleCollapse = useCallback(() => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSED_KEY, String(next));
      return next;
    });
  }, []);

  // Detect if we're inside a group route
  const groupMatch = useMatch('/groups/:groupId/*');
  const groupId = groupMatch?.params.groupId;
  // Don't trigger group mode for the bare /groups/:groupId path (that redirects to /tasks)
  const isGroupSubRoute = !!groupId && !!groupMatch?.params['*'];

  const { data: groupData } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => getGroup(groupId!),
    enabled: !!groupId && isGroupSubRoute,
    staleTime: 5 * 60 * 1000,
  });

  const groupContext: GroupContext | null = useMemo(() => {
    if (!isGroupSubRoute || !groupData?.group) return null;
    return {
      groupId: groupData.group.id,
      groupName: groupData.group.name,
      groupColor: groupData.group.color,
    };
  }, [isGroupSubRoute, groupData?.group]);

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar — always visible on desktop (lg+), toggleable on mobile */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        collapsed={groupContext ? false : collapsed}
        onToggleCollapse={handleToggleCollapse}
        groupContext={groupContext}
      />

      {/* Main content area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header — hidden on desktop */}
        <Header onMenuToggle={() => setSidebarOpen(!sidebarOpen)} />

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
