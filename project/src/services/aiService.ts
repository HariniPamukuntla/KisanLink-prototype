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
  const apiKey = import.meta.env.VITE_AI_API_KEY?.trim();

  if (!endpoint) {
    throw new AIServiceError(
      'AI assistant is not configured yet. Add VITE_AI_API_URL (and the provider key on your server) to connect a language model.',
      'not-configured'
    );
  }

  return { endpoint, apiKey };
}

export async function askAgriculturalAI(
  messages: AIMessage[],
  language: LanguageCode
): Promise<string> {
  const { endpoint, apiKey } = getAIEndpoint();

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}),
    },
    body: JSON.stringify({
      language,
      messages,
      systemPrompt:
        'You are KisanLink, a practical and careful agricultural assistant for Indian farmers. Answer in the requested language when possible. Give actionable farming, storage, market, and buyer guidance. Do not invent live prices, government scheme eligibility, or disease diagnoses; clearly label estimates and recommend checking local official sources when needed.',
    }),
  });

  if (!response.ok) {
    throw new AIServiceError(
      `The AI assistant could not respond (HTTP ${response.status}). Check the configured AI service and try again.`,
      'request-failed'
    );
  }

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new AIServiceError(
      'The AI service returned an unreadable response. Check the service endpoint configuration.',
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
      'The AI service returned no answer. Check that its response uses response, message.content, or choices[0].message.content.',
      'invalid-response'
    );
  }

  return content.trim();
}

export function exchangesToMessages(exchanges: VoiceExchange[]): AIMessage[] {
  return exchanges.map(exchange => ({
    role: exchange.role,
    content: exchange.text,
  }));
}