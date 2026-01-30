interface KeypadDialogOptions {
  title?: string;
  requiredDigits?: number;
}

const STYLE_ID = 'spinbutton-keypad-styles';

const ensureKeypadStyles = (): void => {
  if (document.getElementById(STYLE_ID)) {
    return;
  }
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
    .spinbutton-keypad-backdrop {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.45);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    }
    .spinbutton-keypad-dialog {
      background: var(--spinbutton-keypad-bg);
      border: 1px solid var(--spinbutton-keypad-border);
      border-radius: calc(var(--spinbutton-keypad-radius) + 2px);
      padding: 16px;
      min-width: 240px;
      max-width: min(92vw, 360px);
      color: var(--spinbutton-keypad-text);
    }
    .spinbutton-keypad-title {
      font-size: 14px;
      margin-bottom: 8px;
    }
    .spinbutton-keypad-display {
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono",
        "Courier New", monospace;
      font-size: 18px;
      letter-spacing: 4px;
      text-align: center;
      padding: 8px 0 12px;
    }
    .spinbutton-keypad-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 8px;
    }
    .spinbutton-keypad-button {
      appearance: none;
      border: 1px solid var(--spinbutton-keypad-border);
      background: var(--spinbutton-keypad-bg);
      color: inherit;
      padding: 10px 0;
      border-radius: 8px;
      cursor: pointer;
      font-size: 14px;
    }
    .spinbutton-keypad-button.primary {
      background: var(--spinbutton-keypad-border);
      color: var(--spinbutton-keypad-text);
    }
    .spinbutton-keypad-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    .spinbutton-keypad-actions {
      display: grid;
      grid-template-columns: 1fr;
      margin-top: 8px;
    }
  `;
  document.head.appendChild(style);
};

const clampDigits = (value?: number): number => {
  if (!Number.isFinite(value)) return 8;
  const digits = Math.floor(value as number);
  return Math.max(1, Math.min(32, digits));
};

export const openKeypadDialog = (
  host: HTMLElement,
  options: KeypadDialogOptions = {}
): Promise<string | null> => {
  ensureKeypadStyles();
  const requiredDigits = clampDigits(options.requiredDigits ?? 8);

  const overlay = document.createElement('div');
  overlay.className = 'spinbutton-keypad-backdrop';
  const dialog = document.createElement('div');
  dialog.className = 'spinbutton-keypad-dialog';
  dialog.setAttribute('role', 'dialog');
  dialog.setAttribute('aria-modal', 'true');

  const title = document.createElement('div');
  title.className = 'spinbutton-keypad-title';
  title.textContent = options.title ?? `Enter code (${requiredDigits} digits)`;

  const display = document.createElement('div');
  display.className = 'spinbutton-keypad-display';

  const keypad = document.createElement('div');
  keypad.className = 'spinbutton-keypad-grid';

  const buttons: Array<{ label: string; value: string; className?: string }> = [
    { label: '1', value: '1' },
    { label: '2', value: '2' },
    { label: '3', value: '3' },
    { label: '4', value: '4' },
    { label: '5', value: '5' },
    { label: '6', value: '6' },
    { label: '7', value: '7' },
    { label: '8', value: '8' },
    { label: '9', value: '9' },
    { label: 'Clear', value: 'clear' },
    { label: '0', value: '0' },
    { label: 'Enter', value: 'enter', className: 'primary' },
  ];

  const cancelRow = document.createElement('div');
  cancelRow.className = 'spinbutton-keypad-actions';
  const cancelButton = document.createElement('button');
  cancelButton.className = 'spinbutton-keypad-button';
  cancelButton.type = 'button';
  cancelButton.textContent = 'Cancel';
  cancelRow.appendChild(cancelButton);

  const computed = getComputedStyle(host);
  const bg = computed.getPropertyValue('--card-bg').trim() || '#1c1f2b';
  const border = computed.getPropertyValue('--solid-color').trim() || '#008080';
  const radius = computed.getPropertyValue('--radius').trim() || '8px';
  const text = computed.getPropertyValue('--primary-text-color').trim() || '#ffffff';
  overlay.style.setProperty('--spinbutton-keypad-bg', bg);
  overlay.style.setProperty('--spinbutton-keypad-border', border);
  overlay.style.setProperty('--spinbutton-keypad-radius', radius);
  overlay.style.setProperty('--spinbutton-keypad-text', text);

  let value = '';
  const renderDisplay = (): void => {
    const masked = '*'.repeat(value.length);
    const remaining = '_'.repeat(Math.max(0, requiredDigits - value.length));
    display.textContent = `${masked}${remaining}`;
  };

  let enterButton: HTMLButtonElement | undefined;
  const updateEnterState = (): void => {
    if (enterButton) {
      enterButton.disabled = value.length !== requiredDigits;
    }
  };

  return new Promise((resolve) => {
    let resolved = false;
    const cleanup = (result: string | null) => {
      if (resolved) return;
      resolved = true;
      overlay.remove();
      window.removeEventListener('keydown', keyHandler);
      resolve(result);
    };

    const handleInput = (input: string) => {
      if (input === 'clear') {
        value = '';
      } else if (input === 'cancel') {
        cleanup(null);
        return;
      } else if (input === 'enter') {
        if (value.length === requiredDigits) {
          cleanup(value);
          return;
        }
      } else if (/^\d$/.test(input)) {
        if (value.length < requiredDigits) {
          value += input;
        }
      }
      renderDisplay();
      updateEnterState();
    };

    const keyHandler = (ev: KeyboardEvent) => {
      if (/^\d$/.test(ev.key)) {
        handleInput(ev.key);
        return;
      }
      if (ev.key === 'Backspace') {
        value = value.slice(0, -1);
        renderDisplay();
        updateEnterState();
        return;
      }
      if (ev.key === 'Delete') {
        handleInput('clear');
        return;
      }
      if (ev.key === 'Escape') {
        handleInput('cancel');
        return;
      }
      if (ev.key === 'Enter') {
        handleInput('enter');
      }
    };

    buttons.forEach((btn) => {
      const button = document.createElement('button');
      button.className = 'spinbutton-keypad-button';
      if (btn.className) {
        button.classList.add(btn.className);
      }
      button.type = 'button';
      button.textContent = btn.label;
      button.addEventListener('click', () => handleInput(btn.value));
      keypad.appendChild(button);
      if (btn.value === 'enter') {
        enterButton = button;
      }
    });

    cancelButton.addEventListener('click', () => handleInput('cancel'));
    overlay.addEventListener('click', () => handleInput('cancel'));
    dialog.addEventListener('click', (ev: Event) => ev.stopPropagation());
    window.addEventListener('keydown', keyHandler);

    dialog.append(title, display, keypad, cancelRow);
    overlay.append(dialog);
    document.body.appendChild(overlay);

    renderDisplay();
    updateEnterState();
    const firstButton = keypad.querySelector('button') as HTMLButtonElement | null;
    requestAnimationFrame(() => firstButton?.focus());
  });
};
