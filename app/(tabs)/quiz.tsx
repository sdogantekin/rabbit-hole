import { Text, View } from 'react-native';

import { colors, fonts } from '@/constants/theme';
import { t } from '@/lib/localization';

export default function Quiz() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.appBackground }}>
      <Text style={{ fontFamily: fonts.serif, fontSize: 20, color: colors.ink }}>{t('quiz.placeholderTitle')}</Text>
    </View>
  );
}
