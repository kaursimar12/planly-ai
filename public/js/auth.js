import { api } from './common.js';
import { hydrateIcons } from './icons.js';

hydrateIcons();

const form = document.getElementById('auth-form');
const errorEl = document.getElementById('form-error');
const submit = document.getElementById('submit');
let mode = 'login';

// Already signed in? Go straight to the app.
api('/auth/me', { redirect: false })
  .then(({ onboarded }) => { location.href = onboarded ? '/app.html' : '/profile.html?welcome=1'; })
  .catch(() => {});

function setMode(next) {
  mode = next;
  const signup = mode === 'signup';
  document.getElementById('tab-login').setAttribute('aria-selected', String(!signup));
  document.getElementById('tab-signup').setAttribute('aria-selected', String(signup));
  document.getElementById('name-field').classList.toggle('hidden', !signup);
  document.getElementById('pw-hint').classList.toggle('hidden', !signup);
  document.getElementById('password').autocomplete = signup ? 'new-password' : 'current-password';
  document.getElementById('auth-title').textContent = signup ? 'Create your account' : 'Welcome back';
  document.getElementById('auth-sub').textContent = signup
    ? 'Takes 30 seconds. Then tell Planly what you enjoy.'
    : 'Log in to pick up where you left off.';
  submit.textContent = signup ? 'Create account' : 'Log in';
  errorEl.textContent = '';
}

document.getElementById('tab-login').addEventListener('click', () => setMode('login'));
document.getElementById('tab-signup').addEventListener('click', () => setMode('signup'));

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  errorEl.textContent = '';
  submit.disabled = true;
  const body = Object.fromEntries(new FormData(form));
  try {
    await api(`/auth/${mode}`, { method: 'POST', body });
    location.href = mode === 'signup' ? '/profile.html?welcome=1' : '/app.html';
  } catch (err) {
    errorEl.textContent = err.message;
  } finally {
    submit.disabled = false;
  }
});
