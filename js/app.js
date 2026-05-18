import {
  downloadAndParse,
  getISO,
  getCountryDisplay,
  getPositionES,
} from "./data.js";
import { buildIndex, search } from "./search.js";
import {
  loadRate,
  saveRate,
  calcPrice,
  formatCRC,
  formatEUR,
  DEFAULT_RATE,
} from "./converter.js";
import { openDialog, closeDialog } from "./transitions.js";

/** @type {{ plus: string, check: string, x: string, user: string, userSm: string }} */
const ICON = {
  plus: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  check: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  x: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  user: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
  userSm: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
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
      saveCart();
      renderCart();
      const btn = document.querySelector(`[data-add-id="${id}"]`);
      if (btn) setNotAdded(btn);
    }, 220);
  } else {
    cart = cart.filter((p) => String(p.player_id) !== id);
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
    searchIndex = buildIndex(players);
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

$searchBox.addEventListener("input", () => {
  const query = $searchBox.value;
  if (!query || query.trim().length < 2) {
    $results.innerHTML = "";
    return;
  }
  const found = search(query, searchIndex, players);
  renderResults(found, query);
});

/**
 * Renderiza las tarjetas de resultados de búsqueda.
 * @param {object[]} found
 * @param {string}   query
 */
function renderResults(found, query) {
  if (!query || query.trim().length < 2) {
    $results.innerHTML = "";
    return;
  }
  if (found.length === 0) {
    $results.innerHTML = `<p class="empty-msg">No se encontró ningún jugador con ese nombre en las 48 selecciones del Mundial 2026.</p>`;
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
          : `<span class="no-price">Precio no disponible</span>`}
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
      const price = calcPrice(p.market_value_in_eur, currentRate);
      subtotal += price;
      const country = getCountryDisplay(p.country_of_citizenship);
      const pos = getPositionES(p.position);
      const iso = getISO(p.country_of_citizenship);
      const imgSrc = p.image_url || "";
      const hasPrice = !!p.market_value_in_eur;

      const av = imgSrc
        ? `<img src="${imgSrc}" alt="${p.name}" class="cart-avatar" loading="lazy"
            onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
        : "";
      const avPh = `<div class="cart-avatar-ph" ${imgSrc ? 'style="display:none"' : ""}>${ICON.userSm}</div>`;
      const dot = iso
        ? `<div class="cart-flag-dot"><span class="fi fi-${iso}"></span></div>`
        : "";

      return `<tr>
      <td><div class="cart-player-cell">
        <div class="cart-avatar-wrap">${av}${avPh}${dot}</div>
        <span class="cart-player-name">${p.name}</span>
      </div></td>
      <td class="cart-country-cell">${iso ? `<span class="fi fi-${iso}"></span>` : ""}${country}</td>
      <td><span class="cart-pos-badge">${pos}</span></td>
      ${hasPrice
        ? `<td class="cell-eur">${formatEUR(p.market_value_in_eur)}</td><td class="cell-crc">${formatCRC(price)}</td>`
        : `<td class="cell-eur" colspan="2"><span class="no-price">Precio no disponible</span></td>`}
      <td><button class="del-btn" data-del-id="${p.player_id}" aria-label="Eliminar ${p.name}">${ICON.x}</button></td>
    </tr>`;
    })
    .join("");

  $cartTotal.textContent = formatCRC(subtotal);
}

$cartBody.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-del-id]");
  if (btn) removeFromCart(btn.dataset.delId);
});

$clearCart.addEventListener("click", () => {
  cart = [];
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
  renderResults(
    search($searchBox.value, searchIndex, players),
    $searchBox.value,
  );
  renderCart();
});

$resetBtn.addEventListener("click", () => {
  $fMillones.value = DEFAULT_RATE.millones;
  $fColones.value = DEFAULT_RATE.colones;
});

init();
