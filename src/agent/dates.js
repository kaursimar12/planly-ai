const pad = (n) => String(n).padStart(2, '0');

export const isoDate = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const weekdayName = (d) => d.toLocaleDateString('en-US', { weekday: 'long' });

function validTimeZone(timeZone) {
  try {
    if (timeZone) {
      new Intl.DateTimeFormat('en-US', { timeZone });
      return timeZone;
    }
  } catch {
    // fall through to the server's zone
  }
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** The current date, time and weekday in the user's time zone (falls back to the server's). */
export function localNow({ timeZone, now = new Date() } = {}) {
  const tz = validTimeZone(timeZone);
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'long', hourCycle: 'h23',
    }).formatToParts(now).map((p) => [p.type, p.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}`, weekday: parts.weekday, timeZone: tz };
}
