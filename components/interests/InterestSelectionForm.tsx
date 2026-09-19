import { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { InterestGrid } from '@/components/interests/InterestGrid';
import { MIN_INTEREST_SELECTION } from '@/constants/interest-categories';
import { colors, fonts } from '@/constants/theme';
import { t } from '@/lib/localization';

interface InterestSelectionFormProps {
  initialSelected: string[];
  onSubmit: (slugs: string[]) => Promise<void> | void;
  submitLabel: string;
  minRequired?: number;
}

// Used by onboarding now; reused as-is from profile settings later (requirements.md §6.1
// requires interests to stay editable after onboarding), so this component knows nothing
// about which context it's rendered in.
export function InterestSelectionForm({
  initialSelected,
  onSubmit,
  submitLabel,
  minRequired = MIN_INTEREST_SELECTION,
}: InterestSelectionFormProps) {
  const insets = useSafeAreaInsets();
  const [selected, setSelected] = useState<string[]>(initialSelected);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggle = (slug: string) => {
    setSelected((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug],
    );
  };

  const canSubmit = selected.length >= minRequired && !isSubmitting;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onSubmit(selected);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, paddingHorizontal: 24 }}>
      <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: colors.inkSecondary, marginBottom: 20 }}>
        {t('onboarding.interests.body', { min: minRequired })}
      </Text>
      {/* The category list has grown since this was first built (18 now, more later) — it
          no longer reliably fits one screen, so only the grid scrolls; the count and CTA
          below stay pinned and reachable regardless of how many categories there are. */}
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 4 }} showsVerticalScrollIndicator={false}>
        <InterestGrid selected={selected} onToggle={toggle} />
      </ScrollView>
      {/* Pinned footer sits at the very bottom of the screen — on 3-button Android
          navigation the system bar isn't part of the OS-reserved layout space RN sees by
          default, so without this the Save button rendered directly behind it, unreachable. */}
      <View style={{ marginTop: 16, gap: 12, paddingBottom: insets.bottom + 12 }}>
        <Text style={{ fontFamily: fonts.sans, fontSize: 13, color: colors.inkSecondary, textAlign: 'center' }}>
          {t('onboarding.interests.selectedCount', { count: selected.length })}
          {selected.length < minRequired
            ? t('onboarding.interests.needMore', { count: minRequired - selected.length })
            : ''}
        </Text>
        <Pressable
          onPress={handleSubmit}
          disabled={!canSubmit}
          style={{
            width: '100%',
            paddingVertical: 16,
            borderRadius: 16,
            alignItems: 'center',
            backgroundColor: canSubmit ? colors.ink : colors.neutralWashStrong,
          }}
        >
          <Text
            style={{
              fontFamily: fonts.sansSemiBold,
              fontSize: 16,
              color: canSubmit ? '#fff' : colors.inkFaint,
            }}
          >
            {isSubmitting ? '…' : submitLabel}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
