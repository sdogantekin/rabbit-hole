import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Image, Modal, Pressable, ScrollView, Text, View } from 'react-native';

import { SavedArticleRow } from '@/components/profile/SavedArticleRow';
import { getCategoryColor } from '@/constants/category-colors';
import { INTEREST_CATEGORIES } from '@/constants/interest-categories';
import { colors, fonts } from '@/constants/theme';
import { BADGE_DEFINITIONS } from '@/lib/badges';
import { t } from '@/lib/localization';
import { useAuthStore } from '@/lib/store/auth-store';
import { useProfileQuery, useUploadAvatarMutation } from '@/lib/supabase/queries/profile';
import { useLatestQuizAccuracyQuery } from '@/lib/supabase/queries/quiz';
import { useSavedArticlesQuery } from '@/lib/supabase/queries/saved-articles';
import { useInterestWeightsQuery } from '@/lib/supabase/queries/user-interests';

const LIKED_PREVIEW_COUNT = 6;

export default function Profile() {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const userId = session?.user.id;

  const { data: profile } = useProfileQuery(userId);
  const { data: weights = [] } = useInterestWeightsQuery(userId);
  const { data: saved = [] } = useSavedArticlesQuery(userId);
  const { data: lastQuizAccuracy = null } = useLatestQuizAccuracyQuery(userId);
  const uploadAvatar = useUploadAvatarMutation(userId);

  const [pickerOpen, setPickerOpen] = useState(false);

  const level = 1 + Math.floor((profile?.discovery_score ?? 0) / 100);

  const weightBars = INTEREST_CATEGORIES.map((c) => ({
    ...c,
    weight: weights.find((w) => w.categoryId === c.id)?.weight ?? 0,
  }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 6);
  const maxWeight = Math.max(1, ...weightBars.map((w) => w.weight));

  const badges = BADGE_DEFINITIONS.map((b) => ({ ...b, earned: b.isEarned(saved, lastQuizAccuracy) }));

  const pickImage = async (source: 'camera' | 'library') => {
    setPickerOpen(false);
    const permission =
      source === 'camera'
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return;

    const options: ImagePicker.ImagePickerOptions = {
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    };
    const result =
      source === 'camera'
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled || !result.assets[0]) return;
    uploadAvatar.mutate(result.assets[0].uri);
  };

  return (
    <ScrollView style={{ flex: 1, backgroundColor: colors.appBackground }} contentContainerStyle={styles.content}>
      <View style={styles.headerRow}>
        <Pressable onPress={() => setPickerOpen(true)} accessibilityLabel={t('profile.avatar.title')}>
          <View style={styles.avatar}>
            {profile?.avatar_url ? (
              <Image source={{ uri: profile.avatar_url }} style={styles.avatarImage} />
            ) : (
              <Ionicons name="person-outline" size={22} color={colors.inkMuted} />
            )}
          </View>
        </Pressable>
        <View>
          <Text style={styles.name}>Explorer</Text>
          <Text style={styles.levelText}>{t('profile.levelLabel', { level })}</Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <StatTile value={profile?.streak_count ?? 0} label={t('profile.stats.streak')} />
        <StatTile value={profile?.discovery_score ?? 0} label={t('profile.stats.xp')} />
        <StatTile value={saved.length} label={t('profile.stats.liked')} />
      </View>

      <View>
        <Text style={styles.sectionTitle}>{t('profile.badgesTitle')}</Text>
        <View style={{ flexDirection: 'row', gap: 14 }}>
          {badges.map((b) => (
            <View key={b.id} style={{ alignItems: 'center', gap: 6, width: 64 }}>
              <View
                style={[
                  styles.badgeCircle,
                  { backgroundColor: b.earned ? colors.badgeEarnedBg : colors.badgeUnearnedBg },
                ]}
              >
                <View
                  style={[
                    styles.badgeDot,
                    { backgroundColor: b.earned ? colors.badgeEarnedDot : colors.badgeUnearnedDot },
                  ]}
                />
              </View>
              <Text
                style={[styles.badgeLabel, { color: b.earned ? colors.ink : colors.inkFaint }]}
                numberOfLines={2}
              >
                {t(b.labelKey)}
              </Text>
            </View>
          ))}
        </View>
      </View>

      <View>
        <Text style={styles.sectionTitle}>{t('profile.weightsTitle')}</Text>
        <View style={{ gap: 9 }}>
          {weightBars.map((w) => (
            <View key={w.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={styles.weightLabel} numberOfLines={1}>
                {w.label}
              </Text>
              <View style={styles.weightTrack}>
                <View
                  style={[
                    styles.weightFill,
                    {
                      backgroundColor: getCategoryColor(w.id),
                      width: `${Math.min(100, (w.weight / maxWeight) * 100)}%`,
                    },
                  ]}
                />
              </View>
            </View>
          ))}
        </View>
      </View>

      <View>
        <Text style={styles.sectionTitle}>{t('profile.savedTitle')}</Text>
        {saved.length === 0 ? (
          <Text style={styles.noSavedText}>{t('profile.noSaved')}</Text>
        ) : (
          <View style={{ gap: 8 }}>
            {saved.slice(0, LIKED_PREVIEW_COUNT).map((a) => (
              <SavedArticleRow key={`${a.lang}:${a.pageId}`} article={a} onPress={() => router.push(`/card/${a.pageId}`)} />
            ))}
            {saved.length > LIKED_PREVIEW_COUNT ? (
              <Pressable onPress={() => router.push('/profile/liked-articles')} style={styles.seeAllRow}>
                <Text style={styles.seeAllText}>{t('profile.seeAllCta', { count: saved.length })}</Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </View>

      <View style={styles.linkCard}>
        <Pressable onPress={() => router.push('/profile/edit-interests')} style={styles.linkRow}>
          <Text style={styles.linkText}>{t('profile.editInterestsCta')}</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/profile/privacy')} style={[styles.linkRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.linkText}>{t('profile.privacyCta')}</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      </View>

      <Modal visible={pickerOpen} transparent animationType="slide" onRequestClose={() => setPickerOpen(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setPickerOpen(false)}>
          <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{t('profile.avatar.title')}</Text>
            <Pressable onPress={() => pickImage('camera')} style={styles.sheetButton}>
              <Text style={styles.sheetButtonText}>{t('profile.avatar.takePhoto')}</Text>
            </Pressable>
            <Pressable onPress={() => pickImage('library')} style={styles.sheetButton}>
              <Text style={styles.sheetButtonText}>{t('profile.avatar.chooseFromLibrary')}</Text>
            </Pressable>
            <Pressable onPress={() => setPickerOpen(false)} style={[styles.sheetButton, { marginTop: 4 }]}>
              <Text style={styles.sheetButtonText}>{t('profile.avatar.cancel')}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

function StatTile({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = {
  content: { padding: 20, gap: 22, paddingBottom: 40 },
  headerRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 14 },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.neutralWashStrong,
    overflow: 'hidden' as const,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  avatarImage: { width: 56, height: 56 },
  name: { fontFamily: fonts.serif, fontSize: 18, color: colors.ink },
  levelText: { fontFamily: fonts.sans, fontSize: 12.5, color: colors.inkMuted },
  statsRow: { flexDirection: 'row' as const, gap: 10 },
  statTile: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center' as const,
  },
  statValue: { fontFamily: fonts.sansBold, fontSize: 19, color: colors.ink },
  statLabel: { fontFamily: fonts.sans, fontSize: 10.5, color: colors.inkMuted, marginTop: 2 },
  sectionTitle: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.ink, marginBottom: 10 },
  badgeCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  badgeDot: { width: 16, height: 16, borderRadius: 8 },
  badgeLabel: { fontFamily: fonts.sans, fontSize: 10, textAlign: 'center' as const, lineHeight: 12 },
  weightLabel: { width: 74, fontFamily: fonts.sans, fontSize: 11.5, color: colors.inkSecondary },
  weightTrack: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.neutralWash,
    overflow: 'hidden' as const,
  },
  weightFill: { height: '100%' as const, borderRadius: 4 },
  noSavedText: { fontFamily: fonts.sans, fontSize: 12.5, color: colors.inkMuted },
  seeAllRow: { padding: 12, alignItems: 'center' as const },
  seeAllText: { fontFamily: fonts.sansSemiBold, fontSize: 13, color: colors.accentStrong },
  linkCard: { borderRadius: 16, backgroundColor: colors.surface, overflow: 'hidden' as const },
  linkRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    justifyContent: 'space-between' as const,
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.neutralWash,
  },
  linkText: { fontFamily: fonts.sans, fontSize: 14, color: colors.ink },
  chevron: { fontFamily: fonts.sans, fontSize: 14, color: colors.inkFaint },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end' as const,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    paddingBottom: 40,
    gap: 14,
  },
  sheetHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center' as const },
  sheetTitle: { fontFamily: fonts.serif, fontSize: 17, color: colors.ink, textAlign: 'center' as const },
  sheetButton: {
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.neutralWash,
  },
  sheetButtonText: { fontFamily: fonts.sansSemiBold, fontSize: 14.5, color: colors.ink, textAlign: 'center' as const },
};
