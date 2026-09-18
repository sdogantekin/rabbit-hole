// D5 (gamification.md §3): sent with every streak-affecting Edge Function call so
// record_daily_activity can compute "today" in the user's own day instead of the server's
// UTC day. Falls back to UTC if Intl is unavailable for some reason — that's still correct
// today, just not local, so it's a safe default rather than an error.
export function getLocalTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}
