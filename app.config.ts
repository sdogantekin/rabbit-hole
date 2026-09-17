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
        // expo-splash-screen defaults to imageWidth: 100 and resizeMode: 'contain' — a small
        // centered logo. Full-bleed-looking splash (the whole icon square, letterboxed top
        // and bottom by its own background color) instead needs an explicit, wide
        // imageWidth; 400 spans close to edge-to-edge on typical phone widths (~360-430pt).
        image: './assets/splash-icon.png',
        imageWidth: 400,
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
  ],
};

export default config;
