import { create } from 'zustand';

import type { QuizQuestion } from '@/lib/supabase/queries/quiz';

type QuizStage = 'home' | 'active' | 'summary';
type QuizMode = 'own' | 'shared';

interface QuizState {
  stage: QuizStage;
  mode: QuizMode;
  // Exactly one of these is set, matching `mode` — which endpoint quiz.tsx's handleNext
  // calls to grade the final question (complete-quiz vs complete-shared-quiz).
  quizSessionId: string | null;
  sharedQuizId: string | null;
  questions: QuizQuestion[];
  currentIndex: number;
  selectedOptionIndex: number | null;
  answered: boolean;
  answers: Record<string, number>;
  result: { score: number; totalQuestions: number; xpAwarded: number } | null;
  startOwnQuiz: (quizSessionId: string, questions: QuizQuestion[]) => void;
  startSharedQuiz: (sharedQuizId: string, questions: QuizQuestion[]) => void;
  selectOption: (index: number) => void;
  advance: () => void;
  finish: (result: { score: number; totalQuestions: number; xpAwarded: number }) => void;
  reset: () => void;
}

// Session-only quiz-taking state — no business logic here (grading/XP is server-side in
// complete-quiz/complete-shared-quiz), same split as feed-store's deck/index vs.
// get-feed/score-swipe.
export const useQuizStore = create<QuizState>((set, get) => ({
  stage: 'home',
  mode: 'own',
  quizSessionId: null,
  sharedQuizId: null,
  questions: [],
  currentIndex: 0,
  selectedOptionIndex: null,
  answered: false,
  answers: {},
  result: null,
  startOwnQuiz: (quizSessionId, questions) =>
    set({
      stage: 'active',
      mode: 'own',
      quizSessionId,
      sharedQuizId: null,
      questions,
      currentIndex: 0,
      selectedOptionIndex: null,
      answered: false,
      answers: {},
      result: null,
    }),
  startSharedQuiz: (sharedQuizId, questions) =>
    set({
      stage: 'active',
      mode: 'shared',
      quizSessionId: null,
      sharedQuizId,
      questions,
      currentIndex: 0,
      selectedOptionIndex: null,
      answered: false,
      answers: {},
      result: null,
    }),
  selectOption: (index) => {
    if (get().answered) return;
    const question = get().questions[get().currentIndex];
    if (!question) return;
    set((state) => ({
      selectedOptionIndex: index,
      answered: true,
      answers: { ...state.answers, [question.id]: index },
    }));
  },
  advance: () =>
    set((state) => ({
      currentIndex: state.currentIndex + 1,
      selectedOptionIndex: null,
      answered: false,
    })),
  finish: (result) => set({ stage: 'summary', result }),
  reset: () =>
    set({
      stage: 'home',
      quizSessionId: null,
      sharedQuizId: null,
      questions: [],
      currentIndex: 0,
      selectedOptionIndex: null,
      answered: false,
      answers: {},
      result: null,
    }),
}));
