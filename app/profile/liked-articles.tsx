import { useRouter } from 'expo-router';
import { ScrollView, Text, View } from 'react-native';

import { SavedArticleRow } from '@/components/profile/SavedArticleRow';
import { colors, fonts } from '@/constants/theme';
import { t } from '@/lib/localization';
import { useAuthStore } from '@/lib/store/auth-store';
import { useSavedArticlesQuery } from '@/lib/supabase/queries/saved-articles';

export default function LikedArticles() {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const { data: saved = [] } = useSavedArticlesQuery(session?.user.id);

  return (
    <View style={{ flex: 1, backgroundColor: colors.appBackground, paddingTop: 64 }}>
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
