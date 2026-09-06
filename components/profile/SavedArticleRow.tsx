import { Pressable, Text, View } from 'react-native';

import { getCategoryColor } from '@/constants/category-colors';
import { colors, fonts } from '@/constants/theme';
import type { SavedArticle } from '@/lib/supabase/queries/saved-articles';

interface SavedArticleRowProps {
  article: SavedArticle;
  onPress: () => void;
}

// Shared by the profile screen's preview list and the full "liked articles" screen.
export function SavedArticleRow({ article, onPress }: SavedArticleRowProps) {
  return (
    <Pressable onPress={onPress} style={styles.row}>
      <View style={[styles.dot, { backgroundColor: getCategoryColor(article.categories[0] ?? '') }]} />
      <Text style={styles.title} numberOfLines={1}>
        {article.title}
      </Text>
    </Pressable>
  );
}

const styles = {
  row: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 10,
    padding: 12,
    borderRadius: 12,
    backgroundColor: colors.surface,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  title: { flex: 1, fontFamily: fonts.sans, fontSize: 13, color: colors.ink },
};
