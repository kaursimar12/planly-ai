import { api, esc, getBrowserLocation, setupLogout, toast } from './common.js';
import { hydrateIcons, icon } from './icons.js';

hydrateIcons();

const $ = (id) => document.getElementById(id);
const getRadio = (name) => document.querySelector(`input[name="${name}"]:checked`)?.value || null;
const setRadio = (name, value) => {
  const match = document.querySelector(`input[name="${name}"][value="${value ?? ''}"]`) ?? document.querySelector(`input[name="${name}"][value=""]`);
  match.checked = true;
};
const welcome = new URLSearchParams(location.search).has('welcome');
const lists = { interests: [], hobbies: [], dislikes: [] };
let coords = null; // set only when the user taps "Use current"

// ── Chip inputs ────────────────────────────────────────────────────────

function renderChips(name) {
  const box = document.querySelector(`[data-list="${name}"]`);
  const input = box.querySelector('input');
  box.querySelectorAll('.chip').forEach((c) => c.remove());
  const neg = box.hasAttribute('data-neg');
  for (const [i, value] of lists[name].entries()) {
    const chip = document.createElement('span');
    chip.className = `chip${neg ? ' neg' : ''}`;
    chip.innerHTML = `${esc(value)}<button type="button" aria-label="Remove ${esc(value)}" data-i="${i}">${icon('x', 'i-sm')}</button>`;
    box.insertBefore(chip, input);
  }
}

function addChips(name, raw) {
  for (const part of raw.split(',')) {
    const v = part.trim();
    if (v && !lists[name].some((x) => x.toLowerCase() === v.toLowerCase())) lists[name].push(v);
  }
  renderChips(name);
}

document.querySelectorAll('.chip-input').forEach((box) => {
  const name = box.dataset.list;
  const input = box.querySelector('input');
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addChips(name, input.value);
      input.value = '';
    } else if (e.key === 'Backspace' && !input.value && lists[name].length) {
      lists[name].pop();
      renderChips(name);
    }
  });
  input.addEventListener('blur', () => {
    if (input.value.trim()) {
      addChips(name, input.value);
      input.value = '';
    }
  });
  box.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-i]');
    if (btn) {
      lists[name].splice(Number(btn.dataset.i), 1);
      renderChips(name);
    } else {
      input.focus();
    }
  });
});

// ── Profile form ───────────────────────────────────────────────────────

function fill(profile) {
  for (const name of Object.keys(lists)) {
    lists[name] = [...(profile[name] ?? [])];
    renderChips(name);
  }
  $('meetNewPeople').checked = profile.meetNewPeople;
  setRadio('groupSize', profile.groupSize === 'any' ? '' : profile.groupSize);
  setRadio('activityIntensity', profile.activityIntensity);
  $('budgetMin').value = profile.budgetMin ?? '';
  $('budgetMax').value = profile.budgetMax ?? '';
  $('currency').value = profile.currency ?? 'INR';
  $('maxDistanceKm').value = profile.maxDistanceKm ?? 25;
  $('locationName').value = profile.locationName ?? '';
  coords = null;
}

$('use-location').addEventListener('click', async () => {
  try {
    coords = await getBrowserLocation();
    $('locationName').value = 'Current location';
    toast('Location captured. Save to apply.');
  } catch (err) {
    toast(err.message, 'error');
  }
});
$('locationName').addEventListener('input', () => { coords = null; });

$('profile-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  document.querySelectorAll('.chip-input input').forEach((i) => i.dispatchEvent(new Event('blur')));
  const save = $('save');
  save.disabled = true;
  try {
    const { profile } = await api('/profile', {
      method: 'PUT',
      body: {
        ...lists,
        meetNewPeople: $('meetNewPeople').checked,
        groupSize: getRadio('groupSize'),
        activityIntensity: getRadio('activityIntensity'),
        budgetMin: $('budgetMin').value,
        budgetMax: $('budgetMax').value,
        currency: $('currency').value,
        maxDistanceKm: $('maxDistanceKm').value,
        locationName: $('locationName').value,
        ...(coords ?? {}),
      },
    });
    fill(profile);
    if (welcome) {
      location.href = '/app.html';
      return;
    }
    toast('Preferences saved.');
    loadMemories();
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    save.disabled = false;
  }
});

// ── Memory transparency ────────────────────────────────────────────────

const prettyKey = (key) => {
  if (key.startsWith('category:')) return `${key.slice(9).replace(/_/g, ' ')} activities`;
  if (key.startsWith('never:')) return `“${key.slice(6)}”`;
  return key;
};

function describePref(p) {
  if (p.key.startsWith('never:')) return `Never recommend ${prettyKey(p.key)}`;
  return `You ${p.weight > 0 ? 'enjoy' : "don't enjoy"} ${prettyKey(p.key)}`;
}

const confidenceBar = (c) => `<span class="confidence" title="Confidence ${Math.round(c * 100)}%"><span style="width:${Math.round(c * 100)}%"></span></span>`;
const removeBtn = (attr) => `<span class="mem-actions"><button type="button" ${attr} aria-label="Remove" title="Remove">${icon('trash', 'i-sm')}</button></span>`;

async function loadMemories() {
  const { told, learned, memories } = await api('/memories');
  $('told').innerHTML = told.length
    ? told.map((p) => `<li data-pref="${esc(p.id)}"><span class="text">${esc(describePref(p))}${p.kind === 'stated' ? `<span class="tag">from chat</span>${confidenceBar(p.confidence)}` : ''}</span>
        ${removeBtn('data-del-pref')}</li>`).join('')
    : '<li class="muted">Nothing yet. Add interests on the left.</li>';
  $('learned').innerHTML = learned.length
    ? learned.map((p) => `<li data-pref="${esc(p.id)}"><span class="text">${esc(describePref(p))}${confidenceBar(p.confidence)}</span>
        ${removeBtn('data-del-pref')}</li>`).join('')
    : '<li class="muted">Rate suggestions and patterns will show up here.</li>';
  $('memories').innerHTML = memories.length
    ? memories.map((m) => `<li data-mem="${esc(m.id)}"><span class="text">${esc(m.text)}</span>
        <span class="mem-actions"><button type="button" data-edit-mem aria-label="Edit" title="Edit">${icon('edit', 'i-sm')}</button>
        <button type="button" data-del-mem aria-label="Delete" title="Delete">${icon('trash', 'i-sm')}</button></span></li>`).join('')
    : '<li class="muted">Useful things you mention in chat are saved here.</li>';
}

document.querySelector('main').addEventListener('click', async (e) => {
  const prefLi = e.target.closest('[data-pref]');
  const memLi = e.target.closest('[data-mem]');
  try {
    if (e.target.closest('[data-del-pref]')) {
      await api(`/preferences/${prefLi.dataset.pref}`, { method: 'DELETE' });
      prefLi.remove();
      // Removing a profile-based preference should also update the form lists.
      fill((await api('/profile')).profile);
    } else if (e.target.closest('[data-del-mem]')) {
      await api(`/memories/${memLi.dataset.mem}`, { method: 'DELETE' });
      memLi.remove();
    } else if (e.target.closest('[data-edit-mem]')) {
      const span = memLi.querySelector('.text');
      if (memLi.querySelector('input')) return;
      const input = document.createElement('input');
      input.value = span.textContent;
      span.replaceChildren(input);
      input.focus();
      const btn = e.target.closest('[data-edit-mem]');
      btn.innerHTML = icon('check', 'i-sm');
      btn.title = 'Save';
      btn.removeAttribute('data-edit-mem');
      btn.setAttribute('data-save-mem', '');
    } else if (e.target.closest('[data-save-mem]')) {
      const { memory } = await api(`/memories/${memLi.dataset.mem}`, { method: 'PUT', body: { text: memLi.querySelector('input').value } });
      memLi.querySelector('.text').textContent = memory.text;
      const btn = e.target.closest('[data-save-mem]');
      btn.innerHTML = icon('edit', 'i-sm');
      btn.title = 'Edit';
      btn.removeAttribute('data-save-mem');
      btn.setAttribute('data-edit-mem', '');
    }
  } catch (err) {
    toast(err.message, 'error');
  }
});

// Two-step delete instead of a browser confirm() dialog.
const deleteBtn = $('delete-account');
deleteBtn.addEventListener('click', async () => {
  if (!deleteBtn.dataset.armed) {
    deleteBtn.dataset.armed = '1';
    deleteBtn.innerHTML = `${icon('alert', 'i-sm')}Click again to permanently delete`;
    setTimeout(() => {
      delete deleteBtn.dataset.armed;
      deleteBtn.innerHTML = `${icon('trash', 'i-sm')}Delete my account`;
    }, 5000);
    return;
  }
  try {
    await api('/auth/account', { method: 'DELETE' });
    location.href = '/';
  } catch (err) {
    toast(err.message, 'error');
  }
});

async function init() {
  setupLogout();
  if (welcome) $('welcome').classList.remove('hidden');
  const { profile } = await api('/profile');
  fill(profile);
  await loadMemories();
}

init().catch((err) => toast(err.message, 'error'));
