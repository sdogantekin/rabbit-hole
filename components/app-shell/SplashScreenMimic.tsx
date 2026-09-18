import { Image } from 'expo-image';
import { View } from 'react-native';

// expo-splash-screen's native Android drawable is capped at a fixed ~288dp compositing
// canvas (found in its own plugin source) — anything wider gets clipped, and Android 12+
// separately forces its own small centered-icon system splash regardless of config. Neither
// can produce a real full-bleed screen, so this mimics the intended full-width look
// (icons/appstore.png's own sage background continues past the image, matching the
// reference design) as an ordinary React screen, shown while fonts/min-duration gate in
// app/_layout.tsx keep it up.
export function SplashScreenMimic() {
  return (
    <View style={{ flex: 1, backgroundColor: '#BDC9B7', justifyContent: 'center' }}>
      <Image
        source={require('../../assets/splash-icon.png')}
        style={{ width: '100%', aspectRatio: 1 }}
        contentFit="contain"
      />
    </View>
  );
}
