import { categoryAccent, categoryTint, colors } from '@/constants/theme';
import { INTEREST_CATEGORIES } from '@/constants/interest-categories';

// Same accent/tint hue-spread formula as the design canvas, applied to our real curated
// categories (each carries its own `hue` in constants/interest-categories.ts).
const ACCENT_BY_ID: Record<string, string> = Object.fromEntries(
  INTEREST_CATEGORIES.map((c) => [c.id, categoryAccent(c.hue)]),
);
const TINT_BY_ID: Record<string, string> = Object.fromEntries(
  INTEREST_CATEGORIES.map((c) => [c.id, categoryTint(c.hue)]),
);

export const DEFAULT_ACCENT_COLOR = colors.inkMuted;

export function getCategoryColor(categoryId: string): string {
  return ACCENT_BY_ID[categoryId] ?? DEFAULT_ACCENT_COLOR;
}

export function getCategoryTint(categoryId: string): string {
  return TINT_BY_ID[categoryId] ?? colors.neutralWash;
}
