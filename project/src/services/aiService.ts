import type { LanguageCode, VoiceExchange } from '../types';

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export class AIServiceError extends Error {
  code: 'not-configured' | 'request-failed' | 'invalid-response';

  constructor(
    message: string,
    code: 'not-configured' | 'request-failed' | 'invalid-response'
  ) {
    super(message);
    this.name = 'AIServiceError';
    this.code = code;
  }
}

const DEFAULT_AI_ENDPOINT = '/api/voice/chat';

function getAIEndpoint() {
  return import.meta.env.VITE_AI_API_URL?.trim() || DEFAULT_AI_ENDPOINT;
}

export async function askAgriculturalAI(
  messages: AIMessage[],
  language: LanguageCode
): Promise<string> {
  const endpoint = getAIEndpoint();
  const context = messages.slice(-12);

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language,
        messages: context,
        systemPrompt:
          'You are KisanLink’s in-app farmer decision assistant. Understand multilingual and mixed-language farmer speech. Reply in the selected application language. For selling, quality, or price questions, use these plain-text sections in order: PRODUCT AND REQUEST, QUALITY CHECK, PRICE ANALYSIS, BEST RECOMMENDATION, OTHER OPTIONS, NEXT STEPS. Use short bullet lines, no Markdown tables, pipes, long paragraphs, or raw symbols such as ###, **, or ---. Repeat the product and quantity. Without submitted crop images or structured assessment, call quality guidance preliminary and do not claim a visual grade. Never invent live prices; explain when live data is unavailable and give useful comparison factors and next steps. Make recommendations specific to the farmer’s product, quantity, location, and goal.',
      }),
    });
  } catch {
    throw new AIServiceError(
      'AI assistant is currently unavailable. Please check the AI configuration.',
      'request-failed'
    );
  }

  if (!response.ok) {
    const errorPayload = await response.json().catch(() => null) as { error?: unknown } | null;
    if (response.status === 503 || typeof errorPayload?.error === 'string' && errorPayload.error.toLowerCase().includes('not configured')) {
      throw new AIServiceError(
        'AI assistant is currently unavailable. Please check the AI configuration.',
        'not-configured'
      );
    }
    throw new AIServiceError(
      'AI assistant is currently unavailable. Please check the AI configuration.',
      'request-failed'
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new AIServiceError(
      'AI assistant is currently unavailable. Please check the AI configuration.',
      'invalid-response'
    );
  }

  const content =
    typeof (payload as { response?: unknown })?.response === 'string'
      ? (payload as { response: string }).response
      : typeof (payload as { message?: { content?: unknown } })?.message?.content === 'string'
        ? (payload as { message: { content: string } }).message.content
        : Array.isArray((payload as { choices?: unknown[] })?.choices)
          ? (payload as { choices: Array<{ message?: { content?: unknown }; text?: unknown }> }).choices[0]?.message?.content ||
            (payload as { choices: Array<{ text?: unknown }> }).choices[0]?.text
          : undefined;

  if (typeof content !== 'string' || !content.trim()) {
    throw new AIServiceError(
      'AI assistant is currently unavailable. Please check the AI configuration.',
      'invalid-response'
    );
  }

  return content.trim();
}

export function exchangesToMessages(exchanges: VoiceExchange[]): AIMessage[] {
  return exchanges.slice(-12).map(exchange => ({
    role: exchange.role,
    content: exchange.text,
  }));
}