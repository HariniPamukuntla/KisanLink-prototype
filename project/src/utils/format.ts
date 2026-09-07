export function formatINR(amount: number): string {
  return '₹' + amount.toLocaleString('en-IN');
}

export function formatINRShort(amount: number): string {
  if (amount >= 10000000) return '₹' + (amount / 10000000).toFixed(2) + ' Cr';
  if (amount >= 100000) return '₹' + (amount / 100000).toFixed(2) + ' L';
  if (amount >= 1000) return '₹' + (amount / 1000).toFixed(1) + 'K';
  return '₹' + amount;
}

export function formatNumber(num: number): string {
  return num.toLocaleString('en-IN');
}
