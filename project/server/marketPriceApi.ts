import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
// @ts-ignore node:sqlite is available in the configured Node 22+ runtime.
import { DatabaseSync } from 'node:sqlite';
import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';

type Row = [string,string,string,string,string,number,number,number,string,string,string,string,string];
const dbPath = resolve(process.cwd(), 'data', 'kisanlink.sqlite');
mkdirSync(dirname(dbPath), { recursive: true });
const db = new DatabaseSync(dbPath);

db.exec(`
CREATE TABLE IF NOT EXISTS market_prices(
 id TEXT PRIMARY KEY,
 commodity_key TEXT NOT NULL,
 city TEXT NOT NULL,
 state TEXT NOT NULL,
 price_date TEXT NOT NULL,
 unit TEXT NOT NULL,
 mandi_price_per_kg REAL,
 retail_min_per_kg REAL,
 retail_max_per_kg REAL,
 name_en TEXT NOT NULL,
 name_hi TEXT NOT NULL,
 name_te TEXT NOT NULL,
 name_mr TEXT NOT NULL,
 source_name TEXT NOT NULL,
 source_note TEXT
);
CREATE INDEX IF NOT EXISTS idx_market_prices_date_city ON market_prices(price_date,city);
`);

function seedDailyPrices() {
  const today = new Date().toISOString().slice(0, 10);
  const rows: Row[] = [
    ['onion-big','Onion Big','बड़ा प्याज','పెద్ద ఉల్లిపాయ','मोठा कांदा',53,58,69,'Hyderabad vegetable market snapshot','Mandi ₹53/kg; retail ₹58–69/kg'],
    ['onion-small','Onion Small','छोटा प्याज','చిన్న ఉల్లిపాయ','लहान कांदा',69,76,90,'Hyderabad vegetable market snapshot','Mandi ₹69/kg; retail ₹76–90/kg'],
    ['tomato','Tomato','टमाटर','టమాటా','टोमॅटो',27,30,35,'Hyderabad vegetable market snapshot','Mandi ₹27/kg; retail ₹30–35/kg'],
    ['potato','Potato','आलू','బంగాళాదుంప','बटाटा',25,28,33,'Hyderabad vegetable market snapshot','Mandi ₹25/kg; retail ₹28–33/kg'],
    ['carrot','Carrot','गाजर','క్యారెట్','गाजर',48,53,62,'Hyderabad vegetable market snapshot','Mandi ₹48/kg; retail ₹53–62/kg'],
    ['beetroot','Beetroot','चुकंदर','బీట్‌రూట్','बीट',39,43,51,'Hyderabad vegetable market snapshot','Mandi ₹39/kg; retail ₹43–51/kg'],
    ['drumstick','Drumstick','सहजन','మునగకాయ','शेवगा',50,55,65,'Hyderabad vegetable market snapshot','Mandi ₹50/kg; retail ₹55–65/kg'],
    ['green-chilli','Green Chilli','हरी मिर्च','పచ్చిమిర్చి','हिरवी मिरची',55,61,72,'Hyderabad vegetable market snapshot','Mandi ₹55/kg; retail ₹61–72/kg'],
    ['french-beans','French Beans','फ्रेंच बीन्स','ఫ్రెంచ్ బీన్స్','फ्रेंच बीन्स',72,79,94,'Hyderabad vegetable market snapshot','Mandi ₹72/kg; retail ₹79–94/kg'],
    ['brinjal','Brinjal','बैंगन','వంకాయ','वांगी',23.62,26,32,'Hyderabad district mandi benchmark','Mandi ₹23.62/kg; retail range indicative'],
    ['bhindi','Okra','भिंडी','బెండకాయ','भेंडी',25.5,28,35,'Hyderabad district mandi benchmark','Mandi ₹25.50/kg; retail range indicative'],
    ['cabbage','Cabbage','पत्तागोभी','క్యాబేజీ','कोबी',12.03,14,20,'Hyderabad district mandi benchmark','Mandi ₹12.03/kg; retail range indicative'],
  ];
  const stmt = db.prepare(`INSERT INTO market_prices(id,commodity_key,city,state,price_date,unit,mandi_price_per_kg,retail_min_per_kg,retail_max_per_kg,name_en,name_hi,name_te,name_mr,source_name,source_note) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET price_date=excluded.price_date,mandi_price_per_kg=excluded.mandi_price_per_kg,retail_min_per_kg=excluded.retail_min_per_kg,retail_max_per_kg=excluded.retail_max_per_kg,source_name=excluded.source_name,source_note=excluded.source_note`);
  for (const [key,en,hi,te,mr,mandi,min,max,source,note] of rows) stmt.run(`market-${key}`,key,'Hyderabad','Telangana',today,'kg',mandi,min,max,en,hi,te,mr,source,note);
}
seedDailyPrices();

function send(res: ServerResponse, status: number, value: unknown) { res.statusCode=status; res.setHeader('Content-Type','application/json; charset=utf-8'); res.end(JSON.stringify(value)); }
function getPrices() {
  const today = new Date().toISOString().slice(0, 10);
  return db.prepare('SELECT * FROM market_prices WHERE city=? AND price_date=? ORDER BY commodity_key').all('Hyderabad', today).map((r:any) => ({
    commodityKey:r.commodity_key, city:r.city, state:r.state, date:r.price_date, unit:r.unit,
    mandiPricePerKg:r.mandi_price_per_kg, retailMinPerKg:r.retail_min_per_kg, retailMaxPerKg:r.retail_max_per_kg,
    names:{en:r.name_en,hi:r.name_hi,te:r.name_te,mr:r.name_mr}, source:r.source_name, note:r.source_note,
  }));
}

function handler(req:IncomingMessage,res:ServerResponse,next:(error?:unknown)=>void) {
  const u=new URL(req.url||'/','http://localhost');
  if (!u.pathname.startsWith('/api/market-prices')) { next(); return; }
  try {
    if (req.method==='GET' && u.pathname==='/api/market-prices') return send(res,200,{ok:true,city:'Hyderabad',state:'Telangana',date:new Date().toISOString().slice(0,10),prices:getPrices()});
    return send(res,404,{error:'Not found'});
  } catch(e) { console.error('[market-price-api]',e); return send(res,500,{error:'Market price database operation failed.'}); }
}

export function marketPriceApiPlugin():Plugin { return { name:'kisanlink-market-price-api', configureServer(server){server.middlewares.use(handler as any);}, configurePreviewServer(server){server.middlewares.use(handler as any);} }; }
