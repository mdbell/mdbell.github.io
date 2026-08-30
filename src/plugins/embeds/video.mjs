import { flag } from "./shared.mjs";

const VIDEO_MIME = {
  mp4: "video/mp4",
  m4v: "video/mp4",
  webm: "video/webm",
  ogv: "video/ogg",
  ogg: "video/ogg",
  mov: "video/quicktime",
};

/**
 * Self-hosted clips - the case a live canvas demo can't cover, e.g. a
 * rendering bug that only exists in a build you're no longer shipping.
 *
 *   ::video[Repaint flicker, pre-fix]{src="/videos/flicker.webm,/videos/flicker.mp4" poster="/videos/flicker.jpg"}
 *
 * Not id-based, so it opts out of `id` via `requires` - which is also what
 * keeps the registry honest about not being iframe-shaped by assumption.
 * A comma-separated `src` becomes <source> children in order, so a webm
 * can lead with an mp4 fallback behind it.
 */
export const video = {
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
    // Browsers only honour autoplay when the clip is also muted, so asking
    // for one implies the other rather than silently doing nothing.
    if (flag(params.autoplay)) {
      hProperties.autoplay = true;
      hProperties.muted = true;
    }

    // A single source goes on the element itself; multiple become <source>
    // children so the browser can pick the format it supports.
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
};
