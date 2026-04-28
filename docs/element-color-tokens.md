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
- [x] Default tokens reference `var(--color-primary)` so Tier 2 primary color switch works
- [x] All 6 palettes complete with both light and dark mode variants
- [x] Earth palette fully documented with design system color references — **reference implementation**
- [x] Warm palette documented with Clay design system colors
- [x] File structure: `element-tokens.css` (defaults) + `palettes/{name}.css` (per palette)
- [x] **All ~85 components migrated** to `--el-*` tokens — zero generic color tokens remain
- [x] Old `[data-palette]` `--color-*` blocks removed from `index.css` (palette CSS files handle everything)
- [x] `body` styles updated to `var(--el-page-bg)` / `var(--el-page-text)`
- [x] `theme-context.tsx` comments updated to reflect current system
- [x] CLAUDE.md design system token rule updated to reference `--el-*`

### How to add a new palette

1. Create `palettes/{name}.css` following `earth.css` as reference
2. Document all named colors from the design system in a header comment
3. For each `--el-*` token, assign a color with a `/* Color Name */` comment
4. Think about design intent — task cards use the palette's primary tint, events use a secondary color, etc.
5. For schemeable palettes, write both `[data-palette="X"]` and `[data-palette="X"][data-theme="dark"]` blocks
6. Add the palette name to `COLOR_PALETTES` in `theme-context.tsx` and `PALETTE_COLORS`

### How to add a new component

1. Use `--el-*` tokens for ALL colors — never generic classes like `bg-primary` or `text-foreground`
2. The same semantic role (e.g., "primary button") maps to different tokens in different contexts
3. Find the right token by area: `--el-{area}-{element}-{property}` in `element-tokens.css`
4. Use `var(--el-*)` for inline styles
5. If a new token is needed, add it to `element-tokens.css` (both `:root` and `[data-theme="dark"]`) and all 6 palette files

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
