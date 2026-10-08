import { api, esc, setupLogout, toast } from './common.js';
import { bindFeedback, planHeader, planView } from './components.js';
import { hydrateIcons, icon } from './icons.js';

hydrateIcons();

const root = document.getElementById('plans');

function planCard(plan) {
  const done = plan.status === 'completed';
  const pill = `<span class="pill">${icon(done ? 'check' : 'bookmark', 'i-sm')} ${done ? 'Done' : 'Saved'}</span>`;
  return `<section class="card plan-card" data-plan="${esc(plan.id)}">
    ${planHeader(plan, pill)}
    <div class="plan-card-body">
      ${done ? `<div class="rate-prompt">${icon('heart', 'i-sm')} How did it go? Rate each activity.</div>` : ''}
      ${planView(plan, { feedback: done })}
    </div>
    <div class="plan-card-foot">
      ${done ? '' : `<button type="button" class="btn-primary btn-sm" data-act="complete">${icon('check', 'i-sm')} I did this</button>`}
      ${plan.conversationId ? `<a class="btn btn-sm" href="/app.html?c=${esc(plan.conversationId)}">${icon('chat', 'i-sm')} Open chat</a>` : ''}
      <button type="button" class="btn-sm" data-act="duplicate">${icon('copy', 'i-sm')} Duplicate</button>
      <button type="button" class="btn-sm btn-ghost btn-danger" data-act="delete">${icon('trash', 'i-sm')} Delete</button>
    </div>
  </section>`;
}

async function load() {
  const { plans } = await api('/plans');
  root.innerHTML = plans.length
    ? plans.map(planCard).join('')
    : `<div class="card empty" style="grid-column:1/-1">
        <div class="empty-icon">${icon('calendar', 'i-lg')}</div>
        <h3>No saved plans yet</h3>
        <p class="small">Ask Planly to plan your weekend, then hit “Save plan”.</p>
        <a class="btn btn-soft btn-sm" href="/app.html">${icon('sparkles', 'i-sm')} Start planning</a>
      </div>`;
}

root.addEventListener('click', async (e) => {
  const btn = e.target.closest('[data-act]');
  if (!btn) return;
  const id = btn.closest('[data-plan]').dataset.plan;
  try {
    if (btn.dataset.act === 'complete') {
      await api(`/plans/${id}`, { method: 'PATCH', body: { status: 'completed' } });
      toast('Nice! Tell me how each part went.');
    } else if (btn.dataset.act === 'duplicate') {
      await api(`/plans/${id}/duplicate`, { method: 'POST' });
      toast('Plan duplicated.');
    } else if (btn.dataset.act === 'delete') {
      if (!btn.dataset.armed) {
        btn.dataset.armed = '1';
        btn.innerHTML = `${icon('alert', 'i-sm')} Click again`;
        return;
      }
      await api(`/plans/${id}`, { method: 'DELETE' });
      toast('Plan deleted.');
    }
    await load();
  } catch (err) {
    toast(err.message, 'error');
  }
});
bindFeedback(root);

setupLogout();
load().catch((err) => toast(err.message, 'error'));
