export interface CategoryWeight {
  categoryId: string;
  weight: number;
}

// Proportional weighted-random draw, not strict top-N (design.md §4) — a heavier category
// can legitimately win more than one slot in a batch since each draw is independent.
export function weightedSampleCategory(categories: CategoryWeight[]): string {
  const total = categories.reduce((sum, c) => sum + c.weight, 0);
  let roll = Math.random() * total;
  for (const category of categories) {
    roll -= category.weight;
    if (roll <= 0) return category.categoryId;
  }
  return categories[categories.length - 1].categoryId;
}

// Exploration pool = curated categories outside the user's own top half by weight — always
// includes every category the user has never touched, which is the actual filter-bubble
// target (design.md §4).
export function pickExplorationCategories(
  userWeights: CategoryWeight[],
  allCategoryIds: string[],
  count: number,
): string[] {
  const sortedByWeightDesc = [...userWeights].sort((a, b) => b.weight - a.weight);
  const topHalfCount = Math.ceil(sortedByWeightDesc.length / 2);
  const topWeighted = new Set(sortedByWeightDesc.slice(0, topHalfCount).map((c) => c.categoryId));
  const explorationPool = allCategoryIds.filter((id) => !topWeighted.has(id));

  const picks: string[] = [];
  for (let i = 0; i < count && explorationPool.length > 0; i++) {
    picks.push(explorationPool[Math.floor(Math.random() * explorationPool.length)]);
  }
  return picks;
}

export function tallyByCategory(categoryIds: string[]): Map<string, number> {
  const tally = new Map<string, number>();
  for (const id of categoryIds) {
    tally.set(id, (tally.get(id) ?? 0) + 1);
  }
  return tally;
}

export function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
