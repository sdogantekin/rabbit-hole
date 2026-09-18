import { Pressable, Text, View } from 'react-native';

import { getCategoryColor, getCategoryTint } from '@/constants/category-colors';
import type { InterestCategory } from '@/constants/interest-categories';
import { colors, fonts } from '@/constants/theme';

interface InterestCardProps {
  category: InterestCategory;
  selected: boolean;
  onPress: () => void;
}

export function InterestCard({ category, selected, onPress }: InterestCardProps) {
  const accent = getCategoryColor(category.id);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: 14,
        // Fixed height so a 2-line label ("Space & Astronomy") and a 1-line label
        // ("History") produce the same card size instead of an uneven grid. minHeight alone
        // isn't enough on its own — without an explicit lineHeight, the default font metrics
        // for a wrapped 2-line label were taller than this floor, so the card grew past it
        // anyway while its 1-line row-mate stayed at the (too-small) minimum. Padding
        // (14+14=28) + 2 lines at the lineHeight set below (18*2=36) = 64, so 66 leaves a
        // couple of px of headroom rather than sitting exactly on the boundary.
        minHeight: 66,
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: selected ? accent : colors.border,
        backgroundColor: selected ? getCategoryTint(category.id) : colors.surface,
      }}
    >
      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: accent }} />
      <Text
        style={{
          flexShrink: 1,
          fontFamily: fonts.sansSemiBold,
          fontSize: 14,
          lineHeight: 18,
          color: colors.ink,
        }}
        numberOfLines={2}
      >
        {category.label}
      </Text>
    </Pressable>
  );
}
