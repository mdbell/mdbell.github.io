/**
 * shared.mjs
 *
 * Helpers used by more than one embed provider. Anything only one site
 * needs belongs in that site's own file instead - this is for the parsing
 * chores that keep coming up (query strings, timestamps, boolean-ish
 * directive attributes), not a dumping ground.
 */

/**
 * Query-string builder that drops empty values and encodes the rest, so a
 * provider can hand over a params object without first pruning the keys it
 * didn't end up with.
 */
export function qs(params) {
  const pairs = Object.entries(params)
    .filter(([, v]) => v !== undefined && v !== null && v !== "")
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
  return pairs.length ? `?${pairs.join("&")}` : "";
}

/**
 * Accepts the timestamp shapes people actually paste - "90", "1m30s",
 * "1:30", "1:02:03" - and normalises to whole seconds. Returns undefined
 * for anything unrecognised so the caller just omits the parameter rather
 * than emitting `start=NaN`.
 */
export function toSeconds(value) {
  if (value === undefined) return undefined;
  const raw = String(value).trim();
  if (/^\d+$/.test(raw)) return Number(raw);

  const clock = raw.match(/^(?:(\d+):)?(\d+):(\d{1,2})$/);
  if (clock) {
    const [, h = "0", m, s] = clock;
    return Number(h) * 3600 + Number(m) * 60 + Number(s);
  }

  const units = raw.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i);
  if (units && (units[1] || units[2] || units[3])) {
    const [, h = 0, m = 0, s = 0] = units;
    return Number(h) * 3600 + Number(m) * 60 + Number(s);
  }

  return undefined;
}

/**
 * Directive attributes are strings, and a bare `{loop}` arrives as "".
 * Treat presence as true, but let an explicit "false"/"0"/"no" turn it off
 * so `{controls="false"}` does what it looks like it does.
 */
export function flag(value) {
  if (value === undefined || value === null) return false;
  return !/^(false|0|no|off)$/i.test(String(value).trim());
}
