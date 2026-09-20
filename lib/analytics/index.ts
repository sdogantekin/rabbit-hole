import { getAnalytics, logEvent, setAnalyticsCollectionEnabled } from '@react-native-firebase/analytics';

const analytics = getAnalytics();

// Collection starts disabled at the native level (app.config.ts's
// withAnalyticsCollectionDisabledByDefault) so nothing is sent before this has run once.
export function setAnalyticsConsent(enabled: boolean) {
  setAnalyticsCollectionEnabled(analytics, enabled);
}

export function trackEvent(name: string, params?: Record<string, string | number | boolean>) {
  logEvent(analytics, name, params);
}
