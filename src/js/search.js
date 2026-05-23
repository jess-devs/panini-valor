import { getCountryDisplay } from "./data.js";

/**
 * Mapa de caracteres que no se descomponen vía NFD hacia su equivalente ASCII.
 * @type {Record<string, string>}
 */
const TRANSLITERATE = {
  "\u00D8": "O",  // Ø
  "\u00F8": "o",  // ø
  "\u00C6": "AE", // Æ
  "\u00E6": "ae", // æ
  "\u00D0": "D",  // Ð
  "\u00F0": "d",  // ð
  "\u00DE": "TH", // Þ
  "\u00FE": "th", // þ
  "\u00DF": "ss", // ß
  "\u0130": "I",  // İ (Turkish dotted capital I)
  "\u0131": "i",  // ı (Turkish dotless i)
  "\u0152": "OE", // Œ
  "\u0153": "oe", // œ
};

export function normalize(str) {
  if (!str) return "";
  let result = "";
  for (const ch of str) {
    result += TRANSLITERATE[ch] || ch;
  }
  return result.toLowerCase().normalize("NFD").replace(/[\u0300-\u036F]/g, "");
}

/**
 * Construye el índice de búsqueda a partir del array de jugadores.
 * @param {object[]} players
 * @returns {string[]}
 */
export function buildIndex(players) {
  return players.map((p) => {
    const name = normalize(p.name || "");
    const country = normalize(p.country_of_citizenship || "");
    const display = normalize(getCountryDisplay(p.country_of_citizenship || ""));
    const code = normalize(p.sticker_code || "");
    return `${name} ${country} ${display} ${code} `;
  });
}

// Códigos de estampa exactos: evita que "mex1" coincida con "mex10"
const CODE_RE = /^[a-z]{2,4}\d+$/;

/**
 * Busca jugadores por nombre, país o código de estampa.
 * @param {string}   query
 * @param {string[]} index
 * @param {object[]} players
 * @returns {object[]} Primeros 12 resultados.
 */
export function search(query, index, players) {
  if (!query || query.trim().length < 2) return [];
  const q = normalize(query.trim());
  const needle = CODE_RE.test(q) ? ` ${q} ` : q;
  const results = [];
  for (let i = 0; i < index.length; i++) {
    if (index[i].includes(needle)) results.push(players[i]);
    if (results.length >= 12) break;
  }
  return results;
}

function trigrams(str) {
  const set = new Set();
  const s = ` ${str} `;
  for (let i = 0; i < s.length - 2; i++) set.add(s.slice(i, i + 3));
  return set;
}

function jaccardTrigram(a, b) {
  let intersection = 0;
  for (const t of a) if (b.has(t)) intersection++;
  return intersection / (a.size + b.size - intersection);
}

export function searchFuzzy(query, index, players, threshold = 0.30) {
  if (!query || query.trim().length < 3) return [];
  const qNorm = normalize(query.trim());
  const qTri  = trigrams(qNorm);
  let best = null;
  let bestScore = threshold;
  for (let i = 0; i < index.length; i++) {
    const score = jaccardTrigram(qTri, trigrams(index[i]));
    if (score > bestScore) { bestScore = score; best = players[i]; }
  }
  return best ? [best] : [];
}
