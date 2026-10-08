// Rendering for recommendation cards, plans and feedback controls (shared by chat and plans pages).
import { api, esc, formatDay, formatPrice, safeUrl, toast } from './common.js';
import { icon } from './icons.js';

export const RATINGS = [
  { value: 'loved', icon: 'heart', label: 'Loved it' },
  { value: 'liked', icon: 'thumbs-up', label: 'Liked it' },
  { value: 'okay', icon: 'meh', label: 'It was okay' },
  { value: 'disliked', icon: 'thumbs-down', label: "Didn't like it" },
  { value: 'never', icon: 'ban', label: 'Never recommend this again' },
];

const REASONS = [
  ['', 'Why? (optional)'],
  ['too_expensive', 'Too expensive'],
  ['too_far', 'Too far'],
  ['not_interested', 'Not interested'],
  ['already_visited', 'Already visited'],
  ['too_crowded', 'Too crowded'],
  ['wrong_time', 'Wrong time'],
  ['not_social_enough', 'Not social enough'],
  ['weather', "Weather doesn't suit me"],
];

const CATEGORY_LABELS = {
  music: 'Music', arts: 'Arts', outdoors: 'Outdoors', food_drink: 'Food & drink', sports: 'Sports', workshop: 'Workshop',
  meetup: 'Meetup', games: 'Games', culture: 'Culture', nightlife: 'Nightlife', wellness: 'Wellness', tour: 'Tour', other: 'Activity',
};

const catClass = (c) => `cat-${CATEGORY_LABELS[c.category] ? c.category : 'other'}`;

export function feedbackBar(target) {
  const attr = target.recommendationId ? `data-rec="${esc(target.recommendationId)}"` : `data-item="${esc(target.planItemId)}"`;
  return `<div class="feedback" ${attr} role="group" aria-label="Rate this">
    ${RATINGS.map((r) => `<button type="button" data-rating="${r.value}" title="${r.label}" aria-label="${r.label}" aria-pressed="false">${icon(r.icon, 'i-sm')}</button>`).join('')}
    <select class="hidden" aria-label="Reason">${REASONS.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>
  </div>`;
}

/** Event delegation for every feedback bar inside `root`. */
export function bindFeedback(root) {
  root.addEventListener('click', async (e) => {
    const btn = e.target.closest('.feedback button[data-rating]');
    if (!btn) return;
    const bar = btn.closest('.feedback');
    const rating = btn.dataset.rating;
    try {
      await sendFeedback(bar, rating, null);
      bar.querySelectorAll('button').forEach((b) => b.setAttribute('aria-pressed', String(b === btn)));
      bar.dataset.rating = rating;
      const select = bar.querySelector('select');
      select.classList.toggle('hidden', !['okay', 'disliked', 'never'].includes(rating));
      toast(rating === 'never' ? "Got it — I won't suggest this again." : 'Thanks! I’ll use this for future suggestions.');
    } catch (err) {
      toast(err.message, 'error');
    }
  });
  root.addEventListener('change', async (e) => {
    const select = e.target.closest('.feedback select');
    if (!select || !select.value) return;
    const bar = select.closest('.feedback');
    await sendFeedback(bar, bar.dataset.rating, select.value).catch((err) => toast(err.message, 'error'));
    select.disabled = true;
  });
}

function sendFeedback(bar, rating, reason) {
  return api('/feedback', {
    method: 'POST',
    body: { recommendationId: bar.dataset.rec, planItemId: bar.dataset.item, rating, reason },
  });
}

const metaItem = (name, text, cls = '') => `<span class="meta-item ${cls}">${icon(name, 'i-sm')}<span>${esc(text)}</span></span>`;

function metaItems(c, { withDate = true } = {}) {
  const out = [];
  if (withDate && c.startDate) out.push(metaItem('calendar', `${formatDay(c.startDate)}${c.startTime ? ` · ${c.startTime}` : ''}`));
  else if (c.openingHours) out.push(metaItem('clock', c.openingHours));
  if (c.venue && c.venue !== c.title) out.push(metaItem('pin', c.venue));
  if (c.distanceKm != null) out.push(metaItem('route', `${c.distanceKm} km`));
  const price = formatPrice(c);
  if (price) out.push(metaItem('wallet', price));
  if (c.social >= 7) out.push(metaItem('users', 'Meet people', 'social'));
  return out.join('');
}

function linkButtons(c, { compact = false } = {}) {
  const out = [];
  const url = safeUrl(c.url);
  const map = safeUrl(c.mapUrl);
  if (url) out.push(`<a class="btn btn-sm btn-soft" href="${esc(url)}" target="_blank" rel="noopener noreferrer">Details ${icon('external', 'i-sm')}</a>`);
  if (map) {
    out.push(compact
      ? `<a class="btn btn-sm btn-ghost" href="${esc(map)}" target="_blank" rel="noopener noreferrer" title="Open map" aria-label="Open map">${icon('map', 'i-sm')}</a>`
      : `<a class="btn btn-sm btn-ghost" href="${esc(map)}" target="_blank" rel="noopener noreferrer">${icon('map', 'i-sm')} Map</a>`);
  }
  return out.join('');
}

function sourceLine(c) {
  if (!c.source) return '';
  const checked = c.retrievedAt ? ` · checked ${new Date(c.retrievedAt).toLocaleString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}` : '';
  return `<div class="rec-source">Source: ${esc(c.source)}${checked}</div>`;
}

export function recommendationCard(rec) {
  const c = rec.candidate;
  const kind = c.kind === 'event' ? 'Event' : 'Place';
  return `<article class="rec ${catClass(c)}" data-rec-id="${esc(rec.id)}">
    <div class="rec-top">
      <div class="rec-icon">${icon(CATEGORY_LABELS[c.category] ? c.category : 'other')}</div>
      <div>
        <div class="rec-kicker">${esc(CATEGORY_LABELS[c.category] ?? 'Activity')} · ${kind}</div>
        <h3>${esc(c.title)}</h3>
      </div>
    </div>
    <div class="rec-meta">${metaItems(c)}</div>
    <p class="rec-reason">${icon('sparkles', 'i-sm')}<span class="reason">${esc(rec.reason)}</span></p>
    ${sourceLine(c)}
    <div class="rec-foot">
      <div class="rec-links">${linkButtons(c)}</div>
      ${feedbackBar({ recommendationId: rec.id })}
    </div>
  </article>`;
}

export function planDates(plan) {
  if (!plan.startDate) return '';
  return plan.startDate === plan.endDate ? formatDay(plan.startDate) : `${formatDay(plan.startDate)} – ${formatDay(plan.endDate)}`;
}

/** Gradient header for a plan. `actions` is extra HTML (buttons/pills) for the header's action row. */
export function planHeader(plan, actions = '') {
  const count = plan.items.filter((i) => i.kind !== 'break').length;
  return `<div class="plan-header">
    <h3>${esc(plan.title)}</h3>
    <div class="plan-sub">
      ${plan.startDate ? `<span>${icon('calendar', 'i-sm')}${esc(planDates(plan))}</span>` : ''}
      ${plan.locationName ? `<span>${icon('pin', 'i-sm')}${esc(plan.locationName.split(',')[0])}</span>` : ''}
      <span>${icon('sparkles', 'i-sm')}${count} ${count === 1 ? 'activity' : 'activities'}</span>
    </div>
    ${actions ? `<div class="row">${actions}</div>` : ''}
  </div>`;
}

/**
 * Timeline view of a plan (PRD §42). options.actions: replace/remove buttons; options.feedback: rating bars.
 */
export function planView(plan, { actions = false, feedback = false } = {}) {
  if (!plan.items.length) return '<p class="muted small">This plan has no activities.</p>';
  const days = new Map();
  for (const item of plan.items) {
    if (!days.has(item.day)) days.set(item.day, []);
    days.get(item.day).push(item);
  }
  return [...days.entries()].map(([day, items]) => {
    const d = new Date(`${day}T00:00:00`);
    const valid = !Number.isNaN(d.getTime());
    const weekday = valid ? d.toLocaleDateString(undefined, { weekday: 'long' }) : day;
    const date = valid ? d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : '';
    return `<div class="tl-day">${esc(weekday)} <span class="tl-date">${esc(date)}</span></div>
      <ol class="timeline">${items.map((item) => timelineItem(item, { actions, feedback })).join('')}</ol>`;
  }).join('');
}

const duration = (min) => (min >= 60 ? `${Math.floor(min / 60)}h${min % 60 ? ` ${min % 60}m` : ''}` : `${min}m`);

function timelineItem(item, { actions, feedback }) {
  const isBreak = item.kind === 'break';
  const links = isBreak ? '' : linkButtons(item, { compact: true });
  return `<li class="tl-item ${isBreak ? 'break' : catClass(item)}" data-item-id="${esc(item.id)}">
    <div class="tl-time">${esc(item.startTime ?? '')}</div>
    <div class="tl-dot"></div>
    <div class="tl-card">
      <div class="tl-title"><span>${esc(item.title)}</span>${item.durationMin && !isBreak ? `<span class="tl-duration">${duration(item.durationMin)}</span>` : ''}</div>
      ${isBreak ? '' : `<div class="rec-meta">${metaItems(item, { withDate: false })}</div>`}
      ${item.note ? `<div class="tl-note">${esc(item.note)}</div>` : ''}
      ${!isBreak && (links || actions) ? `<div class="tl-actions">
        <div class="rec-links">${links}</div>
        ${actions ? `<div class="tl-tools">
          <button type="button" class="icon-btn btn-ghost" data-action="replace" data-title="${esc(item.title)}" title="Replace with something else" aria-label="Replace ${esc(item.title)}">${icon('refresh', 'i-sm')}</button>
          <button type="button" class="icon-btn btn-ghost btn-danger" data-action="remove" title="Remove from plan" aria-label="Remove ${esc(item.title)}">${icon('trash', 'i-sm')}</button>
        </div>` : ''}
      </div>` : ''}
      ${feedback && !isBreak ? feedbackBar({ planItemId: item.id }) : ''}
    </div>
  </li>`;
}
