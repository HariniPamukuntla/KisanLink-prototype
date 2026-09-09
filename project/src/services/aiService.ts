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

async function loadMarketPriceContext() {
  try {
    const response = await fetch('/api/market-prices');
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
    if (typeof buyer?.crops_json === 'string') { const parsed = JSON.parse(buyer.crops_json); return Array.isArray(parsed) ? parsed.map(String) : []; }
  } catch { /* ignore malformed profile data */ }
  return [];
}

function localizedPriceAnswer(prices:any[], question:string, language:LanguageCode): string {
  const q=question.toLowerCase();
  const aliases:[string,string[]][]=[
    ['onion-big',['onion','प्याज','उल्लिपाय','ఉల్లిపాయ','कांदा']],
    ['tomato',['tomato','टमाटर','టమాటా','टोमॅटो']],
    ['potato',['potato','आलू','బంగాళాదుంప','बटाटा']],
    ['green-chilli',['chilli','chili','mirchi','मिर्च','మిర్చి','मिरची']],
    ['carrot',['carrot','गाजर','క్యారెట్']],
    ['beetroot',['beetroot','चुकंदर','బీట్‌రూట్','बीट']],
    ['brinjal',['brinjal','बैंगन','వంకాయ','वांगी']],
    ['bhindi',['okra','bhindi','भिंडी','బెండకాయ','भेंडी']],
    ['cabbage',['cabbage','पत्तागोभी','క్యాబేజీ','कोबी']],
  ];
  const requested=aliases.find(([,words])=>words.some(w=>q.includes(w)));
  const row=requested ? prices.find(p=>p.commodityKey===requested[0]) : null;
  const rows=row?[row]:prices.slice(0,9);
  if(!rows.length) return language==='hi'?'आज के बाजार भाव अभी उपलब्ध नहीं हैं।':language==='te'?'ఈరోజు మార్కెట్ ధరలు ఇంకా అందుబాటులో లేవు.':language==='mr'?'आजचे बाजारभाव अजून उपलब्ध नाहीत.':'Today\'s market prices are not available yet.';
  const name=(p:any)=>p?.names?.[language]||p?.names?.en||p?.commodityKey;
  if(row) {
    const n=name(row);
    if(language==='hi') return `आज Hyderabad में ${n} का मंडी भाव लगभग ₹${row.mandiPricePerKg}/kg है। खुदरा कीमत ₹${row.retailMinPerKg}–₹${row.retailMaxPerKg}/kg है। यह ${row.date} का उपलब्ध बाजार डेटा है; स्थानीय मंडी में भाव बदल सकता है।`;
    if(language==='te') return `ఈరోజు Hyderabadలో ${n} మండీ ధర సుమారు ₹${row.mandiPricePerKg}/kg. రిటైల్ ధర ₹${row.retailMinPerKg}–₹${row.retailMaxPerKg}/kg. ఇది ${row.date} అందుబాటులో ఉన్న మార్కెట్ డేటా; స్థానిక మండీలో ధర మారవచ్చు.`;
    if(language==='mr') return `आज Hyderabad मध्ये ${n} चा मंडी भाव सुमारे ₹${row.mandiPricePerKg}/kg आहे. किरकोळ किंमत ₹${row.retailMinPerKg}–₹${row.retailMaxPerKg}/kg आहे. हा ${row.date} चा उपलब्ध बाजार डेटा आहे; स्थानिक बाजारात दर बदलू शकतो.`;
    return `Today in Hyderabad, ${n} is about ₹${row.mandiPricePerKg}/kg in the stored mandi snapshot. Indicative retail price is ₹${row.retailMinPerKg}–₹${row.retailMaxPerKg}/kg. This is data for ${row.date}; local mandi rates can vary.`;
  }
  const label=language==='hi'?'आज Hyderabad के प्रमुख सब्जियों के भाव':language==='te'?'ఈరోజు Hyderabad ప్రధాన కూరగాయల ధరలు':language==='mr'?'आज Hyderabad मधील प्रमुख भाज्यांचे भाव':'Today\'s Hyderabad vegetable prices';
  return `${label}: ${rows.map((p:any)=>`${name(p)} ₹${p.mandiPricePerKg}/kg mandi, ₹${p.retailMinPerKg}–₹${p.retailMaxPerKg}/kg retail`).join('; ')}.`;
}

function localizedCommonAnswer(kind: string, language: LanguageCode, values: { crop?: string; qty?: number; names?: string; count?: number; details?: string } = {}): string | null {
  const { crop = '', qty = 0, names = '', count = 0 } = values;
  if (language === 'hi') {
    if (kind === 'quality') return crop ? `आपकी ${crop} की गुणवत्ता ताजगी, साफ-सफाई, एकसमान आकार, नुकसान, चोट, खराबी और सही रखरखाव के आधार पर जांची जानी चाहिए। KisanLink में 2-फोटो गुणवत्ता जांच का उपयोग करें।` : 'पहले अपनी फसल की जानकारी जोड़ें, फिर 2-फोटो गुणवत्ता जांच का उपयोग करें।';
    if (kind === 'storage') return crop ? `${crop} को सूखी, छायादार और हवादार जगह पर रखें। खराब फसल को अलग रखें और ज्यादा गर्मी या नमी से बचाएं।` : 'ताजी फसल को ठंडी, सूखी और हवादार जगह पर रखें और खराब फसल को अलग करें।';
    if (kind === 'sell') return crop ? `आप अपनी ${crop}${qty ? ` (${qty} क्विंटल)` : ''} को ${names || 'उपलब्ध खरीदारों'} को बेच सकते हैं। मार्केटप्लेस से कनेक्शन अनुरोध भेजें। अनुरोध स्वीकार होने के बाद ही संपर्क विवरण साझा किए जाते हैं।` : 'पहले अपनी फसल की जानकारी जोड़ें। उसके बाद KisanLink मिलान करने वाले खरीदार दिखाएगा।';
    if (kind === 'demand') return `आपकी वर्तमान खरीदार मांग ${names || 'सेट नहीं है'}${qty ? `, आम तौर पर ${qty} क्विंटल` : ''} है। आप My demand में फसल, ग्रेड और मात्रा बदल सकते हैं।`;
    if (kind === 'buyer') return count ? `डेटाबेस में ${count} पंजीकृत खरीदार हैं: ${names}।` : 'डेटाबेस में अभी कोई पंजीकृत खरीदार नहीं है।';
    if (kind === 'farmer') return count ? `${count} किसान लिस्टिंग आपकी खरीदार मांग से मेल खाती हैं।` : 'आपकी वर्तमान खरीदार मांग से मेल खाने वाली किसान लिस्टिंग नहीं मिली।';
    if (kind === 'request') return count ? `आपके पास ${count} कनेक्शन अनुरोध हैं।` : 'आपके पास अभी कोई कनेक्शन अनुरोध नहीं है।';
    if (kind === 'crop') return crop ? `आपकी सेव की गई फसल ${crop}${qty ? ` है और मात्रा ${qty} क्विंटल है` : ''}। यह जानकारी आपके KisanLink डेटाबेस से ली गई है।` : 'अभी कोई फसल सेव नहीं है। होम पेज पर अपनी फसल की जानकारी जोड़ें।';
    if (kind === 'quantity') return qty ? `आपकी सेव की गई मात्रा ${qty} क्विंटल${crop ? ` ${crop} की` : ''} है।` : 'अभी कोई मात्रा सेव नहीं है। होम पेज पर फसल और मात्रा जोड़ें।';
    if (kind === 'hello') return 'नमस्ते! मैं आपकी फसल, खरीदार, मांग, कीमत, बिक्री, गुणवत्ता, अनुरोध और कनेक्शन के बारे में मदद कर सकता हूँ।';
  }
  if (language === 'te') {
    if (kind === 'quality') return crop ? `మీ ${crop} నాణ్యతను తాజాదనం, శుభ్రత, సమాన పరిమాణం, నష్టం, గాయాలు, చెడిపోవడం మరియు సరైన నిర్వహణ ఆధారంగా చూడాలి. KisanLinkలో 2-ఫోటో నాణ్యత తనిఖీని ఉపయోగించండి.` : 'ముందుగా మీ పంట వివరాలను జోడించి, తర్వాత 2-ఫోటో నాణ్యత తనిఖీని ఉపయోగించండి.';
    if (kind === 'storage') return crop ? `${crop}ను పొడి, నీడ ఉన్న, గాలి వచ్చే ప్రదేశంలో ఉంచండి. దెబ్బతిన్న పంటను వేరుగా ఉంచి, అధిక వేడి మరియు తేమను నివారించండి.` : 'తాజా పంటను చల్లని, పొడి, గాలి వచ్చే ప్రదేశంలో ఉంచండి మరియు దెబ్బతిన్న పంటను వేరుగా పెట్టండి.';
    if (kind === 'sell') return crop ? `మీ ${crop}${qty ? ` (${qty} క్వింటాళ్లు)` : ''}ను ${names || 'అందుబాటులో ఉన్న కొనుగోలుదారులకు'} అమ్మవచ్చు. మార్కెట్‌ప్లేస్ నుంచి కనెక్షన్ అభ్యర్థన పంపండి. అభ్యర్థన అంగీకరించిన తర్వాతే సంప్రదింపు వివరాలు చూపబడతాయి.` : 'ముందుగా మీ పంట వివరాలను జోడించండి. తర్వాత KisanLink సరిపోలే కొనుగోలుదారులను చూపిస్తుంది.';
    if (kind === 'demand') return `మీ ప్రస్తుత కొనుగోలుదారు డిమాండ్ ${names || 'సెట్ చేయలేదు'}${qty ? `, సాధారణంగా ${qty} క్వింటాళ్లు` : ''}. My demandలో పంట, గ్రేడ్ మరియు పరిమాణాన్ని మార్చవచ్చు.`;
    if (kind === 'buyer') return count ? `డేటాబేస్‌లో ${count} నమోదైన కొనుగోలుదారులు ఉన్నారు: ${names}.` : 'డేటాబేస్‌లో ప్రస్తుతం నమోదైన కొనుగోలుదారులు లేరు.';
    if (kind === 'farmer') return count ? `మీ కొనుగోలుదారు డిమాండ్‌కు సరిపోలే ${count} రైతు లిస్టింగ్‌లు కనిపించాయి.` : 'మీ ప్రస్తుత కొనుగోలుదారు డిమాండ్‌కు సరిపోలే రైతు లిస్టింగ్ కనిపించలేదు.';
    if (kind === 'request') return count ? `మీకు ${count} కనెక్షన్ అభ్యర్థనలు ఉన్నాయి.` : 'మీకు ఇంకా కనెక్షన్ అభ్యర్థనలు లేవు.';
    if (kind === 'crop') return crop ? `మీరు సేవ్ చేసిన పంట ${crop}${qty ? `, పరిమాణం ${qty} క్వింటాళ్లు` : ''}. ఈ సమాచారం మీ KisanLink డేటాబేస్ నుంచి వచ్చింది.` : 'ఇంకా పంట సేవ్ చేయలేదు. హోమ్ పేజీలో మీ పంట వివరాలను జోడించండి.';
    if (kind === 'quantity') return qty ? `మీరు సేవ్ చేసిన పరిమాణం ${crop ? `${crop}కు ` : ''}${qty} క్వింటాళ్లు.` : 'ఇంకా పరిమాణం సేవ్ చేయలేదు. హోమ్ పేజీలో పంట మరియు పరిమాణాన్ని జోడించండి.';
    if (kind === 'hello') return 'నమస్కారం! మీ పంట, కొనుగోలుదారులు, డిమాండ్, ధరలు, అమ్మకం, నాణ్యత, అభ్యర్థనలు మరియు కనెక్షన్ల గురించి నేను సహాయం చేయగలను.';
  }
  if (language === 'mr') {
    if (kind === 'quality') return crop ? `तुमच्या ${crop} ची गुणवत्ता ताजेपणा, स्वच्छता, एकसमान आकार, नुकसान, डाग, खराबी आणि योग्य हाताळणी यावर तपासली पाहिजे. KisanLink मधील 2-फोटो गुणवत्ता तपासणी वापरा.` : 'आधी तुमच्या पिकाची माहिती जोडा आणि नंतर 2-फोटो गुणवत्ता तपासणी वापरा.';
    if (kind === 'storage') return crop ? `${crop} कोरड्या, सावलीच्या आणि हवेशीर जागी ठेवा. खराब माल वेगळा ठेवा आणि जास्त उष्णता व ओलावा टाळा.` : 'ताजा माल थंड, कोरड्या आणि हवेशीर जागी ठेवा आणि खराब माल वेगळा करा.';
    if (kind === 'sell') return crop ? `तुमचा ${crop}${qty ? ` (${qty} क्विंटल)` : ''} ${names || 'उपलब्ध खरेदीदारांना'} विकू शकता. मार्केटप्लेसमधून कनेक्शन विनंती पाठवा. विनंती स्वीकारल्यानंतरच संपर्क तपशील दिसतील.` : 'आधी तुमच्या पिकाची माहिती जोडा. त्यानंतर KisanLink जुळणारे खरेदीदार दाखवेल.';
    if (kind === 'demand') return `तुमची सध्याची खरेदीदार मागणी ${names || 'सेट केलेली नाही'}${qty ? `, साधारण ${qty} क्विंटल` : ''} आहे. My demand मध्ये पीक, ग्रेड आणि प्रमाण बदलू शकता.`;
    if (kind === 'buyer') return count ? `डेटाबेसमध्ये ${count} नोंदणीकृत खरेदीदार आहेत: ${names}.` : 'डेटाबेसमध्ये सध्या कोणतेही नोंदणीकृत खरेदीदार नाहीत.';
    if (kind === 'farmer') return count ? `तुमच्या खरेदीदार मागणीशी जुळणाऱ्या ${count} शेतकरी लिस्टिंग सापडल्या.` : 'तुमच्या सध्याच्या खरेदीदार मागणीशी जुळणारी शेतकरी लिस्टिंग सापडली नाही.';
    if (kind === 'request') return count ? `तुमच्याकडे ${count} कनेक्शन विनंत्या आहेत.` : 'तुमच्याकडे अजून कोणतीही कनेक्शन विनंती नाही.';
    if (kind === 'crop') return crop ? `तुम्ही सेव केलेले पीक ${crop}${qty ? ` आणि प्रमाण ${qty} क्विंटल आहे` : ''}. ही माहिती तुमच्या KisanLink डेटाबेसमधून घेतली आहे.` : 'अजून कोणतेही पीक सेव केलेले नाही. होम पेजवर तुमची पिकाची माहिती जोडा.';
    if (kind === 'quantity') return qty ? `तुम्ही सेव केलेले प्रमाण ${crop ? `${crop}चे ` : ''}${qty} क्विंटल आहे.` : 'अजून प्रमाण सेव केलेले नाही. होम पेजवर पीक आणि प्रमाण जोडा.';
    if (kind === 'hello') return 'नमस्कार! मी तुमचे पीक, खरेदीदार, मागणी, किंमती, विक्री, गुणवत्ता, विनंत्या आणि कनेक्शन याबद्दल मदत करू शकतो.';
  }
  return null;
}

function localDatabaseAnswer(question: string, raw: string, language: LanguageCode, webRaw = '', marketRaw = ''): string {
  try {
    const data = JSON.parse(raw) as any;
    const q = question.toLowerCase().trim();
    const farmer = data.farmer; const buyer = data.buyer;
    const listings = Array.isArray(data.listings) ? data.listings : [];
    const buyers = Array.isArray(data.buyers) ? data.buyers : [];
    const requests = Array.isArray(data.requests) ? data.requests : [];
    const firstListing = listings[0];
    const crop = firstListing?.crop_name || firstListing?.cropName || farmer?.crop || '';
    const qty = Number(firstListing?.quantity_quintals || firstListing?.quantityQuintals || farmer?.quantityQuintals || 0);
    const buyerCrops = parseBuyerCrops(buyer);
    const accepted = requests.filter((r: any) => r.status === 'accepted');
    const has = (...words: string[]) => words.some(word => q.includes(word));
    const asksPrice = has('price','rate','mandi','market price','today','latest','भाव','कीमत','दर','ధర','మార్కెట్','किंमत');
    const asksSell = has('how to sell','where to sell','sell this','selling route','sell my','बेचना','विक्री','అమ్మాలి','ఎక్కడ అమ్మ');
    const asksQuality = has('quality','grade','fresh','quality check','गुणवत्ता','दर्जा','నాణ్యత');
    const asksStorage = has('storage','store','keep','preserve','संग्रह','भंडारण','साठवण','నిల్వ');
    const asksDemand = has('demand','want','need','looking for','wanted','कितना चाहिए','चाहिए','కావాలి','हवे');
    const asksBuyer = has('buyer','buyers','खरीदार','खरेदीदार','కొనుగోలు','కొనేవారు');
    const asksFarmer = has('farmer','farmers','रैतु','किसान','शेतकरी','రైతు');
    const asksRequest = has('request','requests','connect','connection','pending','accepted','अनुरोध','कनेक्शन','विनंती','అభ్యర్థన');
    const asksContact = has('contact','phone','mobile','email','number','नंबर','फोन','ఫోన్');
    const asksCrop = has('what crop','which crop','my crop','what am i selling','crop am i','फसल','पिक','పంట');
    const asksQuantity = has('quantity','how much','quintal','quintals','कितना','मात्रा','ఎంత');

    let marketPrices:any[]=[];
    try { const parsed=marketRaw?JSON.parse(marketRaw):null; marketPrices=Array.isArray(parsed?.prices)?parsed.prices:[]; } catch { marketPrices=[]; }
    if (asksPrice && marketPrices.length) return localizedPriceAnswer(marketPrices, question, language);

    if (asksContact) {
      if (!accepted.length) return language==='hi'?'अभी कोई स्वीकृत कनेक्शन नहीं है। दूसरे पक्ष के अनुरोध स्वीकार करने के बाद ही संपर्क विवरण दिखेंगे।':language==='te'?'ఇంకా ఆమోదించిన కనెక్షన్ లేదు. అభ్యర్థన అంగీకరించిన తర్వాతే సంప్రదింపు వివరాలు కనిపిస్తాయి.':'No accepted connection is available yet. Contact details are protected until the other side accepts a request.';
      return accepted.map((r: any) => r.buyerName ? `${r.buyerName}: ${r.buyerMobile || 'mobile unavailable'}${r.buyerEmail ? `, ${r.buyerEmail}` : ''}` : `${r.farmerName || 'Farmer'}: ${r.farmerMobile || 'mobile unavailable'}${r.farmerEmail ? `, ${r.farmerEmail}` : ''}`).join(' ');
    }
    if (asksRequest) {
      const localized = localizedCommonAnswer('request', language, { count: requests.length });
      if (localized) return localized;
      if (!requests.length) return 'You have no connection requests yet. A buyer or farmer can send a request from the marketplace.';
      return requests.slice(0,8).map((r:any)=>`${r.buyerName||r.farmerName||'Connection'} — ${r.status} for ${r.cropName||crop||'produce'}${r.requestedQuantity?`, ${r.requestedQuantity} quintals`:''}.`).join(' ');
    }
    if (asksQuality) return localizedCommonAnswer('quality', language, { crop }) || (crop ? `For your ${crop}, quality should be judged by freshness, cleanliness, uniform size, damage, bruising, spoilage, and handling. Use the 2-photo quality check in KisanLink.` : 'Add your crop first, then use the 2-photo quality check.');
    if (asksStorage) return localizedCommonAnswer('storage', language, { crop }) || (crop ? `For ${crop}, keep the produce dry, shaded, ventilated, and separated from damaged produce. Avoid excess heat and moisture.` : 'For most fresh produce, use a cool, dry, ventilated storage area and remove damaged produce.');
    if (asksSell) {
      if (!crop) return localizedCommonAnswer('sell', language, { crop }) || 'Add your crop details first. Then KisanLink can show matching buyers and you can send a connection request.';
      const matchingBuyers=buyers.filter((b:any)=>parseBuyerCrops(b).some((c:string)=>crop.toLowerCase().includes(c.toLowerCase())||c.toLowerCase().includes(crop.toLowerCase())));
      return localizedCommonAnswer('sell', language, { crop, qty, names: matchingBuyers.slice(0,4).map((b:any)=>b.name).join(', ') }) || (matchingBuyers.length?`You can offer your ${crop}${qty?` (${qty} quintals)`:''} to ${matchingBuyers.slice(0,4).map((b:any)=>b.name).join(', ')}. Send a request; contact details are shared after acceptance.`:`Your ${crop} is saved. Open the buyer marketplace to compare buyer demands.`);
    }
    if (asksDemand && buyer) return localizedCommonAnswer('demand', language, { names: buyerCrops.length ? buyerCrops.join(', ') : '', qty: Number(buyer.typical_quantity || 0) }) || `Your current buyer demand is ${buyerCrops.length?buyerCrops.join(', '):'not set'}${buyer.typical_quantity?`, typically ${buyer.typical_quantity} quintals`:''}. You can change crops, grades, and quantity in My demand.`;
    if (asksBuyer && farmer) return localizedCommonAnswer('buyer', language, { count: buyers.length, names: buyers.slice(0,4).map((b:any)=>b.name).join(', ') }) || (buyers.length?`There are ${buyers.length} registered buyers: ${buyers.slice(0,4).map((b:any)=>b.name).join(', ')}.`:'There are no registered buyers in the database.');
    if (asksFarmer && buyer) {
      const wanted=buyerCrops.map(c=>c.toLowerCase()); const matches=listings.filter((l:any)=>wanted.some(word=>String(l.crop_name||l.cropName||'').toLowerCase().includes(word)));
      return localizedCommonAnswer('farmer', language, { count: matches.length }) || (matches.length?`I found ${matches.length} farmer listing${matches.length===1?'':'s'} matching your demand. ${matches.slice(0,4).map((m:any)=>`${m.crop_name||m.cropName} from ${m.farmer_name||m.farmerName}, ${m.quantity_quintals||m.quantityQuintals||0} quintals`).join('; ')}.`:'I could not find a current farmer listing matching your saved buyer demand.');
    }
    if (asksCrop) return localizedCommonAnswer('crop', language, { crop, qty }) || (crop?`Your saved crop is ${crop}${qty?` with ${qty} quintals`:''}. This comes from your live KisanLink database.`:'No crop has been saved yet. Add your crop details on the home page first.');
    if (asksQuantity) return localizedCommonAnswer('quantity', language, { crop, qty }) || (qty?`Your saved listing quantity is ${qty} quintals${crop?` of ${crop}`:''}.`:'No listing quantity is saved yet. Add your crop and quantity on the home page.');
    if (has('hello','hi ','hey','namaste','నమస్తే','नमस्ते')) return localizedCommonAnswer('hello', language) || 'Hello! I can answer questions about your crop, buyers, demand, selling options, quality, requests, contacts, and current market information.';
    if (language==='hi') return 'मैं आपके सवाल के हिसाब से लाइव KisanLink डेटा देख सकता हूँ। फसल, खरीदार, मांग, कीमत, बिक्री, गुणवत्ता या कनेक्शन के बारे में पूछें।';
    if (language==='te') return 'మీ ప్రశ్నకు అనుగుణంగా లైవ్ KisanLink డేటాను చూస్తాను. పంట, కొనుగోలుదారు, డిమాండ్, ధర, అమ్మకం, నాణ్యత లేదా కనెక్షన్ గురించి అడగండి.';
    if (language==='mr') return 'तुमच्या प्रश्नानुसार मी लाइव्ह KisanLink डेटा तपासतो. पीक, खरेदीदार, मागणी, किंमत, विक्री, गुणवत्ता किंवा कनेक्शनबद्दल विचारा.';
    return `I checked your live KisanLink data. I don't want to guess about “${question}”. Ask me about your crop, buyers, demand, prices, selling options, quality, requests, or contacts.`;
  } catch { return 'I could not read the current KisanLink data. Please try again.'; }
}

export async function askAgriculturalAI(messages: AIMessage[], language: LanguageCode): Promise<string> {
  const context=messages.slice(-12); const userMessages=context.filter(m=>m.role==='user'); const last=userMessages.length?userMessages[userMessages.length-1].content:'';
  const database=await loadDatabaseContext(); const market=await loadMarketPriceContext(); const web=await loadWebContext(last);
  const trustedContext=[database?`KISANLINK DATABASE CONTEXT — trusted live application data. Never invent live records. Only reveal another party's mobile/email when a request is accepted.\n${database}`:'',market?`KISANLINK MARKET PRICE DATABASE — multilingual daily Hyderabad data. Use these stored prices for price questions and name the date.\n${market}`:'',web?`CURRENT WEB CONTEXT — supporting external context for timely questions. Never invent exact prices.\n${web}`:''].filter(Boolean).join('\n\n');
  const contextMessage:AIMessage|null=trustedContext?{role:'user',content:trustedContext}:null; const aiMessages:AIMessage[]=contextMessage?[contextMessage,...context]:context;
  try {
    const response=await fetch(ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({language,messages:aiMessages,systemPrompt:'You are KisanLink KisanVoice. Answer the latest user question dynamically, not with a fixed script. Understand Indian languages, transliteration, dialects and mixed-language input. Use the supplied live KisanLink database for account facts and the supplied multilingual market database for price questions. Use current web context only as supporting external information. Never invent live records, contacts, or exact prices. Do not repeat a previous answer unless relevant. Answer the specific question first and keep it practical.'})});
    if(!response.ok) return database?localDatabaseAnswer(last,database,language,web,market):'KisanVoice AI is unavailable.';
    const payload=await response.json() as any; const content=typeof payload.response==='string'?payload.response:typeof payload.message?.content==='string'?payload.message.content:Array.isArray(payload.choices)?(payload.choices[0]?.message?.content||payload.choices[0]?.text):undefined;
    if(typeof content!=='string'||!content.trim()) return database?localDatabaseAnswer(last,database,language,web,market):'I could not generate an answer. Please try again.';
    return content.trim();
  } catch(error) { if(database) return localDatabaseAnswer(last,database,language,web,market); if(error instanceof AIServiceError) throw error; throw new AIServiceError('KisanVoice is temporarily unavailable.','request-failed'); }
}

export function exchangesToMessages(exchanges: VoiceExchange[]): AIMessage[] { return exchanges.slice(-12).map(exchange=>({role:exchange.role,content:exchange.text})); }
