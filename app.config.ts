import type { ExpoConfig } from 'expo/config';

const requiredEnvVars = ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_ANON_KEY'] as const;

for (const key of requiredEnvVars) {
  if (!process.env[key]) {
    throw new Error(`Missing required env var ${key}. Copy .env.example to .env and fill it in.`);
  }
}

const config: ExpoConfig = {
  name: 'RabbitHole',
  slug: 'rabbit-hole',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  scheme: 'rabbithole',
  userInterfaceStyle: 'light',
  ios: {
    bundleIdentifier: 'com.sdogantekin.rabbithole',
    supportsTablet: true,
  },
  android: {
    package: 'com.sdogantekin.rabbithole',
    adaptiveIcon: {
      // Sampled directly from the icon artwork's own background (icons/appstore.png) rather
      // than picked separately, so the two match exactly. No backgroundImage/monochromeImage:
      // the icon pack (see icons/README.md) only ships a foreground layer + this flat color,
      // and doesn't include a themed/monochrome variant (Android 13+ only, optional — falls
      // back to the normal colored icon without one).
      backgroundColor: '#BDC9B7',
      foregroundImage: './assets/android-icon-foreground.png',
    },
  },
  web: {
    favicon: './assets/favicon.png',
  },
  extra: {
    eas: {
      // Links this app config to the @serkan.dogantekin/rabbit-hole EAS project
      // (https://expo.dev/accounts/serkan.dogantekin/projects/rabbit-hole), created via
      // `eas init`. Not a secret — this id is meaningless without the account's own auth.
      projectId: '3d65b3f1-8f12-4e30-9ea5-18af62db47ea',
    },
  },
  plugins: [
    'expo-router',
    'expo-font',
    'expo-image',
    [
      'expo-splash-screen',
      {
        // NOT a place to try for a full-bleed image: this plugin's own Android image
        // generator composites onto a fixed ~288dp canvas and clips anything wider (verified
        // in its source, plugin/build/withAndroidSplashImages.js) — a previous attempt at
        // imageWidth: 400 exceeded that ceiling and rendered clipped instead of bigger.
        // Android 12+ also independently forces its own small centered-icon system splash no
        // matter what's configured here. The real full-bleed look lives in
        // components/app-shell/SplashScreenMimic.tsx, a JS-rendered screen shown immediately
        // after this native phase hides — this config just needs to look clean and
        // consistent for that brief, unavoidable moment beforehand.
        image: './assets/splash-icon.png',
        imageWidth: 180,
        resizeMode: 'contain',
        backgroundColor: '#BDC9B7',
      },
    ],
    [
      'expo-image-picker',
      {
        photosPermission: 'Let RabbitHole use your photo library to set a profile picture.',
        cameraPermission: 'Let RabbitHole use your camera to take a profile picture.',
      },
    ],
    '@react-native-google-signin/google-signin',
  ],
};

export default config;
