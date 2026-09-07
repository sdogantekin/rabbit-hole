import type { GeneratedQuizQuestion, LLMProvider, QuizQuestionInput } from './provider.ts';

const SYSTEM_PROMPT =
  'You write short multiple-choice quiz questions strictly grounded in the provided ' +
  'Wikipedia extracts. Never introduce a fact not present in the given extract for an ' +
  'article. Respond with a single JSON object shaped exactly like ' +
  '{"questions": [{"pageId": number, "questionText": string, ' +
  '"options": [string, string, string, string], "correctOptionIndex": 0-3}]}, ' +
  'with exactly one entry per article, referencing it by its pageId, and no other text.';

// design.md §5.1: "a generic adapter configured with a base URL + model name + API key... ' +
// one adapter handles all of them via config, not per-provider code." Covers Qwen,
// DeepSeek, and any other OpenAI-compatible chat-completions endpoint. Operators deploying a
// specific provider should still follow design.md's per-provider secret naming
// (QWEN_API_KEY, DEEPSEEK_API_KEY, ...) at the infra level and map it to
// OPENAI_COMPATIBLE_API_KEY for whichever provider LLM_PROVIDER currently points at.
export class OpenAICompatibleProvider implements LLMProvider {
  async generateQuizQuestions(articles: QuizQuestionInput[]): Promise<GeneratedQuizQuestion[]> {
    const baseUrl = Deno.env.get('OPENAI_COMPATIBLE_BASE_URL');
    const apiKey = Deno.env.get('OPENAI_COMPATIBLE_API_KEY');
    const model = Deno.env.get('OPENAI_COMPATIBLE_MODEL');
    if (!baseUrl || !apiKey || !model) {
      throw new Error(
        'OPENAI_COMPATIBLE_BASE_URL, OPENAI_COMPATIBLE_API_KEY, and OPENAI_COMPATIBLE_MODEL must all be set',
      );
    }

    const articlesBlock = articles.map((a) => `[pageId: ${a.pageId}] ${a.title}\n${a.extract}`).join('\n\n');

    const res = await fetch(`${baseUrl.replace(/\/$/, '')}/chat/completions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Articles:\n\n${articlesBlock}` },
        ],
        response_format: { type: 'json_object' },
      }),
    });

    if (!res.ok) {
      throw new Error(`OpenAI-compatible provider error: ${res.status} ${await res.text()}`);
    }
    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content;
    if (typeof raw !== 'string') throw new Error('OpenAI-compatible response had no message content');
    return JSON.parse(raw).questions;
  }
}
