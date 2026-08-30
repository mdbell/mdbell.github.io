import { qs, toSeconds } from "./shared.mjs";

/**
 * YouTube.
 *
 * Embedded via youtube-nocookie.com. It still contacts Google when the
 * player loads, but skips the tracking cookies the standard domain sets
 * unless the visitor actually hits play.
 *
 * Recognises watch links, youtu.be short links, /embed/, /shorts/, /live/
 * and /v/, and picks up `?t=` / `&start=` timestamps and `&list=`
 * playlists from whichever of those the URL happens to be.
 */
export const youtube = {
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
};
