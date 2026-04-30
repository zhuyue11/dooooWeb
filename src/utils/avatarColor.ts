/**
 * Per-user avatar color derived from the active color palette.
 *
 * Uses --el-avatar-0 through --el-avatar-7 CSS tokens (defined in
 * element-tokens.css), which are computed from --color-primary,
 * --color-secondary, and --color-accent. Changing the palette
 * automatically changes all avatar colors.
 */

const AVATAR_SLOT_COUNT = 8;

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

/** Returns a CSS variable reference like `var(--el-avatar-3)`. */
export function getAvatarColorVar(name: string): string {
  const slot = hashName(name) % AVATAR_SLOT_COUNT;
  return `var(--el-avatar-${slot})`;
}
