import { qs, toSeconds } from "./shared.mjs";

/**
 * Vimeo.
 *
 * Unlisted videos carry a hash alongside the numeric id, and Vimeo writes
 * it two different ways depending on where the link came from:
 * vimeo.com/123456/abc123 in a share link, ?h=abc123 in a player URL.
 * Both are matched, and since the engine merges the groups from every
 * pattern, whichever one is present wins.
 */
export const vimeo = {
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
    // Vimeo takes its start offset as a #t= fragment rather than a query
    // parameter, so it's appended after the query string rather than
    // going through qs().
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
};
