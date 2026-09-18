import { SHARED_QUIZ_LINK_PATH } from '@/constants/quiz';

// Share links are https URLs (see constants/quiz.ts for why) carrying the quiz id as a query
// param, because GitHub Pages is static and can't serve a page per quiz id. Expo Router maps
// URLs to routes by path, so `/rabbit-hole/q/?id=<uuid>` would otherwise resolve to nothing.
// This rewrites it to the real route before the router ever sees it.
//
// Deliberately regex-only, no URL/URLSearchParams: React Native's URL is a partial polyfill
// whose searchParams support varies, and this runs on the cold-start path where a throw would
// mean the link silently opens the app to a blank screen.
const SHARED_QUIZ_ID = new RegExp(`${SHARED_QUIZ_LINK_PATH}/?\\?(?:.*&)?id=([0-9a-fA-F-]{36})`);

export function redirectSystemPath({ path }: { path: string; initial: boolean }): string {
  const match = SHARED_QUIZ_ID.exec(path);
  // Anything else — including the rabbithole:// scheme links the landing page's fallback
  // button still produces — is handed back untouched for normal route resolution.
  return match ? `/shared-quiz/${match[1]}` : path;
}
