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
        // An image is required here even though we don't want a custom native splash look:
        // the plugin's styles.xml writer (withAndroidSplashStyles.js) unconditionally points
        // windowSplashScreenAnimatedIcon at @drawable/splashscreen_logo, but only generates
        // that drawable (withAndroidSplashImages.js) when `image` is set — omitting it left
        // a dangling resource reference and broke the Gradle build
        // (processReleaseResources: "resource drawable/splashscreen_logo ... not found").
        // Using the adaptive icon's own foreground + background keeps this forced,
        // OS-controlled icon phase (Android 12+ shows one regardless of config) consistent
        // with the real app icon rather than looking broken. imageWidth is kept well under
        // the plugin's ~288dp compositing ceiling (see git history on this file — exceeding
        // it silently clips instead of scaling up). The real branded moment is
        // components/app-shell/SplashScreenMimic.tsx, shown immediately after this native
        // phase hides.
        image: './assets/android-icon-foreground.png',
        imageWidth: 172,
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
