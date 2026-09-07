import { AnthropicProvider } from './anthropic-provider.ts';
import { OpenAICompatibleProvider } from './openai-compatible-provider.ts';

export interface QuizQuestionInput {
  pageId: number;
  title: string;
  extract: string;
}

export interface GeneratedQuizQuestion {
  pageId: number;
  questionText: string;
  options: string[];
  correctOptionIndex: number;
}

export interface LLMProvider {
  generateQuizQuestions(articles: QuizQuestionInput[]): Promise<GeneratedQuizQuestion[]>;
}

// design.md §5.1: switching vendors is a config change (LLM_PROVIDER), never a code change
// in generate-quiz itself. Each branch only reads the secret(s) its own provider needs.
export function createLLMProvider(name: string): LLMProvider {
  switch (name) {
    case 'anthropic':
      return new AnthropicProvider();
    case 'openai-compatible':
      return new OpenAICompatibleProvider();
    default:
      throw new Error(`Unknown LLM_PROVIDER "${name}"`);
  }
}
