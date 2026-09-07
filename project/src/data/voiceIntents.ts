import type { LanguageCode } from '../types';
import { BUYERS, DEMO_FARMER, GROUP_SALES, MARKET_OPTIONS } from './mockData';
import { formatINR } from '../utils/format';

export type Intent = 'price' | 'best_sell' | 'buyer_trust' | 'net_return' | 'group' | 'unknown';

interface IntentKeyword {
  intent: Intent;
  words: string[];
}

const KEYWORDS: IntentKeyword[] = [
  // Price intent
  {
    intent: 'price',
    words: [
      'price', 'भाव', 'भाव', 'दर', 'दर', 'धार', 'விலை', 'ధర', 'ભાવ', 'দাম', 'ಬೆಲೆ', 'വില', 'ਭਾਅ', 'ଦର', 'দাম', 'قیمت',
      'कितना', 'किती', 'how much', 'what is', 'आज', 'today', 'नेत्तन्ना', 'ఎంత', 'કેટલો', 'কত', 'ಎಷ್ಟು', 'എത്ര', 'ਕਿੰਨਾ', 'କେତେ', 'কিমান', 'کتنی',
      'quintal', 'क्विंटल', 'per',
    ],
  },
  // Best selling option
  {
    intent: 'best_sell',
    words: [
      'where should', 'कुठे', 'कहाँ', 'where to sell', 'विकावा', 'बेचें', 'best', 'सर्वोत्तम', 'सर्वश्रेष्ठ', 'चांगला',
      'sell', 'विक्री', 'बिक्री', 'amma', 'ವಿಕ್ರಿ', 'വിൽക്കണം', 'वेच', 'ବିକ୍ରି', 'বিক্ৰী', 'بیچوں',
      'option', 'पर्याय', 'विकल्प', 'ఎంపిక', 'વિકલ્પ',
    ],
  },
  // Buyer trust
  {
    intent: 'buyer_trust',
    words: [
      'trust', 'विश्वास', 'भरोसा', 'नम्मक', 'વિશ્વસનીય', 'বিশ্বস্ত', 'ವಿಶ್ವಾಸ', 'വിശ്വസനീയ', 'ਭਰੋਸੇਯੋਗ', 'ବିଶ୍ୱସନୀୟ', 'বিশ্বাসযোগ্য', 'قابل اعتماد',
      'reliable', 'verified', 'verify', 'ABC', 'Foods', 'Vasant', 'Traders', 'Nashik', 'APMC',
      'buyer', 'खरेदीदार', 'खरीददार', 'buyer', 'खरीद', 'buyers',
      'score', 'गुण', 'स्कोर', 'rating', 'रेटिंग',
    ],
  },
  // Net return
  {
    intent: 'net_return',
    words: [
      'net', 'return', 'निव्वळ', 'शुद्ध', 'निट', 'profit', 'लाभ', 'उत्पन्न', 'आय', 'income',
      'transport', 'वाहतूक', 'परिवहन', 'cost', 'खर्च', 'लागत',
      'calculate', 'मोजणी', 'गणना', 'estimate', 'अंदाज',
    ],
  },
  // Group selling
  {
    intent: 'group',
    words: [
      'group', 'समूह', 'सामूहिक', 'एकता', 'samuh', 'ekta', 'సమూహ', 'સમૂહ', 'গোষ্ঠী', 'ಗುಂಪು', 'ഗ്രൂപ്പ്', 'ਸਮੂਹ', 'ସମୂହ', 'গোট', 'گروہ',
      'vikri', 'विक्री', 'बिक्री', 'selling', 'together', 'मिळून', 'साथे', 'સાથે', 'সঙ্গে',
      'join', 'सामील', 'शामिल', 'చేరండి', 'જોડાવું', 'যোগ',
    ],
  },
];

export function detectIntent(text: string): Intent {
  const lower = text.toLowerCase();
  const scores: Record<Intent, number> = {
    price: 0, best_sell: 0, buyer_trust: 0, net_return: 0, group: 0, unknown: 0,
  };

  for (const { intent, words } of KEYWORDS) {
    for (const word of words) {
      if (lower.includes(word.toLowerCase())) {
        scores[intent]++;
      }
    }
  }

  let best: Intent = 'unknown';
  let bestScore = 0;
  for (const [intent, score] of Object.entries(scores)) {
    if (score > bestScore) {
      bestScore = score;
      best = intent as Intent;
    }
  }

  return bestScore > 0 ? best : 'unknown';
}

export function generateResponse(intent: Intent, lang: LanguageCode): string {
  const farmer = DEMO_FARMER;
  const topBuyer = BUYERS.find(b => b.id === 'b2')!;
  const nashikApmc = BUYERS.find(b => b.id === 'b1')!;
  const groupSale = GROUP_SALES.find(g => g.id === 'g1')!;

  switch (intent) {
    case 'price': {
      if (lang === 'mr') {
        return `आज नाशिकमध्ये कांद्याचा सरासरी भाव ${formatINR(nashikApmc.pricePerQuintal)} प्रति क्विंटल आहे. पुण्यातील verified buyer ${topBuyer.name} ${formatINR(topBuyer.pricePerQuintal)} देत आहे. Transport खर्च विचारात घेतल्यानंतर पुणे buyer तुमच्यासाठी चांगला पर्याय आहे.`;
      }
      if (lang === 'hi') {
        return `आज नासिक में प्याज का औसत भाव ${formatINR(nashikApmc.pricePerQuintal)} प्रति क्विंटल है। पुणे का verified buyer ${topBuyer.name} ${formatINR(topBuyer.pricePerQuintal)} दे रहा है। परिवहन लागत को ध्यान में रखते हुए पुणे buyer आपके लिए अच्छा विकल्प है।`;
      }
      if (lang === 'te') {
        return `నేడు నాసిక్‌లో ఉల్లిపాయ సగటు ధర ${formatINR(nashikApmc.pricePerQuintal)} క్వింటాల్‌కు. పూణేలోని verified buyer ${topBuyer.name} ${formatINR(topBuyer.pricePerQuintal)} ఇస్తోంది. రవాణా ఖర్చు పరిగణనలోకి తీసుకుంటే పూణే buyer మీకు మంచి ఎంపిక.`;
      }
      return `Today the average onion price in Nashik is ${formatINR(nashikApmc.pricePerQuintal)} per quintal. A verified buyer in Pune, ${topBuyer.name}, is offering ${formatINR(topBuyer.pricePerQuintal)}. After considering transport costs, the Pune buyer is a better option for you.`;
    }

    case 'best_sell': {
      const saleValue = topBuyer.pricePerQuintal * farmer.quantity;
      if (lang === 'mr') {
        return `तुमच्यासाठी सर्वोत्तम पर्याय पुण्यातील ${topBuyer.name} आहे. विक्री मूल्य ${formatINR(saleValue)}, वाहतूक ${formatINR(3000)}, इतर खर्च ${formatINR(1000)}. अंदाजे निव्वळ उत्पन्न ${formatINR(50000)}. हा खरेदीदार verified आणि उच्च विश्वासार्ह आहे.`;
      }
      if (lang === 'hi') {
        return `आपके लिए सर्वश्रेष्ठ विकल्प पुणे का ${topBuyer.name} है। बिक्री मूल्य ${formatINR(saleValue)}, परिवहन ${formatINR(3000)}, अन्य लागत ${formatINR(1000)}। अनुमानित शुद्ध लाभ ${formatINR(50000)}। यह खरीददार verified और उच्च भरोसेमंद है।`;
      }
      if (lang === 'te') {
        return `మీకు ఉత్తమ ఎంపిక పూణేలోని ${topBuyer.name}. అమ్మకం విలువ ${formatINR(saleValue)}, రవాణా ${formatINR(3000)}, ఇతర ఖర్చులు ${formatINR(1000)}. అంచనా నికర ఆదాయం ${formatINR(50000)}. ఈ buyer verified మరియు అధిక నమ్మకం.`;
      }
      return `Your best option is ${topBuyer.name} in Pune. Sale value ${formatINR(saleValue)}, transport ${formatINR(3000)}, other costs ${formatINR(1000)}. Estimated net return ${formatINR(50000)}. This buyer is verified and highly trusted.`;
    }

    case 'buyer_trust': {
      if (lang === 'mr') {
        return `${topBuyer.name} चा विश्वास गुण ${topBuyer.trust.trustScore} आहे — उच्च विश्वास. त्यांनी ${topBuyer.trust.completedDeals} व्यवहार पूर्ण केले आहेत, ${topBuyer.trust.onTimePaymentPct}% वेळेवर पेमेंट करतात, आणि सरासरी पेमेंट वेळ ${topBuyer.trust.avgPaymentDays} दिवस आहे. Farmer rating ${topBuyer.trust.farmerRating}/5 आहे.`;
      }
      if (lang === 'hi') {
        return `${topBuyer.name} का ट्रस्ट स्कोर ${topBuyer.trust.trustScore} है — उच्च भरोसा। उन्होंने ${topBuyer.trust.completedDeals} सौदे पूरे किए हैं, ${topBuyer.trust.onTimePaymentPct}% समय पर भुगतान करते हैं, और औसत भुगतान समय ${topBuyer.trust.avgPaymentDays} दिन है। किसान रेटिंग ${topBuyer.trust.farmerRating}/5 है।`;
      }
      if (lang === 'te') {
        return `${topBuyer.name} ట్రస్ట్ స్కోర్ ${topBuyer.trust.trustScore} — అధిక నమ్మకం. వారు ${topBuyer.trust.completedDeals} లావాదేవీలు పూర్తి చేశారు, ${topBuyer.trust.onTimePaymentPct}% సమయానికి చెల్లిస్తారు, సగటు చెల్లింపు సమయం ${topBuyer.trust.avgPaymentDays} రోజులు. రైతు రేటింగ్ ${topBuyer.trust.farmerRating}/5.`;
      }
      return `${topBuyer.name} has a trust score of ${topBuyer.trust.trustScore} — high trust. They have completed ${topBuyer.trust.completedDeals} deals, pay on time ${topBuyer.trust.onTimePaymentPct}% of the time, and average payment time is ${topBuyer.trust.avgPaymentDays} days. Farmer rating is ${topBuyer.trust.farmerRating} out of 5.`;
    }

    case 'net_return': {
      const abcOption = MARKET_OPTIONS.find(m => m.id === 'm2')!;
      const saleValue = abcOption.pricePerQuintal * farmer.quantity;
      const net = saleValue - abcOption.transportCost - abcOption.otherCosts;
      if (lang === 'mr') {
        return `तुमच्या ${farmer.quantity} क्विंटल कांद्यासाठी: विक्री मूल्य ${formatINR(saleValue)}, वाहतूक ${formatINR(abcOption.transportCost)}, इतर खर्च ${formatINR(abcOption.otherCosts)}. अंदाजे निव्वळ उत्पन्न ${formatINR(net)}. ${topBuyer.name} हा सर्वोत्तम पर्याय आहे.`;
      }
      if (lang === 'hi') {
        return `आपके ${farmer.quantity} क्विंटल प्याज के लिए: बिक्री मूल्य ${formatINR(saleValue)}, परिवहन ${formatINR(abcOption.transportCost)}, अन्य लागत ${formatINR(abcOption.otherCosts)}। अनुमानित शुद्ध लाभ ${formatINR(net)}। ${topBuyer.name} सर्वश्रेष्ठ विकल्प है।`;
      }
      if (lang === 'te') {
        return `మీ ${farmer.quantity} క్వింటాళ్ల ఉల్లిపాయకు: అమ్మకం విలువ ${formatINR(saleValue)}, రవాణా ${formatINR(abcOption.transportCost)}, ఇతర ఖర్చులు ${formatINR(abcOption.otherCosts)}. అంచనా నికర ఆదాయం ${formatINR(net)}. ${topBuyer.name} ఉత్తమ ఎంపిక.`;
      }
      return `For your ${farmer.quantity} quintals of onion: Sale value ${formatINR(saleValue)}, transport ${formatINR(abcOption.transportCost)}, other costs ${formatINR(abcOption.otherCosts)}. Estimated net return ${formatINR(net)}. ${topBuyer.name} is the best option.`;
    }

    case 'group': {
      const totalQty = groupSale.farmers.reduce((s, f) => s + f.quantity, 0);
      if (lang === 'mr') {
        return `${groupSale.buyerName} ला ${groupSale.requiredQuantity} क्विंटल कांदा हवा आहे. जवळच्या शेतकऱ्यांसोबत समूह तयार करून तुम्ही सामील होऊ शकता. सध्या समूहात ${totalQty} क्विंटल उपलब्ध आहे. भाव ${formatINR(groupSale.pricePerQuintal)} प्रति क्विंटल मिळेल.`;
      }
      if (lang === 'hi') {
        return `${groupSale.buyerName} को ${groupSale.requiredQuantity} क्विंटल प्याज चाहिए। पास के किसानों के साथ समूह बनाकर आप शामिल हो सकते हैं। वर्तमान में समूह में ${totalQty} क्विंटल उपलब्ध है। भाव ${formatINR(groupSale.pricePerQuintal)} प्रति क्विंटल मिलेगा।`;
      }
      if (lang === 'te') {
        return `${groupSale.buyerName} కు ${groupSale.requiredQuantity} క్వింటాళ్ల ఉల్లిపాయ కావాలి. సమీపంలోని రైతులతో సమూహం చేయవచ్చు. ప్రస్తుతం సమూహంలో ${totalQty} క్వింటాళ్లు అందుబాటులో ఉన్నాయి. ధర ${formatINR(groupSale.pricePerQuintal)} క్వింటాల్‌కు.`;
      }
      return `${groupSale.buyerName} needs ${groupSale.requiredQuantity} quintals of onion. You can join a group with nearby farmers. Currently the group has ${totalQty} quintals available. You will get ${formatINR(groupSale.pricePerQuintal)} per quintal.`;
    }

    case 'unknown':
    default: {
      if (lang === 'mr') {
        return 'माफ करा, मला समजले नाही. तुम्ही कांद्याचा भाव, खरेदीदार विश्वास, विक्री पर्याय, किंवा सामूहिक विक्री विषयी विचारू शकता.';
      }
      if (lang === 'hi') {
        return 'माफ कीजिए, मुझे समझ नहीं आया। आप प्याज का भाव, खरीददार भरोसा, बिक्री विकल्प, या सामूहिक बिक्री के बारे में पूछ सकते हैं।';
      }
      if (lang === 'te') {
        return 'క్షమించండి, నాకు అర్థం కాలేదు. మీరు ఉల్లిపాయ ధర, buyer నమ్మకం, అమ్మకం ఎంపిక, లేదా సమూహ విక్రయం గురించి అడగవచ్చు.';
      }
      return 'Sorry, I did not understand that. You can ask about onion prices, buyer trust, selling options, or group selling.';
    }
  }
}

export const SPEECH_LANG_MAP: Partial<Record<LanguageCode, string>> = {
  mr: 'mr-IN',
  hi: 'hi-IN',
  te: 'te-IN',
  en: 'en-IN',
};
