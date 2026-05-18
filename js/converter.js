export const DEFAULT_RATE = { millones: 10, colones: 100 };
const STORAGE_KEY = 'panini_rate';

export function loadRate() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const rate = JSON.parse(saved);
      if (rate.millones > 0 && rate.colones > 0) return rate;
    }
  } catch (_) { }
  return { ...DEFAULT_RATE };
}

export function saveRate(rate) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rate));
}

export function calcPrice(valorEUR, rate) {
  if (!valorEUR || valorEUR <= 0) return rate.colones;
  const price = (valorEUR / (rate.millones * 1_000_000)) * rate.colones;
  return Math.max(rate.colones, Math.round(price));
}

export function formatCRC(n) {
  return '₡' + n.toLocaleString('es-CR');
}

export function formatEUR(n) {
  if (!n || n <= 0) return '€0';
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000) return `€${(n / 1_000).toFixed(0)}K`;
  return '€' + n.toLocaleString('es-CR');
}
