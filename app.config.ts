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
    // TODO: replace with a real reversed-domain identifier before any device or store build.
    bundleIdentifier: 'com.rabbithole.app',
    supportsTablet: true,
  },
  android: {
    // TODO: replace with a real package name before any device or store build.
    package: 'com.rabbithole.app',
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
