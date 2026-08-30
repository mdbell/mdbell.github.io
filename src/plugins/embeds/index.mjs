/**
 * src/plugins/embeds/
 *
 * The provider registry consumed by remark-embed.mjs. One file per site,
 * aggregated here. Adding support for somewhere new means adding a file
 * next to these and one line to the array at the bottom - the plugin
 * itself never changes.
 *
 * The engine handles directive parsing, URL -> id resolution, validation,
 * error reporting, captions, a11y titles and the responsive wrapper. A
 * provider only has to say what its URLs look like and what element to
 * emit.
 *
 * ---------------------------------------------------------------------
 * The provider contract
 * ---------------------------------------------------------------------
 *
 *   name          Directive name. `::youtube{...}` finds the provider
 *                 named "youtube". Must be unique across the registry.
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
 *                 a malformed id at build time beats shipping a page with
 *                 a silently broken player.
 *
 *   match         RegExps run against a pasted {url="..."}. Named capture
 *                 groups become params, so `(?<id>...)` supplies the id
 *                 and any other group (e.g. `(?<hash>...)`) rides along.
 *                 EVERY pattern is tried and the results merged (first
 *                 match wins per key), so one regex can pull the id from
 *                 the path while another pulls a token out of the query
 *                 string. A provider with no `match` can still be used by
 *                 name - it just can't be reached by `::embed{url="..."}`.
 *
 *   requires      Param that must be present instead of `id`, for
 *                 providers that aren't id-based (optional; see video.mjs,
 *                 which wants a `src`).
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
 * ---------------------------------------------------------------------
 * Adding a provider
 * ---------------------------------------------------------------------
 *
 * 1. Copy the shape of youtube.mjs into ./<site>.mjs.
 * 2. Import it below and add it to `embedProviders`.
 *
 * Shared parsing helpers (query strings, timestamps, boolean-ish
 * attributes) live in ./shared.mjs. Anything only one site needs stays in
 * that site's file.
 *
 * ORDER MATTERS for `::embed{url="..."}` only: the engine dispatches to
 * the first provider whose patterns can pull its required param out of the
 * URL. Keep providers with broad matchers last so they can't shadow a more
 * specific one.
 */

import { youtube } from "./youtube.mjs";
import { vimeo } from "./vimeo.mjs";
import { video } from "./video.mjs";

export const embedProviders = [youtube, vimeo, video];
