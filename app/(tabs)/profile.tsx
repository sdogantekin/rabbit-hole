import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';

import { SavedArticleRow } from '@/components/profile/SavedArticleRow';
import { BADGE_ICONS } from '@/constants/badge-icons';
import { getCategoryColor } from '@/constants/category-colors';
import { Ionicons } from '@/constants/icons';
import { INTEREST_CATEGORIES } from '@/constants/interest-categories';
import { colors, fonts } from '@/constants/theme';
import { BADGE_DEFINITIONS } from '@/lib/badges';
import { t } from '@/lib/localization';
import { useAuthStore } from '@/lib/store/auth-store';
import { useOnboardingStore } from '@/lib/store/onboarding-store';
import { supabase } from '@/lib/supabase/client';
import { useEarnedBadgesQuery } from '@/lib/supabase/queries/badges';
import { signOutOfGoogle } from '@/lib/supabase/queries/auth';
import { useProfileQuery, useUpdateProfileMutation, useUploadAvatarMutation } from '@/lib/supabase/queries/profile';
import { useSavedArticlesQuery } from '@/lib/supabase/queries/saved-articles';
import { useInterestWeightsQuery } from '@/lib/supabase/queries/user-interests';

const LIKED_PREVIEW_COUNT = 6;
// gamification.md D22: kept short so a name reads well on a leaderboard row.
const DISPLAY_NAME_MIN_LENGTH = 2;
const DISPLAY_NAME_MAX_LENGTH = 24;
// gamification.md D9/D10: matches `level = 1 + floor(discovery_score / 100)` — the only
// other place this number appears. Linear for launch; a curve later only touches this line.
const XP_PER_LEVEL = 100;

export default function Profile() {
  const router = useRouter();
  const session = useAuthStore((s) => s.session);
  const resetOnboarding = useOnboardingStore((s) => s.reset);
  const userId = session?.user.id;

  const { data: profile } = useProfileQuery(userId);
  const { data: weights = [] } = useInterestWeightsQuery(userId);
  const { data: saved = [] } = useSavedArticlesQuery(userId);
  const { data: earnedBadgeIds } = useEarnedBadgesQuery(userId);
  const uploadAvatar = useUploadAvatarMutation(userId);
  const updateProfile = useUpdateProfileMutation(userId);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [nameEditorOpen, setNameEditorOpen] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);

  const discoveryScore = profile?.discovery_score ?? 0;
  const level = 1 + Math.floor(discoveryScore / XP_PER_LEVEL);
  const xpIntoLevel = discoveryScore % XP_PER_LEVEL;

  const weightBars = INTEREST_CATEGORIES.map((c) => ({
    ...c,
    weight: weights.find((w) => w.categoryId === c.id)?.weight ?? 0,
  }))
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 6);
  const maxWeight = Math.max(1, ...weightBars.map((w) => w.weight));

  const badges = BADGE_DEFINITIONS.map((b) => ({ ...b, earned: earnedBadgeIds?.has(b.id) ?? false }));

  // No confirmation dialog: unlike account deletion this is fully reversible (just sign back
  // in), so a low-friction single tap is the right amount of ceremony.
  const handleLogout = async () => {
    // Also clears the native Google session — otherwise it silently re-signs the same
    // account back in on next login without showing the account picker.
    await Promise.all([supabase.auth.signOut(), signOutOfGoogle()]);
    // The onboarding store persists interest picks locally (so a mid-onboarding relaunch
    // doesn't lose them) independent of any session — without this, the next account to go
    // through onboarding on this device would see the previous account's picks pre-selected.
    resetOnboarding();
    router.replace('/(onboarding)/intro');
  };

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

  const openNameEditor = () => {
    setNameDraft(profile?.display_name ?? '');
    setNameError(null);
    setNameEditorOpen(true);
  };

  const saveName = () => {
    const trimmed = nameDraft.trim();
    if (trimmed.length < DISPLAY_NAME_MIN_LENGTH) {
      setNameError(t('profile.editName.tooShort'));
      return;
    }
    if (trimmed.length > DISPLAY_NAME_MAX_LENGTH) {
      setNameError(t('profile.editName.tooLong'));
      return;
    }
    setNameEditorOpen(false);
    if (trimmed !== profile?.display_name) {
      updateProfile.mutate({ display_name: trimmed });
    }
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
        <View style={styles.headerText}>
          <Pressable onPress={openNameEditor} style={styles.nameRow}>
            <Text style={styles.name}>{profile?.display_name ?? ''}</Text>
            <Ionicons name="pencil-outline" size={13} color={colors.inkFaint} />
          </Pressable>
          <Text style={styles.levelText}>{t('profile.levelLabel', { level })}</Text>
          <View style={styles.levelProgressTrack}>
            <View
              style={[styles.levelProgressFill, { width: `${(xpIntoLevel / XP_PER_LEVEL) * 100}%` }]}
            />
          </View>
          <Text style={styles.levelProgressText}>
            {t('profile.xpProgress', { current: xpIntoLevel, total: XP_PER_LEVEL })}
          </Text>
          <Text style={styles.accountText} numberOfLines={1}>
            {session?.user.is_anonymous ? t('profile.guestAccount') : session?.user.email}
          </Text>
        </View>
      </View>

      <View style={styles.statsRow}>
        <StatTile
          value={profile?.streak_count ?? 0}
          label={t('profile.stats.streak')}
          caption={
            (profile?.longest_streak ?? 0) > 0
              ? t('profile.stats.longestStreakCaption', { count: profile?.longest_streak ?? 0 })
              : undefined
          }
        />
        <StatTile value={profile?.discovery_score ?? 0} label={t('profile.stats.xp')} />
        <StatTile value={saved.length} label={t('profile.stats.liked')} />
      </View>

      <View>
        <Text style={styles.sectionTitle}>{t('profile.badgesTitle')}</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 14, paddingRight: 8 }}
        >
          {badges.map((b) => (
            <View key={b.id} style={{ alignItems: 'center', gap: 6, width: 64 }}>
              <View
                style={[
                  styles.badgeCircle,
                  { backgroundColor: b.earned ? colors.badgeEarnedBg : colors.badgeUnearnedBg },
                ]}
              >
                {BADGE_ICONS[b.id] ? (
                  <Image
                    source={BADGE_ICONS[b.id]}
                    style={[styles.badgeIcon, { opacity: b.earned ? 1 : 0.35 }]}
                    resizeMode="contain"
                  />
                ) : (
                  <Ionicons
                    name="ribbon-outline"
                    size={28}
                    color={b.earned ? colors.ink : colors.inkFaint}
                  />
                )}
              </View>
              <Text
                style={[styles.badgeLabel, { color: b.earned ? colors.ink : colors.inkFaint }]}
                numberOfLines={2}
              >
                {t(b.labelKey)}
              </Text>
            </View>
          ))}
        </ScrollView>
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
        <Pressable onPress={() => router.push('/profile/privacy')} style={styles.linkRow}>
          <Text style={styles.linkText}>{t('profile.privacyCta')}</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
        <Pressable onPress={() => router.push('/profile/about')} style={[styles.linkRow, { borderBottomWidth: 0 }]}>
          <Text style={styles.linkText}>{t('profile.aboutCta')}</Text>
          <Text style={styles.chevron}>›</Text>
        </Pressable>
      </View>

      <Pressable onPress={handleLogout} style={styles.logoutButton}>
        <Text style={styles.logoutText}>{t('profile.logoutCta')}</Text>
      </Pressable>

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

      <Modal
        visible={nameEditorOpen}
        transparent
        animationType="slide"
        onRequestClose={() => setNameEditorOpen(false)}
      >
        <Pressable style={styles.sheetBackdrop} onPress={() => setNameEditorOpen(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
            <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation()}>
              <View style={styles.sheetHandle} />
              <Text style={styles.sheetTitle}>{t('profile.editName.title')}</Text>
              <Text style={styles.nameEditorBody}>{t('profile.editName.body')}</Text>
              <TextInput
                value={nameDraft}
                onChangeText={(text) => {
                  setNameDraft(text);
                  setNameError(null);
                }}
                placeholder={t('profile.editName.placeholder')}
                placeholderTextColor={colors.inkFaint}
                maxLength={DISPLAY_NAME_MAX_LENGTH}
                autoFocus
                style={styles.nameInput}
              />
              {nameError ? <Text style={styles.nameErrorText}>{nameError}</Text> : null}
              <Pressable onPress={saveName} style={[styles.sheetButton, styles.sheetButtonPrimary]}>
                <Text style={[styles.sheetButtonText, styles.sheetButtonTextPrimary]}>
                  {t('profile.editName.saveCta')}
                </Text>
              </Pressable>
              <Pressable onPress={() => setNameEditorOpen(false)} style={styles.sheetButton}>
                <Text style={styles.sheetButtonText}>{t('profile.editName.cancelCta')}</Text>
              </Pressable>
            </Pressable>
          </KeyboardAvoidingView>
        </Pressable>
      </Modal>
    </ScrollView>
  );
}

function StatTile({ value, label, caption }: { value: number; label: string; caption?: string }) {
  return (
    <View style={styles.statTile}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      {caption ? <Text style={styles.statCaption}>{caption}</Text> : null}
    </View>
  );
}

const styles = {
  content: { padding: 20, gap: 22, paddingBottom: 40 },
  headerRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 14 },
  headerText: { flex: 1 },
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
  nameRow: { flexDirection: 'row' as const, alignItems: 'center' as const, gap: 6 },
  name: { fontFamily: fonts.serif, fontSize: 18, color: colors.ink },
  levelText: { fontFamily: fonts.sans, fontSize: 12.5, color: colors.inkMuted },
  levelProgressTrack: {
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.neutralWash,
    overflow: 'hidden' as const,
    marginTop: 5,
  },
  levelProgressFill: { height: '100%' as const, borderRadius: 2, backgroundColor: colors.accent },
  levelProgressText: { fontFamily: fonts.sans, fontSize: 10.5, color: colors.inkFaint, marginTop: 3 },
  accountText: { fontFamily: fonts.sans, fontSize: 12.5, color: colors.inkFaint, marginTop: 5 },
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
  statCaption: { fontFamily: fonts.sans, fontSize: 9.5, color: colors.inkFaint, marginTop: 1 },
  sectionTitle: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.ink, marginBottom: 10 },
  badgeCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  },
  badgeIcon: { width: 36, height: 36 },
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
  logoutButton: { padding: 16, borderRadius: 16, alignItems: 'center' as const },
  logoutText: { fontFamily: fonts.sansSemiBold, fontSize: 14, color: colors.inkMuted },
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
  sheetButtonPrimary: { backgroundColor: colors.ink },
  sheetButtonTextPrimary: { color: '#fff' },
  nameEditorBody: { fontFamily: fonts.sans, fontSize: 12.5, color: colors.inkMuted, textAlign: 'center' as const, marginTop: -6 },
  nameInput: {
    fontFamily: fonts.sans,
    fontSize: 15,
    color: colors.ink,
    backgroundColor: colors.neutralWash,
    borderRadius: 14,
    padding: 14,
  },
  nameErrorText: { fontFamily: fonts.sans, fontSize: 12, color: colors.negative, marginTop: -6 },
};
