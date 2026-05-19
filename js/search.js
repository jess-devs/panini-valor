import { getCountryDisplay } from "./data.js";

export function normalize(str) {
  if (!str) return "";
  return str.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
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
