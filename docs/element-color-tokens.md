# Element-Specific Color Token System

## Overview

dooooWeb uses an element-specific color token system where every UI element has its own named CSS variable (`--el-*`). Each Color Palette provides a complete mapping of all element tokens to colors from its design system. Components reference `--el-*` variables, never generic tokens like `bg-primary`.

**Two independent axes:**
- **Color Palette** — controls all `--el-*` color tokens (273 tokens)
- **Display Style** — controls shape tokens (`--radius-*`, `--shadow-*`, `--spacing-*`)

## Current Status

### Completed
- [x] Default light mode tokens defined (`:root` in `element-tokens.css`)
- [x] Default dark mode tokens defined (`[data-theme="dark"]` in `element-tokens.css`)
- [x] Earth palette fully documented with design system color references (`palettes/earth.css`) — **reference implementation**
- [x] Warm palette fully documented with Clay design system colors (`palettes/warm.css`) — light + dark
- [x] Fresh palette complete (`palettes/fresh.css`) — light + dark
- [x] Ocean palette complete (`palettes/ocean.css`) — light + dark
- [x] Yellow palette complete (`palettes/yellow.css`) — light + dark
- [x] Pink palette complete (`palettes/pink.css`) — light + dark
- [x] All 6 palettes have both light and dark mode variants
- [x] Button, Card, Input, Toast components migrated to `--el-*` tokens
- [x] File structure: `element-tokens.css` (defaults) + `palettes/{name}.css` (per palette)

### Remaining Work

#### 1. Rewrite palette files with proper documentation (5 files)

Each palette file needs the same treatment as `earth.css`:
- Color palette documented in header comment (all named colors from the design system)
- Every `--el-*` token assigned with a comment tracing it to a named palette color
- Both light and dark mode variants for schemeable palettes (warm, fresh)

| File | Source Design System | Status |
|------|---------------------|--------|
| `palettes/earth.css` | Starbucks DESIGN.md | ✅ Complete — reference |
| `palettes/warm.css` | Clay DESIGN.md | ✅ Complete — light + dark, documented |
| `palettes/fresh.css` | Mintlify DESIGN.md | ✅ Complete — light + dark |
| `palettes/ocean.css` | Original doooo theme | ✅ Complete — light + dark |
| `palettes/yellow.css` | Original doooo theme | ✅ Complete — light + dark |
| `palettes/pink.css` | Original doooo theme | ✅ Complete — light + dark |

**How to write a palette file:**
1. Read the DESIGN.md from `/tmp/design-md-explore/{name}/DESIGN.md`
2. List ALL colors from the design system in the header comment
3. For each of the 273 `--el-*` tokens, assign a color from the palette with a `/* Color Name */` comment
4. Think about design intent — don't randomly assign colors. E.g., task cards should use the palette's primary tint, events should use a secondary color, etc.
5. For schemeable palettes (warm, earth, fresh), also write the `[data-palette="X"][data-theme="dark"]` block

#### 2. Migrate all components to `--el-*` tokens (~85 files, ~1062 replacements)

Components currently use generic Tailwind theme tokens (`bg-primary`, `text-foreground`, `border-border`, etc.). Each needs to be replaced with the element-specific `--el-*` token.

**Important:** The same `bg-primary` in different components maps to DIFFERENT element tokens:
- `bg-primary` in a button → `bg-(--el-btn-primary-bg)`
- `bg-primary` in the calendar add button → `bg-(--el-cal-add-btn-bg)`
- `bg-primary` in a sidebar active item → `bg-(--el-sidebar-item-active-bg)`

This must be done per-component, not as a blanket find-and-replace.

**Already migrated:**
- `Button.tsx` — uses `--el-btn-*` tokens
- `Card.tsx` — uses `--el-card-*` tokens
- `Input.tsx` — uses `--el-input-*` tokens
- `Toast.tsx` — uses `--el-toast-*` tokens

**Migration order (by area):**
1. UI primitives: ConfirmDialog, PopoverWrapper, Switch, CategoryPopover, RepeatPopover, ReminderPicker, DurationPicker, TimePicker, TimeOfDayPicker, TimeZonePicker, CalendarPopover
2. Layout: Sidebar, Header, Logo
3. Calendar: CalendarHeader, WeekGrid, MonthGrid, DayTimeline, ItemCard, ItemRow, ItemPanel
4. Items: ItemFormModal, ItemSidePanel, ItemEditorPage, ItemViewPage
5. Targets: TargetCard, PlanCard, PlanCalendarView, PlanExecutionView, PlanTemplateItem, etc.
6. Groups: GroupCard, GroupFormModal, InviteMemberModal, MemberListItem, etc.
7. Chat: MessageBubble, ChatInputBar, ChatMessageList, AIChatMessage, etc.
8. Notifications: NotificationItem, GroupInvitationCard
9. Auth: LoginPage, RegisterPage, EmailLoginPage, ForgotPasswordPage
10. Settings: ThemeSettingsPage, SettingsPage, LanguageSettingsPage, etc.
11. Other pages: HomePage, TodoPage, SearchPage, StubPage

**How to migrate a component:**
1. Read the component file
2. Find every color-related class (`bg-*`, `text-*`, `border-*`, `color:`, `backgroundColor:`)
3. Replace each with the corresponding `--el-*` token based on the element's semantic role
4. Use `var(--el-*)` for inline styles
5. Verify the component still renders correctly

#### 3. Remove old `--color-*` tokens

Once ALL components are migrated:
1. Remove old `--color-*` definitions from `@theme` in `index.css`
2. Remove old `[data-palette="*"]` blocks from `index.css`
3. Remove old `[data-color="*"]` (Tier 2) blocks from `index.css`
4. Remove old `[data-theme="dark"]` color overrides from `index.css` (keep the shape token dark overrides)
5. Verify build: `npx vite build`
6. Verify no component references `--color-*`: `grep -r 'color-primary\|color-foreground\|color-surface' src/`

#### 4. Update theme-context.tsx

Simplify the theme context:
- Remove `ThemeColor` tier (Tier 2) — no longer needed since element tokens handle everything
- Keep `ThemePattern` (light/dark/auto/system)
- Keep `ColorPalette` (ocean, yellow, pink, warm, earth, fresh)
- Keep `DisplayStyle` (default, soft, flat, pill)
- Remove `THEME_COLORS`, `THEME_COLOR_HEX` arrays
- Remove `ThemeColorSection` from ThemeSettingsPage

#### 5. Update CLAUDE.md

Update the design system token rule to reference `--el-*` instead of `--color-*`.

## File Structure

```
src/styles/
  index.css              — Main CSS: Tailwind import, shape tokens, animations
  element-tokens.css     — Default light + dark element color tokens (653 lines)
  palettes/
    ocean.css            — Ocean palette element tokens
    yellow.css           — Yellow palette element tokens
    pink.css             — Pink palette element tokens
    warm.css             — Warm palette (Clay-inspired) element tokens
    earth.css            — Earth palette (Starbucks-inspired) — REFERENCE FILE
    fresh.css            — Fresh palette (Mintlify-inspired) element tokens
```

## Token Naming Convention

```
--el-{area}-{element}-{property}
```

- **area**: `page`, `sidebar`, `header`, `cal`, `item`, `panel`, `modal`, `editor`, `view`, `btn`, `input`, `card`, `toast`, `dialog`, `popover`, `switch`, `target`, `plan`, `group`, `chat`, `ai`, `notif`, `invite`, `role`, `auth`, `settings`
- **element**: specific UI element (e.g., `item`, `title`, `date-label`, `checkbox`)
- **property**: `bg`, `text`, `border`, `icon`, `hover`, `active`, etc.

## Total Token Count: 273

| Area | Tokens |
|------|--------|
| Layout (page, sidebar, header, logo) | 27 |
| Calendar | 29 |
| Item Row | 24 |
| Item Side Panel | 16 |
| Modals & Forms | 28 |
| Buttons | 12 |
| Inputs | 8 |
| Cards | 2 |
| Toast | 11 |
| Confirm Dialog | 8 |
| Popovers | 8 |
| Switch | 3 |
| Targets & Plans | 17 |
| Groups | 11 |
| Chat & AI | 14 |
| Notifications | 30 |
| Auth | 17 |
| Settings | 8 |

## Design System Sources

The DESIGN.md files are downloaded at `/tmp/design-md-explore/`:
- `starbucks/DESIGN.md` → Earth palette
- `clay/DESIGN.md` → Warm palette (YAML frontmatter format)
- `mintlify/DESIGN.md` → Fresh palette

To re-download: `cd /tmp/design-md-explore && npx getdesign@latest add {name}`

Ocean, Yellow, Pink palettes are original doooo themes — no external DESIGN.md.
