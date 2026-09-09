import type { LanguageCode, VoiceExchange } from '../types';
import { getCurrentSession } from './authService';

export interface AIMessage { role: 'user' | 'assistant'; content: string; }
export class AIServiceError extends Error { code: 'not-configured' | 'request-failed' | 'invalid-response'; constructor(message: string, code: 'not-configured' | 'request-failed' | 'invalid-response') { super(message); this.name = 'AIServiceError'; this.code = code; } }
const ENDPOINT = '/api/voice/chat';

async function loadDatabaseContext() {
  const session = getCurrentSession();
  if (!session?.profile?.id || session.role === 'admin') return '';
  try {
    const response = await fetch(`/api/kisanlink/voice-context?role=${session.role}&userId=${encodeURIComponent(session.profile.id)}`);
    return response.ok ? JSON.stringify(await response.json()) : '';
  } catch { return ''; }
}

async function loadWebContext(question: string) {
  if (!question.trim()) return '';
  try {
    const response = await fetch(`/api/web/search?q=${encodeURIComponent(question)}`);
    if (!response.ok) return '';
    const payload = await response.json() as { items?: Array<{ title?: string; snippet?: string; link?: string; source?: string }>; source?: string };
    if (!Array.isArray(payload.items) || !payload.items.length) return '';
    return JSON.stringify({ source: payload.source || 'web', results: payload.items.slice(0, 5) });
  } catch { return ''; }
}

function parseBuyerCrops(buyer: any): string[] {
  try {
    if (Array.isArray(buyer?.crops)) return buyer.crops.map(String);
    if (typeof buyer?.crops_json === 'string') {
      const parsed = JSON.parse(buyer.crops_json);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    }
  } catch { /* ignore malformed profile data */ }
  return [];
}

function localDatabaseAnswer(question: string, raw: string, language: LanguageCode, webRaw = ''): string {
  try {
    const data = JSON.parse(raw) as any;
    const q = question.toLowerCase().trim();
    const farmer = data.farmer;
    const buyer = data.buyer;
    const listings = Array.isArray(data.listings) ? data.listings : [];
    const buyers = Array.isArray(data.buyers) ? data.buyers : [];
    const requests = Array.isArray(data.requests) ? data.requests : [];
    const firstListing = listings[0];
    const crop = firstListing?.crop_name || firstListing?.cropName || farmer?.crop || '';
    const qty = Number(firstListing?.quantity_quintals || firstListing?.quantityQuintals || farmer?.quantityQuintals || 0);
    const buyerCrops = parseBuyerCrops(buyer);
    const accepted = requests.filter((r: any) => r.status === 'accepted');
    const pending = requests.filter((r: any) => r.status === 'pending');

    const has = (...words: string[]) => words.some(word => q.includes(word));
    const asksPrice = has('price', 'rate', 'mandi', 'market price', 'today', 'latest', 'भाव', 'कीमत', 'ధర', 'మార్కెట్');
    const asksSell = has('how to sell', 'where to sell', 'sell this', 'selling route', 'sell my', 'बेचना', 'विक्री', 'అమ్మాలి', 'ఎక్కడ అమ్మ');
    const asksQuality = has('quality', 'grade', 'fresh', 'quality check', 'गुणवत्ता', 'दर्जा', 'నాణ్యత');
    const asksStorage = has('storage', 'store', 'keep', 'preserve', 'संग्रह', 'भंडारण', 'साठवण', 'నిల్వ');
    const asksDemand = has('demand', 'want', 'need', 'looking for', 'wanted', 'कितना चाहिए', 'चाहिए', 'कावాలి', 'కావాలి', 'हवे');
    const asksBuyer = has('buyer', 'buyers', 'खरीदार', 'खरेदीदार', 'కొనుగోలు', 'కొనేవారు');
    const asksFarmer = has('farmer', 'farmers', 'रैतु', 'रैतिक', 'किसान', 'शेतकरी', 'రైతు');
    const asksRequest = has('request', 'requests', 'connect', 'connection', 'pending', 'accepted', 'अनुरोध', 'कनेक्शन', 'विनंती', 'అభ్యర్థన');
    const asksContact = has('contact', 'phone', 'mobile', 'email', 'number', 'नंबर', 'फोन', 'ఫోన్');
    const asksCrop = has('what crop', 'which crop', 'my crop', 'what am i selling', 'crop am i', 'फसल', 'पिक', 'పంట');
    const asksQuantity = has('quantity', 'how much', 'quintal', 'quintals', 'कितना', 'मात्रा', 'ఎంత');

    if (asksContact) {
      if (!accepted.length) return 'No accepted connection is available yet. Contact details are protected until the other side accepts a request.';
      return accepted.map((r: any) => r.buyerName
        ? `${r.buyerName}: ${r.buyerMobile || 'mobile unavailable'}${r.buyerEmail ? `, ${r.buyerEmail}` : ''}`
        : `${r.farmerName || 'Farmer'}: ${r.farmerMobile || 'mobile unavailable'}${r.farmerEmail ? `, ${r.farmerEmail}` : ''}`).join(' ');
    }

    if (asksRequest) {
      if (!requests.length) return 'You have no connection requests yet. A buyer or farmer can send a request from the marketplace.';
      return requests.slice(0, 8).map((r: any) => `${r.buyerName || r.farmerName || 'Connection'} — ${r.status} for ${r.cropName || crop || 'produce'}${r.requestedQuantity ? `, ${r.requestedQuantity} quintals` : ''}.`).join(' ');
    }

    if (asksPrice) {
      if (webRaw) {
        try {
          const web = JSON.parse(webRaw) as any;
          const top = Array.isArray(web.results) ? web.results[0] : null;
          if (top) return `For ${crop || 'your crop'}, I found current web information: ${top.title || 'market update'}. ${top.snippet || ''} Source: ${top.source || 'Google News'}. Verify the latest local mandi quote before making a sale.`;
        } catch { /* use safe fallback */ }
      }
      return `I don't have a verified live mandi price in the KisanLink database right now${crop ? ` for ${crop}` : ''}. Check the latest local mandi/APMC quote and compare grade, quantity, location, and transport costs before accepting an offer.`;
    }

    if (asksQuality) {
      return crop
        ? `For your ${crop}, quality should be judged by visible freshness, cleanliness, uniform size, damage, bruising, spoilage, and handling. Use the 2-photo quality check in KisanLink for a visual assessment.`
        : 'Add your crop first, then use the 2-photo quality check. The assessment can compare visible freshness, cleanliness, damage, and uniformity.';
    }

    if (asksStorage) {
      return crop
        ? `For ${crop}, keep the produce dry, shaded, ventilated, and separated from damaged produce. Avoid excess heat and moisture, and use clean containers to reduce handling losses.`
        : 'For most fresh produce, use a cool, dry, ventilated storage area, remove damaged produce, and avoid unnecessary handling.';
    }

    if (asksSell) {
      if (!crop) return 'Add your crop details first. Then KisanLink can show matching buyers and you can send a connection request to the buyer you choose.';
      const matchingBuyers = buyers.filter((b: any) => parseBuyerCrops(b).some((c: string) => crop.toLowerCase().includes(c.toLowerCase()) || c.toLowerCase().includes(crop.toLowerCase())));
      return matchingBuyers.length
        ? `You can offer your ${crop}${qty ? ` (${qty} quintals)` : ''} to matching buyers such as ${matchingBuyers.slice(0, 4).map((b: any) => b.name).join(', ')}. Open the buyer list and send a request; contact details are shared after acceptance.`
        : `Your ${crop} is saved. Open the buyer marketplace to compare available buyer demands and send a connection request.`;
    }

    if (asksDemand && buyer) {
      return `Your current buyer demand is ${buyerCrops.length ? buyerCrops.join(', ') : 'not set'}${buyer.typical_quantity ? `, typically ${buyer.typical_quantity} quintals` : ''}. You can change crops, grades, and quantity in My demand.`;
    }

    if (asksBuyer && farmer) {
      if (!buyers.length) return 'There are no registered buyers in the database.';
      return `There are ${buyers.length} registered buyers in the live database: ${buyers.slice(0, 4).map((b: any) => b.name).join(', ')}. Their current demands are shown after your crop details are entered.`;
    }

    if (asksFarmer && buyer) {
      const wanted = buyerCrops.map(c => c.toLowerCase());
      const matches = listings.filter((listing: any) => wanted.some(word => String(listing.crop_name || listing.cropName || '').toLowerCase().includes(word)));
      return matches.length
        ? `I found ${matches.length} farmer listing${matches.length === 1 ? '' : 's'} matching your demand. ${matches.slice(0, 4).map((m: any) => `${m.crop_name || m.cropName} from ${m.farmer_name || m.farmerName}, ${m.quantity_quintals || m.quantityQuintals || 0} quintals`).join('; ')}.`
        : 'I could not find a current farmer listing matching your saved buyer demand.';
    }

    if (asksCrop) return crop ? `Your saved crop is ${crop}${qty ? ` with ${qty} quintals` : ''}. This comes from your live KisanLink database.` : 'No crop has been saved yet. Add your crop details on the home page first.';
    if (asksQuantity) return qty ? `Your saved listing quantity is ${qty} quintals${crop ? ` of ${crop}` : ''}.` : 'No listing quantity is saved yet. Add your crop and quantity on the home page.';

    if (has('hello', 'hi ', 'hey', 'namaste', 'నమస్తే', 'नमस्ते')) return 'Hello! I can answer questions about your crop, buyers, demand, selling options, quality, requests, contacts, and current market information.';

    if (language === 'hi') return 'मैं आपके सवाल के हिसाब से लाइव KisanLink डेटा देख सकता हूँ। फसल, खरीदार, मांग, कीमत, बिक्री, गुणवत्ता या कनेक्शन के बारे में अपना सवाल लिखें।';
    if (language === 'te') return 'మీ ప్రశ్నకు అనుగుణంగా లైవ్ KisanLink డేటాను చూస్తాను. పంట, కొనుగోలుదారు, డిమాండ్, ధర, అమ్మకం, నాణ్యత లేదా కనెక్షన్ గురించి అడగండి.';
    if (language === 'mr') return 'तुमच्या प्रश्नानुसार मी लाइव्ह KisanLink डेटा तपासतो. पीक, खरेदीदार, मागणी, किंमत, विक्री, गुणवत्ता किंवा कनेक्शनबद्दल विचारा.';
    return `I checked your live KisanLink data. I don't want to guess about “${question}”. Ask me about your crop, quantity, buyers, demand, selling options, quality, requests, contacts, or current market information.`;
  } catch {
    return 'I could not read the current KisanLink data. Please try again.';
  }
}

export async function askAgriculturalAI(messages: AIMessage[], language: LanguageCode): Promise<string> {
  const context = messages.slice(-12);
  const userMessages = context.filter(message => message.role === 'user');
  const last = userMessages.length ? userMessages[userMessages.length - 1].content : '';
  const database = await loadDatabaseContext();
  const web = await loadWebContext(last);
  const trustedContext = [
    database ? `KISANLINK DATABASE CONTEXT — trusted live application data. Use it as the source of truth for the user's account. Never invent live records. Only reveal another party's mobile/email when a request is accepted.\n${database}` : '',
    web ? `CURRENT WEB CONTEXT — retrieved for this question because it may need current information. Treat it as supporting external context, not as account truth. Cite the source name in plain language when useful. Never invent exact prices from snippets.\n${web}` : '',
  ].filter(Boolean).join('\n\n');
  const contextMessage: AIMessage | null = trustedContext ? { role: 'user', content: trustedContext } : null;
  const aiMessages: AIMessage[] = contextMessage ? [contextMessage, ...context] : context;

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        language,
        messages: aiMessages,
        systemPrompt: 'You are KisanLink KisanVoice. Answer the latest user question dynamically, not with a fixed script. Understand Indian languages, transliteration, dialects and mixed-language input. Use the supplied live KisanLink database for account facts and supplied current web context for timely external facts. Never invent live records, contacts, or exact prices. Do not repeat a previous answer unless it is actually relevant. Answer the specific question first and keep it practical.',
      }),
    });
    if (!response.ok) {
      if (database) return localDatabaseAnswer(last, database, language, web);
      throw new AIServiceError('KisanVoice AI is unavailable.', 'request-failed');
    }
    const payload = await response.json() as any;
    const content = typeof payload.response === 'string'
      ? payload.response
      : typeof payload.message?.content === 'string'
        ? payload.message.content
        : Array.isArray(payload.choices) ? (payload.choices[0]?.message?.content || payload.choices[0]?.text) : undefined;
    if (typeof content !== 'string' || !content.trim()) return database ? localDatabaseAnswer(last, database, language, web) : 'I could not generate an answer. Please try again.';
    return content.trim();
  } catch (error) {
    if (database) return localDatabaseAnswer(last, database, language, web);
    if (error instanceof AIServiceError) throw error;
    throw new AIServiceError('KisanVoice is temporarily unavailable.', 'request-failed');
  }
}

export function exchangesToMessages(exchanges: VoiceExchange[]): AIMessage[] {
  return exchanges.slice(-12).map(exchange => ({ role: exchange.role, content: exchange.text }));
}
