import { Link } from 'react-router-dom';
import { Plus, Flag } from 'lucide-react';
import { useAuth } from '@/lib/contexts/auth-context';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

function formatDate(): string {
  return new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

// Metric card data (placeholder — will be replaced with real API data)
const METRICS = [
  { label: "Today's Tasks", value: '8', sub: '3 completed', subColor: '#10b981' },
  { label: 'Overdue', value: '2', sub: 'from yesterday', subColor: '#6b7280', valueColor: '#ef4444' },
  { label: 'To-do', value: '12', sub: '5 due today', subColor: '#f59e0b' },
  { label: 'This Week', value: '24', sub: '+5 from last week', subColor: '#3b82f6' },
  { label: 'Completion Rate', value: '73%', sub: '+8% this week', subColor: '#10b981' },
];

// Upcoming tasks (placeholder)
const UPCOMING_TASKS = [
  { title: 'Ship v2.0 release', meta: 'Today · 11:00 AM · Work', priority: 'high' as const },
  { title: 'Lunch with Sara', meta: 'Today · 12:30 PM · Personal', priority: null },
  { title: 'Gym session', meta: 'Today · 6:00 PM · Health', priority: null },
  { title: '1:1 with Mike', meta: 'Tomorrow · Afternoon · Work', priority: null },
];

// Schedule items (placeholder)
const SCHEDULE = [
  { time: '9:00', title: 'Morning standup', bg: '#dbeafe', text: '#1e40af' },
  { time: '11:00', title: 'Ship v2.0 release', bg: '#eef2ff', text: '#360EFF', active: true },
  { time: '12:30', title: 'Lunch with Sara', bg: '#fce7f3', text: '#9d174d' },
  { time: '14:00', title: 'Review PR #247', bg: '#fef3c7', text: '#92400e' },
  { time: '18:00', title: 'Gym session', bg: '#d1fae5', text: '#065f46' },
];

export function HomePage() {
  const { user } = useAuth();
  const firstName = user?.name?.split(' ')[0] || 'there';

  return (
    <div className="flex h-full flex-col gap-6" style={{ fontFamily: 'Inter, sans-serif' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold text-foreground">
            {getGreeting()}, {firstName}
          </h1>
          <p className="text-sm font-medium text-muted-foreground">{formatDate()}</p>
        </div>
        <button className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#360EFF] text-white transition-opacity hover:opacity-90">
          <Plus size={20} />
        </button>
      </div>

      {/* Metrics row */}
      <div className="flex gap-4">
        {METRICS.map((m) => (
          <div
            key={m.label}
            className="flex flex-1 flex-col gap-2 rounded-2xl bg-surface p-5 shadow-[0_1px_3px_rgba(0,0,0,0.04)]"
          >
            <span className="text-[13px] font-medium text-muted-foreground">{m.label}</span>
            <div className="flex items-end gap-2">
              <span className="text-[32px] font-bold leading-none" style={{ color: m.valueColor || 'var(--color-foreground)' }}>
                {m.value}
              </span>
              <span className="text-[13px] font-medium" style={{ color: m.subColor }}>
                {m.sub}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Body: Upcoming Tasks + Today's Schedule */}
      <div className="flex min-h-0 flex-1 gap-4">
        {/* Upcoming Tasks */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-2xl bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <span className="text-base font-semibold text-foreground">Upcoming Tasks</span>
            <Link to="/todo" className="text-[13px] font-medium text-[#360EFF] hover:underline">
              View all
            </Link>
          </div>
          {/* List */}
          <div className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-2">
            {UPCOMING_TASKS.map((task) => (
              <div
                key={task.title}
                className="flex items-center gap-3 rounded-lg px-3 py-2.5"
              >
                {/* Checkbox circle */}
                <div className="h-[18px] w-[18px] flex-shrink-0 rounded-full border-2 border-[#360EFF]" />
                {/* Text */}
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <span className="text-sm font-medium text-foreground">{task.title}</span>
                  <span className="text-xs text-muted-foreground">{task.meta}</span>
                </div>
                {/* Priority flag */}
                {task.priority === 'high' && (
                  <Flag size={16} className="flex-shrink-0 text-[#ef4444]" />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Today's Schedule */}
        <div className="flex flex-1 flex-col overflow-hidden rounded-2xl bg-surface shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border px-5 py-4">
            <span className="text-base font-semibold text-foreground">Today's Schedule</span>
            <Link to="/calendar" className="text-[13px] font-medium text-[#360EFF] hover:underline">
              Open calendar
            </Link>
          </div>
          {/* Timeline */}
          <div className="flex flex-1 flex-col overflow-y-auto px-4 py-2">
            {SCHEDULE.map((item, i) => (
              <div
                key={item.time}
                className={`flex items-center gap-4 py-3 ${i < SCHEDULE.length - 1 ? 'border-b border-border' : ''}`}
              >
                <span
                  className="w-10 text-xs font-medium"
                  style={{ color: item.active ? '#360EFF' : '#6b7280', fontWeight: item.active ? 600 : 500 }}
                >
                  {item.time}
                </span>
                <div
                  className="flex flex-1 items-center rounded-md px-2.5 py-1.5"
                  style={{
                    backgroundColor: item.bg,
                    border: item.active ? '1px solid #360EFF' : 'none',
                  }}
                >
                  <span
                    className="text-[13px] font-medium"
                    style={{ color: item.text, fontWeight: item.active ? 600 : 500 }}
                  >
                    {item.title}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
