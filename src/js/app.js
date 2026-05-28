import {
  downloadAndParse,
  getISO,
  getCountryDisplay,
  getPositionES,
  normalizeCountryName,
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
import { GROUPS, TEAM_DISPLAY, TEAM_COUNTRY, buildChecklistMap, getMissingEntries } from "./checklist.js";

const ICON = {
  plus: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  check: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  x: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  warning: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
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
  renderCart(id);
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
  const doRemove = () => {
    cart = cart.filter((p) => String(p.player_id) !== id);
    clearPlayerState(id);
    saveCart();
    renderCart();
    const btn = document.querySelector(`[data-add-id="${id}"]`);
    if (btn) setNotAdded(btn);
  };
  if (row) {
    gsap.to(row, {
      opacity: 0, x: 18, scaleY: 0.6,
      duration: 0.22, ease: "power2.in",
      onComplete: doRemove,
    });
  } else {
    doRemove();
  }
}

const $overlay = document.getElementById("overlay");
const $progress = document.getElementById("progress-bar");
const $loadMsg = document.getElementById("load-msg");
const $loadError = document.getElementById("load-error");
const $searchBox      = document.getElementById("search");
const $searchScanBtn  = document.querySelector(".search-scanner-btn");
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
const $filterTrigger = document.getElementById("filter-trigger");
const $filterTriggerLabel = document.getElementById("filter-trigger-label");
const $filterChipClear = document.getElementById("filter-chip-clear");
const $filterChipText = document.getElementById("filter-chip-text");
const $filterDialog = document.getElementById("filter-dialog");
const $filterDialogClose = document.getElementById("filter-dialog-close");
const $filterGroupGrid = document.getElementById("filter-group-grid");
const $filterGroupsView = document.getElementById("filter-groups-view");
const $filterTeamsView = document.getElementById("filter-teams-view");
const $filterTeamGrid = document.getElementById("filter-team-grid");
const $filterTeamsLabel = document.getElementById("filter-teams-label");
const $filterBackBtn = document.getElementById("filter-back-btn");
const $filterApplyGroupBtn = document.getElementById("filter-apply-group-btn");
const $filterDialogClear = document.getElementById("filter-dialog-clear");
const $cartSortBtn = document.getElementById("cart-sort-btn");
const $sortPopover = document.getElementById("sort-popover");
const $cartBar = document.getElementById("cart-bar");
const $cartBarCount = document.getElementById("cart-bar-count");
const $cartBarTotal = document.getElementById("cart-bar-total");

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
      const match = entry && TEAM_COUNTRY[entry.team] === normalizeCountryName(p.country_of_citizenship);
      return match ? { ...p, sticker_code: entry.code, sticker_team: entry.team } : p;
    });
    searchIndex = buildIndex(players);
    activePool = players;
    activeIndex = searchIndex;
    loadCart(players);

    $overlay.classList.add("hidden");
    animateFilterBtnsIn();

    renderCart();

    const qParam = new URLSearchParams(location.search).get("q");
    if (qParam?.trim()) {
      $searchBox.value = qParam.trim();
      syncClearBtn();
      runQuery();
      $searchBox.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      $searchBox.focus();
    }

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
    if (query.length < 2) { $results.innerHTML = ""; hideResetBtn(); return; }
    renderResults(search(query, activeIndex, activePool));
    return;
  }

  if (activeTeam) {
    if (query.length >= 2) {
      renderResults(search(query, activeIndex, activePool));
      return;
    }
    const matchedCodes = new Set(activePool.map((p) => p.sticker_code).filter(Boolean));
    const missing = getMissingEntries(activeTeam, matchedCodes);
    const synth = missing.map((e) => ({
      _missing: true,
      name: e.name,
      sticker_code: e.code,
      sticker_team: e.team,
      country_of_citizenship: TEAM_COUNTRY[e.team],
      position: null,
      market_value_in_eur: null,
      image_url: "",
      player_id: null,
    }));
    renderResults([...synth, ...activePool]);
    return;
  }

  if (query.length < 2) {
    $results.innerHTML = `<p class="empty-msg">Escribí un nombre para buscar dentro del Grupo ${activeGroup}.</p>`;
    return;
  }
  renderResults(search(query, activeIndex, activePool));
}


const $searchClearBtn = document.getElementById("search-clear-btn");

function syncClearBtn() {
  const hasText = $searchBox.value.length > 0;
  $searchScanBtn.hidden = hasText;
  $searchClearBtn.hidden = !hasText;
}

$searchBox.addEventListener("input", () => { runQuery(); syncClearBtn(); });

function animateCardsOut(onComplete) {
  const cards = [...$results.querySelectorAll(".card")];
  if (!cards.length) { onComplete(); return; }
  gsap.to(cards, {
    opacity: 0, y: -10, scale: 0.94,
    duration: 0.18,
    stagger: { each: 0.025, from: "start" },
    ease: "power2.in",
    onComplete,
  });
}

$searchClearBtn.addEventListener("click", () => {
  animateCardsOut(() => {
    $searchBox.value = "";
    syncClearBtn();
    runQuery();
    $searchBox.focus();
  });
});

const $searchResetBtn = document.getElementById("search-reset-btn");

function showResetBtn() {
  if (!$searchResetBtn.hidden) return;
  $searchResetBtn.hidden = false;
  gsap.fromTo($searchResetBtn,
    { opacity: 0, scale: 0.75, x: -8 },
    { opacity: 1, scale: 1, x: 0, duration: 0.28, ease: "back.out(2)" }
  );
}

function hideResetBtn() {
  if ($searchResetBtn.hidden) return;
  gsap.to($searchResetBtn, {
    opacity: 0, scale: 0.8, x: -6,
    duration: 0.18, ease: "power2.in",
    onComplete: () => { $searchResetBtn.hidden = true; }
  });
}

function animateFilterBtnsIn() {
  gsap.from(["#filter-trigger", "#intercambio-btn"], {
    y: -10, opacity: 0, scale: 0.88,
    duration: 0.42, stagger: 0.09,
    ease: "back.out(1.8)", clearProps: "all"
  });
  gsap.from("#cart-section", {
    y: 24, opacity: 0, scale: 0.97,
    duration: 0.55, delay: 0.18,
    ease: "power3.out", clearProps: "all"
  });
}

/* Press feedback on all filter-row buttons */
["#filter-trigger", "#intercambio-btn", "#search-reset-btn"].forEach((sel) => {
  const el = document.querySelector(sel);
  el.addEventListener("pointerdown", () => gsap.to(el, { scale: 0.91, duration: 0.08, ease: "power2.in" }));
  el.addEventListener("pointerup",   () => gsap.to(el, { scale: 1, duration: 0.25, ease: "back.out(2.5)" }));
  el.addEventListener("pointerleave",() => gsap.to(el, { scale: 1, duration: 0.18 }));
});

$searchResetBtn.addEventListener("click", () => {
  animateCardsOut(() => {
    $searchBox.value = "";
    syncClearBtn();
    runQuery();
    $searchBox.focus();
  });
});

function renderResults(found) {
  found.length === 0 ? hideResetBtn() : showResetBtn();
  if (found.length === 0) {
    $results.innerHTML = `<p class="empty-msg">${
      activeTeam || activeGroup
        ? "No se encontraron jugadores para este filtro en el catálogo. Algunos jugadores del álbum Panini pueden no estar disponibles en la base de datos de Transfermarkt."
        : "No se encontró ningún jugador con ese nombre en las 48 selecciones del Mundial 2026. Algunos jugadores pueden no estar en nuestra base de datos de Transfermarkt."
    }</p>`;
    return;
  }
  const inCart = new Set(cartIds());
  $results.innerHTML = found
    .map((p) => p._missing ? missingCardHTML(p) : cardHTML(p, inCart.has(String(p.player_id))))
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
 * Genera el HTML de una tarjeta para un jugador del checklist sin datos en el CSV.
 * @param {object} p - Objeto sintético con _missing: true
 * @returns {string}
 */
function missingCardHTML(p) {
  const country = getCountryDisplay(p.country_of_citizenship);
  const iso = getISO(p.country_of_citizenship);
  const dot = iso
    ? `<div class="player-flag-dot"><span class="fi fi-${iso}"></span></div>`
    : "";

  return `
  <div class="card card--missing">
    ${p.sticker_code ? `<span class="sticker-code sticker-code--missing">${p.sticker_code}</span>` : ""}
    <div class="player-photo-wrap">
      <div class="player-placeholder player-placeholder--missing">${ICON.warning}</div>
      ${dot}
    </div>
    <div class="card-body">
      <p class="player-name">${p.name}</p>
      <div class="player-meta">
        <span class="player-country">${country}</span>
        <span class="missing-badge">Sin datos</span>
      </div>
      <div class="card-pricing">
        <span class="missing-hint">No disponible en la base de Transfermarkt</span>
      </div>
    </div>
    <button class="add-btn add-btn--missing" disabled title="Sin datos en el catálogo" aria-label="Sin datos">
      ${ICON.x}
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
function renderCart(newId = null) {
  const prevCount = parseInt($cartCount.textContent, 10) || 0;
  $cartCount.textContent = cart.length;
  if (cart.length !== prevCount) animateCartBadge();

  if (!cart.length) {
    $cartSection.classList.add("cart--empty");
    $cartTotal.textContent = "—";
    if ($cartBar) $cartBar.classList.remove("cart-bar--visible");
    requestAnimationFrame(() => animateCartEmptyIn());
    return;
  }

  $cartSection.classList.remove("cart--empty");
  let subtotal = 0;

  $cartBody.innerHTML = getSortedCart()
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

  if (newId) {
    const newRow = $cartBody.querySelector(`[data-price-row="${newId}"]`);
    if (newRow) {
      gsap.from(newRow, {
        opacity: 0, x: 20, scale: 0.97,
        duration: 0.34, ease: "back.out(1.6)",
        clearProps: "all",
      });
    }
  }

  if ($cartBar) {
    const count = cart.length;
    $cartBar.classList.add("cart-bar--visible");
    $cartBarCount.textContent = `${count} postal${count !== 1 ? "es" : ""}`;
    $cartBarTotal.textContent = formatCRC(subtotal);
  }
}

function animateCartBadge() {
  gsap.fromTo($cartCount,
    { scale: 1.5, opacity: 0.6 },
    { scale: 1, opacity: 1, duration: 0.38, ease: "back.out(2.8)" }
  );
}

function animateCartEmptyIn() {
  const el = document.getElementById("cart-empty-state");
  if (!el || el.style.display === "none") return;
  gsap.from(el, {
    opacity: 0, y: 14, scale: 0.93,
    duration: 0.44, ease: "back.out(1.7)",
  });
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

// ── Sort ────────────────────────────────────────────────
let cartSortMode = "default";

function getEffectiveEUR(p) {
  const id = String(p.player_id);
  if (p.market_value_in_eur) return editedValues.get(id) || p.market_value_in_eur;
  return estimatedValues.get(id) || 0;
}

function getSortedCart() {
  const arr = [...cart];
  if (cartSortMode === "price-desc") return arr.sort((a, b) => getEffectiveEUR(b) - getEffectiveEUR(a));
  if (cartSortMode === "price-asc")  return arr.sort((a, b) => getEffectiveEUR(a) - getEffectiveEUR(b));
  if (cartSortMode === "name-asc")   return arr.sort((a, b) => a.name.localeCompare(b.name, "es"));
  return arr;
}

$cartSortBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  $sortPopover.classList.toggle("hidden");
});

document.addEventListener("click", (e) => {
  if (!$cartSortBtn.contains(e.target)) $sortPopover.classList.add("hidden");
});

$sortPopover.addEventListener("click", (e) => {
  const opt = e.target.closest("[data-sort]");
  if (!opt) return;
  cartSortMode = opt.dataset.sort;
  $sortPopover.classList.add("hidden");
  $sortPopover.querySelectorAll(".sort-option").forEach((btn) => {
    btn.classList.toggle("sort-option--active", btn.dataset.sort === cartSortMode);
  });
  $cartSortBtn.classList.toggle("cart-sort-btn--active", cartSortMode !== "default");
  renderCart();
});

// ── Filter dialog ────────────────────────────────────────
let dialogSelectedGroup = "";

function renderGroupGrid() {
  $filterGroupGrid.innerHTML = Object.entries(GROUPS).map(([groupCode, teams]) => {
    const flags = teams.map((t) => {
      const iso = getISO(TEAM_COUNTRY[t]);
      return iso ? `<span class="fi fi-${iso} filter-flag-sm"></span>` : "";
    }).join("");
    const isActive = activeGroup === groupCode && !activeTeam;
    return `<button class="filter-group-card${isActive ? " filter-group-card--active" : ""}" data-group="${groupCode}" type="button">
      <span class="filter-group-letter">Grupo ${groupCode}</span>
      <div class="filter-group-flags">${flags}</div>
    </button>`;
  }).join("");
}

function renderTeamGrid(groupCode) {
  const teams = GROUPS[groupCode] || [];
  $filterTeamGrid.innerHTML = teams.map((t) => {
    const iso = getISO(TEAM_COUNTRY[t]);
    const name = TEAM_DISPLAY[t] || t;
    const isActive = activeTeam === t;
    return `<button class="filter-team-card${isActive ? " filter-team-card--active" : ""}" data-team="${t}" data-group="${groupCode}" type="button">
      ${iso ? `<span class="fi fi-${iso} filter-flag-lg"></span>` : ""}
      <span class="filter-team-name">${name}</span>
    </button>`;
  }).join("");
}

function showGroupsView() {
  renderGroupGrid();
  $filterGroupsView.hidden = false;
  $filterTeamsView.hidden = true;
}

function showTeamsView(groupCode) {
  dialogSelectedGroup = groupCode;
  $filterTeamsLabel.textContent = `Grupo ${groupCode}`;
  renderTeamGrid(groupCode);
  $filterGroupsView.hidden = true;
  $filterTeamsView.hidden = false;
}

function openFilterDialog() {
  showGroupsView();
  $filterDialog.showModal();
}

function closeFilterDialog() {
  $filterDialog.close();
}

function updateFilterChip() {
  if (!activeGroup && !activeTeam) {
    $filterTriggerLabel.textContent = "Filtrar por grupo o selección";
    $filterTrigger.classList.remove("filter-trigger-btn--active");
    $filterChipClear.hidden = true;
    return;
  }
  $filterTrigger.classList.add("filter-trigger-btn--active");
  const label = activeTeam ? TEAM_DISPLAY[activeTeam] : `Grupo ${activeGroup}`;
  $filterTriggerLabel.textContent = label;
  $filterChipText.textContent = label;
  $filterChipClear.hidden = false;
}

function applyGroupFilter(groupCode) {
  activeGroup = groupCode;
  activeTeam = "";
  applyFilter();
  updateFilterChip();
  closeFilterDialog();
  runQuery();
}

function applyTeamFilter(teamCode, groupCode) {
  activeGroup = groupCode;
  activeTeam = teamCode;
  applyFilter();
  updateFilterChip();
  closeFilterDialog();
  runQuery();
}

function clearFilter() {
  activeGroup = "";
  activeTeam = "";
  applyFilter();
  updateFilterChip();
  runQuery();
}

$filterTrigger.addEventListener("click", openFilterDialog);
$filterDialogClose.addEventListener("click", closeFilterDialog);
$filterChipClear.addEventListener("click", clearFilter);
$filterBackBtn.addEventListener("click", showGroupsView);

$filterApplyGroupBtn.addEventListener("click", () => {
  applyGroupFilter(dialogSelectedGroup);
});

$filterDialogClear.addEventListener("click", () => {
  clearFilter();
  closeFilterDialog();
});

$filterDialog.addEventListener("click", (e) => {
  if (e.target === $filterDialog) { closeFilterDialog(); return; }
  const teamCard = e.target.closest("[data-team]");
  if (teamCard) { applyTeamFilter(teamCard.dataset.team, teamCard.dataset.group); return; }
  const groupCard = e.target.closest("[data-group]");
  if (groupCard && !$filterGroupsView.hidden) showTeamsView(groupCard.dataset.group);
});

// Recibe los códigos de figurita desde el modal de intercambio y los muestra como resultados.
document.addEventListener("intercambio:lookup", (e) => {
  const codes = new Set(e.detail);
  clearFilter();
  $searchBox.value = "";
  syncClearBtn();
  const matched = players.filter((p) => p.sticker_code && codes.has(p.sticker_code));
  renderResults(matched);
  $results.scrollIntoView({ behavior: "smooth", block: "start" });
});

init();
