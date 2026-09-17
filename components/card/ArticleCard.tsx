import { Image } from 'expo-image';
import { useState } from 'react';
import { Linking, Pressable, Text, View } from 'react-native';

import { getCategoryColor } from '@/constants/category-colors';
import { Ionicons } from '@/constants/icons';
import { INTEREST_CATEGORIES } from '@/constants/interest-categories';
import { colors, fonts } from '@/constants/theme';
import { WIKIPEDIA_LICENSE_NAME } from '@/constants/wikipedia-license';
import { t } from '@/lib/localization';
import type { FeedCard } from '@/lib/supabase/queries/feed';

interface ArticleCardProps {
  card: FeedCard;
}

export function ArticleCard({ card }: ArticleCardProps) {
  // react-native's core Image silently renders nothing on failure, with no error signal to
  // react to — expo-image (Expo's recommended replacement, more robust with real-world CDN
  // quirks like a Wikimedia thumbnail still being generated on first request) gives us
  // onError, so a failed load falls back to the same category placeholder as "no thumbnail."
  const [imageFailed, setImageFailed] = useState(false);
  const category = INTEREST_CATEGORIES.find((c) => c.id === card.categoryId);
  const accentColor = getCategoryColor(card.categoryId);

  return (
    <View
      style={{
        flex: 1,
        overflow: 'hidden',
        borderRadius: 24,
        backgroundColor: colors.surface,
        shadowColor: '#000',
        shadowOpacity: 0.08,
        shadowRadius: 14,
        shadowOffset: { width: 0, height: 4 },
      }}
    >
      <View style={{ height: '46%', width: '100%' }}>
        {card.thumbnailUrl && !imageFailed ? (
          <Image
            source={{ uri: card.thumbnailUrl }}
            style={{ flex: 1 }}
            contentFit="cover"
            onError={() => setImageFailed(true)}
          />
        ) : (
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: accentColor,
            }}
          >
            {category ? <Ionicons name={category.icon as never} size={44} color="#ffffff" /> : null}
          </View>
        )}
        {category ? (
          <View
            style={{
              position: 'absolute',
              top: 14,
              left: 14,
              paddingHorizontal: 11,
              paddingVertical: 5,
              borderRadius: 100,
              backgroundColor: accentColor,
            }}
          >
            <Text style={{ fontFamily: fonts.sansBold, fontSize: 11, color: '#fff' }}>{category.label}</Text>
          </View>
        ) : null}
      </View>

      <View style={{ flex: 1, padding: 18, paddingTop: 16 }}>
        <Text
          style={{ fontFamily: fonts.serif, fontSize: 21, color: colors.ink, marginBottom: 8, lineHeight: 26 }}
        >
          {card.title}
        </Text>
        <Text
          style={{ fontFamily: fonts.sans, fontSize: 13.5, lineHeight: 20, color: colors.inkSecondary, flex: 1 }}
          numberOfLines={4}
        >
          {card.extract}
        </Text>

        <Pressable
          onPress={() => Linking.openURL(card.sourceUrl)}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
            paddingTop: 10,
            marginTop: 8,
            borderTopWidth: 1,
            borderTopColor: colors.neutralWash,
          }}
        >
          <Text style={{ fontFamily: fonts.sans, fontSize: 11, color: colors.inkFaint }}>
            {t('feed.card.attributionCta')}
          </Text>
          <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 11, color: colors.accent }}>
            Wikipedia ↗ · {WIKIPEDIA_LICENSE_NAME}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
