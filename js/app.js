import { downloadAndParse, getISO, getCountryDisplay, getPositionES } from './data.js';
import { buildIndex, search } from './search.js';
import {
  loadRate, saveRate, calcPrice, formatCRC, formatEUR, DEFAULT_RATE,
} from './converter.js';

// ── SVG icons ─────────────────────────────────────────────────────────────────
const ICON = {
  plus: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>`,
  check: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
  x: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`,
  user: `<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
};

// ── Estado ────────────────────────────────────────────────────────────────────
let players = [];
let searchIndex = [];
let currentRate = loadRate();

// ── Carrito ───────────────────────────────────────────────────────────────────
const CART_KEY = 'panini_cart';
let cart = [];

function cartIds() { return cart.map(p => String(p.player_id)); }

function saveCart() {
  localStorage.setItem(CART_KEY, JSON.stringify(cartIds()));
}

function loadCart(allPlayers) {
  try {
    const ids = JSON.parse(localStorage.getItem(CART_KEY) || '[]');
    if (!ids.length) return;
    const idSet = new Set(ids.map(String));
    cart = allPlayers.filter(p => idSet.has(String(p.player_id)));
  } catch (_) {}
}

function addToCart(playerId) {
  const id = String(playerId);
  if (cartIds().includes(id)) return;
  const p = players.find(p => String(p.player_id) === id);
  if (!p) return;
  cart.push(p);
  saveCart();
  renderCart();
  const btn = document.querySelector(`[data-add-id="${id}"]`);
  if (btn) setAdded(btn);
}

function removeFromCart(playerId) {
  const id = String(playerId);
  cart = cart.filter(p => String(p.player_id) !== id);
  saveCart();
  renderCart();
  const btn = document.querySelector(`[data-add-id="${id}"]`);
  if (btn) setNotAdded(btn);
}

// ── Refs DOM ──────────────────────────────────────────────────────────────────
const $overlay     = document.getElementById('overlay');
const $progress    = document.getElementById('progress-bar');
const $loadMsg     = document.getElementById('load-msg');
const $loadError   = document.getElementById('load-error');
const $searchBox   = document.getElementById('search');
const $results     = document.getElementById('results');
const $configBtn   = document.getElementById('config-btn');
const $modal       = document.getElementById('modal');
const $modalClose  = document.getElementById('modal-close');
const $fMillones   = document.getElementById('f-millones');
const $fColones    = document.getElementById('f-colones');
const $saveBtn     = document.getElementById('save-btn');
const $resetBtn    = document.getElementById('reset-btn');
const $cartSection = document.getElementById('cart-section');
const $cartBody    = document.getElementById('cart-body');
const $cartTotal   = document.getElementById('cart-total');
const $clearCart   = document.getElementById('clear-cart');
const $cartCount   = document.getElementById('cart-count');

// ── Carga inicial ─────────────────────────────────────────────────────────────
async function init() {
  try {
    players = await downloadAndParse(pct => {
      $progress.style.width = (pct * 100) + '%';
      if (pct >= 1) $loadMsg.textContent = 'Procesando jugadores…';
    });
    searchIndex = buildIndex(players);
    loadCart(players);
    $overlay.classList.add('hidden');
    renderCart();
    $searchBox.focus();
  } catch (err) {
    $loadMsg.textContent = '';
    $loadError.textContent =
      'No se pudo cargar el catálogo: ' + err.message +
      '. Verificá tu conexión y recargá la página.';
  }
}

// ── Búsqueda ──────────────────────────────────────────────────────────────────
$searchBox.addEventListener('input', () => {
  const query = $searchBox.value;
  const found = search(query, searchIndex, players);
  renderResults(found, query);
});

function renderResults(found, query) {
  if (!query || query.trim().length < 2) {
    $results.innerHTML = '';
    return;
  }
  if (found.length === 0) {
    $results.innerHTML = `<p class="empty-msg">No se encontró ningún jugador con ese nombre en las 48 selecciones del Mundial 2026.</p>`;
    return;
  }
  const inCart = new Set(cartIds());
  $results.innerHTML = found.map(p => cardHTML(p, inCart.has(String(p.player_id)))).join('');
}

function flagDot(country) {
  const iso = getISO(country);
  if (!iso) return '';
  return `<div class="player-flag-dot"><span class="fi fi-${iso}"></span></div>`;
}

function cardHTML(p, added) {
  const price   = calcPrice(p.market_value_in_eur, currentRate);
  const country = getCountryDisplay(p.country_of_citizenship);
  const pos     = getPositionES(p.position);
  const imgSrc  = p.image_url || '';

  const photo = imgSrc
    ? `<img src="${imgSrc}" alt="${p.name}" class="player-img" loading="lazy"
          onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
    : '';
  const placeholder = `<div class="player-placeholder" ${imgSrc ? 'style="display:none"' : ''}>${ICON.user}</div>`;

  const btnClass = added ? 'add-btn add-btn--added' : 'add-btn';

  return `
  <div class="card">
    <div class="player-photo-wrap">
      ${photo}${placeholder}
      ${flagDot(p.country_of_citizenship)}
    </div>
    <div class="card-body">
      <p class="player-name">${p.name}</p>
      <div class="player-meta">
        <span class="player-country">${country}</span>
        <span class="player-pos-badge">${pos}</span>
      </div>
      <div class="card-pricing">
        <span class="player-eur">${formatEUR(p.market_value_in_eur)}</span>
        <span class="player-crc">${formatCRC(price)}</span>
      </div>
    </div>
    <button class="${btnClass}" data-add-id="${p.player_id}"
      title="${added ? 'Ya está en tu lista' : 'Agregar a mi lista'}"
      aria-label="${added ? 'Ya agregado' : 'Agregar'}">
      ${added ? ICON.check : ICON.plus}
    </button>
  </div>`;
}

function setAdded(btn) {
  btn.innerHTML = ICON.check;
  btn.classList.add('add-btn--added');
  btn.title = 'Ya está en tu lista';
}
function setNotAdded(btn) {
  btn.innerHTML = ICON.plus;
  btn.classList.remove('add-btn--added');
  btn.title = 'Agregar a mi lista';
}

$results.addEventListener('click', e => {
  const btn = e.target.closest('[data-add-id]');
  if (btn) addToCart(btn.dataset.addId);
});

// ── Carrito: render ───────────────────────────────────────────────────────────
function renderCart() {
  const count = cart.length;
  $cartCount.textContent = count;

  if (count === 0) {
    $cartSection.classList.add('cart--empty');
    $cartTotal.textContent = '—';
    return;
  }

  $cartSection.classList.remove('cart--empty');

  let subtotal = 0;
  $cartBody.innerHTML = cart.map(p => {
    const price   = calcPrice(p.market_value_in_eur, currentRate);
    subtotal += price;
    const country = getCountryDisplay(p.country_of_citizenship);
    const pos     = getPositionES(p.position);
    const iso     = getISO(p.country_of_citizenship);
    const imgSrc  = p.image_url || '';

    const avatar = imgSrc
      ? `<img src="${imgSrc}" alt="${p.name}" class="cart-avatar" loading="lazy"
            onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`
      : '';
    const avatarPh = `<div class="cart-avatar-ph" ${imgSrc ? 'style="display:none"' : ''}>${ICON.user}</div>`;
    const flagDotHtml = iso
      ? `<div class="cart-flag-dot"><span class="fi fi-${iso}"></span></div>`
      : '';

    return `
    <tr>
      <td>
        <div class="cart-player-cell">
          <div class="cart-avatar-wrap">${avatar}${avatarPh}${flagDotHtml}</div>
          <span class="cart-player-name">${p.name}</span>
        </div>
      </td>
      <td class="cart-country-cell">
        ${iso ? `<span class="fi fi-${iso}"></span>` : ''}${country}
      </td>
      <td><span class="cart-pos-badge">${pos}</span></td>
      <td class="cell-eur">${formatEUR(p.market_value_in_eur)}</td>
      <td class="cell-crc">${formatCRC(price)}</td>
      <td>
        <button class="del-btn" data-del-id="${p.player_id}" aria-label="Eliminar ${p.name}">
          ${ICON.x}
        </button>
      </td>
    </tr>`;
  }).join('');

  $cartTotal.textContent = formatCRC(subtotal);
}

$cartBody.addEventListener('click', e => {
  const btn = e.target.closest('[data-del-id]');
  if (btn) removeFromCart(btn.dataset.delId);
});

$clearCart.addEventListener('click', () => {
  cart = [];
  saveCart();
  renderCart();
  document.querySelectorAll('.add-btn--added').forEach(setNotAdded);
});

// ── Modal ─────────────────────────────────────────────────────────────────────
$configBtn.addEventListener('click', openModal);
$modalClose.addEventListener('click', closeModal);
$modal.addEventListener('click', e => { if (e.target === $modal) closeModal(); });

function openModal() {
  $fMillones.value = currentRate.millones;
  $fColones.value  = currentRate.colones;
  $modal.classList.remove('hidden');
  $fMillones.focus();
}
function closeModal() {
  $modal.classList.add('hidden');
}

$saveBtn.addEventListener('click', () => {
  const m = parseFloat($fMillones.value);
  const c = parseFloat($fColones.value);
  if (!m || !c || m <= 0 || c <= 0) {
    alert('Los valores deben ser números positivos.');
    return;
  }
  currentRate = { millones: m, colones: c };
  saveRate(currentRate);
  closeModal();
  renderResults(search($searchBox.value, searchIndex, players), $searchBox.value);
  renderCart();
});

$resetBtn.addEventListener('click', () => {
  $fMillones.value = DEFAULT_RATE.millones;
  $fColones.value  = DEFAULT_RATE.colones;
});

// ── Init ──────────────────────────────────────────────────────────────────────
init();
