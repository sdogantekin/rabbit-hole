import { View } from 'react-native';

import { InterestCard } from '@/components/interests/InterestCard';
import { INTEREST_CATEGORIES } from '@/constants/interest-categories';

interface InterestGridProps {
  selected: string[];
  onToggle: (slug: string) => void;
}

export function InterestGrid({ selected, onToggle }: InterestGridProps) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {INTEREST_CATEGORIES.map((category) => (
        <View key={category.id} style={{ width: '48%' }}>
          <InterestCard
            category={category}
            selected={selected.includes(category.slug)}
            onPress={() => onToggle(category.slug)}
          />
        </View>
      ))}
    </View>
  );
}
