import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SavedArticleRow } from '@/components/profile/SavedArticleRow';
import { colors, fonts } from '@/constants/theme';
import { t } from '@/lib/localization';
import { useAuthStore } from '@/lib/store/auth-store';
import { useSavedArticlesQuery } from '@/lib/supabase/queries/saved-articles';

export default function LikedArticles() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const session = useAuthStore((s) => s.session);
  const { data: saved = [] } = useSavedArticlesQuery(session?.user.id);

  return (
    <View style={{ flex: 1, backgroundColor: colors.appBackground, paddingTop: insets.top + 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, marginBottom: 8 }}>
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel={t('likedArticles.backCta')}
          style={{
            width: 34,
            height: 34,
            borderRadius: 17,
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.06)',
          }}
        >
          <Ionicons name="chevron-back" size={20} color={colors.inkSecondary} />
        </Pressable>
      </View>
      <Text
        style={{ fontFamily: fonts.serif, fontSize: 22, color: colors.ink, marginBottom: 16, paddingHorizontal: 24 }}
      >
        {t('likedArticles.title')}
      </Text>
      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40, gap: 8 }}>
        {saved.map((a) => (
          <SavedArticleRow key={`${a.lang}:${a.pageId}`} article={a} onPress={() => router.push(`/card/${a.pageId}`)} />
        ))}
      </ScrollView>
    </View>
  );
}
