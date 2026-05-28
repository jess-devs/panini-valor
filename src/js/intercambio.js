import { openDialog, closeDialog } from "./transitions.js";
import { TEAM_COUNTRY, TEAM_DISPLAY } from "./checklist.js";
import { getISO } from "./data.js";

/**
 * Parsea el texto exportado de figuritas.app.
 * Detecta secciones "Repetidas" y "Me faltan" automáticamente.
 * @param {string} text
 * @returns {{ repetidas: Map<string, Set<number>>, me_faltan: Map<string, Set<number>> }}
 */
function parseFullList(text) {
  const repetidas = new Map();
  const me_faltan = new Map();
  let currentMap = null;

  const SECTION_RE = /^(repetidas|me falt[aá]n?)$/i;
  // Matches lines like: "MEX 🇲🇽: 7, 12, 13" or "FWC 📜: 10, 11"
  const STICKER_RE = /^([A-Z]{2,5}[^:\n]*?):\s*([\d,\s]+)$/u;

  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line) continue;

    if (SECTION_RE.test(line)) {
      currentMap = /repetidas/i.test(line) ? repetidas : me_faltan;
      continue;
    }

    const m = line.match(STICKER_RE);
    if (!m) continue;

    // If no section header detected yet, default to repetidas
    if (!currentMap) currentMap = repetidas;

    const key = m[1].trim();
    const nums = m[2]
      .split(",")
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => Number.isFinite(n) && n > 0);

    if (!nums.length) continue;
    if (!currentMap.has(key)) currentMap.set(key, new Set());
    for (const n of nums) currentMap.get(key).add(n);
  }

  return { repetidas, me_faltan };
}

/**
 * Cruza las figuritas que el dador tiene de más con las que el receptor necesita.
 * @param {Map<string, Set<number>>} giver  - repetidas del dador
 * @param {Map<string, Set<number>>} receiver - me_faltan del receptor
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
 * Renderiza las secciones de resultados dentro de un contenedor DOM.
 * @param {HTMLElement} container
 * @param {{ key: string, numbers: number[] }[]} matches
 * @param {string} emptyMsg
 */
function renderMatches(container, matches, emptyMsg) {
  if (!matches.length) {
    container.innerHTML = `<p class="ix-empty">${emptyMsg}</p>`;
    return;
  }
  container.innerHTML = matches
    .map(({ key, numbers }) => {
      const code = key.split(" ")[0]; // "KOR" from "KOR 🇰🇷"
      const flag = flagHtml(code);
      const label = TEAM_DISPLAY[code] || code;
      return `
    <div class="ix-results-section">
      <span class="ix-team-info" title="${label}">${flag}<span class="ix-team-code">${code}</span></span>
      <div class="ix-chips">
        ${numbers.map((n) => `<span class="ix-chip">${n}</span>`).join("")}
      </div>
    </div>`;
    })
    .join("");
}

/**
 * Genera el texto plano para copiar al portapapeles.
 */
function buildCopyText(iGive, theyGive) {
  const lines = ["Intercambio de figuritas — Panini Valor", "https://jess-devs.github.io/panini-valor/", ""];
  if (iGive.length) {
    lines.push("Yo le puedo dar a mi amigo:");
    for (const { key, numbers } of iGive) {
      lines.push(`  ${key}: ${numbers.join(", ")}`);
    }
  } else {
    lines.push("No hay figuritas para darle a tu amigo.");
  }
  if (theyGive.length) {
    lines.push("", "Mi amigo me puede dar:");
    for (const { key, numbers } of theyGive) {
      lines.push(`  ${key}: ${numbers.join(", ")}`);
    }
  }
  return lines.join("\n");
}

/** Cuenta el total de figuritas en un array de matches */
function countTotal(matches) {
  return matches.reduce((sum, { numbers }) => sum + numbers.length, 0);
}

let lastIGive = [];
let lastTheyGive = [];

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
  const resultsGrid = viewResults.querySelector(".ix-grid");
  const myTa = /** @type {HTMLTextAreaElement} */ (
    document.getElementById("ix-my-ta")
  );
  const friendTa = /** @type {HTMLTextAreaElement} */ (
    document.getElementById("ix-friend-ta")
  );
  const iGiveContainer = document.getElementById("ix-i-give");
  const theyGiveContainer = document.getElementById("ix-they-give");
  const theyGivePanel = document.getElementById("ix-they-give-panel");
  const iGiveBadge = document.getElementById("ix-i-give-badge");
  const theyGiveBadge = document.getElementById("ix-they-give-badge");

  openBtn.addEventListener("click", () => openDialog(dialog));

  closeBtn.addEventListener("click", () => closeDialog(dialog));

  // Close on backdrop click
  dialog.addEventListener("click", (e) => {
    if (e.target === dialog) closeDialog(dialog);
  });

  // Cruzar listas
  crossBtn.addEventListener("click", () => {
    const myList = parseFullList(myTa.value);
    const friendList = parseFullList(friendTa.value);

    lastIGive = findMatches(myList.repetidas, friendList.me_faltan);
    lastTheyGive = findMatches(friendList.repetidas, myList.me_faltan);

    renderMatches(
      iGiveContainer,
      lastIGive,
      "No hay figuritas en común que le puedas dar.",
    );

    // Show "they give me" panel only if friend provided a "Repetidas" section
    const friendHasRepetidas = friendList.repetidas.size > 0;
    theyGivePanel.hidden = !friendHasRepetidas;
    resultsGrid.classList.toggle("ix-grid--single", !friendHasRepetidas);

    if (friendHasRepetidas) {
      renderMatches(
        theyGiveContainer,
        lastTheyGive,
        "Tu amigo no tiene repetidas que te sirvan.",
      );
      const theyTotal = countTotal(lastTheyGive);
      theyGiveBadge.textContent = theyTotal
        ? `${theyTotal} figurita${theyTotal !== 1 ? "s" : ""}`
        : "";
      theyGiveBadge.hidden = theyTotal === 0;
    }

    const iTotal = countTotal(lastIGive);
    iGiveBadge.textContent = iTotal
      ? `${iTotal} figurita${iTotal !== 1 ? "s" : ""}`
      : "";
    iGiveBadge.hidden = iTotal === 0;

    viewInput.hidden = true;
    viewResults.hidden = false;
  });

  backBtn.addEventListener("click", () => {
    viewResults.hidden = true;
    viewInput.hidden = false;
  });

  copyBtn.addEventListener("click", () => {
    const text = buildCopyText(lastIGive, lastTheyGive);
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
      // Modern API as last resort (requires HTTPS or localhost)
      navigator.clipboard?.writeText(text).catch(() => {});
    }

    copyBtn.textContent = "¡Copiado!";
    setTimeout(() => {
      copyBtn.textContent = orig;
    }, 2000);
  });

  // Reset views when dialog closes
  dialog.addEventListener("close", () => {
    viewInput.hidden = false;
    viewResults.hidden = true;
    lastIGive = [];
    lastTheyGive = [];
  });
}
