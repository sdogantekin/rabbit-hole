import { useRouter } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

import { colors, fonts } from '@/constants/theme';
import { t } from '@/lib/localization';

export default function Intro() {
  const router = useRouter();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: colors.appBackground,
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: 96,
        paddingHorizontal: 32,
        paddingBottom: 48,
      }}
    >
      <View />

      <View style={{ alignItems: 'center', gap: 18 }}>
        <View
          style={{
            width: 64,
            height: 64,
            borderRadius: 32,
            backgroundColor: colors.appBackground,
            borderWidth: 2,
            borderColor: colors.ink,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <View
            style={{
              width: 36,
              height: 36,
              borderRadius: 18,
              borderWidth: 2,
              borderColor: colors.ink,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: colors.accent }} />
          </View>
        </View>
        <Text style={{ fontFamily: fonts.serif, fontSize: 34, letterSpacing: -0.5, color: colors.ink }}>
          {t('onboarding.intro.title')}
        </Text>
        <Text
          style={{
            fontFamily: fonts.sans,
            fontSize: 16,
            lineHeight: 24,
            color: colors.inkSecondary,
            maxWidth: 260,
            textAlign: 'center',
          }}
        >
          {t('onboarding.intro.body')}
        </Text>
      </View>

      <View style={{ width: '100%', gap: 14, alignItems: 'center' }}>
        <Pressable
          onPress={() => router.push('/(onboarding)/interests')}
          style={{
            width: '100%',
            paddingVertical: 16,
            borderRadius: 16,
            backgroundColor: colors.accent,
            alignItems: 'center',
          }}
        >
          <Text style={{ fontFamily: fonts.sansSemiBold, fontSize: 16, color: '#fff' }}>
            {t('onboarding.intro.cta')}
          </Text>
        </Pressable>
        <Text style={{ fontFamily: fonts.sans, fontSize: 12, color: colors.inkFaint }}>
          {t('onboarding.intro.attribution')}
        </Text>
      </View>
    </View>
  );
}
