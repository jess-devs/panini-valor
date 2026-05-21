/** @type {{ millones: number, colones: number }} */
export const DEFAULT_RATE = { millones: 10, colones: 100 };

const STORAGE_KEY = "panini_rate";

/**
 * Lee la tasa guardada en localStorage.
 * @returns {{ millones: number, colones: number }}
 */
export function loadRate() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const rate = JSON.parse(saved);
      if (rate.millones > 0 && rate.colones > 0) return rate;
    }
  } catch (_) {}
  return { ...DEFAULT_RATE };
}

/**
 * Persiste la tasa en localStorage.
 * @param {{ millones: number, colones: number }} rate
 */
export function saveRate(rate) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rate));
}

/**
 * Calcula el precio en colones de una postal dado el valor de mercado en EUR.
 * @param {number} valorEUR - Valor de mercado en euros.
 * @param {{ millones: number, colones: number }} rate - Tasa de conversión activa.
 * @returns {number} Precio en colones (mínimo = rate.colones).
 */
export function calcPrice(valorEUR, rate) {
  if (!valorEUR || valorEUR <= 0) return rate.colones;
  const price = (valorEUR / (rate.millones * 1_000_000)) * rate.colones;
  return Math.max(rate.colones, Math.round(price));
}

/**
 * Formatea un número como precio en colones costarricenses.
 * @param {number} n
 * @returns {string} Ej: "₡1,800"
 */
export function formatCRC(n) {
  return "₡" + n.toLocaleString("es-CR");
}

/**
 * Formatea un valor en euros con sufijo M/K.
 * @param {number} n - Valor en euros.
 * @returns {string} Ej: "€180M", "€500K"
 */
export function formatEUR(n) {
  if (!n || n <= 0) return "€0";
  if (n >= 1_000_000) return `€${(n / 1_000_000).toFixed(0)}M`;
  if (n >= 1_000) return `€${(n / 1_000).toFixed(0)}K`;
  return "€" + n.toLocaleString("es-CR");
}
