import {
  downloadAndParse,
  getISO,
  getCountryDisplay,
  getPositionES,
} from "./data.js";
import { buildIndex, search, normalize } from "./search.js";
import {
  loadRate,
  saveRate,
  calcPrice,
  formatCRC,
  formatEUR,
  DEFAULT_RATE,
} from "./converter.js";
import { openDialog, closeDialog } from "./transitions.js";
import { GROUPS, TEAM_DISPLAY, TEAM_COUNTRY, buildChecklistMap } from "./checklist.js";

const ICON = {
  plus: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  check: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  x: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  user: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  userSm: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  pencil: `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>`,
};

/** @type {object[]} */
let players = [];
/** @type {string[]} */
let searchIndex = [];
/** @type {{ millones: number, colones: number }} */
let currentRate = loadRate();

const CART_KEY = "panini_cart";
/** @type {object[]} */
let cart = [];

let activeGroup = "";
let activeTeam = "";
let activePool = [];
let activeIndex = [];

const estimatedValues = new Map();
const editedValues = new Map();
const editingIds = new Set();
const editingTimers = new Map();

const EDITING_TIMEOUT_MS = 3000;

function scheduleCloseEditing(id) {
  clearTimeout(editingTimers.get(id));
  editingTimers.set(id, setTimeout(() => closeEditing(id), EDITING_TIMEOUT_MS));
}

function closeEditing(id) {
  clearTimeout(editingTimers.get(id));
  editingTimers.delete(id);
  if (!editingIds.has(id)) return;
  editingIds.delete(id);
  const row = $cartBody?.querySelector(`[data-price-row="${id}"]`);
  if (row) {
    row.classList.remove("price-row--editing", "no-price-row--editing");
  }
}

function clearPlayerState(id) {
  estimatedValues.delete(id);
  editedValues.delete(id);
  editingIds.delete(id);
  clearTimeout(editingTimers.get(id));
  editingTimers.delete(id);
}

/**
 * Devuelve los IDs del carrito como strings.
 * @returns {string[]}
 */
function cartIds() {
  return cart.map((p) => String(p.player_id));
}

/**
 * Persiste los IDs del carrito en localStorage.
 */
function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cartIds()));
}

/**
 * Restaura el carrito desde localStorage cruzando con el catálogo cargado.
 * @param {object[]} allPlayers
 */
function loadCart(allPlayers) {
  try {
    const ids = new Set(
      JSON.parse(localStorage.getItem(CART_KEY) || "[]").map(String),
    );
    if (!ids.size) return;
    cart = allPlayers.filter((p) => ids.has(String(p.player_id)));
  } catch (_) {}
}

/**
 * Agrega un jugador al carrito y dispara la animación de bounce en el botón.
 * @param {string|number} playerId
 */
function addToCart(playerId) {
  const id = String(playerId);
  if (cartIds().includes(id)) return;
  const p = players.find((p) => String(p.player_id) === id);
  if (!p) return;
  cart.push(p);
  saveCart();
  renderCart();
  const btn = document.querySelector(`[data-add-id="${id}"]`);
  if (btn) {
    setAdded(btn);
    btn.classList.add("add-btn--pop");
    btn.addEventListener(
      "animationend",
      () => btn.classList.remove("add-btn--pop"),
      { once: true },
    );
  }
}

/**
 * Elimina un jugador del carrito animando la fila de salida.
 * Usa setTimeout en lugar de animationend para evitar conflictos de especificidad CSS.
 * @param {string|number} playerId
 */
function removeFromCart(playerId) {
  const id = String(playerId);
  const row = $cartBody.querySelector(`[data-del-id="${id}"]`)?.closest("tr");
  if (row) {
    row.classList.add("cart-row-out");
    setTimeout(() => {
      cart = cart.filter((p) => String(p.player_id) !== id);
      clearPlayerState(id);
      saveCart();
      renderCart();
      const btn = document.querySelector(`[data-add-id="${id}"]`);
      if (btn) setNotAdded(btn);
    }, 220);
  } else {
    cart = cart.filter((p) => String(p.player_id) !== id);
    clearPlayerState(id);
    saveCart();
    renderCart();
    const btn = document.querySelector(`[data-add-id="${id}"]`);
    if (btn) setNotAdded(btn);
  }
}

const $overlay = document.getElementById("overlay");
const $progress = document.getElementById("progress-bar");
const $loadMsg = document.getElementById("load-msg");
const $loadError = document.getElementById("load-error");
const $searchBox = document.getElementById("search");
const $results = document.getElementById("results");
const $configBtn = document.getElementById("config-btn");
const $modal = document.getElementById("modal");
const $modalClose = document.getElementById("modal-close");
const $fMillones = document.getElementById("f-millones");
const $fColones = document.getElementById("f-colones");
const $saveBtn = document.getElementById("save-btn");
const $resetBtn = document.getElementById("reset-btn");
const $cartSection = document.getElementById("cart-section");
const $cartBody = document.getElementById("cart-body");
const $cartTotal = document.getElementById("cart-total");
const $clearCart = document.getElementById("clear-cart");
const $cartCount = document.getElementById("cart-count");
const $disclaimerDialog = document.getElementById("disclaimer-dialog");
const $disclaimerClose = document.getElementById("disclaimer-close");
const $disclaimerTrigger = document.getElementById("disclaimer-trigger");
const $filterGroup = document.getElementById("filter-group");
const $filterTeam = document.getElementById("filter-team");

/**
 * Genera el HTML de una tarjeta skeleton para el estado de carga.
 * @returns {string}
 */
function skeletonCard() {
  return `<div class="card-skeleton">
    <div class="sk-avatar skeleton-bg"></div>
    <div class="sk-body">
      <div class="sk-line sk-line-name skeleton-bg"></div>
      <div class="sk-line sk-line-meta skeleton-bg"></div>
      <div class="sk-line sk-line-price skeleton-bg"></div>
    </div>
    <div class="sk-btn skeleton-bg"></div>
  </div>`;
}

/**
 * Muestra n tarjetas skeleton en el contenedor de resultados.
 * @param {number} [n=6]
 */
function showSkeletons(n = 6) {
  $results.innerHTML = Array(n).fill(skeletonCard()).join("");
}

/**
 * Limpia el contenedor de resultados.
 */
function hideSkeletons() {
  $results.innerHTML = "";
}

/**
 * Descarga el catálogo, inicializa el índice de búsqueda y el carrito,
 * luego muestra el disclaimer si es la primera visita.
 */
async function init() {
  try {
    players = await downloadAndParse((pct) => {
      $progress.style.width = pct * 100 + "%";
      if (pct >= 1) $loadMsg.textContent = "Procesando jugadores…";
    });
    const globalCodeMap = buildChecklistMap(null, null);
    players = players.map((p) => {
      const entry = globalCodeMap.get(normalize(p.name || ""));
      const match = entry && TEAM_COUNTRY[entry.team] === p.country_of_citizenship;
      return match ? { ...p, sticker_code: entry.code, sticker_team: entry.team } : p;
    });
    searchIndex = buildIndex(players);
    activePool = players;
    activeIndex = searchIndex;
    loadCart(players);

    $overlay.classList.add("hidden");
    $searchBox.focus();

    renderCart();
    await maybeShowDisclaimer();
  } catch (err) {
    $loadMsg.textContent = "";
    $loadError.textContent =
      "No se pudo cargar el catálogo: " +
      err.message +
      ". Verificá tu conexión y recargá la página.";
  }
}

function getFilteredPlayers() {
  if (!activeGroup && !activeTeam) return players;
  const allowedTeams = new Set(activeTeam ? [activeTeam] : (GROUPS[activeGroup] || []));
  return players.filter((p) => p.sticker_team && allowedTeams.has(p.sticker_team));
}

function applyFilter() {
  activePool = getFilteredPlayers();
  activeIndex = activePool === players ? searchIndex : buildIndex(activePool);
}

function runQuery() {
  const query = $searchBox.value.trim();

  if (!activeGroup && !activeTeam) {
    if (query.length < 2) { $results.innerHTML = ""; return; }
    renderResults(search(query, activeIndex, activePool));
    return;
  }

  if (activeTeam) {
    const found = query.length >= 2 ? search(query, activeIndex, activePool) : activePool;
    renderResults(found);
    return;
  }

  // Solo grupo: pedir texto para no abrumar
  if (query.length < 2) {
    $results.innerHTML = `<p class="empty-msg">Escribí un nombre para buscar dentro del Grupo ${activeGroup}.</p>`;
    return;
  }
  renderResults(search(query, activeIndex, activePool));
}

function updateTeamDropdown() {
  $filterTeam.innerHTML = `<option value="">Todas las selecciones</option>`;
  const codes = activeGroup
    ? GROUPS[activeGroup]
    : Object.keys(TEAM_DISPLAY).sort((a, b) =>
        TEAM_DISPLAY[a].localeCompare(TEAM_DISPLAY[b], "es"),
      );
  codes.forEach((code) => {
    const opt = document.createElement("option");
    opt.value = code;
    opt.textContent = TEAM_DISPLAY[code];
    $filterTeam.appendChild(opt);
  });
  $filterTeam.value = "";
  $filterTeam.disabled = false;
}

$searchBox.addEventListener("input", runQuery);

$filterGroup.addEventListener("change", () => {
  activeGroup = $filterGroup.value;
  activeTeam = "";
  updateTeamDropdown();
  applyFilter();
  runQuery();
});

$filterTeam.addEventListener("change", () => {
  activeTeam = $filterTeam.value;
  applyFilter();
  runQuery();
});

function renderResults(found) {
  if (found.length === 0) {
    $results.innerHTML = `<p class="empty-msg">${
      activeTeam || activeGroup
        ? "No se encontraron jugadores para este filtro en el catálogo."
        : "No se encontró ningún jugador con ese nombre en las 48 selecciones del Mundial 2026."
    }</p>`;
    return;
  }
  const inCart = new Set(cartIds());
  $results.innerHTML = found
    .map((p) => cardHTML(p, inCart.has(String(p.player_id))))
    .join("");
}

/**
 * Genera el HTML de una tarjeta de jugador.
 * @param {object}  p     - Fila del CSV (jugador).
 * @param {boolean} added - Si ya está en el carrito.
 * @returns {string}
 */
function cardHTML(p, added) {
  const price = calcPrice(p.market_value_in_eur, currentRate);
  const country = getCountryDisplay(p.country_of_citizenship);
  const pos = getPositionES(p.position);
  const iso = getISO(p.country_of_citizenship);
  const imgSrc = p.image_url || "";
  const hasPrice = !!p.market_value_in_eur;

  const photo = imgSrc
    ? `<img src="${imgSrc}" alt="${p.name}" class="player-img" loading="lazy"
          onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
    : "";
  const ph = `<div class="player-placeholder" ${imgSrc ? 'style="display:none"' : ""}>${ICON.user}</div>`;
  const dot = iso
    ? `<div class="player-flag-dot"><span class="fi fi-${iso}"></span></div>`
    : "";

  return `
  <div class="card">
    ${p.sticker_code ? `<span class="sticker-code">${p.sticker_code}</span>` : ""}
    <div class="player-photo-wrap">${photo}${ph}${dot}</div>
    <div class="card-body">
      <p class="player-name">${p.name}</p>
      <div class="player-meta">
        <span class="player-country">${country}</span>
        <span class="player-pos-badge">${pos}</span>
      </div>
      <div class="card-pricing">
        ${hasPrice
          ? `<span class="player-eur">${formatEUR(p.market_value_in_eur)}</span><span class="player-crc">${formatCRC(price)}</span>`
          : `<span class="no-price"><a href="https://www.transfermarkt.es/" target="_blank" rel="noopener noreferrer">Precio no disponible</a></span>`}
      </div>
    </div>
    <button class="add-btn${added ? " add-btn--added" : ""}" data-add-id="${p.player_id}"
      title="${added ? "Ya está en tu lista" : "Agregar a mi lista"}" aria-label="${added ? "Agregado" : "Agregar"}">
      ${added ? ICON.check : ICON.plus}
    </button>
  </div>`;
}

/**
 * Actualiza el botón para reflejar que el jugador fue agregado al carrito.
 * @param {HTMLButtonElement} btn
 */
function setAdded(btn) {
  btn.innerHTML = ICON.check;
  btn.classList.add("add-btn--added");
  btn.title = "Ya está en tu lista";
}

/**
 * Actualiza el botón para reflejar que el jugador no está en el carrito.
 * @param {HTMLButtonElement} btn
 */
function setNotAdded(btn) {
  btn.innerHTML = ICON.plus;
  btn.classList.remove("add-btn--added");
  btn.title = "Agregar a mi lista";
}

$results.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-add-id]");
  if (btn) addToCart(btn.dataset.addId);
});

/**
 * Re-renderiza la sección del carrito con los jugadores actuales y el subtotal.
 */
function renderCart() {
  $cartCount.textContent = cart.length;

  if (!cart.length) {
    $cartSection.classList.add("cart--empty");
    $cartTotal.textContent = "—";
    return;
  }

  $cartSection.classList.remove("cart--empty");
  let subtotal = 0;

  $cartBody.innerHTML = cart
    .map((p) => {
      const id = String(p.player_id);
      const hasPrice = !!p.market_value_in_eur;

      const estRaw = estimatedValues.get(id);
      const estMillions = estRaw !== undefined ? parseFloat((estRaw / 1_000_000).toFixed(3)) : "";

      const editedRaw = editedValues.get(id);
      const editMillions = editedRaw !== undefined ? parseFloat((editedRaw / 1_000_000).toFixed(3)) : "";
      const origMillions = hasPrice ? parseFloat((p.market_value_in_eur / 1_000_000).toFixed(3)) : 0;
      const isEditing = editingIds.has(id);

      const eurForCalc = hasPrice ? (editedRaw || p.market_value_in_eur) : (estRaw || null);
      const price = calcPrice(eurForCalc, currentRate);
      subtotal += price;

      const country = getCountryDisplay(p.country_of_citizenship);
      const pos = getPositionES(p.position);
      const iso = getISO(p.country_of_citizenship);
      const imgSrc = p.image_url || "";

      const av = imgSrc
        ? `<img src="${imgSrc}" alt="${p.name}" class="cart-avatar" loading="lazy"
            onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
        : "";
      const avPh = `<div class="cart-avatar-ph" ${imgSrc ? 'style="display:none"' : ""}>${ICON.userSm}</div>`;
      const dot = iso
        ? `<div class="cart-flag-dot"><span class="fi fi-${iso}"></span></div>`
        : "";

      let priceCells;
      if (hasPrice) {
        const displayEUR = editedRaw || p.market_value_in_eur;
        priceCells = `
          <td class="cell-eur edit-cell">
            <div class="eur-display">
              <span class="eur-text${editedRaw ? " eur-edited" : ""}">${formatEUR(displayEUR)}</span>
              <button class="eur-edit-btn" data-edit-id="${id}" title="Editar valor de mercado" aria-label="Editar valor">${ICON.pencil}</button>
            </div>
            <div class="eur-edit est-input-wrap">
              <span class="est-prefix">€</span>
              <input type="number" class="edit-eur-input" data-edit-eur-id="${id}"
                min="0" step="any" placeholder="${origMillions}"
                value="${editMillions}"
                aria-label="Valor de mercado en millones de euros">
              <span class="est-suffix">M</span>
            </div>
          </td>
          <td class="cell-crc edit-crc-cell">
            <button class="eur-edit-mobile-btn" data-edit-id="${id}" aria-label="Editar valor de mercado">${ICON.pencil}</button>
            <span class="crc-value${editedRaw ? " crc-edited" : ""}" data-crc-id="${id}">${formatCRC(price)}</span>
          </td>`;
      } else {
        priceCells = `
          <td class="cell-eur est-cell">
            <button class="est-edit-btn" data-edit-id="${id}" title="Agregar estimado" aria-label="Agregar estimado">${ICON.pencil}</button>
            <div class="est-input-wrap" title="Ingresá el valor estimado en millones de euros">
              <span class="est-prefix">€</span>
              <input type="number" class="est-input" data-est-id="${id}"
                placeholder="0" min="0" step="any" value="${estMillions}"
                aria-label="Precio estimado en millones de euros para ${p.name}">
              <span class="est-suffix">M</span>
            </div>
          </td>
          <td class="cell-crc est-price-cell${estRaw ? "" : " est-price-pending"}" data-est-price-id="${id}">
            <button class="est-edit-mobile-btn" data-edit-id="${id}" aria-label="Agregar estimado">${ICON.pencil}</button>
            ${formatCRC(price)}
          </td>`;
      }

      const trClass = hasPrice
        ? `price-row${isEditing ? " price-row--editing" : ""}`
        : `no-price-row${isEditing ? " no-price-row--editing" : ""}`;

      return `<tr class="${trClass}" data-price-row="${id}">
      <td><div class="cart-player-cell">
        <div class="cart-avatar-wrap">${av}${avPh}${dot}</div>
        <span class="cart-player-name">${p.name}</span>
      </div></td>
      <td class="cart-country-cell">${iso ? `<span class="fi fi-${iso}"></span>` : ""}${country}</td>
      <td><span class="cart-pos-badge">${pos}</span></td>
      ${priceCells}
      <td><button class="del-btn" data-del-id="${p.player_id}" aria-label="Eliminar ${p.name}">${ICON.x}</button></td>
    </tr>`;
    })
    .join("");

  $cartTotal.textContent = formatCRC(subtotal);
}

$cartBody.addEventListener("click", (e) => {
  const delBtn = e.target.closest("[data-del-id]");
  if (delBtn) { removeFromCart(delBtn.dataset.delId); return; }

  const editBtn = e.target.closest("[data-edit-id]");
  if (editBtn) {
    const id = editBtn.dataset.editId;
    const row = $cartBody.querySelector(`[data-price-row="${id}"]`);
    if (!row) return;
    const isNoPriceRow = row.classList.contains("no-price-row");
    const editingClass = isNoPriceRow ? "no-price-row--editing" : "price-row--editing";
    const inputSelector = isNoPriceRow ? `[data-est-id="${id}"]` : `[data-edit-eur-id="${id}"]`;
    if (editingIds.has(id)) {
      closeEditing(id);
    } else {
      editingIds.add(id);
      row.classList.add(editingClass);
      setTimeout(() => row.querySelector(inputSelector)?.focus(), 0);
      scheduleCloseEditing(id);
    }
  }
});

function recalcSubtotal() {
  let subtotal = 0;
  cart.forEach((p) => {
    const pid = String(p.player_id);
    const est = estimatedValues.get(pid);
    const edited = editedValues.get(pid);
    const eur = p.market_value_in_eur ? (edited || p.market_value_in_eur) : (est || null);
    subtotal += calcPrice(eur, currentRate);
  });
  $cartTotal.textContent = formatCRC(subtotal);
}

$cartBody.addEventListener("input", (e) => {
  const estInput = e.target.closest(".est-input");
  if (estInput) {
    const id = estInput.dataset.estId;
    scheduleCloseEditing(id);
    const millions = parseFloat(estInput.value);
    if (isNaN(millions) || millions <= 0) estimatedValues.delete(id);
    else estimatedValues.set(id, millions * 1_000_000);

    const estRaw = estimatedValues.get(id);
    const price = calcPrice(estRaw || null, currentRate);
    const priceCell = $cartBody.querySelector(`[data-est-price-id="${id}"]`);
    if (priceCell) {
      priceCell.textContent = formatCRC(price);
      priceCell.classList.toggle("est-price-pending", !estRaw);
    }
    recalcSubtotal();
    return;
  }

  const editInput = e.target.closest(".edit-eur-input");
  if (!editInput) return;
  const id = editInput.dataset.editEurId;
  scheduleCloseEditing(id);
  const millions = parseFloat(editInput.value);
  if (isNaN(millions) || millions <= 0) editedValues.delete(id);
  else editedValues.set(id, millions * 1_000_000);

  const editedRaw = editedValues.get(id);
  const player = cart.find((p) => String(p.player_id) === id);
  if (!player) return;
  const displayEUR = editedRaw || player.market_value_in_eur;
  const price = calcPrice(displayEUR, currentRate);

  const crcEl = $cartBody.querySelector(`[data-crc-id="${id}"]`);
  if (crcEl) {
    crcEl.textContent = formatCRC(price);
    crcEl.classList.toggle("crc-edited", !!editedRaw);
  }
  const eurText = $cartBody.querySelector(`[data-price-row="${id}"] .eur-text`);
  if (eurText) {
    eurText.textContent = formatEUR(displayEUR);
    eurText.classList.toggle("eur-edited", !!editedRaw);
  }
  recalcSubtotal();
});

$clearCart.addEventListener("click", () => {
  cart = [];
  estimatedValues.clear();
  editedValues.clear();
  editingIds.clear();
  saveCart();
  renderCart();
  document.querySelectorAll(".add-btn--added").forEach(setNotAdded);
});

const DISCLAIMER_KEY = "panini_disclaimer_v1";

/**
 * Muestra el disclaimer si el usuario no lo ha visto antes.
 * El delay permite que el overlay de carga termine su animación de salida.
 */
async function maybeShowDisclaimer() {
  if (localStorage.getItem(DISCLAIMER_KEY)) return;
  await new Promise((r) => setTimeout(r, 350));
  await openDialog($disclaimerDialog, $disclaimerTrigger);
}

$disclaimerClose.addEventListener("click", async () => {
  localStorage.setItem(DISCLAIMER_KEY, "1");
  await closeDialog($disclaimerDialog);
});

$disclaimerTrigger.addEventListener("click", async () => {
  await openDialog($disclaimerDialog, $disclaimerTrigger);
});

/**
 * El cierre con Escape lo maneja <dialog> natively, pero igualmente
 * necesitamos persistir el flag para no mostrar el disclaimer de nuevo.
 */
$disclaimerDialog.addEventListener("close", () => {
  localStorage.setItem(DISCLAIMER_KEY, "1");
});

$configBtn.addEventListener("click", openModal);
$modalClose.addEventListener("click", closeModal);
$modal.addEventListener("click", (e) => {
  if (e.target === $modal) closeModal();
});

/**
 * Abre el modal de configuración de tasa y pre-rellena los campos.
 */
function openModal() {
  $fMillones.value = currentRate.millones;
  $fColones.value = currentRate.colones;
  $modal.classList.remove("hidden", "modal-closing");
  $fMillones.focus();
}

/**
 * Cierra el modal de configuración con animación de salida.
 */
function closeModal() {
  $modal.classList.add("modal-closing");
  setTimeout(() => {
    $modal.classList.add("hidden");
    $modal.classList.remove("modal-closing");
  }, 210);
}

$saveBtn.addEventListener("click", () => {
  const m = parseFloat($fMillones.value);
  const c = parseFloat($fColones.value);
  if (!m || !c || m <= 0 || c <= 0) {
    alert("Los valores deben ser números positivos.");
    return;
  }
  currentRate = { millones: m, colones: c };
  saveRate(currentRate);
  closeModal();
  runQuery();
  renderCart();
});

$resetBtn.addEventListener("click", () => {
  $fMillones.value = DEFAULT_RATE.millones;
  $fColones.value = DEFAULT_RATE.colones;
});

updateTeamDropdown();
init();
