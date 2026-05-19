import { getCountryDisplay } from "./data.js";

/**
 * Normaliza un string: minúsculas y sin diacríticos.
 * @param {string} str
 * @returns {string}
 */
function normalize(str) {
  if (!str) return "";
  return str.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/**
 * Construye el índice de búsqueda a partir del array de jugadores.
 * Cada entrada concatena nombre + país (inglés) + país (español) normalizados.
 * @param {object[]} players
 * @returns {string[]}
 */
export function buildIndex(players) {
  return players.map((p) => {
    const name = normalize(p.name || "");
    const country = normalize(p.country_of_citizenship || "");
    const display = normalize(
      getCountryDisplay(p.country_of_citizenship || ""),
    );
    const code = normalize(p.sticker_code || "");
    // Trailing space allows exact word-boundary match on sticker codes
    return `${name} ${country} ${display} ${code} `;
  });
}

/** Detecta si una query normalizada tiene forma de código de estampa (ej: mex15, arg17) */
const CODE_RE = /^[a-z]{2,4}\d+$/;

/**
 * Busca jugadores por nombre, país o código de estampa.
 * @param {string}   query   - Texto ingresado por el usuario.
 * @param {string[]} index   - Índice generado por buildIndex.
 * @param {object[]} players - Array completo de jugadores.
 * @returns {object[]} Primeros 12 resultados.
 */
export function search(query, index, players) {
  if (!query || query.trim().length < 2) return [];
  const q = normalize(query.trim());
  // Para códigos de estampa usamos match de palabra exacta (evita que "mex1" encuentre "mex10")
  const needle = CODE_RE.test(q) ? ` ${q} ` : q;
  const results = [];
  for (let i = 0; i < index.length; i++) {
    if (index[i].includes(needle)) results.push(players[i]);
    if (results.length >= 12) break;
  }
  return results;
}
