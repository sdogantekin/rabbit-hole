import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image, Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getCategoryColor } from '@/constants/category-colors';
import { INTEREST_CATEGORIES } from '@/constants/interest-categories';
import { colors, fonts } from '@/constants/theme';
import { WIKIPEDIA_LICENSE_NAME, WIKIPEDIA_LICENSE_URL } from '@/constants/wikipedia-license';
import { t } from '@/lib/localization';
import { useArticleCacheQuery } from '@/lib/supabase/queries/feed';

export default function ArticleReader() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const pageId = Number(id);
  const { data: article, isLoading, isError } = useArticleCacheQuery(pageId, 'en');

  const category = article ? INTEREST_CATEGORIES.find((c) => article.categories.includes(c.id)) : undefined;

  return (
    <View style={{ flex: 1, backgroundColor: colors.appBackground }}>
      <View style={{ paddingTop: insets.top + 8, paddingHorizontal: 18, paddingBottom: 8 }}>
        <Pressable
          onPress={() => router.back()}
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.06)',
          }}
        >
          <Ionicons name="close" size={18} color={colors.inkSecondary} />
        </Pressable>
      </View>

      {isLoading ? (
        <Text style={{ paddingHorizontal: 20, fontFamily: fonts.sans, color: colors.inkSecondary }}>
          {t('reader.loading')}
        </Text>
      ) : isError || !article ? (
        <Text style={{ paddingHorizontal: 20, fontFamily: fonts.sans, color: colors.inkSecondary }}>
          {t('reader.loadError')}
        </Text>
      ) : (
        <ScrollView contentContainerStyle={{ paddingHorizontal: 22, paddingBottom: 40 }}>
          <View
            style={{
              height: 180,
              marginBottom: 8,
              borderRadius: 18,
              overflow: 'hidden',
              backgroundColor: category ? getCategoryColor(category.id) : colors.neutralWash,
            }}
          >
            {article.thumbnail_url ? (
              <Image source={{ uri: article.thumbnail_url }} style={{ flex: 1 }} resizeMode="cover" />
            ) : null}
          </View>

          <Text
            style={{ fontFamily: fonts.serif, fontSize: 26, color: colors.ink, lineHeight: 32, marginBottom: 14 }}
          >
            {article.title}
          </Text>

          {category ? (
            <View
              style={{
                alignSelf: 'flex-start',
                marginBottom: 14,
                paddingHorizontal: 11,
                paddingVertical: 5,
                borderRadius: 100,
                backgroundColor: getCategoryColor(category.id),
              }}
            >
              <Text style={{ fontFamily: fonts.sansBold, fontSize: 11, color: '#fff' }}>{category.label}</Text>
            </View>
          ) : null}

          <Text style={{ fontFamily: fonts.sans, fontSize: 15, lineHeight: 24, color: colors.inkSecondary, marginBottom: 22 }}>
            {article.extract}
          </Text>

          <Pressable
            onPress={() => Linking.openURL(article.source_url)}
            style={{
              alignItems: 'center',
              paddingVertical: 14,
              borderRadius: 14,
              borderWidth: 1.5,
              borderColor: colors.ink,
              marginBottom: 10,
            }}
          >
            <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 14, color: colors.ink }}>
              {t('reader.readOnWikipediaCta')} ↗
            </Text>
          </Pressable>

          <Pressable onPress={() => Linking.openURL(WIKIPEDIA_LICENSE_URL)}>
            <Text style={{ fontFamily: fonts.sans, fontSize: 11.5, color: colors.inkFaint, textAlign: 'center' }}>
              Text available under {WIKIPEDIA_LICENSE_NAME} · {t('feed.card.attributionCta')}
            </Text>
          </Pressable>
        </ScrollView>
      )}
    </View>
  );
}
