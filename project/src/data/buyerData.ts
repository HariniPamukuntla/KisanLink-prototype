import type { ProduceListing } from '../types';

const placeholderPhoto = (crop: string, colors: string) =>
  `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 520"><defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="${colors.split(',')[0]}"/><stop offset="1" stop-color="${colors.split(',')[1]}"/></linearGradient></defs><rect width="800" height="520" fill="url(#g)"/><circle cx="400" cy="245" r="125" fill="rgba(255,255,255,.16)"/><text x="400" y="265" text-anchor="middle" fill="white" font-family="Arial" font-size="48" font-weight="700">${crop}</text><text x="400" y="315" text-anchor="middle" fill="rgba(255,255,255,.8)" font-family="Arial" font-size="22">AI-assisted produce listing</text></svg>`)}`;

export const SAMPLE_PRODUCE_LISTINGS: ProduceListing[] = [
  {
    id: 'listing-sample-onion',
    farmerId: 'sample-farmer-onion',
    farmerName: 'Suresh Patil',
    district: 'Nashik',
    state: 'Maharashtra',
    cropName: 'Onion',
    variety: 'Nashik Red',
    quantityQuintals: 80,
    grade: 'A',
    qualityScore: 92,
    harvestDate: '2026-08-28',
    expectedPricePerQuintal: 2700,
    qualityConfidence: 'high',
    photos: [placeholderPhoto('Onion', '#7c3f32,#d47c4b')],
  },
  {
    id: 'listing-sample-tomato',
    farmerId: 'sample-farmer-tomato',
    farmerName: 'Kavita Jadhav',
    district: 'Pune',
    state: 'Maharashtra',
    cropName: 'Tomato',
    variety: 'Hybrid',
    quantityQuintals: 35,
    grade: 'B',
    qualityScore: 78,
    harvestDate: '2026-09-01',
    expectedPricePerQuintal: 1850,
    qualityConfidence: 'medium',
    photos: [placeholderPhoto('Tomato', '#a53c3c,#ed8d63')],
  },
  {
    id: 'listing-sample-soybean',
    farmerId: 'sample-farmer-soybean',
    farmerName: 'Ravi More',
    district: 'Ahmednagar',
    state: 'Maharashtra',
    cropName: 'Soybean',
    variety: 'JS 335',
    quantityQuintals: 120,
    grade: 'A',
    qualityScore: 89,
    harvestDate: '2026-08-20',
    expectedPricePerQuintal: 4350,
    qualityConfidence: 'high',
    photos: [placeholderPhoto('Soybean', '#4e6b3f,#a2b86c')],
  },
];

export function daysSinceHarvest(harvestDate?: string) {
  if (!harvestDate) return null;
  const harvest = new Date(`${harvestDate}T00:00:00`);
  const now = new Date();
  return Math.max(0, Math.floor((now.getTime() - harvest.getTime()) / 86400000));
}