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
        borderRadius: 14,
        borderWidth: 1.5,
        borderColor: selected ? accent : colors.border,
        backgroundColor: selected ? getCategoryTint(category.id) : colors.surface,
      }}
    >
      <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: accent }} />
      <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 14, color: colors.ink }}>
        {category.label}
      </Text>
    </Pressable>
  );
}
