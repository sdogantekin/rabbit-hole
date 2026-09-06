import { Text, View } from 'react-native';

import { getCategoryTint } from '@/constants/category-colors';
import { colors, fonts } from '@/constants/theme';
import type { FeedCard } from '@/lib/supabase/queries/feed';

interface ArticleCardPeekProps {
  card: FeedCard;
}

// Simplified stand-in shown behind the top card in the deck — just enough shape to read
// as "there's more," without competing with the interactive card on top.
export function ArticleCardPeek({ card }: ArticleCardPeekProps) {
  return (
    <View
      style={{
        flex: 1,
        overflow: 'hidden',
        borderRadius: 24,
        backgroundColor: colors.surface,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 4 },
      }}
    >
      <View style={{ height: '46%', width: '100%', backgroundColor: getCategoryTint(card.categoryId) }} />
      <View style={{ padding: 18 }}>
        <Text
          style={{ fontFamily: fonts.serif, fontSize: 19, color: colors.ink, opacity: 0.55 }}
          numberOfLines={1}
        >
          {card.title}
        </Text>
      </View>
    </View>
  );
}
