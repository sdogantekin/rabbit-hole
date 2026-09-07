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
