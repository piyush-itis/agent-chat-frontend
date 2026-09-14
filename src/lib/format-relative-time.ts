const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

export function formatRelativeTime(value: Date | string | number, now = Date.now()): string {
  const then = value instanceof Date ? value.getTime() : new Date(value).getTime();
  if (Number.isNaN(then)) return "";

  const diffSec = Math.round((then - now) / 1000);
  const abs = Math.abs(diffSec);
  const sign = diffSec >= 0 ? 1 : -1;
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "always" });

  if (abs < 45) return "just now";
  if (abs < HOUR) return rtf.format(sign * Math.round(abs / MINUTE), "minute");
  if (abs < 36 * HOUR) return rtf.format(sign * Math.round(abs / HOUR), "hour");
  if (abs < WEEK) return rtf.format(sign * Math.round(abs / DAY), "day");
  if (abs < MONTH) return rtf.format(sign * Math.round(abs / WEEK), "week");
  if (abs < YEAR) return rtf.format(sign * Math.round(abs / MONTH), "month");
  return rtf.format(sign * Math.round(abs / YEAR), "year");
}
