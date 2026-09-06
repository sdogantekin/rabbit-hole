import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';

import { colors, fonts } from '@/constants/theme';
import { t } from '@/lib/localization';
import { sendEmailOtp, verifyEmailOtp } from '@/lib/supabase/queries/auth';

interface EmailOtpFormProps {
  onVerified: () => void;
}

export function EmailOtpForm({ onVerified }: EmailOtpFormProps) {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSendCode = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await sendEmailOtp(email);
      setStep('code');
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerify = async () => {
    setError(null);
    setIsSubmitting(true);
    try {
      await verifyEmailOtp(email, code);
      onVerified();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setIsSubmitting(false);
    }
  };

  const inputStyle = {
    fontFamily: fonts.sans,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: colors.ink,
  };
  const labelStyle = { fontFamily: fonts.sansMedium, fontSize: 14, color: colors.inkSecondary, marginBottom: 4 };

  return (
    <View style={{ paddingHorizontal: 24 }}>
      {step === 'email' ? (
        <>
          <Text style={labelStyle}>{t('onboarding.auth.emailLabel')}</Text>
          <TextInput
            value={email}
            onChangeText={setEmail}
            placeholder={t('onboarding.auth.emailPlaceholder')}
            autoCapitalize="none"
            keyboardType="email-address"
            style={inputStyle}
          />
          <Pressable
            onPress={handleSendCode}
            disabled={!email || isSubmitting}
            style={{
              marginTop: 16,
              alignItems: 'center',
              borderRadius: 16,
              paddingVertical: 16,
              backgroundColor: email ? colors.ink : colors.neutralWashStrong,
            }}
          >
            <Text style={{ fontFamily: fonts.sansSemiBold, color: email ? '#fff' : colors.inkFaint }}>
              {t('onboarding.auth.sendCodeCta')}
            </Text>
          </Pressable>
        </>
      ) : (
        <>
          <Text style={labelStyle}>{t('onboarding.auth.codeLabel')}</Text>
          <TextInput
            value={code}
            onChangeText={setCode}
            placeholder={t('onboarding.auth.codePlaceholder')}
            keyboardType="number-pad"
            style={inputStyle}
          />
          <Pressable
            onPress={handleVerify}
            disabled={!code || isSubmitting}
            style={{
              marginTop: 16,
              alignItems: 'center',
              borderRadius: 16,
              paddingVertical: 16,
              backgroundColor: code ? colors.ink : colors.neutralWashStrong,
            }}
          >
            <Text style={{ fontFamily: fonts.sansSemiBold, color: code ? '#fff' : colors.inkFaint }}>
              {t('onboarding.auth.verifyCta')}
            </Text>
          </Pressable>
          <Pressable onPress={() => setStep('email')} style={{ marginTop: 12, alignItems: 'center' }}>
            <Text style={{ fontFamily: fonts.sans, fontSize: 14, color: colors.inkMuted }}>
              {t('onboarding.auth.resendCta')}
            </Text>
          </Pressable>
        </>
      )}
      {error ? (
        <Text style={{ marginTop: 12, fontFamily: fonts.sans, fontSize: 14, color: colors.negativeBorder }}>
          {error}
        </Text>
      ) : null}
    </View>
  );
}
