import type { Plugin } from 'vite';
import type { IncomingMessage, ServerResponse } from 'node:http';

type SearchItem = { title:string; snippet:string; link:string; source:string };
function send(res:ServerResponse,status:number,value:unknown){res.statusCode=status;res.setHeader('Content-Type','application/json; charset=utf-8');res.end(JSON.stringify(value));}
function clean(value:string){return value.replace(/\s+/g,' ').trim();}
function needsCurrentData(q:string){return /\b(today|latest|current|now|price|prices|mandi|market rate|weather|rain|forecast|news|scheme|government|subsidy|apmc|minimum support|msp)\b/i.test(q)||/[आजअब].*(भाव|कीमत|मंडी|मौसम)|ભાવ|ధర|మార్కెట్ ధర|ధరలు/i.test(q);}
async function googleSearch(query:string):Promise<SearchItem[]>{
  const key=process.env.GOOGLE_CSE_API_KEY?.trim(); const cx=process.env.GOOGLE_CSE_ID?.trim();
  if(!key||!cx)return [];
  const url=`https://www.googleapis.com/customsearch/v1?key=${encodeURIComponent(key)}&cx=${encodeURIComponent(cx)}&num=5&q=${encodeURIComponent(query)}`;
  const response=await fetch(url); if(!response.ok)return [];
  const payload=await response.json() as any;
  return Array.isArray(payload.items)?payload.items.slice(0,5).map((item:any)=>({title:clean(String(item.title||'')),snippet:clean(String(item.snippet||'')),link:String(item.link||''),source:clean(String(item.displayLink||'Google'))})).filter((x:SearchItem)=>x.title||x.snippet):[];
}
async function googleNews(query:string):Promise<SearchItem[]>{
  const url=`https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-IN&gl=IN&ceid=IN:en`;
  const response=await fetch(url,{headers:{'User-Agent':'KisanLink/1.0'}}); if(!response.ok)return [];
  const xml=await response.text(); const items=[...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].slice(0,5); const decode=(s:string)=>s.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g,'$1').replace(/&amp;/g,'&').replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&#39;/g,"'").replace(/&quot;/g,'"');
  return items.map(match=>{const block=match[1];const title=decode(block.match(/<title>([\s\S]*?)<\/title>/)?.[1]||'');const link=decode(block.match(/<link>([\s\S]*?)<\/link>/)?.[1]||'');const source=decode(block.match(/<source[^>]*>([\s\S]*?)<\/source>/)?.[1]||'Google News');return{title:clean(title),snippet:`Current Google News result for ${query}.`,link,source:clean(source)};}).filter(x=>x.title);
}
async function handler(req:IncomingMessage,res:ServerResponse,next:()=>void){const url=new URL(req.url||'/','http://localhost');if(url.pathname!=='/api/web/search'){next();return;}if(req.method!=='GET'){send(res,405,{error:'Method not allowed'});return;}const query=clean(url.searchParams.get('q')||'');if(!query){send(res,400,{error:'q is required'});return;}if(!needsCurrentData(query)){send(res,200,{items:[],source:'none'});return;}try{const google=await googleSearch(query);if(google.length){send(res,200,{items:google,source:'google'});return;}const news=await googleNews(query);send(res,200,{items:news,source:news.length?'google-news':'none'});}catch{send(res,200,{items:[],source:'none'});}}
export function webSearchApiPlugin():Plugin{return{name:'kisanlink-web-search-api',configureServer(server){server.middlewares.use((req,res,next)=>{void handler(req,res,next);});},configurePreviewServer(server){server.middlewares.use((req,res,next)=>{void handler(req,res,next);});}};}
