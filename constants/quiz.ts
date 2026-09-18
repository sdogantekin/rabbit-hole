// Shared between the client (gating the Quiz tab's CTA before it ever calls the Edge
// Function) and generate-quiz/complete-quiz (imported via a relative path, same pattern as
// lib/supabase/types.ts) so the unlock threshold, quiz length, and XP value can't drift
// between the two.

// design.md leaves the exact "threshold of likes" unspecified; low enough that a curious
// new user reaches it in one feed session, per requirements.md §6.4's "offered proactively,
// not only when sought out" intent.
export const MIN_LIKES_TO_UNLOCK_QUIZ = 5;

// design.md §5: "the extracts of the last 10-15 liked articles."
export const MAX_ARTICLES_FOR_QUIZ = 15;

// requirements.md §6.4 calls these "short" quizzes; one question per source article, capped.
export const MAX_QUESTIONS_PER_QUIZ = 10;

// design.md §6: "larger amount per correct quiz answer" than per-swipe XP (not yet built).
export const QUIZ_XP_PER_CORRECT_ANSWER = 15;

// Share links are https (not the rabbithole:// scheme) so they still do something useful for
// a recipient without the app installed — an Android App Link opens the app directly when it
// is installed, and falls through to docs/q/index.html (a "get the app" page) when it isn't.
// A bare custom-scheme link is simply dead for that person, which defeats sharing as a growth
// mechanic (gamification.md D21).
//
// The id travels as a query param rather than a path segment because GitHub Pages is static:
// it cannot serve a page per quiz id. app/+native-intent.ts rewrites the incoming URL back to
// the /shared-quiz/[id] route, and app.config.ts's intentFilters must keep matching this path.
export const SHARED_QUIZ_LINK_PATH = '/rabbit-hole/q';
export const SHARED_QUIZ_LINK_HOST = 'sdogantekin.github.io';
export const SHARED_QUIZ_LINK_BASE = `https://${SHARED_QUIZ_LINK_HOST}${SHARED_QUIZ_LINK_PATH}/`;
