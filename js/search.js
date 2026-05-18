function normalize(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

export function buildIndex(players) {
  return players.map(p => normalize(p.name || ''));
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
