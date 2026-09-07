export interface SubmittedAnswer {
  questionId: string;
  selectedOptionIndex: number;
}

export function isSubmittedAnswer(value: unknown): value is SubmittedAnswer {
  const record = value as Record<string, unknown> | null;
  return (
    typeof record === 'object' &&
    record !== null &&
    typeof record.questionId === 'string' &&
    typeof record.selectedOptionIndex === 'number'
  );
}

// Shared by complete-quiz and complete-shared-quiz: never trust a client-supplied score,
// always regrade from the stored answer key.
export function gradeAnswers(
  answers: unknown[],
  correctByQuestionId: Map<string, number>,
): { score: number; validAnswers: SubmittedAnswer[] } {
  const validAnswers = (answers as unknown[]).filter(isSubmittedAnswer).filter((a) => correctByQuestionId.has(a.questionId));
  const score = validAnswers.filter((a) => correctByQuestionId.get(a.questionId) === a.selectedOptionIndex).length;
  return { score, validAnswers };
}
