import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';

const dbPath = resolve(process.cwd(), 'data', 'kisanlink.sqlite');
mkdirSync(dirname(dbPath), { recursive: true });
const db = new DatabaseSync(dbPath);
db.exec('PRAGMA foreign_keys = ON;');

db.exec(`
CREATE TABLE IF NOT EXISTS farmers (id TEXT PRIMARY KEY, name TEXT NOT NULL, mobile TEXT NOT NULL, email TEXT, district TEXT NOT NULL, state TEXT, language TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS buyers (id TEXT PRIMARY KEY, business_name TEXT NOT NULL, mobile TEXT NOT NULL, email TEXT, state TEXT NOT NULL, district TEXT NOT NULL, buyer_type TEXT NOT NULL, crops_json TEXT NOT NULL, grades_json TEXT NOT NULL, typical_quantity REAL NOT NULL, language TEXT NOT NULL DEFAULT 'en', verified INTEGER NOT NULL DEFAULT 0, trust_score REAL NOT NULL DEFAULT 72, completed_deals INTEGER NOT NULL DEFAULT 0, successful_deals INTEGER NOT NULL DEFAULT 0, on_time_payment_pct REAL NOT NULL DEFAULT 0, complaints INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS produce_listings (id TEXT PRIMARY KEY, farmer_id TEXT NOT NULL REFERENCES farmers(id) ON DELETE CASCADE, crop_name TEXT NOT NULL, variety TEXT, quantity_quintals REAL NOT NULL, grade TEXT NOT NULL, expected_price REAL NOT NULL, harvest_date TEXT, state TEXT NOT NULL, district TEXT NOT NULL, created_at TEXT NOT NULL);
CREATE TABLE IF NOT EXISTS connection_requests (id TEXT PRIMARY KEY, farmer_id TEXT NOT NULL REFERENCES farmers(id) ON DELETE CASCADE, buyer_id TEXT NOT NULL REFERENCES buyers(id) ON DELETE CASCADE, listing_id TEXT NOT NULL REFERENCES produce_listings(id) ON DELETE CASCADE, requested_quantity REAL NOT NULL, message TEXT, status TEXT NOT NULL CHECK(status IN ('pending','accepted','rejected')), created_at TEXT NOT NULL, responded_at TEXT);
CREATE INDEX IF NOT EXISTS idx_requests_buyer_status ON connection_requests(buyer_id, status);
CREATE INDEX IF NOT EXISTS idx_requests_farmer_status ON connection_requests(farmer_id, status);
`);

const seeds = [
  ['buyer-greenfresh','GreenFresh Wholesale','9876543210','Telangana','Hyderabad','Wholesaler',['Tomato','Onion','Potato'],['A','B'],80,88,24,22,94,1],
  ['buyer-sri-lakshmi','Sri Lakshmi Foods','9876543211','Telangana','Warangal','Processor',['Tomato','Chilli'],['A','B'],120,82,31,29,91,2],
  ['buyer-deccan-mart','Deccan Fresh Mart','9876543212','Telangana','Hyderabad','Retailer',['Onion','Potato','Tomato'],['A','B','C'],50,79,18,16,96,0],
  ['buyer-ruralroots','Rural Roots Traders','9876543213','Maharashtra','Nashik','Wholesaler',['Onion','Tomato','Wheat'],['A','B'],100,85,27,25,89,2],
] as const;
if (Number(db.prepare('SELECT COUNT(*) AS count FROM buyers').get()?.count || 0) === 0) {
  const insert = db.prepare(`INSERT INTO buyers(id,business_name,mobile,state,district,buyer_type,crops_json,grades_json,typical_quantity,trust_score,completed_deals,successful_deals,on_time_payment_pct,complaints,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`);
  for (const b of seeds) insert.run(b[0],b[1],b[2],b[3],b[4],b[5],JSON.stringify(b[6]),JSON.stringify(b[7]),b[8],b[9],b[10],b[11],b[12],b[13],new Date().toISOString());
}

function send(res: ServerResponse, status: number, value: unknown) { res.statusCode=status; res.setHeader('Content-Type','application/json; charset=utf-8'); res.end(JSON.stringify(value)); }
async function readBody(req: IncomingMessage) { const chunks: Buffer[]=[]; for await (const c of req) chunks.push(Buffer.isBuffer(c)?c:Buffer.from(c)); return JSON.parse(Buffer.concat(chunks).toString('utf8')||'{}') as any; }

function syncFarmer(profile: any) {
  if (!profile?.id || !profile?.name || !profile?.mobile) return;
  db.prepare(`INSERT INTO farmers(id,name,mobile,email,district,state,language,created_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET name=excluded.name,mobile=excluded.mobile,email=excluded.email,district=excluded.district,state=excluded.state,language=excluded.language`).run(profile.id,profile.name,profile.mobile,profile.email||null,profile.district||'',profile.produce?.state||'Telangana',profile.language||'en',profile.createdAt||new Date().toISOString());
  if (profile.produce?.cropName) {
    const p=profile.produce;
    db.prepare(`INSERT INTO produce_listings(id,farmer_id,crop_name,variety,quantity_quintals,grade,expected_price,harvest_date,state,district,created_at) VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET crop_name=excluded.crop_name,variety=excluded.variety,quantity_quintals=excluded.quantity_quintals,grade=excluded.grade,expected_price=excluded.expected_price,harvest_date=excluded.harvest_date,state=excluded.state,district=excluded.district`).run(p.id||`listing-${profile.id}`,profile.id,p.cropName,p.variety||null,p.quantityQuintals,p.grade,p.expectedPricePerQuintal||0,p.harvestDate||null,p.state||'Telangana',profile.district||'',new Date().toISOString());
  }
}

function getBuyers() { return db.prepare('SELECT * FROM buyers ORDER BY trust_score DESC,business_name').all().map((r:any)=>({id:r.id,name:r.business_name,type:r.buyer_type,location:`${r.district}, ${r.state}`,distanceKm:0,pricePerQuintal:0,demandQuintals:r.typical_quantity,crop:JSON.parse(r.crops_json)[0]||'',grade:JSON.parse(r.grades_json)[0]||'A',trust:{trustScore:r.trust_score,completedDeals:r.completed_deals,successfulDeals:r.successful_deals,onTimePaymentPct:r.on_time_payment_pct,avgPaymentDays:2,complaints:r.complaints,farmerRating:4.5,verifiedBusiness:Boolean(r.verified)},businessName:r.business_name,mobile:r.mobile,email:r.email,state:r.state,district:r.district,buyerType:r.buyer_type,crops:JSON.parse(r.crops_json),preferredGrades:JSON.parse(r.grades_json),typicalQuantityQuintals:r.typical_quantity,verified:Boolean(r.verified)})); }
function getListings() { return db.prepare(`SELECT p.*,f.name farmer_name,f.mobile farmer_mobile,f.email farmer_email FROM produce_listings p JOIN farmers f ON f.id=p.farmer_id ORDER BY p.created_at DESC`).all().map((r:any)=>({id:r.id,farmerId:r.farmer_id,farmerName:r.farmer_name,farmerMobile:r.farmer_mobile,farmerEmail:r.farmer_email,district:r.district,state:r.state,cropName:r.crop_name,variety:r.variety,quantityQuintals:r.quantity_quintals,grade:r.grade,expectedPricePerQuintal:r.expected_price,harvestDate:r.harvest_date})); }
function getRequests(role:string,userId:string) { const where=role==='buyer'?'r.buyer_id=?':'r.farmer_id=?'; return db.prepare(`SELECT r.*,f.name farmer_name,f.mobile farmer_mobile,f.email farmer_email,f.district farmer_district,b.business_name buyer_name,b.mobile buyer_mobile,b.email buyer_email,b.state buyer_state,b.district buyer_district,p.crop_name,p.variety,p.grade,p.expected_price,p.quantity_quintals FROM connection_requests r JOIN farmers f ON f.id=r.farmer_id JOIN buyers b ON b.id=r.buyer_id JOIN produce_listings p ON p.id=r.listing_id WHERE ${where} ORDER BY r.created_at DESC`).all(userId).map((r:any)=>({id:r.id,farmerId:r.farmer_id,farmerName:r.farmer_name,farmerMobile:r.farmer_mobile,farmerEmail:r.farmer_email,farmerDistrict:r.farmer_district,buyerId:r.buyer_id,buyerName:r.buyer_name,buyerMobile:r.buyer_mobile,buyerEmail:r.buyer_email,buyerState:r.buyer_state,buyerDistrict:r.buyer_district,listingId:r.listing_id,cropName:r.crop_name,variety:r.variety,requestedQuantity:r.requested_quantity,availableQuantity:r.quantity_quintals,expectedPricePerQuintal:r.expected_price,grade:r.grade,status:r.status,message:r.message,createdAt:r.created_at,respondedAt:r.responded_at})); }

async function handler(req:IncomingMessage,res:ServerResponse) {
  const url=new URL(req.url||'/','http://localhost'); if(!url.pathname.startsWith('/api/kisanlink')) return;
  try {
    if(req.method==='GET'&&url.pathname==='/api/kisanlink/market'){const role=url.searchParams.get('role')||'farmer';const userId=url.searchParams.get('userId')||'';return send(res,200,{buyers:getBuyers(),listings:getListings(),requests:userId?getRequests(role,userId):[]});}
    if(req.method==='POST'&&url.pathname==='/api/kisanlink/sync-farmer'){const d=await readBody(req);syncFarmer(d.profile);return send(res,200,{ok:true});}
    if(req.method==='POST'&&url.pathname==='/api/kisanlink/requests'){const d=await readBody(req);syncFarmer(d.farmer);const listing=db.prepare('SELECT * FROM produce_listings WHERE id=? AND farmer_id=?').get(String(d.listingId),d.farmer?.id) as any;const buyer=db.prepare('SELECT id FROM buyers WHERE id=?').get(String(d.buyerId));if(!listing||!buyer)return send(res,400,{error:'Farmer, buyer or listing was not found.'});const id=`request-${Date.now()}-${Math.random().toString(36).slice(2,8)}`;db.prepare(`INSERT INTO connection_requests(id,farmer_id,buyer_id,listing_id,requested_quantity,message,status,created_at) VALUES(?,?,?,?,?,?,?,?)`).run(id,d.farmer.id,String(d.buyerId),String(d.listingId),Number(d.requestedQuantity),String(d.message||''),'pending',new Date().toISOString());return send(res,201,{ok:true,request:getRequests('farmer',d.farmer.id)[0]});}
    const match=url.pathname.match(/^\/api\/kisanlink\/requests\/([^/]+)$/);if(req.method==='PATCH'&&match){const d=await readBody(req);if(d.status!=='accepted'&&d.status!=='rejected')return send(res,400,{error:'Status must be accepted or rejected.'});const r=db.prepare('SELECT * FROM connection_requests WHERE id=?').get(match[1]) as any;if(!r||r.buyer_id!==d.buyerId)return send(res,403,{error:'Only the requested buyer can respond.'});db.prepare('UPDATE connection_requests SET status=?,responded_at=? WHERE id=?').run(d.status,new Date().toISOString(),match[1]);return send(res,200,{ok:true});}
    return send(res,404,{error:'Not found'});
  } catch(error){console.error('[sqlite-api]',error);return send(res,500,{error:'KisanLink database operation failed.'});}
}

export function sqliteApiPlugin(): Plugin { return {name:'kisanlink-sqlite-api',configureServer(server){server.middlewares.use(handler);},configurePreviewServer(server){server.middlewares.use(handler);}}; }
