interface ConfirmDialogOptions {
  title?: string;
  confirmText?: string;
  cancelText?: string;
}

const STYLE_ID = 'spinbutton-confirm-styles';

const ensureConfirmStyles = (): void => {
  if (document.getElementById(STYLE_ID)) {
    return;
  }
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .spinbutton-confirm-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    }
    .spinbutton-confirm-dialog {
      background: var(--spinbutton-confirm-bg);
      border: 1px solid var(--spinbutton-confirm-border);
      border-radius: calc(var(--spinbutton-confirm-radius) + 2px);
      padding: 16px;
      min-width: 220px;
      max-width: min(90vw, 360px);
      color: var(--spinbutton-confirm-text);
    }
    .spinbutton-confirm-title {
      font-size: 14px;
      margin-bottom: 12px;
    }
    .spinbutton-confirm-actions {
      display: flex;
      gap: 8px;
      justify-content: flex-end;
    }
    .spinbutton-confirm-button {
      appearance: none;
      border: 1px solid var(--spinbutton-confirm-border);
      background: var(--spinbutton-confirm-bg);
      color: inherit;
      padding: 6px 12px;
      border-radius: 6px;
      cursor: pointer;
    }
    .spinbutton-confirm-button.primary {
      background: var(--spinbutton-confirm-border);
      color: var(--spinbutton-confirm-text);
    }
  `;
  document.head.appendChild(style);
};

export const openConfirmDialog = (
  host: HTMLElement,
  options: ConfirmDialogOptions = {}
): Promise<boolean> => {
  ensureConfirmStyles();
  const overlay = document.createElement('div');
  overlay.className = 'spinbutton-confirm-backdrop';
  const dialog = document.createElement('div');
  dialog.className = 'spinbutton-confirm-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');

  const title = document.createElement('div');
  title.className = 'spinbutton-confirm-title';
  title.textContent = options.title ?? 'Are you sure?';

  const actions = document.createElement('div');
  actions.className = 'spinbutton-confirm-actions';
  const cancel = document.createElement('button');
  cancel.className = 'spinbutton-confirm-button';
  cancel.type = 'button';
  cancel.textContent = options.cancelText ?? 'Cancel';
  const confirm = document.createElement('button');
  confirm.className = 'spinbutton-confirm-button primary';
  confirm.type = 'button';
  confirm.textContent = options.confirmText ?? 'Confirm';
  actions.append(cancel, confirm);
  dialog.append(title, actions);
  overlay.append(dialog);

  const computed = getComputedStyle(host);
  const bg = computed.getPropertyValue('--card-bg').trim() || '#1c1f2b';
  const border = computed.getPropertyValue('--solid-color').trim() || '#008080';
  const radius = computed.getPropertyValue('--radius').trim() || '8px';
  const text = computed.getPropertyValue('--primary-text-color').trim() || '#ffffff';
  overlay.style.setProperty('--spinbutton-confirm-bg', bg);
  overlay.style.setProperty('--spinbutton-confirm-border', border);
  overlay.style.setProperty('--spinbutton-confirm-radius', radius);
  overlay.style.setProperty('--spinbutton-confirm-text', text);

  return new Promise((resolve) => {
    let resolved = false;
    const keyHandler = (ev: KeyboardEvent) => {
      if (ev.key === 'Escape') {
        cleanup(false);
      }
      if (ev.key === 'Enter') {
        cleanup(true);
      }
    };
    const cleanup = (value: boolean) => {
      if (resolved) return;
      resolved = true;
      overlay.remove();
      window.removeEventListener('keydown', keyHandler);
      resolve(value);
    };
    overlay.addEventListener('click', () => cleanup(false));
    dialog.addEventListener('click', (ev: Event) => ev.stopPropagation());
    cancel.addEventListener('click', () => cleanup(false));
    confirm.addEventListener('click', () => cleanup(true));
    window.addEventListener('keydown', keyHandler);
    document.body.appendChild(overlay);
    requestAnimationFrame(() => cancel.focus());
  });
};
