import { openDialog, closeDialog } from "./transitions.js";
import { TEAM_COUNTRY, TEAM_DISPLAY } from "./checklist.js";
import { getISO } from "./data.js";

/** Códigos de equipo válidos para el allowlist del parser */
const KNOWN_TEAMS = new Set([...Object.keys(TEAM_COUNTRY), "FWC", "CC"]);

function addToMap(map, code, num) {
  if (!map.has(code)) map.set(code, new Set());
  map.get(code).add(num);
}

/**
 * Parser universal: acepta cualquier formato de export o texto a mano.
 *
 * Formatos soportados:
 *   - A mano:         "Mar17", "Par13", "Cod11"
 *   - Otra app:       "🇿🇦 Sudáfrica (1): RSA6" / "🏆 FWC: FWC1, FWC2"
 *   - figuritas.app:  "MEX 🇲🇽: 7, 12, 13"
 *   - Sin emojis:     cualquiera de las anteriores sin emoji
 *
 * Estrategia 1 (prioridad): busca tokens TEAM+NUM en la línea
 * Estrategia 2 (fallback): patrón "TEAM [texto]: num, num"
 *
 * @param {string} text
 * @returns {{ repetidas: Map<string, Set<number>>, me_faltan: Map<string, Set<number>> }}
 */
function parseFullList(text) {
  const repetidas = new Map();
  const me_faltan = new Map();
  let current = null;

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.startsWith("http") || line.startsWith("─") || line.startsWith("—")) continue;

    if (line.length < 60) {
      if (/repetidas/i.test(line)) { current = repetidas; continue; }
      if (/me\s*falt[aá]/i.test(line)) { current = me_faltan; continue; }
    }
    if (!current) current = repetidas;

    const re1 = /\b([A-Za-z]{2,5})(\d{1,2})\b/g;
    let m;
    let found = false;
    while ((m = re1.exec(line)) !== null) {
      const code = m[1].toUpperCase();
      if (!KNOWN_TEAMS.has(code)) continue;
      addToMap(current, code, parseInt(m[2], 10));
      found = true;
    }

    if (!found) {
      const m2 = line.match(/^([A-Za-z]{2,5})[^:\n]{0,30}:\s*([\d][,\d\s]*)$/u);
      if (m2) {
        const code = m2[1].toUpperCase();
        if (KNOWN_TEAMS.has(code)) {
          const nums = m2[2]
            .split(",")
            .map((s) => parseInt(s.trim(), 10))
            .filter((n) => Number.isFinite(n) && n > 0);
          for (const n of nums) addToMap(current, code, n);
        }
      }
    }
  }

  return { repetidas, me_faltan };
}

/**
 * Cruza las figuritas que el dador tiene de más con las que el receptor necesita.
 * @param {Map<string, Set<number>>} giver
 * @param {Map<string, Set<number>>} receiver
 * @returns {{ key: string, numbers: number[] }[]}
 */
function findMatches(giver, receiver) {
  const result = [];
  for (const [key, giverNums] of giver) {
    if (!receiver.has(key)) continue;
    const receiverNums = receiver.get(key);
    const common = [...giverNums]
      .filter((n) => receiverNums.has(n))
      .sort((a, b) => a - b);
    if (common.length) result.push({ key, numbers: common });
  }
  return result;
}

/** Devuelve el HTML del ícono de bandera para un código de equipo, o vacío si no aplica. */
function flagHtml(teamCode) {
  const country = TEAM_COUNTRY[teamCode];
  if (!country) return "";
  const iso = getISO(country);
  return iso ? `<span class="fi fi-${iso}" aria-hidden="true"></span>` : "";
}

/**
 * Renderiza los resultados dentro de un contenedor DOM.
 * @param {HTMLElement} container
 * @param {{ key: string, numbers: number[] }[]} matches
 * @param {string} emptyMsg
 */
function renderMatches(container, matches, emptyMsg) {
  const inner = matches.length
    ? `<div class="ix-results-inner">${matches.map(({ key, numbers }) => {
        const flag = flagHtml(key);
        const label = TEAM_DISPLAY[key] || key;
        return `
    <div class="ix-results-section">
      <span class="ix-team-info" title="${label}">${flag}<span class="ix-team-code">${key}</span></span>
      <div class="ix-chips">
        ${numbers.map((n) => `<span class="ix-chip">${n}</span>`).join("")}
      </div>
    </div>`;
      }).join("")}</div>`
    : `<div class="ix-results-inner">
      <div class="ix-empty-state">
        <svg class="ix-empty-svg" width="96" height="68" viewBox="0 0 96 68" fill="none" aria-hidden="true">
          <g transform="rotate(-8 22 30)">
            <rect x="2" y="6" width="38" height="50" rx="5" fill="#fffbf0" stroke="#fde68a" stroke-width="1.5"/>
            <rect x="8" y="13" width="26" height="20" rx="3" fill="#fde68a" opacity="0.55"/>
            <rect x="8" y="38" width="26" height="2.5" rx="1.25" fill="#e8a020" opacity="0.25"/>
            <rect x="11" y="43" width="20" height="2" rx="1" fill="#e8a020" opacity="0.15"/>
          </g>
          <g transform="rotate(8 74 30)">
            <rect x="56" y="6" width="38" height="50" rx="5" fill="#fffbf0" stroke="#fde68a" stroke-width="1.5"/>
            <rect x="62" y="13" width="26" height="20" rx="3" fill="#fde68a" opacity="0.55"/>
            <rect x="62" y="38" width="26" height="2.5" rx="1.25" fill="#e8a020" opacity="0.25"/>
            <rect x="65" y="43" width="20" height="2" rx="1" fill="#e8a020" opacity="0.15"/>
          </g>
          <circle cx="48" cy="34" r="11" fill="#f2f2f4" stroke="#e4e4e7" stroke-width="1.5"/>
          <text x="48" y="34" text-anchor="middle" dominant-baseline="central" font-size="13" font-weight="700" fill="#aeaeb2" font-family="system-ui,sans-serif">?</text>
        </svg>
        <p class="ix-empty-msg">${emptyMsg}</p>
      </div>
    </div>`;

  container.innerHTML = inner;
}

/**
 * Genera el texto plano para copiar al portapapeles.
 * @param {{ key: string, numbers: number[] }[]} result
 */
function buildCopyText(result) {
  const lines = ["Intercambio de figuritas — Panini Valor", "https://jess-devs.github.io/panini-valor/", ""];
  if (result.length) {
    lines.push("Tu amigo te puede dar:");
    for (const { key, numbers } of result) {
      lines.push(`  ${key}: ${numbers.join(", ")}`);
    }
  } else {
    lines.push("Tu amigo no tiene figuritas que te sirvan.");
  }
  return lines.join("\n");
}

/** Cuenta el total de figuritas en un array de matches */
function countTotal(matches) {
  return matches.reduce((sum, { numbers }) => sum + numbers.length, 0);
}

let lastResult = [];

export function initIntercambio() {
  const dialog = /** @type {HTMLDialogElement} */ (
    document.getElementById("intercambio-dialog")
  );
  if (!dialog) return;

  const openBtn = document.getElementById("intercambio-btn");
  const closeBtn = document.getElementById("ix-close");
  const crossBtn = document.getElementById("ix-cross-btn");
  const backBtn = document.getElementById("ix-back-btn");
  const copyBtn = document.getElementById("ix-copy-btn");
  const viewInput = document.getElementById("ix-view-input");
  const viewResults = document.getElementById("ix-view-results");
  const myTa = /** @type {HTMLTextAreaElement} */ (
    document.getElementById("ix-my-ta")
  );
  const friendTa = /** @type {HTMLTextAreaElement} */ (
    document.getElementById("ix-friend-ta")
  );
  const resultBody = document.getElementById("ix-result-body");
  const resultBadge = document.getElementById("ix-result-badge");
  const resultPanel = resultBody.closest(".ix-result-panel");
  const pricesBtn = document.getElementById("ix-prices-btn");
  const totalChip = document.getElementById("ix-total-chip");

  // Collapse toggle
  const resultHeading = resultPanel.querySelector(".ix-result-heading");
  resultHeading.addEventListener("click", () => {
    const collapsed = resultPanel.classList.toggle("collapsed");
    resultHeading.setAttribute("aria-expanded", String(!collapsed));
  });

  openBtn.addEventListener("click", () => openDialog(dialog));
  closeBtn.addEventListener("click", () => closeDialog(dialog));

  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) closeDialog(dialog);
  });

  // Cruzar listas
  crossBtn.addEventListener("click", () => {
    const myList = parseFullList(myTa.value);
    const friendList = parseFullList(friendTa.value);

    // Izquierda = lo que me falta; derecha = repetidas del amigo.
    // Si no hay sección explícita, usar lo que se parseó en el único mapa no vacío.
    const myNeeds = myList.me_faltan.size > 0 ? myList.me_faltan : myList.repetidas;
    const friendExtras = friendList.repetidas.size > 0 ? friendList.repetidas : friendList.me_faltan;

    lastResult = findMatches(friendExtras, myNeeds);

    renderMatches(resultBody, lastResult, "Tu amigo no tiene figuritas que te sirvan.");

    const total = countTotal(lastResult);
    resultBadge.textContent = total ? `${total} figurita${total !== 1 ? "s" : ""}` : "";
    resultBadge.hidden = total === 0;

    // Reset collapse state
    resultPanel.classList.remove("collapsed");
    resultHeading.setAttribute("aria-expanded", "true");

    // Show "Ver precios" only when there are matches
    pricesBtn.hidden = lastResult.length === 0;

    // Request price total from app.js
    if (lastResult.length > 0) {
      const codes = lastResult.flatMap(({ key, numbers }) => numbers.map((n) => `${key}${n}`));
      document.dispatchEvent(new CustomEvent("intercambio:price-request", { detail: codes }));
    } else {
      totalChip.hidden = true;
    }

    viewInput.hidden = true;
    viewResults.hidden = false;
  });

  backBtn.addEventListener("click", () => {
    viewResults.hidden = true;
    viewInput.hidden = false;
  });

  document.addEventListener("intercambio:price-response", (e) => {
    totalChip.textContent = e.detail;
    totalChip.hidden = false;
  });

  pricesBtn.addEventListener("click", () => {
    const codes = lastResult.flatMap(({ key, numbers }) => numbers.map((n) => `${key}${n}`));
    document.dispatchEvent(new CustomEvent("intercambio:lookup", { detail: codes }));
    closeDialog(dialog);
  });

  copyBtn.addEventListener("click", () => {
    const text = buildCopyText(lastResult);
    const orig = copyBtn.textContent;

    // Append inside the dialog to preserve focus context
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.setAttribute("readonly", "");
    Object.assign(ta.style, {
      position: "absolute",
      left: "-9999px",
      top: "0",
      fontSize: "12pt",
    });
    dialog.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, 99999);

    let ok = false;
    try {
      ok = document.execCommand("copy");
    } catch {}
    dialog.removeChild(ta);

    if (!ok) {
      navigator.clipboard?.writeText(text).catch(() => {});
    }

    copyBtn.textContent = "¡Copiado!";
    setTimeout(() => {
      copyBtn.textContent = orig;
    }, 2000);
  });

  dialog.addEventListener("close", () => {
    viewInput.hidden = false;
    viewResults.hidden = true;
    lastResult = [];
  });
}
