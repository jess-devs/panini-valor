import { downloadAndParse } from "./data.js";
import { normalize } from "./search.js";
import { CHECKLIST, TEAM_COUNTRY } from "./checklist.js";

async function runTest() {
  console.group("Panini Checklist — cobertura en el CSV");
  console.log("Descargando catálogo...");

  const players = await downloadAndParse(() => {});

  // Índice rápido: "nombre_normalizado|country_of_citizenship" → player
  const byNameCountry = new Map();
  for (const p of players) {
    byNameCountry.set(`${normalize(p.name || "")}|${p.country_of_citizenship}`, p);
  }

  let total = 0;
  let found = 0;
  const missing = [];

  for (const [team, entries] of Object.entries(CHECKLIST)) {
    const country = TEAM_COUNTRY[team];
    for (const entry of entries) {
      total++;
      if (byNameCountry.has(`${normalize(entry.name)}|${country}`)) {
        found++;
      } else {
        missing.push({ code: entry.code, name: entry.name, team, country });
      }
    }
  }

  const pct = ((found / total) * 100).toFixed(1);
  console.log(`Encontrados: ${found} / ${total} (${pct}%)`);

  if (missing.length === 0) {
    console.log("Todos los jugadores del checklist tienen match en el CSV.");
  } else {
    console.group(`Sin match: ${missing.length} jugadores`);
    for (const m of missing) {
      console.log(`${m.code.padEnd(7)} ${m.name}  [${m.team} / ${m.country}]`);
    }
    console.groupEnd();
  }

  console.groupEnd();
}

runTest().catch(console.error);
