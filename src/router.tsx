import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '@/components/layout/AppShell';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { PublicRoute } from '@/components/layout/PublicRoute';

// Auth pages
import { LoginPage } from '@/pages/auth/LoginPage';
import { EmailLoginPage } from '@/pages/auth/EmailLoginPage';
import { RegisterPage } from '@/pages/auth/RegisterPage';
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage';

// Main pages
import { HomePage } from '@/pages/home/HomePage';
import { CalendarPage } from '@/pages/home/CalendarPage';
import { TodoPage } from '@/pages/home/TodoPage';
import { SearchPage } from '@/pages/home/SearchPage';

// Groups
import { GroupListPage } from '@/pages/groups/GroupListPage';
import { GroupTodoPage } from '@/pages/groups/GroupTodoPage';
import { GroupCalendarPage } from '@/pages/groups/GroupCalendarPage';
import { GroupChatPage } from '@/pages/groups/GroupChatPage';
import { GroupMembersPage } from '@/pages/groups/GroupMembersPage';
import { GroupSettingsPage } from '@/pages/groups/GroupSettingsPage';

// Targets & Plans
import { TargetPlanHomePage } from '@/pages/targets/TargetPlanHomePage';
import { TargetDetailPage } from '@/pages/targets/TargetDetailPage';
import { PlanListPage } from '@/pages/targets/PlanListPage';
import { PlanDetailPage } from '@/pages/targets/PlanDetailPage';
import { AIChatPage } from '@/pages/targets/AIChatPage';

// Items (view/edit)
import { ItemViewPage } from '@/pages/items/ItemViewPage';
import { ItemEditorPage } from '@/pages/items/ItemEditorPage';

// Other
import { StatisticsPage } from '@/pages/statistics/StatisticsPage';
import { NotificationPage } from '@/pages/notifications/NotificationPage';

// Settings
import { SettingsPage } from '@/pages/settings/SettingsPage';
import { ProfilePage } from '@/pages/settings/ProfilePage';
import { AccountInfoPage } from '@/pages/settings/AccountInfoPage';
import { ThemeSettingsPage } from '@/pages/settings/ThemeSettingsPage';
import { LanguageSettingsPage } from '@/pages/settings/LanguageSettingsPage';
import { DisplaySettingsPage } from '@/pages/settings/DisplaySettingsPage';
import { NotificationSettingsPage } from '@/pages/settings/NotificationSettingsPage';
import { PrivacySecurityPage } from '@/pages/settings/PrivacySecurityPage';
import { HelpPage } from '@/pages/settings/HelpPage';
import { AboutPage } from '@/pages/settings/AboutPage';

export const router = createBrowserRouter([
  // Public routes (redirect to /home if authenticated)
  {
    element: <PublicRoute />,
    children: [
      { path: '/login', element: <LoginPage /> },
      { path: '/login/email', element: <EmailLoginPage /> },
      { path: '/register', element: <RegisterPage /> },
      { path: '/forgot-password', element: <ForgotPasswordPage /> },
    ],
  },

  // Protected routes (redirect to /login if not authenticated)
  {
    element: <ProtectedRoute />,
    children: [
      {
        element: <AppShell />,
        children: [
          { index: true, element: <Navigate to="/home" replace /> },
          { path: '/home', element: <HomePage /> },
          { path: '/calendar', element: <CalendarPage /> },
          { path: '/todo', element: <TodoPage /> },
          { path: '/search', element: <SearchPage /> },

          // Items (view/edit)
          { path: '/items/new', element: <ItemEditorPage /> },
          { path: '/items/:id/edit', element: <ItemEditorPage /> },
          { path: '/items/:id', element: <ItemViewPage /> },

          // Groups
          { path: '/groups', element: <GroupListPage /> },
          { path: '/groups/:groupId', element: <Navigate to="tasks" replace /> },
          { path: '/groups/:groupId/tasks', element: <GroupTodoPage /> },
          { path: '/groups/:groupId/calendar', element: <GroupCalendarPage /> },
          { path: '/groups/:groupId/chat', element: <GroupChatPage /> },
          { path: '/groups/:groupId/members', element: <GroupMembersPage /> },
          { path: '/groups/:groupId/settings', element: <GroupSettingsPage /> },

          // Targets & Plans
          { path: '/targets', element: <TargetPlanHomePage /> },
          { path: '/targets/:targetId', element: <TargetDetailPage /> },
          { path: '/plans', element: <PlanListPage /> },
          { path: '/plans/:planId', element: <PlanDetailPage /> },
          { path: '/ai-chat', element: <AIChatPage /> },

          // Statistics
          { path: '/statistics', element: <StatisticsPage /> },

          // Notifications
          { path: '/notifications', element: <NotificationPage /> },

          // Settings
          { path: '/settings', element: <SettingsPage /> },
          { path: '/settings/profile', element: <ProfilePage /> },
          { path: '/settings/account', element: <AccountInfoPage /> },
          { path: '/settings/theme', element: <ThemeSettingsPage /> },
          { path: '/settings/language', element: <LanguageSettingsPage /> },
          { path: '/settings/display', element: <DisplaySettingsPage /> },
          { path: '/settings/notifications', element: <NotificationSettingsPage /> },
          { path: '/settings/privacy', element: <PrivacySecurityPage /> },
          { path: '/settings/help', element: <HelpPage /> },
          { path: '/settings/about', element: <AboutPage /> },
        ],
      },
    ],
  },
]);
