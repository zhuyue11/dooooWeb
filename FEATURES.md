# dooooWeb — Feature Tracker

> Comprehensive tracker for porting all dooooApp (mobile) features to the web platform.
> This document serves as both the feature specification and implementation progress tracker.

## Status Legend

| Symbol | Meaning |
|--------|---------|
| `[ ]` | Not started |
| `[~]` | In progress |
| `[x]` | Complete |
| **P0** | Launch blocker — must ship in Phase 1 |
| **P1** | Important — Phase 2 |
| **P2** | Nice-to-have — Phase 3+ |

---

## Phase 1 — Core MVP (P0)

### 1.1 Authentication

- [ ] Email/password login
- [ ] Email/password registration
- [ ] Password reset flow
- [ ] OAuth: Google sign-in
- [ ] OAuth: Apple sign-in
- [ ] OAuth: WeChat sign-in
- [ ] JWT session management (token storage, refresh, Axios interceptors)
- [ ] Protected route middleware (redirect unauthenticated users)
- [ ] Logout

### 1.2 Task Management

- [ ] Task list view
- [ ] Create task (title, description)
- [ ] Edit task
- [ ] Delete task (with confirmation dialog)
- [ ] Priority levels (None / Low / Medium / High / Urgent)
- [ ] Duration setting (minutes)
- [ ] Time of day assignment (Morning / Afternoon / Evening)
- [ ] Scheduled date picker
- [ ] Due date picker
- [ ] Location field (address, coordinates)
- [ ] First reminder (configurable minutes before)
- [ ] Second reminder
- [ ] Tags / labels
- [ ] Task status toggle (complete / incomplete)
- [ ] Overdue task visual indicators
- [ ] Show-in-to-do-list-when-overdue option

### 1.3 Recurring Tasks

- [ ] Daily recurrence pattern
- [ ] Weekly recurrence pattern with weekday selection
- [ ] Monthly recurrence pattern
- [ ] Yearly recurrence pattern
- [ ] Custom interval support
- [ ] End conditions (by date, by count, never)
- [ ] Individual instance management (modify single occurrence)
- [ ] "Update all future" for recurring task chains
- [ ] Recurring task options modal (edit this / all future instances)

### 1.4 Categories

- [ ] View categories list
- [ ] Create category
- [ ] Edit category (name, color)
- [ ] Delete category
- [ ] Custom color picker
- [ ] Default categories on first use
- [ ] Filter tasks by category

### 1.5 Event Management

Events are a separate concept from tasks — they have no completion tracking, use status-based lifecycle (CONFIRMED / TENTATIVE / CANCELLED), and support guests, RSVP, meeting links, and Google Calendar sync.

- [ ] Item type selector (Task / Event toggle)
- [ ] Create event (title, description)
- [ ] Edit event
- [ ] Delete event (with confirmation)
- [ ] Event status: CONFIRMED / TENTATIVE / CANCELLED
- [ ] Start date / time picker
- [ ] End date / time picker (supports multi-day events)
- [ ] All-day event toggle (hasTime flag)
- [ ] Timezone selection (start + end timezone)
- [ ] Duration setting
- [ ] Location field (address, coordinates, place ID)
- [ ] Guest list management (add / remove by email)
- [ ] Meeting link field (Google Meet, Zoom, etc.)
- [ ] Event reminders (first + second reminder)
- [ ] Event display on calendar (distinct from tasks)

### 1.6 Recurring Events

- [ ] Daily / weekly / monthly / yearly recurrence (same patterns as tasks)
- [ ] Custom interval support
- [ ] End conditions (by date, by count, never)
- [ ] Individual instance management (modify / remove single occurrence)
- [ ] "Update all future" for recurring event chains

### 1.7 Event Attendees & RSVP

- [ ] Attendee list display with RSVP status
- [ ] RSVP actions: Accept / Decline / Tentative / Needs Action
- [ ] Organizer indicator
- [ ] Attendee invitation notifications
- [ ] View events you're attending (as guest)

### 1.8 Google Calendar Sync

- [ ] Bidirectional sync with Google Calendar
- [ ] Google Calendar OAuth connection
- [ ] Auto-sync on event create / update / delete
- [ ] Conflict detection via etag
- [ ] Google Meet link integration
- [ ] Sync status indicators

### 1.9 Calendar Views

- [ ] Week view (default)
- [ ] Month view (full month grid)
- [ ] Day / timeline view with hourly grid
- [ ] Date navigation (today button, prev/next)
- [ ] Task display on calendar cells
- [ ] Task dot indicators on dates
- [ ] Date selection to filter task list

---

## Phase 2 — Collaboration & Planning (P1)

### 2.1 Groups / Teams

- [ ] Group list view (with tabs: All / My Groups / Joined Groups)
- [ ] Create group
- [ ] Edit group details
- [ ] Delete group (owner only)
- [ ] Group detail view
- [ ] Roles: Owner / Admin / Member / Viewer
- [ ] Search / discover public groups
- [ ] Favorite / star groups

### 2.2 Group Members & Invitations

- [ ] Invite members via email
- [ ] View pending invitations
- [ ] Accept / decline group invitations
- [ ] Manage member roles
- [ ] Remove members from group
- [ ] Member list with avatars and roles

### 2.3 Group Chat

- [ ] Real-time messaging via WebSocket
- [ ] Message history with scroll-back / pagination
- [ ] Unread message indicators
- [ ] Chat panel UI in group detail view
- [ ] Message timestamps and sender info

### 2.4 Group Tasks & Events

- [ ] Assign tasks to group members
- [ ] "For All Members" group activity type
- [ ] Track individual completion status per participant
- [ ] Join All / Leave All for recurring group activities
- [ ] Participant RSVP tracking (Invited / Confirmed / Declined / Left)
- [ ] Participant avatar display with completion status
- [ ] Group events (events scoped to a group)
- [ ] Recurring group events with participant management

### 2.5 Targets / Goals

- [ ] Target list view
- [ ] Create target (name, description)
- [ ] Edit target
- [ ] Delete target
- [ ] Target statuses: Active / Completed / Archived
- [ ] Link plans to targets
- [ ] Target detail view with linked plans

### 2.6 Plans & Task Templates

- [ ] Plan list view
- [ ] View plan details and templates
- [ ] AI-generated plans (from AI Planner)
- [ ] Plan statuses: Saved / In Progress / Completed
- [ ] Task templates within plans (title, description, duration, time, repeat)
- [ ] Event templates within plans
- [ ] Template ordering (drag-and-drop reorder)
- [ ] Gap days between tasks configuration

### 2.7 Plan Execution

- [ ] Start / execute plan screen
- [ ] Drag-and-drop task scheduling onto calendar
- [ ] Conflict detection for time slots
- [ ] Time preference modal (morning / afternoon / evening)
- [ ] Scheduling modes (spread vs. concentrated)
- [ ] Week-by-week preview with pager
- [ ] Smart start date selection
- [ ] Confirm and execute (create actual tasks and events from templates)

### 2.8 AI Chat Planner

- [ ] Chat interface UI
- [ ] Streaming AI responses via SSE (Server-Sent Events)
- [ ] Plan generation from conversation
- [ ] Recommended plans display
- [ ] Plan preview before saving
- [ ] Save generated plans to profile
- [ ] Session persistence (resume previous planning sessions)
- [ ] Chat history management
- [ ] Off-topic detection with redirect prompts

---

## Phase 3 — Advanced Features (P2)

### 3.1 Advanced Search

- [ ] Text search across tasks and events
- [ ] Filter by priority
- [ ] Filter by category
- [ ] Filter by plan
- [ ] Filter by target
- [ ] Filter by group
- [ ] Filter by date range
- [ ] Filter by overdue only
- [ ] Combined multi-filter support
- [ ] Visual filter chips for active filters
- [ ] Real-time search results

### 3.2 Notifications

- [ ] Notification list view
- [ ] Task reminder notifications
- [ ] Group invitation notifications
- [ ] Event invitation notifications
- [ ] Group activity notifications
- [ ] Filter by type: All / Unread / Invitations
- [ ] Mark as read (single)
- [ ] Mark all as read
- [ ] Delete notification
- [ ] Unread badge count (sidebar + favicon)
- [ ] Browser push notifications (Web Push API)

### 3.3 Invitation System

- [ ] Group invitation accept / decline
- [ ] Task participant invitation
- [ ] Event invitation with RSVP
- [ ] Invitation history / pending list
- [ ] Notification-linked invitation actions

### 3.4 Statistics & Analytics

- [ ] Task completion statistics overview
- [ ] Completion trend charts (line / bar)
- [ ] Category breakdown (pie / donut chart)
- [ ] Date range selector for analytics
- [ ] Group-level statistics

### 3.5 Calendar — Advanced

- [ ] Five-week expanded view
- [ ] Infinite scroll with virtual scrolling
- [ ] Task drag-and-drop between dates to reschedule
- [ ] Event drag-and-drop between dates to reschedule
- [ ] Multi-day event visual continuations (spanning bars)
- [ ] Hide completed tasks toggle
- [ ] Unified task + event display with visual distinction

### 3.6 Data Sync (Web Adaptation)

- [ ] API client with retry logic and error handling
- [ ] Optimistic UI updates (instant feedback)
- [ ] WebSocket real-time updates
- [ ] Offline indicator banner (when disconnected)
- [ ] IndexedDB local cache (web equivalent of SQLite)
- [ ] Background sync on reconnect

---

## Phase 4 — Settings & Polish (P2)

### 4.1 Account Management

- [ ] Profile view / edit (name, email)
- [ ] Avatar upload and display
- [ ] Password change
- [ ] Account info page

### 4.2 Appearance & Themes

- [ ] Light theme (default)
- [ ] Dark theme
- [ ] Ocean theme
- [ ] Crimson theme
- [ ] Amber theme
- [ ] Yellow theme
- [ ] Cyan theme
- [ ] Purple theme
- [ ] Theme persistence (localStorage)
- [ ] System theme detection (prefers-color-scheme)

### 4.3 Localization & Language

- [ ] Multi-language support (i18n framework)
- [ ] Language switcher UI
- [ ] Timezone awareness
- [ ] Date / time format localization

### 4.4 Notification Settings

- [ ] Reminder timing preferences
- [ ] Notification enable / disable toggles
- [ ] Browser notification permission handling

### 4.5 Data & Privacy

- [ ] Privacy settings page
- [ ] Data export functionality
- [ ] Activity history view
- [ ] Account deletion

### 4.6 Help & Support

- [ ] Help / FAQ page
- [ ] Feedback submission form
- [ ] Bug report form
- [ ] About page with app info and version

---

## Web-Specific Features (not in mobile app)

These are features that take advantage of the web platform and desktop form factor:

- [ ] Keyboard shortcuts (global and contextual)
- [ ] Responsive design (mobile / tablet / desktop breakpoints)
- [ ] Sidebar navigation with collapsible sections
- [ ] Breadcrumb navigation
- [ ] URL-based routing with deep linking
- [ ] Browser tab title updates (dynamic page titles)
- [ ] Print-friendly task / calendar views
- [ ] Right-click context menus
- [ ] Multi-select tasks with Shift / Ctrl+click
- [ ] Bulk task operations (delete, move, categorize)
- [ ] Drag-and-drop file attachments (if applicable)
- [ ] Browser-native date/time pickers as fallback

---

## Architecture Notes

### Recommended Tech Stack

| Layer | Technology | Notes |
|-------|-----------|-------|
| Framework | Next.js 14+ (App Router) | TypeScript, server/client components |
| Styling | Tailwind CSS | Mirrors NativeWind in dooooApp |
| State | React Context + Zustand | Lightweight, similar to mobile patterns |
| API Client | Axios | Same as dooooApp for consistency |
| Auth | NextAuth.js | Google, Apple OAuth support |
| Real-time | Socket.io client | Matches backend WebSocket service |
| Calendar | @fullcalendar/react or custom | Rich calendar with drag-and-drop |
| Drag & Drop | @dnd-kit/core | Plan execution, task reordering |
| Charts | Recharts | Statistics & analytics |
| Forms | React Hook Form + Zod | Validation and form state |
| i18n | next-intl | Matches dooooApp locale structure |
| Testing | Vitest + Playwright | Unit + E2E testing |

### Backend Integration

- Reuses the existing **dooooBackend** API — no backend changes needed for most features
- Same JWT authentication flow
- Same WebSocket service for real-time updates
- API base URL configured via `NEXT_PUBLIC_API_URL` environment variable
- OAuth redirect URIs need to be added for the web domain

### Key Differences from Mobile

| Aspect | dooooApp (Mobile) | dooooWeb (Web) |
|--------|-------------------|----------------|
| Storage | SQLite (expo-sqlite) | IndexedDB or in-memory cache |
| Navigation | React Navigation (stack/tab) | Next.js App Router (URL-based) |
| Styling | NativeWind (Tailwind for RN) | Tailwind CSS (native web) |
| Auth tokens | Expo SecureStore | httpOnly cookies or localStorage |
| Push notifications | Expo Notifications | Web Push API (service worker) |
| Offline support | Full local-first SQLite | IndexedDB cache + optimistic UI |
| Gestures | React Native Gesture Handler | Mouse events, drag API |
| Layout | Mobile-first (single column) | Responsive (sidebar + main content) |
