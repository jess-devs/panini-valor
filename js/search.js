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
    return `${name} ${country} ${display}`;
  });
}

/**
 * Busca jugadores por nombre o país.
 * @param {string}   query   - Texto ingresado por el usuario.
 * @param {string[]} index   - Índice generado por buildIndex.
 * @param {object[]} players - Array completo de jugadores.
 * @returns {object[]} Primeros 12 resultados.
 */
export function search(query, index, players) {
  if (!query || query.trim().length < 2) return [];
  const q = normalize(query.trim());
  const results = [];
  for (let i = 0; i < index.length; i++) {
    if (index[i].includes(q)) results.push(players[i]);
    if (results.length >= 12) break;
  }
  return results;
}
