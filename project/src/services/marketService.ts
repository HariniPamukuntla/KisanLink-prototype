import type { Buyer, BuyerProfile, BuyerRequest, FarmerProfile, ProduceListing } from '../types';
const API='/api/kisanlink';
async function request<T>(url:string,options?:RequestInit):Promise<T>{const response=await fetch(url,{headers:{'Content-Type':'application/json',...(options?.headers||{})},...options});const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||'Database request failed');return data as T;}
export async function syncFarmer(profile:FarmerProfile){await request(`${API}/sync-farmer`,{method:'POST',body:JSON.stringify({profile})});}
export async function syncBuyer(profile:BuyerProfile){await request(`${API}/sync-buyer`,{method:'POST',body:JSON.stringify({profile})});}
export async function loadMarket(role:'farmer'|'buyer',userId:string){return request<{buyers:Buyer[];listings:ProduceListing[];requests:BuyerRequest[]}>(`${API}/market?role=${role}&userId=${encodeURIComponent(userId)}`);}
export async function createBuyerRequest(input:{farmer:FarmerProfile;buyerId:string;listingId:string;requestedQuantity:number;message?:string}){return request<{ok:boolean;request:BuyerRequest}>(`${API}/requests`,{method:'POST',body:JSON.stringify(input)});}
export async function respondToBuyerRequest(requestId:string,buyerId:string,status:'accepted'|'rejected'){return request<{ok:boolean}>(`${API}/requests/${encodeURIComponent(requestId)}`,{method:'PATCH',body:JSON.stringify({buyerId,status})});}
export type LinkedBuyer=BuyerProfile&{name:string};
