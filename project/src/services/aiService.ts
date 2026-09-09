import type { LanguageCode, VoiceExchange } from '../types';
import { getCurrentSession } from './authService';

export interface AIMessage { role: 'user' | 'assistant'; content: string; }
export class AIServiceError extends Error {
  code: 'not-configured' | 'request-failed' | 'invalid-response';
  constructor(message: string, code: 'not-configured' | 'request-failed' | 'invalid-response') {
    super(message);
    this.name = 'AIServiceError';
    this.code = code;
  }
}

const ENDPOINT = '/api/voice/chat';

async function loadDatabaseContext() {
  const session = getCurrentSession();
  if (!session?.profile?.id || session.role === 'admin') return '';
  try {
    const response = await fetch(`/api/kisanlink/voice-context?role=${session.role}&userId=${encodeURIComponent(session.profile.id)}`);
    return response.ok ? JSON.stringify(await response.json()) : '';
  } catch {
    return '';
  }
}

function localDatabaseAnswer(question: string, raw: string, language: LanguageCode): string {
  try {
    const data = JSON.parse(raw) as any;
    const q = question.toLowerCase();
    const farmer = data.farmer;
    const buyer = data.buyer;
    const listings = Array.isArray(data.listings) ? data.listings : [];
    const buyers = Array.isArray(data.buyers) ? data.buyers : [];
    const requests = Array.isArray(data.requests) ? data.requests : [];
    const crop = farmer?.id ? (listings[0]?.crop_name || listings[0]?.cropName || '') : '';
    const qty = farmer?.id ? (listings[0]?.quantity_quintals || listings[0]?.quantityQuintals || 0) : 0;
    const buyerCrops = buyer?.crops_json ? JSON.parse(buyer.crops_json) : (buyer?.crops || []);
    const cropWords = ['crop', 'produce', 'selling', 'sell', 'what am i selling', 'పంట', 'फसल', 'पीक'];
    const buyerWords = ['buyer', 'buyers', 'who can buy', 'खरीदार', 'खरेदीदार', 'కొనుగోలు', 'కొనేవారు'];
    const requestWords = ['request', 'requests', 'connect', 'connection', 'अभ्यर्थन', 'अनुरोध', 'विनंती', 'కనెక్షన్', 'అభ్యర్థన'];
    const farmerWords = ['farmer', 'farmers', 'రైతు', 'किसान', 'शेतकरी'];
    const demandWords = ['want', 'need', 'demand', 'wanted', 'కావాలి', 'चाहिए', 'हवे'];
    const has = (words: string[]) => words.some(word => q.includes(word));

    if (has(cropWords)) {
      if (crop) return `Your saved crop is ${crop}${qty ? ` with ${qty} quintals` : ''}. This is from your live KisanLink database.`;
      return 'No crop has been saved yet. Add your crop details on the home page first.';
    }
    if (has(demandWords) && buyer) {
      return `Your current buyer demand is ${buyerCrops.join(', ') || 'not set'}, with a typical quantity of ${buyer.typical_quantity || 0} quintals. You can update it in My demand.`;
    }
    if (has(buyerWords) && farmer) {
      if (!buyers.length) return 'There are no registered buyers in the database.';
      return `I found ${buyers.length} registered buyers: ${buyers.slice(0, 4).map((b: any) => b.name).join(', ')}. The buyer records come from the live database.`;
    }
    if (has(farmerWords) && buyer) {
      const wanted = buyerCrops.map((value: string) => value.toLowerCase());
      const matches = listings.filter((listing: any) => wanted.some((word: string) => String(listing.crop_name || listing.cropName).toLowerCase().includes(word)));
      if (!matches.length) return 'No current farmer listing matches your buyer demand.';
      return `I found ${matches.length} farmer listings matching your demand. The latest is ${matches[0].crop_name || matches[0].cropName} from ${matches[0].farmer_name || matches[0].farmerName}, ${matches[0].quantity_quintals || matches[0].quantityQuintals} quintals.`;
    }
    if (has(requestWords)) {
      if (!requests.length) return 'You have no connection requests yet.';
      return requests.slice(0, 5).map((request: any) => `${request.buyerName || request.farmerName}: ${request.status} for ${request.cropName}, ${request.requestedQuantity} quintals.`).join(' ');
    }
    if (q.includes('contact') || q.includes('phone') || q.includes('mobile') || q.includes('email') || q.includes('नंबर') || q.includes('ఫోన్')) {
      const accepted = requests.filter((request: any) => request.status === 'accepted');
      if (!accepted.length) return 'No accepted connection is available, so protected contact details cannot be shared yet.';
      return accepted.map((request: any) => request.buyerName
        ? `${request.buyerName}: ${request.buyerMobile || 'mobile unavailable'}${request.buyerEmail ? `, ${request.buyerEmail}` : ''}`
        : `${request.farmerName}: ${request.farmerMobile || 'mobile unavailable'}${request.farmerEmail ? `, ${request.farmerEmail}` : ''}`
      ).join(' ');
    }
    if (language === 'hi') return 'मैंने आपका लाइव KisanLink डेटाबेस देखा है। अपनी फसल, खरीदार, मांग या कनेक्शन के बारे में पूछें।';
    if (language === 'te') return 'నేను మీ లైవ్ KisanLink డేటాబేస్‌ను చూశాను. మీ పంట, కొనుగోలుదారులు, డిమాండ్ లేదా కనెక్షన్ల గురించి అడగండి.';
    if (language === 'mr') return 'मी तुमचा लाइव्ह KisanLink डेटाबेस तपासला आहे. तुमच्या पिकाबद्दल, खरेदीदारांबद्दल, मागणीबद्दल किंवा कनेक्शनबद्दल विचारा.';
    return 'I checked your live KisanLink database. Ask me about your crop, buyers, demand, farmer listings, or connection requests.';
  } catch {
    return 'I could not read the current KisanLink database context. Please try again.';
  }
}

export async function askAgriculturalAI(messages: AIMessage[], language: LanguageCode): Promise<string> {
  const context = messages.slice(-12);
  const database = await loadDatabaseContext();
  const userMessages = context.filter(message => message.role === 'user');
  const last = userMessages.length ? userMessages[userMessages.length - 1].content : '';
  const databaseMessage: AIMessage | null = database
    ? {
        role: 'user',
        content: `KISANLINK DATABASE CONTEXT — trusted live application data for this logged-in user. Use it as the source of truth. Do not invent buyers, farmers, crops, requests, prices, or contacts. Only reveal another party's mobile/email when the request status is accepted.\n${database}`,
      }
    : null;
  const aiMessages: AIMessage[] = databaseMessage ? [databaseMessage, ...context] : context;

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language,
        messages: aiMessages,
        systemPrompt: 'You are KisanLink KisanVoice. Understand Indian languages, dialects, transliteration and mixed-language farmer speech. Answer directly and practically in the selected language. Use KISANLINK DATABASE CONTEXT as the source of truth. Never invent live application records or protected contact details.',
      }),
    });
    if (!response.ok) {
      if (database) return localDatabaseAnswer(last, database, language);
      throw new AIServiceError('KisanVoice AI is unavailable.', 'request-failed');
    }
    const payload = await response.json() as any;
    const content = typeof payload.response === 'string'
      ? payload.response
      : typeof payload.message?.content === 'string'
        ? payload.message.content
        : Array.isArray(payload.choices)
          ? (payload.choices[0]?.message?.content || payload.choices[0]?.text)
          : undefined;
    if (typeof content !== 'string' || !content.trim()) {
      return database ? localDatabaseAnswer(last, database, language) : 'I could not generate an answer. Please try again.';
    }
    return content.trim();
  } catch (error) {
    if (database) return localDatabaseAnswer(last, database, language);
    if (error instanceof AIServiceError) throw error;
    throw new AIServiceError('KisanVoice is temporarily unavailable.', 'request-failed');
  }
}

export function exchangesToMessages(exchanges: VoiceExchange[]): AIMessage[] {
  return exchanges.slice(-12).map(exchange => ({ role: exchange.role, content: exchange.text }));
}
