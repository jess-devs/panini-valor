import { downloadAndParse } from "./data.js";
import { buildIndex, search } from "./search.js";
import { calcPrice, formatCRC, loadRate } from "./converter.js";

const CART_KEY = "panini_cart";

const ICON_CHECK = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>`;
const ICON_X     = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>`;
const ICON_PRICE = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>`;
const ICON_CAM   = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>`;

// ── State ─────────────────────────────────────
let players     = [];
let searchIndex = [];
let cameraStream = null;
let ocrWorker   = null;
let workerReady = false;
let dataReady   = false;

// ── DOM ───────────────────────────────────────
const $initStatus      = document.getElementById("init-status");
const $initMsg         = document.getElementById("init-msg");
const $tabBtns         = document.querySelectorAll("[role='tab']");
const $panels          = document.querySelectorAll("[role='tabpanel']");
const $video           = document.getElementById("preview");
const $captureBtn      = document.getElementById("capture-btn");
const $indStatus       = document.getElementById("individual-status");
const $cameraUnavail   = document.getElementById("camera-unavailable");
const $cameraErrMsg    = document.getElementById("camera-error-msg");
const $cameraRetryBtn  = document.getElementById("camera-retry-btn");
const $offscreen       = document.getElementById("offscreen-canvas");
const $dropZone        = document.getElementById("drop-zone");
const $fileInput       = document.getElementById("file-input");
const $filePickBtn     = document.getElementById("file-pick-btn");
const $batchThumbs     = document.getElementById("batch-thumbs");
const $batchProgress   = document.getElementById("batch-progress");
const $batchBar        = document.getElementById("batch-bar");
const $batchStatusTxt  = document.getElementById("batch-status");
const $batchSummary    = document.getElementById("batch-summary");
const $toast           = document.getElementById("ocr-toast");
const $toastMsg        = document.getElementById("ocr-toast-msg");

const offCtx = $offscreen.getContext("2d");

// ── Tabs ──────────────────────────────────────
function switchTab(target) {
  $tabBtns.forEach((btn) => {
    const active = btn.dataset.tab === target;
    btn.setAttribute("aria-selected", active);
    btn.classList.toggle("tab-btn--active", active);
  });
  $panels.forEach((panel) => {
    panel.hidden = panel.id !== `tab-${target}`;
  });
  if (target === "individual") {
    startCamera();
  } else {
    stopCamera();
  }
}

$tabBtns.forEach((btn) =>
  btn.addEventListener("click", () => switchTab(btn.dataset.tab))
);

// ── Camera ────────────────────────────────────
async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    showCameraError(
      "La cámara no está disponible. Asegurate de acceder por HTTPS o localhost."
    );
    return;
  }
  try {
    cameraStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 960 } },
    });
    $video.srcObject = cameraStream;
    $cameraUnavail.hidden = true;
    $captureBtn.disabled = !workerReady || !dataReady;
    if (workerReady && dataReady) showIndStatus("", "");
  } catch (err) {
    const msg = err.name === "NotAllowedError"
      ? "Permiso denegado. Habilitá el acceso a la cámara en la configuración del navegador."
      : "No se pudo acceder a la cámara: " + err.message;
    showCameraError(msg);
  }
}

function stopCamera() {
  if (!cameraStream) return;
  cameraStream.getTracks().forEach((t) => t.stop());
  cameraStream = null;
  $video.srcObject = null;
}

function showCameraError(msg) {
  $cameraUnavail.hidden = false;
  $cameraErrMsg.textContent = msg;
  $captureBtn.disabled = true;
}

$cameraRetryBtn.addEventListener("click", () => {
  $cameraUnavail.hidden = true;
  startCamera();
});

// ── Preprocessing ─────────────────────────────
function preprocessSource(source) {
  const w = source.videoWidth || source.naturalWidth || source.width;
  const h = source.videoHeight || source.naturalHeight || source.height;
  $offscreen.width  = w;
  $offscreen.height = h;
  offCtx.drawImage(source, 0, 0);
  const imgData = offCtx.getImageData(0, 0, w, h);
  const d = imgData.data;
  for (let i = 0; i < d.length; i += 4) {
    const luma = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
    const v = luma > 128 ? 255 : 0;
    d[i] = d[i + 1] = d[i + 2] = v;
  }
  offCtx.putImageData(imgData, 0, 0);
  return $offscreen;
}

// ── OCR + candidate extraction ────────────────
async function runOCR(canvas) {
  const { data: { text } } = await ocrWorker.recognize(canvas);
  return text;
}

function extractCandidates(rawText) {
  return rawText
    .split("\n")
    .map((l) => l.replace(/[^a-zA-ZÀ-ÿ\s''-]/g, "").trim())
    .filter((s) => s.length >= 3 && /[A-ZÁÉÍÓÚÑÜ]{2}/.test(s))
    .slice(0, 6);
}

function findPlayer(candidates) {
  for (const candidate of candidates) {
    const results = search(candidate, searchIndex, players);
    if (results.length > 0) return results[0];
  }
  return null;
}

// ── Individual mode ───────────────────────────
$captureBtn.addEventListener("click", async () => {
  if (!workerReady || !dataReady) {
    showIndStatus("Todavía cargando recursos, esperá un momento…", "loading");
    return;
  }
  $captureBtn.disabled = true;
  showIndStatus("Procesando imagen…", "loading");
  try {
    const canvas = preprocessSource($video);
    const rawText = await runOCR(canvas);
    const candidates = extractCandidates(rawText);
    const player = findPlayer(candidates);
    if (player) {
      showIndStatus(`Encontrado: ${player.name}`, "success");
      await new Promise((r) => setTimeout(r, 700));
      window.location.href = `../app.html?q=${encodeURIComponent(player.name)}`;
    } else {
      showIndStatus(
        "No se pudo identificar el jugador. Ajustá la cámara y volvé a intentar.",
        "error"
      );
      $captureBtn.disabled = false;
    }
  } catch (err) {
    showIndStatus("Error al procesar: " + err.message, "error");
    $captureBtn.disabled = false;
  }
});

function showIndStatus(msg, type) {
  $indStatus.className = "status-msg" + (type ? ` status-msg--${type}` : "");
  $indStatus.hidden = !msg;
  if (type === "loading") {
    $indStatus.innerHTML = msg;
  } else {
    $indStatus.textContent = msg;
  }
}

// ── Batch mode ────────────────────────────────
$filePickBtn.addEventListener("click", () => $fileInput.click());
$fileInput.addEventListener("change", () => {
  if ($fileInput.files.length) processBatch([...$fileInput.files]);
});

$dropZone.addEventListener("dragover", (e) => {
  e.preventDefault();
  $dropZone.classList.add("drag-over");
});
$dropZone.addEventListener("dragleave", () =>
  $dropZone.classList.remove("drag-over")
);
$dropZone.addEventListener("drop", (e) => {
  e.preventDefault();
  $dropZone.classList.remove("drag-over");
  const files = [...e.dataTransfer.files].filter((f) =>
    f.type.startsWith("image/")
  );
  if (files.length) processBatch(files);
});

async function processBatch(files) {
  if (!workerReady || !dataReady) {
    showToast("Todavía cargando recursos, esperá un momento…");
    return;
  }

  $batchThumbs.innerHTML = "";
  $batchSummary.hidden = true;
  $batchProgress.hidden = false;
  $batchBar.value = 0;
  $batchBar.max = files.length;

  // Build thumbnails
  const objectUrls = [];
  for (const file of files) {
    const url = URL.createObjectURL(file);
    objectUrls.push(url);
    const thumb = document.createElement("div");
    thumb.className = "batch-thumb";
    const img = document.createElement("img");
    img.src = url;
    img.alt = "";
    img.loading = "lazy";
    const statusEl = document.createElement("div");
    statusEl.className = "thumb-status";
    thumb.append(img, statusEl);
    $batchThumbs.appendChild(thumb);
  }

  const thumbEls = $batchThumbs.querySelectorAll(".batch-thumb");
  const recognized = [];
  const failedLabels = [];

  for (let i = 0; i < files.length; i++) {
    $batchBar.value = i;
    $batchStatusTxt.textContent = `Procesando ${i + 1} de ${files.length}…`;
    const thumb = thumbEls[i];
    thumb.classList.add("thumb--processing");
    thumb.querySelector(".thumb-status").innerHTML = ICON_CAM;

    let player = null;
    try {
      const bitmap = await createImageBitmap(files[i]);
      const canvas = preprocessSource(bitmap);
      bitmap.close();
      const rawText = await runOCR(canvas);
      const candidates = extractCandidates(rawText);
      player = findPlayer(candidates);
      if (!player && candidates[0]) failedLabels.push(`"${candidates[0]}"`);
      else if (!player) failedLabels.push("imagen sin texto");
    } catch (_) {
      failedLabels.push("error de procesamiento");
    }

    thumb.classList.remove("thumb--processing");
    if (player) {
      recognized.push(player);
      thumb.classList.add("thumb--ok");
      thumb.querySelector(".thumb-status").innerHTML = ICON_CHECK;
    } else {
      thumb.classList.add("thumb--fail");
      thumb.querySelector(".thumb-status").innerHTML = ICON_X;
    }

    // Yield between images (break-up-long-tasks guide)
    if ("scheduler" in window && "yield" in window.scheduler) {
      await window.scheduler.yield();
    } else {
      await new Promise((r) => setTimeout(r, 0));
    }
  }

  // Revoke object URLs
  objectUrls.forEach((url) => URL.revokeObjectURL(url));

  // Merge into cart localStorage
  const newIds = recognized
    .filter((p) => p.player_id)
    .map((p) => String(p.player_id));
  if (newIds.length) {
    try {
      const existing = JSON.parse(
        localStorage.getItem(CART_KEY) || "[]"
      ).map(String);
      const merged = [...new Set([...existing, ...newIds])];
      localStorage.setItem(CART_KEY, JSON.stringify(merged));
    } catch (_) {}
  }

  // Subtotal
  const rate = loadRate();
  const subtotal = recognized.reduce(
    (sum, p) => sum + calcPrice(p.market_value_in_eur, rate),
    0
  );

  $batchBar.value = files.length;
  $batchStatusTxt.textContent = "Procesamiento completo.";
  showSummary(recognized, failedLabels, subtotal, files.length);
}

function showSummary(recognized, failedLabels, subtotal, total) {
  const failCount = total - recognized.length;
  let html = `<div class="summary-rows">
    <div class="summary-row summary-row--ok">
      ${ICON_CHECK}
      <span><strong>${recognized.length}</strong> de ${total} figurita${total !== 1 ? "s" : ""} reconocida${recognized.length !== 1 ? "s" : ""}</span>
    </div>`;

  if (failCount > 0) {
    const labels = failedLabels.slice(0, 3).join(", ");
    const extra  = failedLabels.length > 3 ? ` y ${failedLabels.length - 3} más` : "";
    html += `<div class="summary-row summary-row--fail">
      ${ICON_X}
      <span>${failCount} no reconocida${failCount !== 1 ? "s" : ""}: ${labels}${extra}</span>
    </div>`;
  }

  html += `<div class="summary-row summary-row--total">
    ${ICON_PRICE}
    <span>Total agregado a la lista: ${formatCRC(subtotal)}</span>
  </div></div>
  <a href="../app.html" class="btn-primary">Ver mi lista</a>`;

  $batchSummary.innerHTML = html;
  $batchSummary.hidden = false;
}

// ── Toast ─────────────────────────────────────
let toastTimer = null;
function showToast(msg) {
  $toastMsg.textContent = msg;
  if ($toast.showPopover) {
    $toast.showPopover();
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      if ($toast.hidePopover) $toast.hidePopover();
    }, 4000);
  }
}

// ── Init status bar ───────────────────────────
function setInitStatus(msg) {
  if (!msg) { $initStatus.hidden = true; return; }
  $initStatus.hidden = false;
  $initMsg.textContent = msg;
}

function updateCaptureBtn() {
  if (cameraStream && workerReady && dataReady) {
    $captureBtn.disabled = false;
    $captureBtn.title = "Capturar figurita";
  }
}

// ── Load data ─────────────────────────────────
async function initData() {
  setInitStatus("Cargando catálogo de jugadores…");
  try {
    players = await downloadAndParse(() => {});
    searchIndex = buildIndex(players);
    dataReady = true;
    updateCaptureBtn();
    setInitStatus(workerReady ? "" : "Cargando motor OCR…");
  } catch (err) {
    setInitStatus("Error al cargar datos. Recargá la página.");
    showToast("No se pudo cargar el catálogo de jugadores.");
  }
}

// ── Load OCR worker ───────────────────────────
async function initOCR() {
  setInitStatus("Cargando motor OCR…");
  try {
    ocrWorker = await Tesseract.createWorker("eng");
    workerReady = true;
    updateCaptureBtn();
    if (dataReady) setInitStatus("");
  } catch (err) {
    setInitStatus("Error al inicializar OCR. Recargá la página.");
    showToast("No se pudo inicializar el motor OCR.");
  }
}

// ── Bootstrap ─────────────────────────────────
startCamera();
Promise.all([initData(), initOCR()]);
