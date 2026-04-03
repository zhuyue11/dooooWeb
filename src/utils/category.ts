// ── Category color and name utilities ────────────────────────────────
import type { Category } from '@/types/api';

/** Hardcoded category colors for seed/default categories (bg + text pairs). */
export const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  cme63mc0q0005f2ui0dfg1tqg: { bg: '#dbeafe', text: '#1e40af' },  // Work
  cme63mc0q0006f2ui0dfg1tqh: { bg: '#d1fae5', text: '#065f46' },  // Personal
  cme63mc0q000af2ui0dfg1tql: { bg: '#ffedd5', text: '#9a3412' },  // Home
  cme63mc0q000bf2ui0dfg1tqm: { bg: '#cffafe', text: '#155e75' },  // Travel
  cme63mc0q0007f2ui0dfg1tqi: { bg: '#fef3c7', text: '#92400e' },  // Shopping
  cme63mc0q0008f2ui0dfg1tqj: { bg: '#fce7f3', text: '#9d174d' },  // Health
  cme63mc0q0009f2ui0dfg1tqk: { bg: '#eef2ff', text: '#3730a3' },  // Learning
};

export const CATEGORY_NAMES: Record<string, string> = {
  cme63mc0q0005f2ui0dfg1tqg: 'Work',
  cme63mc0q0006f2ui0dfg1tqh: 'Personal',
  cme63mc0q000af2ui0dfg1tql: 'Home',
  cme63mc0q000bf2ui0dfg1tqm: 'Travel',
  cme63mc0q0007f2ui0dfg1tqi: 'Shopping',
  cme63mc0q0008f2ui0dfg1tqj: 'Health',
  cme63mc0q0009f2ui0dfg1tqk: 'Learning',
};

export const DEFAULT_CATEGORY_COLOR = { bg: '#f3f4f6', text: '#374151' };

/** Resolve category color: first try the fetched categories list, then fall back to hardcoded map. */
export function getCategoryColor(
  categoryId: string | undefined,
  categories?: Category[],
): { bg: string; text: string } {
  if (!categoryId) return DEFAULT_CATEGORY_COLOR;

  // Try fetched categories first (they have a `color` field)
  if (categories) {
    const cat = categories.find((c) => c.id === categoryId);
    if (cat?.color) {
      // Generate pastel bg + dark text from the category's hex color
      return { bg: `${cat.color}20`, text: cat.color };
    }
  }

  // Fall back to hardcoded seed colors
  return CATEGORY_COLORS[categoryId] || DEFAULT_CATEGORY_COLOR;
}

/** Resolve category name from fetched categories or hardcoded fallback. */
export function getCategoryName(
  categoryId: string | undefined,
  categories?: Category[],
): string | undefined {
  if (!categoryId) return undefined;
  if (categories) {
    const cat = categories.find((c) => c.id === categoryId);
    if (cat) return cat.name;
  }
  return CATEGORY_NAMES[categoryId];
}
