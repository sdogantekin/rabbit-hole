import { z } from 'npm:zod@3.23.8';

import type { GeneratedQuizQuestion } from '../_shared/llm/provider.ts';

const questionSchema = z.object({
  pageId: z.number(),
  questionText: z.string().min(1),
  options: z.array(z.string().min(1)).length(4),
  correctOptionIndex: z.number().int().min(0).max(3),
});

const questionsSchema = z.array(questionSchema);

// design.md §5.1: validate against a strict schema regardless of provider, AND ground every
// question back to a pageId we actually sent it. A schema-valid question about an article we
// never gave the model is exactly the "invented fact" failure mode CLAUDE.md's quiz-grounding
// guardrail warns about, so it's rejected the same as a malformed shape.
export function validateGeneratedQuestions(
  raw: unknown,
  allowedPageIds: Set<number>,
): GeneratedQuizQuestion[] | null {
  const result = questionsSchema.safeParse(raw);
  if (!result.success) return null;
  const questions = result.data;
  if (questions.length !== allowedPageIds.size) return null;

  const seenPageIds = new Set<number>();
  for (const question of questions) {
    if (!allowedPageIds.has(question.pageId) || seenPageIds.has(question.pageId)) return null;
    seenPageIds.add(question.pageId);
  }
  return questions;
}
