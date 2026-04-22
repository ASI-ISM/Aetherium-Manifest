import { SETTINGS_PANES } from './settings-store.js';

function isDesktopViewport(win = globalThis) {
  return (win.innerWidth || 0) >= 800;
}

const ROLE_WEIGHT = Object.freeze({
  viewer: 0,
  operator: 1,
});

function hasRequiredRole(role, minimumRole) {
  return (ROLE_WEIGHT[role] ?? 0) >= (ROLE_WEIGHT[minimumRole] ?? 0);
}

export function createSettingsWorkspace(documentRef, config = {}) {
  const shell = documentRef.getElementById('settings-workspace');
  const dialog = documentRef.getElementById('settings-dialog');
  const toggleButton = documentRef.getElementById('settings-toggle');
  const closeButton = documentRef.getElementById('close-settings');
  const paneButtons = Array.from(documentRef.querySelectorAll('[data-pane-target]'));
  const paneBodies = Array.from(documentRef.querySelectorAll('[data-pane-body]'));

  let lastFocused = null;
  let activeRole = config.getRole?.() || 'viewer';

  const getFocusable = () => {
    if (!dialog) return [];
    return Array.from(
      dialog.querySelectorAll(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href], [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => !el.hasAttribute('hidden') && el.getClientRects().length > 0);
  };

  const applyViewportMode = () => {
    if (!dialog) return;
    dialog.dataset.layout = isDesktopViewport(config.windowRef) ? 'sheet' : 'fullscreen';
  };

  const applyRoleGuards = (role = activeRole) => {
    activeRole = role;
    const restricted = Array.from(documentRef.querySelectorAll('[data-min-role]'));
    restricted.forEach((element) => {
      const minimumRole = element.dataset.minRole || 'viewer';
      const allowed = hasRequiredRole(role, minimumRole);
      element.disabled = !allowed;
      element.setAttribute('aria-disabled', String(!allowed));
      if (!allowed) {
        element.dataset.locked = 'true';
      } else {
        delete element.dataset.locked;
      }
    });
    config.onRoleGuardApplied?.(role);
  };

  const activatePane = (paneId, { focus = false } = {}) => {
    const target = SETTINGS_PANES.includes(paneId) ? paneId : SETTINGS_PANES[0];

    paneButtons.forEach((button) => {
      const active = button.dataset.paneTarget === target;
      button.setAttribute('aria-selected', String(active));
      button.tabIndex = active ? 0 : -1;
      if (active && focus) button.focus();
    });

    paneBodies.forEach((panel) => {
      panel.hidden = panel.dataset.paneBody !== target;
    });

    config.onPaneActivated?.(target);
  };

  const open = (requestedPane) => {
    if (!shell || !dialog) return;
    lastFocused = documentRef.activeElement;
    shell.hidden = false;
    toggleButton?.setAttribute('aria-expanded', 'true');
    applyViewportMode();

    const initialPane = requestedPane || config.getLastPane?.() || SETTINGS_PANES[0];
    activatePane(initialPane);

    const preferredFocus = dialog.querySelector('[data-autofocus]') || getFocusable()[0];
    preferredFocus?.focus();
    config.onOpened?.(initialPane);
  };

  const close = () => {
    if (!shell) return;
    shell.hidden = true;
    toggleButton?.setAttribute('aria-expanded', 'false');
    (lastFocused || toggleButton)?.focus();
    config.onClosed?.();
  };

  const onDialogKeydown = (event) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      close();
      return;
    }

    if (event.key === 'Tab') {
      const focusable = getFocusable();
      if (!focusable.length) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && documentRef.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && documentRef.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
      return;
    }

    const activeButton = documentRef.activeElement;
    if (activeButton?.dataset?.paneTarget && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      event.preventDefault();
      const current = paneButtons.indexOf(activeButton);
      const delta = event.key === 'ArrowDown' ? 1 : -1;
      const nextIndex = (current + delta + paneButtons.length) % paneButtons.length;
      const nextButton = paneButtons[nextIndex];
      const pane = nextButton.dataset.paneTarget;
      activatePane(pane, { focus: true });
    }
  };

  const bind = () => {
    toggleButton?.addEventListener('click', () => {
      if (shell?.hidden) {
        open();
      } else {
        close();
      }
    });

    closeButton?.addEventListener('click', close);

    paneButtons.forEach((button) => {
      button.addEventListener('click', () => activatePane(button.dataset.paneTarget));
    });

    dialog?.addEventListener('keydown', onDialogKeydown);

    const win = config.windowRef ?? globalThis;
    if (typeof win.addEventListener === 'function') {
      win.addEventListener('resize', applyViewportMode);
    }

    applyRoleGuards(activeRole);
  };

  return {
    bind,
    open,
    close,
    activatePane,
    isOpen: () => Boolean(shell && !shell.hidden),
    getLayoutMode: () => dialog?.dataset.layout || 'sheet',
    applyRoleGuards,
  };
}
