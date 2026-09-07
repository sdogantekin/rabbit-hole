import type { GeneratedQuizQuestion, LLMProvider, QuizQuestionInput } from './provider.ts';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const ANTHROPIC_VERSION = '2023-06-01';
// CLAUDE.md: "Defaults to Claude (Haiku tier)". Overridable per design.md §5.1's provider
// flexibility without redeploying code.
const DEFAULT_MODEL = 'claude-haiku-4-5-20251001';
const TOOL_NAME = 'submit_quiz_questions';

const SYSTEM_PROMPT =
  'You write short multiple-choice quiz questions strictly grounded in the provided ' +
  'Wikipedia extracts. Every question must be answerable using only the given extract for ' +
  'its article — never introduce a fact, name, date, or detail that is not present in that ' +
  'extract. Write exactly one question per article, referencing it by its pageId. Each ' +
  'question needs exactly 4 options with exactly one correct answer.';

function buildTool(articleCount: number) {
  return {
    name: TOOL_NAME,
    description: 'Submit the generated multiple-choice quiz questions.',
    input_schema: {
      type: 'object',
      properties: {
        questions: {
          type: 'array',
          minItems: articleCount,
          maxItems: articleCount,
          items: {
            type: 'object',
            properties: {
              pageId: { type: 'integer' },
              questionText: { type: 'string' },
              options: { type: 'array', items: { type: 'string' }, minItems: 4, maxItems: 4 },
              correctOptionIndex: { type: 'integer', minimum: 0, maximum: 3 },
            },
            required: ['pageId', 'questionText', 'options', 'correctOptionIndex'],
          },
        },
      },
      required: ['questions'],
    },
  };
}

// Uses a forced tool call (tool_choice) rather than prompting for JSON in prose, so the
// shape is structurally guaranteed by the API instead of hoping the model formats it right.
// generate-quiz still runs its own zod + pageId-grounding check on the result regardless.
export class AnthropicProvider implements LLMProvider {
  async generateQuizQuestions(articles: QuizQuestionInput[]): Promise<GeneratedQuizQuestion[]> {
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY is not configured');
    const model = Deno.env.get('ANTHROPIC_MODEL') ?? DEFAULT_MODEL;

    const articlesBlock = articles.map((a) => `[pageId: ${a.pageId}] ${a.title}\n${a.extract}`).join('\n\n');

    const res = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': ANTHROPIC_VERSION,
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: `Articles:\n\n${articlesBlock}` }],
        tools: [buildTool(articles.length)],
        tool_choice: { type: 'tool', name: TOOL_NAME },
      }),
    });

    if (!res.ok) {
      throw new Error(`Anthropic API error: ${res.status} ${await res.text()}`);
    }
    const data = await res.json();
    const toolUse = data.content?.find((block: { type: string }) => block.type === 'tool_use');
    if (!toolUse) throw new Error('Anthropic response did not include a tool_use block');
    return toolUse.input.questions;
  }
}
