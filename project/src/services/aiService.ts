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

function getAIEndpoint() {
  const endpoint = import.meta.env.VITE_AI_API_URL?.trim();

  if (!endpoint) {
    throw new AIServiceError(
      'AI assistant is currently unavailable. Please check the AI configuration.',
      'not-configured'
    );
  }

  return endpoint;
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
          'You are KisanLink Agricultural AI Assistant. Help Indian farmers with agricultural questions, crops, markets, storage, buyers, government schemes, crop quality, and general farming. Understand informal and mixed-language speech. Reply in the farmer’s language or natural mixed style whenever possible. Never invent today’s prices, scheme eligibility, or live facts. If no real-time data source is connected, say that live market data is not currently connected instead of guessing.',
      }),
    });
  } catch {
    throw new AIServiceError(
      'AI assistant is currently unavailable. Please check the AI configuration.',
      'request-failed'
    );
  }

  if (!response.ok) {
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