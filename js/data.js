export const CSV_URL = "data/players.csv.gz";

/**
 * Países clasificados al Mundial 2026, tal como aparecen
 * en el campo country_of_citizenship del dataset de Transfermarkt.
 * @type {Set<string>}
 */
const WC2026_COUNTRIES = new Set([
  "Argentina",
  "Brazil",
  "Colombia",
  "Uruguay",
  "Ecuador",
  "Paraguay",
  "Spain",
  "France",
  "Germany",
  "Portugal",
  "Netherlands",
  "Belgium",
  "Croatia",
  "Switzerland",
  "Norway",
  "Scotland",
  "Austria",
  "England",
  "Bosnia-Herzegovina",
  "Sweden",
  "Turkey",
  "Czech Republic",
  "United States",
  "Mexico",
  "Canada",
  "Haiti",
  "Panama",
  "Curacao",
  "Morocco",
  "Egypt",
  "Algeria",
  "Ghana",
  "Cote d'Ivoire",
  "Tunisia",
  "Senegal",
  "South Africa",
  "DR Congo",
  "Cape Verde",
  "Japan",
  "Korea, South",
  "Australia",
  "Iran",
  "Saudi Arabia",
  "Qatar",
  "Uzbekistan",
  "Jordan",
  "Iraq",
  "New Zealand",
]);

/**
 * Nombres localizados al español para países con nombres especiales en el dataset.
 * @type {Record<string, string>}
 */
export const COUNTRY_DISPLAY = {
  "Korea, South": "Corea del Sur",
  "Cote d'Ivoire": "Costa de Marfil",
  "DR Congo": "R.D. Congo",
  "Bosnia-Herzegovina": "Bosnia y Herzegovina",
  "Czech Republic": "Chequia",
};

/**
 * Códigos ISO 3166-1 alpha-2 para la librería flag-icons.
 * @type {Record<string, string>}
 */
const ISO_CODES = {
  Argentina: "ar",
  Brazil: "br",
  Colombia: "co",
  Uruguay: "uy",
  Ecuador: "ec",
  Paraguay: "py",
  Spain: "es",
  France: "fr",
  Germany: "de",
  Portugal: "pt",
  Netherlands: "nl",
  Belgium: "be",
  Croatia: "hr",
  Switzerland: "ch",
  Norway: "no",
  Scotland: "gb-sct",
  Austria: "at",
  England: "gb-eng",
  "Bosnia-Herzegovina": "ba",
  Sweden: "se",
  Turkey: "tr",
  "Czech Republic": "cz",
  "United States": "us",
  Mexico: "mx",
  Canada: "ca",
  Haiti: "ht",
  Panama: "pa",
  Curacao: "cw",
  Morocco: "ma",
  Egypt: "eg",
  Algeria: "dz",
  Ghana: "gh",
  "Cote d'Ivoire": "ci",
  Tunisia: "tn",
  Senegal: "sn",
  "South Africa": "za",
  "DR Congo": "cd",
  "Cape Verde": "cv",
  Japan: "jp",
  "Korea, South": "kr",
  Australia: "au",
  Iran: "ir",
  "Saudi Arabia": "sa",
  Qatar: "qa",
  Uzbekistan: "uz",
  Jordan: "jo",
  Iraq: "iq",
  "New Zealand": "nz",
};

/**
 * Devuelve el código ISO del país o cadena vacía si no existe.
 * @param {string} country
 * @returns {string}
 */
export function getISO(country) {
  return ISO_CODES[country] || "";
}

/**
 * Devuelve el nombre localizado al español o el original si no hay traducción.
 * @param {string} country
 * @returns {string}
 */
export function getCountryDisplay(country) {
  return COUNTRY_DISPLAY[country] || country;
}

/** @type {Record<string, string>} */
const POSITION_ES = {
  Attack: "Delantero",
  Midfield: "Mediocampista",
  Defender: "Defensa",
  Goalkeeper: "Portero",
};

/**
 * Traduce al español la posición del jugador.
 * @param {string} position
 * @returns {string}
 */
export function getPositionES(position) {
  return POSITION_ES[position] || position || "—";
}

/**
 * Descarga y descomprime el CSV de jugadores, lo parsea con PapaParse
 * y filtra solo los clasificados al Mundial 2026 con valor de mercado > 0.
 * @param {(pct: number) => void} onProgress - Callback con progreso 0–1.
 * @returns {Promise<object[]>}
 */
export async function downloadAndParse(onProgress) {
  const response = await fetch(CSV_URL);
  if (!response.ok)
    throw new Error(`Error al descargar datos: ${response.status}`);

  const contentLength = response.headers.get("Content-Length");
  const total = contentLength ? parseInt(contentLength, 10) : 0;
  let loaded = 0;

  const decompressed = response.body.pipeThrough(
    new DecompressionStream("gzip"),
  );
  const reader = decompressed.getReader();
  const chunks = [];

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.length;
    if (total > 0) onProgress(Math.min(loaded / total, 1));
  }

  const text = new TextDecoder("utf-8").decode(
    chunks.reduce((acc, c) => {
      const merged = new Uint8Array(acc.length + c.length);
      merged.set(acc);
      merged.set(c, acc.length);
      return merged;
    }, new Uint8Array(0)),
  );

  onProgress(1);

  return new Promise((resolve, reject) => {
    Papa.parse(text, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete({ data }) {
        resolve(filterWC2026(data));
      },
      error(err) {
        reject(new Error("Error al procesar los datos: " + err.message));
      },
    });
  });
}

/**
 * Filtra las filas del CSV: solo jugadores de selecciones clasificadas
 * al Mundial 2026 con valor de mercado mayor a cero.
 * @param {object[]} rows
 * @returns {object[]}
 */
function filterWC2026(rows) {
  return rows.filter((row) => {
    const country = (row.country_of_citizenship || "").trim();
    const value = row.market_value_in_eur;
    return WC2026_COUNTRIES.has(country) && value && value > 0;
  });
}
