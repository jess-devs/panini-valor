export const CSV_URL = "data/players.csv.gz";

/**
 * Normaliza el nombre de un país usando el mapa de alias.
 * @param {string} country
 * @returns {string}
 */
export function normalizeCountryName(country) {
  const trimmed = (country || "").trim();
  return COUNTRY_ALIASES[trimmed] || trimmed;
}

/**
 * Mapa de alias: variantes de nombres de país hacia el nombre canónico.
 * @type {Record<string, string>}
 */
const COUNTRY_ALIASES = {
  "South Korea": "Korea, South",
  "Korea Republic": "Korea, South",
  Korea: "Korea, South",
  "Ivory Coast": "Cote d'Ivoire",
  "Congo DR": "DR Congo",
  "Democratic Republic of Congo": "DR Congo",
  "Bosnia and Herzegovina": "Bosnia-Herzegovina",
  "Bosnia & Herzegovina": "Bosnia-Herzegovina",
  "Cabo Verde": "Cape Verde",
  "Türkiye": "Turkey",
  "Curaçao": "Curacao",
};

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
  "United States": "Estados Unidos",
  "Saudi Arabia": "Arabia Saudita",
  "New Zealand": "Nueva Zelanda",
  "South Africa": "Sudáfrica",
  "Cape Verde": "Cabo Verde",
  France: "Francia",
  Germany: "Alemania",
  Netherlands: "Países Bajos",
  Japan: "Japón",
  Sweden: "Suecia",
  Denmark: "Dinamarca",
  Norway: "Noruega",
  Switzerland: "Suiza",
  Belgium: "Bélgica",
  Turkey: "Türkiye",
  Greece: "Grecia",
  Croatia: "Croacia",
  Romania: "Rumanía",
  Hungary: "Hungría",
  Poland: "Polonia",
  Serbia: "Serbia",
  Slovakia: "Eslovaquia",
  Slovenia: "Eslovenia",
  Austria: "Austria",
};

/**
 * Códigos ISO 3166-1 alpha-2 para la librería flag-icons.
 * @type {Record<string, string>}
 */
const ISO_CODES = {
  Afghanistan: "af",
  Albania: "al",
  Algeria: "dz",
  "American Samoa": "as",
  Andorra: "ad",
  Angola: "ao",
  Argentina: "ar",
  Armenia: "am",
  Australia: "au",
  Austria: "at",
  Azerbaijan: "az",
  Bahrain: "bh",
  Bangladesh: "bd",
  Belarus: "by",
  Belgium: "be",
  Belize: "bz",
  Benin: "bj",
  Bhutan: "bt",
  Bolivia: "bo",
  "Bosnia-Herzegovina": "ba",
  Botswana: "bw",
  Brazil: "br",
  Bulgaria: "bg",
  Burkina: "bf",
  "Burkina Faso": "bf",
  Burundi: "bi",
  Cambodia: "kh",
  Cameroon: "cm",
  Canada: "ca",
  "Cape Verde": "cv",
  "Central African Republic": "cf",
  Chad: "td",
  Chile: "cl",
  China: "cn",
  Colombia: "co",
  Comoros: "km",
  "Congo DR": "cd",
  "DR Congo": "cd",
  "Congo, DR": "cd",
  "Republic of Congo": "cg",
  "Costa Rica": "cr",
  Croatia: "hr",
  Cuba: "cu",
  Curacao: "cw",
  Cyprus: "cy",
  "Czech Republic": "cz",
  Denmark: "dk",
  Djibouti: "dj",
  "Dominican Republic": "do",
  Ecuador: "ec",
  Egypt: "eg",
  "El Salvador": "sv",
  England: "gb-eng",
  "Equatorial Guinea": "gq",
  Eritrea: "er",
  Estonia: "ee",
  Eswatini: "sz",
  Ethiopia: "et",
  "Faroe Islands": "fo",
  Fiji: "fj",
  Finland: "fi",
  France: "fr",
  Gabon: "ga",
  Gambia: "gm",
  Georgia: "ge",
  Germany: "de",
  Ghana: "gh",
  Gibraltar: "gi",
  Greece: "gr",
  Guatemala: "gt",
  Guinea: "gn",
  "Guinea-Bissau": "gw",
  Guyana: "gy",
  Haiti: "ht",
  Honduras: "hn",
  Hungary: "hu",
  Iceland: "is",
  India: "in",
  Indonesia: "id",
  Iran: "ir",
  Iraq: "iq",
  Ireland: "ie",
  Israel: "il",
  Italy: "it",
  Jamaica: "jm",
  Japan: "jp",
  Jordan: "jo",
  Kazakhstan: "kz",
  Kenya: "ke",
  Kosovo: "xk",
  Kuwait: "kw",
  Kyrgyzstan: "kg",
  Laos: "la",
  Latvia: "lv",
  Lebanon: "lb",
  Lesotho: "ls",
  Liberia: "lr",
  Libya: "ly",
  Liechtenstein: "li",
  Lithuania: "lt",
  Luxembourg: "lu",
  Madagascar: "mg",
  Malawi: "mw",
  Malaysia: "my",
  Maldives: "mv",
  Mali: "ml",
  Malta: "mt",
  Mauritania: "mr",
  Mauritius: "mu",
  Mexico: "mx",
  Moldova: "md",
  Mongolia: "mn",
  Montenegro: "me",
  Morocco: "ma",
  Mozambique: "mz",
  Myanmar: "mm",
  Namibia: "na",
  Nepal: "np",
  Netherlands: "nl",
  "New Zealand": "nz",
  Nicaragua: "ni",
  Niger: "ne",
  Nigeria: "ng",
  "North Macedonia": "mk",
  "Northern Ireland": "gb-nir",
  Norway: "no",
  Oman: "om",
  Pakistan: "pk",
  Panama: "pa",
  Paraguay: "py",
  Peru: "pe",
  Philippines: "ph",
  Poland: "pl",
  Portugal: "pt",
  Qatar: "qa",
  Romania: "ro",
  Russia: "ru",
  Rwanda: "rw",
  "Saudi Arabia": "sa",
  Scotland: "gb-sct",
  Senegal: "sn",
  Serbia: "rs",
  "Sierra Leone": "sl",
  Slovakia: "sk",
  Slovenia: "si",
  Somalia: "so",
  "South Africa": "za",
  "South Sudan": "ss",
  Spain: "es",
  "Sri Lanka": "lk",
  Sudan: "sd",
  Suriname: "sr",
  Sweden: "se",
  Switzerland: "ch",
  Syria: "sy",
  Taiwan: "tw",
  Tajikistan: "tj",
  Tanzania: "tz",
  Thailand: "th",
  Togo: "tg",
  "Trinidad and Tobago": "tt",
  Tunisia: "tn",
  Turkey: "tr",
  Turkmenistan: "tm",
  Uganda: "ug",
  Ukraine: "ua",
  "United Arab Emirates": "ae",
  "United States": "us",
  Uruguay: "uy",
  Uzbekistan: "uz",
  Venezuela: "ve",
  Vietnam: "vn",
  Wales: "gb-wls",
  Yemen: "ye",
  Zambia: "zm",
  Zimbabwe: "zw",
  "Korea, South": "kr",
  "Cote d'Ivoire": "ci",
};

/**
 * Devuelve el código ISO del país o cadena vacía si no existe.
 * @param {string} country
 * @returns {string}
 */
export function getISO(country) {
  return ISO_CODES[normalizeCountryName(country)] || "";
}

/**
 * Devuelve el nombre localizado al español o el original si no hay traducción.
 * @param {string} country
 * @returns {string}
 */
export function getCountryDisplay(country) {
  return COUNTRY_DISPLAY[normalizeCountryName(country)] || normalizeCountryName(country);
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
 * y devuelve todos los jugadores sin filtro de país.
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
        resolve(data.filter((row) => row.player_id && row.name));
      },
      error(err) {
        reject(new Error("Error al procesar los datos: " + err.message));
      },
    });
  });
}
