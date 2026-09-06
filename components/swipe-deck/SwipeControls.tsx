import { Ionicons } from '@expo/vector-icons';
import { Pressable, View } from 'react-native';

import { colors } from '@/constants/theme';
import { t } from '@/lib/localization';

interface SwipeControlsProps {
  onSkip: () => void;
  onLike: () => void;
  disabled?: boolean;
}

// Accessible, tap-target alternative to the swipe gesture (requirements.md §7). Wired by
// the feed screen to the exact same handler the gesture uses — one code path either way.
export function SwipeControls({ onSkip, onLike, disabled }: SwipeControlsProps) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 28, paddingTop: 16 }}>
      <Pressable
        onPress={onSkip}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={t('feed.controls.skipLabel')}
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          borderWidth: 1.5,
          borderColor: colors.negativeBorder,
          backgroundColor: colors.surface,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="close" size={22} color={colors.negative} />
      </Pressable>
      <Pressable
        onPress={onLike}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityLabel={t('feed.controls.likeLabel')}
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: colors.accent,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: colors.accent,
          shadowOpacity: 0.35,
          shadowRadius: 16,
          shadowOffset: { width: 0, height: 6 },
        }}
      >
        <Ionicons name="heart" size={26} color="#ffffff" />
      </Pressable>
    </View>
  );
}
