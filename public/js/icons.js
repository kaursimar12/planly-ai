// Inline SVG line icons (24×24, stroke = currentColor).
const PATHS = {
  logo: '<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h10"/>',
  send: '<path d="M12 19V5M6 11l6-6 6 6"/>',
  chat: '<path d="M21 14.5a2 2 0 0 1-2 2H8l-5 4.5V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  calendar: '<rect x="3" y="4.5" width="18" height="16.5" rx="3"/><path d="M16 2.5v4M8 2.5v4M3 10h18"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  logout: '<path d="M9 21H5.5A2.5 2.5 0 0 1 3 18.5v-13A2.5 2.5 0 0 1 5.5 3H9M16 17l5-5-5-5M21 12H9"/>',
  pin: '<path d="M12 21.5s-7-6.1-7-11.8a7 7 0 0 1 14 0c0 5.7-7 11.8-7 11.8z"/><circle cx="12" cy="9.7" r="2.5"/>',
  sparkles: '<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/><path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M21.5 20a6.5 6.5 0 0 0-4-6"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="M15.8 8.2l-2.3 5.3-5.3 2.3 2.3-5.3z"/>',
  shuffle: '<path d="M16 3h5v5M4 20 21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>',
  moon: '<path d="M20.5 13.5A8.5 8.5 0 1 1 10.5 3.5a6.5 6.5 0 0 0 10 10z"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  external: '<path d="M14 4h6v6M20 4l-9 9M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10"/>',
  map: '<path d="M9 4 3 6.5v13.5l6-2.5 6 2.5 6-2.5V4l-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>',
  trash: '<path d="M4 7h16M10 11v6M14 11v6M6 7l1 12.5a1.5 1.5 0 0 0 1.5 1.5h7a1.5 1.5 0 0 0 1.5-1.5L18 7M9 7V4.5A1.5 1.5 0 0 1 10.5 3h3A1.5 1.5 0 0 1 15 4.5V7"/>',
  refresh: '<path d="M20.5 12a8.5 8.5 0 1 1-2.5-6l2.5 2.5"/><path d="M20.5 3.5v5h-5"/>',
  bookmark: '<path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-4-6 4z"/>',
  check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>',
  copy: '<rect x="8" y="8" width="13" height="13" rx="2.5"/><path d="M16 8V5.5A2.5 2.5 0 0 0 13.5 3h-8A2.5 2.5 0 0 0 3 5.5v8A2.5 2.5 0 0 0 5.5 16H8"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  heart: '<path d="M12 20.5s-7.5-4.6-9.3-9.4A5 5 0 0 1 12 6.3a5 5 0 0 1 9.3 4.8c-1.8 4.8-9.3 9.4-9.3 9.4z"/>',
  'thumbs-up': '<path d="M7 10.5V21H4.5A1.5 1.5 0 0 1 3 19.5V12a1.5 1.5 0 0 1 1.5-1.5zM7 10.5 11 3a2.2 2.2 0 0 1 3.2 2.3L13.5 9h5.3a2 2 0 0 1 2 2.4l-1.4 7.8a2.2 2.2 0 0 1-2.2 1.8H7"/>',
  'thumbs-down': '<g transform="rotate(180 12 12)"><path d="M7 10.5V21H4.5A1.5 1.5 0 0 1 3 19.5V12a1.5 1.5 0 0 1 1.5-1.5zM7 10.5 11 3a2.2 2.2 0 0 1 3.2 2.3L13.5 9h5.3a2 2 0 0 1 2 2.4l-1.4 7.8a2.2 2.2 0 0 1-2.2 1.8H7"/></g>',
  meh: '<circle cx="12" cy="12" r="9"/><path d="M8.5 15h7M9 9.5h.01M15 9.5h.01"/>',
  ban: '<circle cx="12" cy="12" r="9"/><path d="M5.7 5.7l12.6 12.6"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/>',
  wallet: '<rect x="3" y="6" width="18" height="14" rx="3"/><path d="M3 10h18M16.5 15h1"/><path d="M6 6l9-3 1.5 3"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5h.01"/>',
  alert: '<path d="M12 3.5 2.5 20h19z"/><path d="M12 10v4.5M12 17.5h.01"/>',
  brain: '<path d="M9 3.5a3 3 0 0 0-3 3 3 3 0 0 0-2.5 4.5A3 3 0 0 0 5 16.5 3.5 3.5 0 0 0 9 20.5V3.5zM15 3.5a3 3 0 0 1 3 3 3 3 0 0 1 2.5 4.5 3 3 0 0 1-1.5 5.5 3.5 3.5 0 0 1-4 4V3.5z"/>',
  sliders: '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M20 18h0"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/>',
  heartHand: '<path d="M12 20.5s-7.5-4.6-9.3-9.4A5 5 0 0 1 12 6.3a5 5 0 0 1 9.3 4.8c-1.8 4.8-9.3 9.4-9.3 9.4z"/>',
  route: '<circle cx="6" cy="19" r="2.5"/><circle cx="18" cy="5" r="2.5"/><path d="M8.5 19H16a3.5 3.5 0 0 0 0-7H8a3.5 3.5 0 0 1 0-7h7.5"/>',
  shield: '<path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6z"/>',
  // Category icons
  music: '<path d="M9 18V5.5l11-2V16"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
  arts: '<path d="M12 3a9 9 0 1 0 0 18c1.1 0 1.6-.8 1.6-1.6 0-1.2-1-1.5-1-2.5s.8-1.5 1.8-1.5H17a4 4 0 0 0 4-4c0-4.7-4-8.4-9-8.4z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10.5" cy="7" r="1"/><circle cx="15.5" cy="7.5" r="1"/>',
  outdoors: '<path d="M3 20 9.5 8.5l4 6.5 2.5-3.5L21 20z"/><circle cx="17" cy="5.5" r="1.8"/>',
  food_drink: '<path d="M4 8.5h13V13a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5zM17 9.5h1.5a2.5 2.5 0 0 1 0 5H17M8 2.5v3M12 2.5v3"/>',
  sports: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
  workshop: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="M13.5 6.5l4 4"/>',
  meetup: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M21.5 20a6.5 6.5 0 0 0-4-6"/>',
  games: '<rect x="3.5" y="3.5" width="17" height="17" rx="4"/><circle cx="8.5" cy="8.5" r="1.1"/><circle cx="15.5" cy="15.5" r="1.1"/><circle cx="15.5" cy="8.5" r="1.1"/><circle cx="8.5" cy="15.5" r="1.1"/>',
  culture: '<path d="M3 21h18M5 21v-9.5M19 21v-9.5M9.5 21v-9.5M14.5 21v-9.5M2.5 9.5 12 4l9.5 5.5z"/>',
  nightlife: '<path d="M20.5 13.5A8.5 8.5 0 1 1 10.5 3.5a6.5 6.5 0 0 0 10 10z"/>',
  wellness: '<path d="M5 20.5c0-9 6-15 15-16-1 9-7 15-15 16zM5 20.5l7.5-7.5"/>',
  tour: '<circle cx="12" cy="12" r="9"/><path d="M15.8 8.2l-2.3 5.3-5.3 2.3 2.3-5.3z"/>',
  other: '<path d="M12 3l1.8 4.7L18.5 9.5l-4.7 1.8L12 16l-1.8-4.7L5.5 9.5l4.7-1.8z"/>',
};

export function icon(name, cls = '') {
  const body = PATHS[name] ?? PATHS.other;
  return `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${body}</svg>`;
}

/** Replaces every <span data-icon="name"> in the page with its SVG. */
export function hydrateIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach((el) => {
    el.outerHTML = icon(el.dataset.icon, el.className);
  });
}
