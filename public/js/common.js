// Shared helpers for all pages.

// A 401 means the session is gone, so send the user to the login page. Wrong-password errors on login/signup
// are also 401s, and the login page itself checks /auth/me, so those pass redirect: false or are skipped here.
const NO_REDIRECT = ['/auth/login', '/auth/signup'];

export async function api(path, { method = 'GET', body, redirect = true } = {}) {
  const init = { method, headers: {} };
  if (method !== 'GET') {
    init.headers['Content-Type'] = 'application/json';
    init.body = JSON.stringify(body ?? {});
  }
  const res = await fetch(`/api${path}`, init);
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && redirect && !NO_REDIRECT.includes(path)) {
    location.href = '/';
    throw new Error('Not signed in');
  }
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

const ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ESCAPES[c]);

/** Escaped text with **bold** and paragraphs. */
export function richText(s) {
  return esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .split(/\n{2,}/)
    .map((p) => `<p>${p.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

/** Only allow http(s) links from external data. */
export function safeUrl(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.href : null;
  } catch {
    return null;
  }
}

let toastTimer;
export function toast(message, kind = 'info') {
  document.querySelector('.toast')?.remove();
  const el = document.createElement('div');
  el.className = `toast${kind === 'error' ? ' error' : ''}`;
  el.setAttribute('role', kind === 'error' ? 'alert' : 'status');
  el.textContent = message;
  document.body.append(el);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.remove(), 3500);
}

/**
 * In-app confirmation dialog (no browser confirm()). Resolves true if confirmed.
 * Closes on Cancel, Esc or a click outside; focus moves to the safe (cancel) button.
 */
export function confirmDialog({ title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', danger = false, icon = '' }) {
  return new Promise((resolve) => {
    const previous = document.activeElement;
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `<div class="modal" role="alertdialog" aria-modal="true" aria-labelledby="modal-title" aria-describedby="modal-text">
      ${icon ? `<div class="modal-icon${danger ? ' danger' : ''}">${icon}</div>` : ''}
      <h2 id="modal-title">${esc(title)}</h2>
      <p id="modal-text">${esc(message)}</p>
      <div class="modal-actions">
        <button type="button" data-answer="no">${esc(cancelLabel)}</button>
        <button type="button" class="${danger ? 'btn-danger-solid' : 'btn-primary'}" data-answer="yes">${esc(confirmLabel)}</button>
      </div>
    </div>`;

    const close = (answer) => {
      document.removeEventListener('keydown', onKey);
      overlay.classList.remove('show');
      setTimeout(() => overlay.remove(), 150);
      previous?.focus?.();
      resolve(answer);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') close(false);
      if (e.key === 'Tab') {
        // Keep focus inside the dialog.
        const buttons = [...overlay.querySelectorAll('button')];
        const i = buttons.indexOf(document.activeElement);
        e.preventDefault();
        buttons[(i + (e.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus();
      }
    };

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) return close(false);
      const btn = e.target.closest('[data-answer]');
      if (btn) close(btn.dataset.answer === 'yes');
    });
    document.addEventListener('keydown', onKey);
    document.body.append(overlay);
    requestAnimationFrame(() => overlay.classList.add('show'));
    overlay.querySelector('[data-answer="no"]').focus();
  });
}

const LOGOUT_ICON = '<svg class="i i-lg" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 21H5.5A2.5 2.5 0 0 1 3 18.5v-13A2.5 2.5 0 0 1 5.5 3H9M16 17l5-5-5-5M21 12H9"/></svg>';

export function setupLogout() {
  document.getElementById('logout')?.addEventListener('click', async () => {
    const ok = await confirmDialog({
      title: 'Log out of Planly?',
      message: "You'll need to sign in again to see your chats and plans.",
      confirmLabel: 'Log out',
      cancelLabel: 'Stay signed in',
      icon: LOGOUT_ICON,
    });
    if (!ok) return;
    await api('/auth/logout', { method: 'POST' }).catch(() => {});
    location.href = '/';
  });
}

export const storage = {
  get(key) {
    try { return JSON.parse(localStorage.getItem(key)); } catch { return null; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* storage unavailable */ }
  },
  remove(key) {
    try { localStorage.removeItem(key); } catch { /* storage unavailable */ }
  },
};

export function getBrowserLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Location is not supported by this browser.'));
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => reject(new Error('Location permission was denied.')),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  });
}

export function formatDay(iso) {
  const d = new Date(`${iso}T00:00:00`);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });
}

export function formatPrice(item) {
  if (item.priceText) return item.priceText;
  if (item.price === 0) return 'Free';
  if (item.price != null) return `~${item.price}`;
  return null;
}
