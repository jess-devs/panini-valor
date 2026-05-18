export async function openDialog(dialogEl, _triggerEl) {
  dialogEl.classList.remove('dialog-closing');
  dialogEl.showModal();
}

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
