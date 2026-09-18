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
        // An image is required here even though we don't want a distinct native splash look:
        // the plugin's styles.xml writer (withAndroidSplashStyles.js) unconditionally points
        // windowSplashScreenAnimatedIcon at @drawable/splashscreen_logo, but only generates
        // that drawable (withAndroidSplashImages.js) when `image` is set — omitting it left
        // a dangling resource reference and broke the Gradle build
        // (processReleaseResources: "resource drawable/splashscreen_logo ... not found").
        //
        // assets/splash-mark.png is a static render of the exact ring+dot glyph
        // SplashScreenMimic.tsx draws (see the script in git history on this file), on the
        // app's own cream background rather than the adaptive icon's sage one. Android 12+
        // forces this OS-controlled icon phase regardless of config; matching its look to
        // SplashScreenMimic's static ring (which no longer animates — only the wordmark
        // fades in beneath it) makes the native phase read as the first frame of one
        // continuous screen instead of a second, visually distinct splash.
        image: './assets/splash-mark.png',
        imageWidth: 80,
        backgroundColor: '#fcf3ed',
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
