import * as Application from 'expo-application';
import { useRouter } from 'expo-router';
import { Linking, Pressable, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Ionicons } from '@/constants/icons';
import { colors, fonts } from '@/constants/theme';
import { WIKIPEDIA_LICENSE_NAME, WIKIPEDIA_LICENSE_URL } from '@/constants/wikipedia-license';
import { t } from '@/lib/localization';

const PRIVACY_POLICY_URL = 'https://sdogantekin.github.io/rabbit-hole/privacy-policy.html';

export default function About() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={{ flex: 1, backgroundColor: colors.appBackground, paddingTop: insets.top + 8 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 18, marginBottom: 8 }}>
        <Pressable
          onPress={() => router.back()}
          accessibilityLabel={t('about.backCta')}
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

      <ScrollView contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40, gap: 22 }}>
        <Text style={{ fontFamily: fonts.serif, fontSize: 22, color: colors.ink }}>{t('about.title')}</Text>

        <View style={{ backgroundColor: colors.surface, borderRadius: 16, overflow: 'hidden' }}>
          <InfoRow label={t('about.versionLabel')} value={Application.nativeApplicationVersion ?? '—'} showBorder />
          <InfoRow label={t('about.buildLabel')} value={Application.nativeBuildVersion ?? '—'} />
        </View>

        <View style={{ gap: 8 }}>
          <Text style={styles.sectionTitle}>{t('about.contentTitle')}</Text>
          <Text style={styles.body}>{t('about.contentBody')}</Text>
          <Pressable onPress={() => Linking.openURL(WIKIPEDIA_LICENSE_URL)}>
            <Text style={styles.link}>{WIKIPEDIA_LICENSE_NAME} ↗</Text>
          </Pressable>
        </View>

        <View style={{ gap: 8 }}>
          <Text style={styles.sectionTitle}>{t('about.legalTitle')}</Text>
          <Pressable onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}>
            <Text style={styles.link}>{t('about.privacyPolicyCta')} ↗</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

interface InfoRowProps {
  label: string;
  value: string;
  showBorder?: boolean;
}

function InfoRow({ label, value, showBorder }: InfoRowProps) {
  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: showBorder ? 1 : 0,
        borderBottomColor: colors.neutralWash,
      }}
    >
      <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: colors.inkSecondary }}>{label}</Text>
      <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 14, color: colors.ink }}>{value}</Text>
    </View>
  );
}

const styles = {
  sectionTitle: { fontFamily: fonts.sansBold, fontSize: 13, color: colors.ink },
  body: { fontFamily: fonts.sans, fontSize: 13.5, lineHeight: 20, color: colors.inkSecondary },
  link: { fontFamily: fonts.sansSemiBold, fontSize: 14, color: colors.accentStrong },
};
