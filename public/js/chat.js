import { api, esc, getBrowserLocation, richText, setupLogout, storage, toast } from './common.js';
import { bindFeedback, planHeader, planView, recommendationCard } from './components.js';
import { hydrateIcons, icon } from './icons.js';

const $ = (id) => document.getElementById(id);
const els = {
  home: $('home'),
  messages: $('messages'),
  scroll: $('chat-scroll'),
  input: $('input'),
  form: $('composer'),
  send: $('send'),
  convList: $('conv-list'),
  planPanel: $('plan-panel'),
  planBody: $('plan-body'),
  planToggle: $('plan-toggle'),
  planCount: $('plan-count'),
  locBtn: $('loc-btn'),
  sidebar: $('sidebar'),
  menuBtn: $('menu-btn'),
  scrim: $('scrim'),
};

let conversationId = null;
let currentPlan = null;
let busy = false;
// Precise location is only sent when the user opts in with the location button (PRD §54).
let geo = storage.get('planly.location');

// ── Startup ────────────────────────────────────────────────────────────

async function init() {
  hydrateIcons();
  setupLogout();
  const me = await api('/auth/me');
  if (!me.onboarded) {
    location.href = '/profile.html?welcome=1';
    return;
  }
  const hour = new Date().getHours();
  const part = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  $('greeting').textContent = `${part}${me.user.name ? `, ${me.user.name}` : ''}`;

  const { profile } = await api('/profile');
  $('home-location').textContent = profile.locationName
    ? `Planning around ${profile.locationName.split(',')[0]}`
    : 'No home city yet: set one in Profile or use your location';
  updateLocButton();
  renderPlan(null);
  if (window.matchMedia('(max-width: 640px)').matches) els.input.placeholder = 'Ask Planly anything…';

  await loadConversations();
  const fromUrl = new URLSearchParams(location.search).get('c');
  if (fromUrl) await openConversation(fromUrl).catch(() => resetChat());
  if (window.matchMedia('(min-width: 861px)').matches) els.input.focus();
}

// ── Drawers (sidebar on mobile, plan on tablet/mobile) ─────────────────

function closeDrawers() {
  els.sidebar.classList.remove('open');
  els.planPanel.classList.remove('open');
  els.scrim.classList.remove('show');
  els.menuBtn.setAttribute('aria-expanded', 'false');
  els.planToggle.setAttribute('aria-expanded', 'false');
}

function openDrawer(which) {
  closeDrawers();
  const panel = which === 'sidebar' ? els.sidebar : els.planPanel;
  panel.classList.add('open');
  els.scrim.classList.add('show');
  (which === 'sidebar' ? els.menuBtn : els.planToggle).setAttribute('aria-expanded', 'true');
}

els.menuBtn.addEventListener('click', () => openDrawer('sidebar'));
els.planToggle.addEventListener('click', () => openDrawer('plan'));
$('sidebar-close').addEventListener('click', closeDrawers);
$('plan-close').addEventListener('click', closeDrawers);
els.scrim.addEventListener('click', closeDrawers);
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawers(); });

// ── Conversations ──────────────────────────────────────────────────────

async function loadConversations() {
  const { conversations } = await api('/conversations');
  els.convList.innerHTML = conversations
    .map((c) => `<li class="${c.id === conversationId ? 'active' : ''}">
      <a href="?c=${esc(c.id)}" data-id="${esc(c.id)}">${icon('chat', 'i-sm')}<span>${esc(c.title ?? 'New chat')}</span></a>
      <button type="button" class="del" data-del="${esc(c.id)}" aria-label="Delete conversation" title="Delete">${icon('trash', 'i-sm')}</button>
    </li>`)
    .join('') || '<li class="conv-empty">Your chats will appear here.</li>';
}

async function openConversation(id) {
  const { messages, plan } = await api(`/conversations/${id}`);
  conversationId = id;
  history.replaceState(null, '', `?c=${id}`);
  els.messages.innerHTML = '';
  for (const m of messages) {
    if (m.role === 'user') appendUser(m.content);
    else renderAssistant(appendAssistantShell(), { message: m.content, ...(m.data ?? {}) });
  }
  els.home.classList.toggle('hidden', messages.length > 0);
  renderPlan(plan);
  await loadConversations();
  scrollDown(false);
}

function resetChat() {
  conversationId = null;
  history.replaceState(null, '', '/app.html');
  els.messages.innerHTML = '';
  els.home.classList.remove('hidden');
  renderPlan(null);
  loadConversations();
}

els.convList.addEventListener('click', async (e) => {
  const del = e.target.closest('[data-del]');
  const link = e.target.closest('a[data-id]');
  if (del) {
    await api(`/conversations/${del.dataset.del}`, { method: 'DELETE' }).catch((err) => toast(err.message, 'error'));
    if (del.dataset.del === conversationId) resetChat();
    else loadConversations();
  } else if (link) {
    e.preventDefault();
    closeDrawers();
    if (!busy) await openConversation(link.dataset.id).catch((err) => toast(err.message, 'error'));
  }
});

$('new-chat').addEventListener('click', () => {
  if (busy) return;
  closeDrawers();
  resetChat();
  els.input.focus();
});

// ── Messages ───────────────────────────────────────────────────────────

function scrollDown(smooth = true) {
  els.scroll.scrollTo({ top: els.scroll.scrollHeight, behavior: smooth ? 'smooth' : 'auto' });
}

function appendUser(text) {
  const el = document.createElement('div');
  el.className = 'msg msg-user';
  el.textContent = text;
  els.messages.append(el);
}

function appendAssistantShell() {
  const el = document.createElement('div');
  el.className = 'msg msg-assistant';
  el.innerHTML = `<div class="avatar">${icon('logo')}</div>
    <div class="msg-body">
      <div class="bubble">
        <div class="msg-text hidden"></div>
        <div class="status-line"><span class="typing"><span></span><span></span><span></span></span><span class="status-text">Thinking…</span></div>
      </div>
    </div>`;
  els.messages.append(el);
  return el;
}

function renderAssistant(el, result) {
  const recs = result.recommendations ?? [];
  const warnings = result.warnings ?? [];
  const confirm = result.confirm;
  el.querySelector('.msg-body').innerHTML = `
    <div class="bubble">
      ${richText(result.message)}
      ${warnings.length ? `<div class="notice">${icon('info', 'i-sm')}<div>${warnings.map(esc).join('<br>')}</div></div>` : ''}
      ${confirm ? `<div class="confirm-card" data-key="${esc(confirm.key)}" data-sentiment="${esc(confirm.sentiment)}">
        <p>It sounds like your preference may have changed. Update your profile to say you <strong>${confirm.sentiment === 'like' ? 'like' : "don't like"} ${esc(confirm.subject)}</strong>?</p>
        <div class="row"><button type="button" class="btn-primary btn-sm" data-confirm="yes">${icon('check', 'i-sm')} Yes, update my profile</button>
        <button type="button" class="btn-sm" data-confirm="no">No, just this time</button></div>
      </div>` : ''}
    </div>
    ${recs.length ? `<div class="recs">${recs.map(recommendationCard).join('')}</div>` : ''}
    ${result.quickReplies?.length ? `<div class="chips">${result.quickReplies.map((q) => `<button type="button" class="chip-btn" data-reply="${esc(q)}">${esc(q)}</button>`).join('')}</div>` : ''}`;
}

els.messages.addEventListener('click', async (e) => {
  const reply = e.target.closest('[data-reply]');
  if (reply) return send(reply.dataset.reply);

  const confirmBtn = e.target.closest('[data-confirm]');
  if (confirmBtn) {
    const card = confirmBtn.closest('.confirm-card');
    if (confirmBtn.dataset.confirm === 'yes') {
      try {
        await api('/preferences/confirm', { method: 'POST', body: { key: card.dataset.key, sentiment: card.dataset.sentiment } });
        card.innerHTML = '<p>Done — your profile is updated.</p>';
      } catch (err) {
        toast(err.message, 'error');
      }
    } else {
      card.innerHTML = '<p>Okay, I’ll treat that as a one-off.</p>';
    }
  }
});
bindFeedback(els.messages);

async function send(text) {
  text = text.trim();
  if (!text || busy) return;
  busy = true;
  els.send.disabled = true;
  els.home.classList.add('hidden');
  els.input.value = '';
  autosize();

  try {
    if (!conversationId) {
      const { conversation } = await api('/conversations', { method: 'POST' });
      conversationId = conversation.id;
      history.replaceState(null, '', `?c=${conversationId}`);
    }
    appendUser(text);
    const shell = appendAssistantShell();
    scrollDown();
    await streamReply(text, shell);
  } catch (err) {
    toast(err.message, 'error');
  } finally {
    busy = false;
    els.send.disabled = false;
    scrollDown();
    loadConversations();
  }
}

async function streamReply(text, shell) {
  const res = await fetch(`/api/conversations/${conversationId}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, location: geo, timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
  });
  if (res.status === 401) {
    location.href = '/';
    return;
  }
  if (!res.ok || !res.body) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || `Request failed (${res.status})`);
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let idx;
    while ((idx = buffer.indexOf('\n\n')) !== -1) {
      const block = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 2);
      const event = block.match(/^event: (.*)$/m)?.[1];
      const data = block.match(/^data: (.*)$/m)?.[1];
      if (event && data) handleEvent(event, JSON.parse(data), shell);
    }
  }
}

function handleEvent(event, data, shell) {
  const statusText = shell.querySelector('.status-text');
  const msgText = shell.querySelector('.msg-text');
  if (event === 'status') {
    if (statusText) statusText.textContent = data.text;
  } else if (event === 'reset') {
    // The answer is being revised (e.g. options were too far); clear the first draft.
    if (msgText) {
      msgText.textContent = '';
      msgText.classList.add('hidden');
    }
  } else if (event === 'delta') {
    // The LLM's reply streams in while it finishes the recommendations.
    if (msgText) {
      msgText.classList.remove('hidden');
      msgText.textContent += data.text;
      if (statusText) statusText.textContent = 'Putting together recommendations…';
    }
  } else if (event === 'result') {
    renderAssistant(shell, data);
    if (data.plan) {
      renderPlan(data.plan);
      if (window.matchMedia('(max-width: 1200px)').matches) toast('Your plan is ready: tap “Plan” to view it.');
    }
  } else if (event === 'error') {
    shell.querySelector('.msg-body').innerHTML = `<div class="bubble"><p>Sorry, something went wrong.</p><div class="notice error">${icon('alert', 'i-sm')}<div>${esc(data.message)}</div></div></div>`;
  }
  scrollDown();
}

// ── Plan panel ─────────────────────────────────────────────────────────

function renderPlan(plan) {
  currentPlan = plan;
  const activities = plan ? plan.items.filter((i) => i.kind !== 'break').length : 0;
  els.planCount.textContent = String(activities);
  els.planCount.classList.toggle('hidden', !activities);

  if (!plan) {
    els.planBody.innerHTML = `<div class="empty">
      <div class="empty-icon">${icon('route', 'i-lg')}</div>
      <h3>No plan yet</h3>
      <p class="small">Ask for a weekend or day plan and your itinerary will show up here.</p>
      <button type="button" class="btn-soft btn-sm" data-action="ask-plan">${icon('calendar', 'i-sm')} Plan my weekend</button>
    </div>`;
    return;
  }
  const action = plan.status === 'draft'
    ? `<button type="button" class="btn-sm btn-save" data-action="save-plan">${icon('bookmark', 'i-sm')} Save plan</button>`
    : `<span class="pill">${icon('check', 'i-sm')} ${esc(plan.status)}</span>`;
  els.planBody.innerHTML = `${planHeader(plan, action)}${planView(plan, { actions: true })}`;
}

els.planPanel.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;
  try {
    if (action === 'ask-plan') {
      closeDrawers();
      send('Plan my weekend.');
    } else if (!currentPlan) {
      return;
    } else if (action === 'save-plan') {
      const { plan } = await api(`/plans/${currentPlan.id}`, { method: 'PATCH', body: { status: 'saved' } });
      renderPlan(plan);
      toast('Plan saved. Find it under Plans.');
    } else if (action === 'remove') {
      const itemId = btn.closest('[data-item-id]').dataset.itemId;
      const { plan } = await api(`/plans/${currentPlan.id}/items/${itemId}`, { method: 'DELETE' });
      renderPlan(plan);
    } else if (action === 'replace') {
      closeDrawers();
      send(`Replace "${btn.dataset.title}" in my plan with something else.`);
    }
  } catch (err) {
    toast(err.message, 'error');
  }
});

// ── Composer & location ────────────────────────────────────────────────

function autosize() {
  els.input.style.height = 'auto';
  els.input.style.height = `${Math.min(els.input.scrollHeight, 180)}px`;
}

els.input.addEventListener('input', autosize);
els.input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    send(els.input.value);
  }
});
els.form.addEventListener('submit', (e) => {
  e.preventDefault();
  send(els.input.value);
});
document.querySelectorAll('[data-prompt]').forEach((b) => b.addEventListener('click', () => send(b.dataset.prompt)));

function updateLocButton() {
  els.locBtn.setAttribute('aria-pressed', String(Boolean(geo)));
  els.locBtn.title = geo ? 'Using your current location (click to stop)' : 'Use my current location';
}

els.locBtn.addEventListener('click', async () => {
  if (geo) {
    geo = null;
    storage.remove('planly.location');
    toast('Using your profile location again.');
  } else {
    try {
      geo = await getBrowserLocation();
      storage.set('planly.location', geo);
      toast('Using your current location.');
    } catch (err) {
      toast(err.message, 'error');
    }
  }
  updateLocButton();
});

init().catch((err) => toast(err.message, 'error'));
