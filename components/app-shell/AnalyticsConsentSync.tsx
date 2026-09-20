import { useEffect } from 'react';

import { setAnalyticsConsent } from '@/lib/analytics';
import { useAuthStore } from '@/lib/store/auth-store';
import { useProfileQuery } from '@/lib/supabase/queries/profile';

// Renders nothing — just keeps native analytics collection in sync with the profile's
// analytics_opt_in toggle (app/profile/privacy.tsx), wherever it changes.
export function AnalyticsConsentSync() {
  const userId = useAuthStore((s) => s.session?.user.id);
  const { data: profile } = useProfileQuery(userId);

  useEffect(() => {
    if (profile) setAnalyticsConsent(profile.analytics_opt_in ?? true);
  }, [profile]);

  return null;
}
