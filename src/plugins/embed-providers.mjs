/**
 * embed-providers.mjs
 *
 * The provider registry consumed by remark-embed.mjs. Adding support for a
 * new site should mean adding an entry to the array at the bottom of this
 * file - not touching the plugin itself. The engine handles directive
 * parsing, URL -> id resolution, validation, error reporting, captions,
 * a11y titles and the responsive wrapper; a provider only has to say what
 * its URLs look like and what element to emit.
 *
 * A provider is:
 *
 *   name          Directive name. `::youtube{...}` finds the provider named
 *                 "youtube". Must be unique across the registry.
 *
 *   aliases       Extra directive names for the same provider (optional).
 *
 *   label         Human-readable name, used in error messages and in the
 *                 fallback a11y title ("YouTube embed").
 *
 *   aspectRatio   Default CSS aspect-ratio for the frame, e.g. "16 / 9".
 *                 Authors override per-embed with {ratio="4 / 3"}. Use
 *                 "auto" for content that should size itself.
 *
 *   idPattern     RegExp the resolved id must satisfy (optional). Catching
 *                 a malformed id at build time beats shipping a page with a
 *                 silently broken player.
 *
 *   match         RegExps run against a pasted {url="..."}. Named capture
 *                 groups become params, so `(?<id>...)` supplies the id and
 *                 any other group (e.g. `(?<hash>...)`) rides along. EVERY
 *                 pattern is tried and the results merged (first match wins
 *                 per key), so one regex can pull the id from the path
 *                 while another pulls a token out of the query string.
 *
 *   requires      Param that must be present instead of `id`, for providers
 *                 that aren't id-based (optional; see the self-hosted
 *                 "video" provider, which wants a `src`).
 *
 *   build({ params, attributes, title })
 *                 Returns the element descriptor to render inside the
 *                 responsive frame:
 *                   { hName, hProperties, hChildren? }
 *                 `hChildren` takes raw hast children, for elements like
 *                 <video> that need <source> tags. `params` holds the
 *                 resolved id plus any named groups and explicit
 *                 attributes; `title` is the already-resolved a11y title.
 *
 * NOTE: YouTube is embedded via youtube-nocookie.com. It still contacts
 * Google when the player loads, but skips the tracking cookies set by the
 * standard domain unless the visitor actually hits play.
 */

/** Query-string builder that drops empty values and encodes the rest. */
function qs(params) {
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
function toSeconds(value) {
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
function flag(value) {
  if (value === undefined || value === null) return false;
  return !/^(false|0|no|off)$/i.test(String(value).trim());
}

const VIDEO_MIME = {
  mp4: "video/mp4",
  m4v: "video/mp4",
  webm: "video/webm",
  ogv: "video/ogg",
  ogg: "video/ogg",
  mov: "video/quicktime",
};

export const embedProviders = [
  {
    name: "youtube",
    aliases: ["yt"],
    label: "YouTube",
    aspectRatio: "16 / 9",
    idPattern: /^[A-Za-z0-9_-]{11}$/,
    match: [
      // youtube.com/watch?v=ID (with the id anywhere in the query string)
      /(?:youtube\.com|youtube-nocookie\.com)\/watch\?(?:[^#\s]*&)?v=(?<id>[A-Za-z0-9_-]{11})/,
      // /embed/ID, /shorts/ID, /live/ID, /v/ID
      /(?:youtube\.com|youtube-nocookie\.com)\/(?:embed|shorts|live|v)\/(?<id>[A-Za-z0-9_-]{11})/,
      // youtu.be/ID short links
      /youtu\.be\/(?<id>[A-Za-z0-9_-]{11})/,
      // Timestamps ride along on any of the above: ?t=90 or &start=90
      /[?&](?:t|start)=(?<start>[\dhms:]+)/,
      // Playlist context
      /[?&]list=(?<list>[A-Za-z0-9_-]+)/,
    ],
    build({ params, title }) {
      const src =
        `https://www.youtube-nocookie.com/embed/${params.id}` +
        qs({ start: toSeconds(params.start), list: params.list });

      return {
        hName: "iframe",
        hProperties: {
          src,
          title,
          loading: "lazy",
          referrerpolicy: "strict-origin-when-cross-origin",
          allow:
            "accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share",
          allowFullScreen: true,
        },
      };
    },
  },

  {
    name: "vimeo",
    aliases: [],
    label: "Vimeo",
    aspectRatio: "16 / 9",
    idPattern: /^\d+$/,
    match: [
      // vimeo.com/123456 and vimeo.com/123456/abcdef (unlisted-video hash)
      /vimeo\.com\/(?:video\/)?(?<id>\d+)(?:\/(?<hash>[A-Za-z0-9]+))?/,
      // player.vimeo.com/video/123456?h=abcdef carries the hash in the query
      /[?&]h=(?<hash>[A-Za-z0-9]+)/,
      /[?&#]t=(?<start>[\dhms:]+)/,
    ],
    build({ params, title }) {
      const seconds = toSeconds(params.start);
      const src =
        `https://player.vimeo.com/video/${params.id}` +
        qs({ h: params.hash }) +
        (seconds ? `#t=${seconds}s` : "");

      return {
        hName: "iframe",
        hProperties: {
          src,
          title,
          loading: "lazy",
          referrerpolicy: "strict-origin-when-cross-origin",
          allow: "autoplay; fullscreen; picture-in-picture; clipboard-write",
          allowFullScreen: true,
        },
      };
    },
  },

  {
    // Self-hosted clips - the case a live canvas demo can't cover, e.g. a
    // rendering bug that only exists in a build you're no longer shipping.
    // Not id-based, so it opts out of `id` via `requires` and demonstrates
    // that the registry isn't iframe-shaped by assumption.
    //
    //   ::video[Repaint flicker, pre-fix]{src="/videos/flicker.webm,/videos/flicker.mp4" poster="/videos/flicker.jpg"}
    //
    // A comma-separated `src` becomes <source> children in order, so a
    // webm can lead with an mp4 fallback behind it.
    name: "video",
    aliases: ["clip"],
    label: "Video",
    aspectRatio: "16 / 9",
    requires: "src",
    build({ params, title }) {
      const sources = String(params.src)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const hProperties = {
        title,
        controls: !("controls" in params) || flag(params.controls),
        preload: params.preload || "metadata",
        playsInline: true,
      };

      if (params.poster) hProperties.poster = params.poster;
      if (flag(params.loop)) hProperties.loop = true;
      if (flag(params.muted)) hProperties.muted = true;
      // Browsers only honour autoplay when the clip is also muted, so
      // asking for one implies the other rather than silently doing nothing.
      if (flag(params.autoplay)) {
        hProperties.autoplay = true;
        hProperties.muted = true;
      }

      // A single source goes on the element itself; multiple become
      // <source> children so the browser can pick the format it supports.
      if (sources.length === 1) {
        hProperties.src = sources[0];
        return { hName: "video", hProperties };
      }

      return {
        hName: "video",
        hProperties,
        hChildren: sources.map((src) => {
          const ext = (src.split(".").pop() || "").toLowerCase();
          return {
            type: "element",
            tagName: "source",
            properties: { src, type: VIDEO_MIME[ext] },
            children: [],
          };
        }),
      };
    },
  },
];
