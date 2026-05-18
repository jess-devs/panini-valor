import { getCountryDisplay } from './data.js';

function normalize(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

export function buildIndex(players) {
  return players.map(p => {
    const name = normalize(p.name || '');
    const country = normalize(p.country_of_citizenship || '');
    const display = normalize(getCountryDisplay(p.country_of_citizenship || ''));
    return `${name} ${country} ${display}`;
  });
}

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
