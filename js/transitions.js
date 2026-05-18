/**
 * Abre un <dialog> con animación de entrada (CSS class dialogIn).
 * @param {HTMLDialogElement} dialogEl
 * @param {HTMLElement}       [_triggerEl] - Reservado para compatibilidad futura.
 */
export async function openDialog(dialogEl, _triggerEl) {
  dialogEl.classList.remove('dialog-closing');
  dialogEl.showModal();
}

/**
 * Cierra un <dialog> esperando que termine la animación de salida (CSS class dialogOut).
 * @param {HTMLDialogElement} dialogEl
 * @returns {Promise<void>}
 */
export async function closeDialog(dialogEl) {
  return new Promise(resolve => {
    dialogEl.classList.add('dialog-closing');
    dialogEl.addEventListener('animationend', () => {
      dialogEl.classList.remove('dialog-closing');
      dialogEl.close();
      resolve();
    }, { once: true });
  });
}
