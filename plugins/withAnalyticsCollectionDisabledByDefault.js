const { withAndroidManifest, withInfoPlist } = require('@expo/config-plugins');

// requirements.md §7: "clear consent for any analytics beyond basic crash reporting". The
// native Firebase SDKs start collecting automatically as soon as the app process launches —
// before our JS call to lib/analytics's setAnalyticsConsent() can run — so collection has to
// start OFF at the native config level. It's turned on once profile.analytics_opt_in is known
// (see components/app-shell/AnalyticsConsentSync.tsx).
const withAnalyticsCollectionDisabledByDefault = (config) => {
  config = withInfoPlist(config, (c) => {
    c.modResults.FIREBASE_ANALYTICS_COLLECTION_ENABLED = false;
    return c;
  });
  config = withAndroidManifest(config, (c) => {
    const application = c.modResults.manifest.application?.[0];
    if (application) {
      application['meta-data'] = application['meta-data'] ?? [];
      application['meta-data'].push({
        $: { 'android:name': 'firebase_analytics_collection_enabled', 'android:value': 'false' },
      });
    }
    return c;
  });
  return config;
};

module.exports = withAnalyticsCollectionDisabledByDefault;
