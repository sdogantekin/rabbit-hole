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
      backgroundColor: '#E6F4FE',
      foregroundImage: './assets/android-icon-foreground.png',
      backgroundImage: './assets/android-icon-background.png',
      monochromeImage: './assets/android-icon-monochrome.png',
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
    'expo-splash-screen',
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
