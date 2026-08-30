import { visit, SKIP } from "unist-util-visit";
import { toString as mdastToString } from "mdast-util-to-string";

import { embedProviders } from "./embeds/index.mjs";

/**
 * remarkEmbed
 *
 * Requires `remark-directive` to be registered BEFORE this plugin in the
 * remark pipeline (it does the actual `::` parsing into leafDirective
 * nodes - this plugin only transforms the result).
 *
 * Astro config:
 *   import remarkDirective from "remark-directive";
 *   import { remarkEmbed } from "./src/plugins/remark-embed.mjs";
 *
 *   markdown: { remarkPlugins: [remarkDirective, remarkEmbed, ...] }
 *
 * ---------------------------------------------------------------------
 * Usage
 * ---------------------------------------------------------------------
 *
 * Every embed is a LEAF directive - two colons, single line, no body:
 *
 *   ::youtube{id="dQw4w9WgXcQ"}
 *   ::youtube{#dQw4w9WgXcQ}                  <- `#` is shorthand for id
 *   ::youtube{url="https://youtu.be/dQw4w9WgXcQ?t=90"}
 *
 * The bracketed label becomes a visible <figcaption> AND the embed's
 * accessible name, so one thing does both jobs:
 *
 *   ::youtube[Kevlin Henney on why estimates fail]{#dQw4w9WgXcQ}
 *
 * If a caption would be visual noise, set the a11y name on its own:
 *
 *   ::youtube{#dQw4w9WgXcQ title="Kevlin Henney on estimates"}
 *
 * `::embed` resolves the provider from the URL, which is the form to use
 * when pasting a link you haven't looked at:
 *
 *   ::embed{url="https://vimeo.com/123456/abc123"}
 *   ::embed{provider="youtube" id="dQw4w9WgXcQ"}
 *
 * Two attributes are handled here rather than by any provider:
 *   {ratio="4 / 3"}   override the frame's aspect-ratio ("auto" to let
 *                     the content size itself)
 *   {.class-name}     extra class on the <figure>, for one-off layout
 *
 * ---------------------------------------------------------------------
 * Extending
 * ---------------------------------------------------------------------
 *
 * Add a file to src/plugins/embeds/ and list it in that directory's
 * index.mjs. Nothing in this file knows what YouTube is; it only knows how
 * to resolve a provider, turn a URL into params, and wrap whatever element
 * the provider returns. See embeds/index.mjs for the provider contract.
 *
 * ---------------------------------------------------------------------
 * Why leaf directives specifically
 * ---------------------------------------------------------------------
 *
 * remark-directive keys on colon COUNT, and the wrong count parses
 * SUCCESSFULLY as a different node type rather than erroring - so a typo
 * would otherwise render as plain text with no clue why. As in
 * remark-tabs.mjs, the mismatched kinds are caught up front with a
 * file-anchored message:
 *   :youtube{...}    1 colon  -> text directive (inline)
 *   ::youtube{...}   2 colons -> leaf directive (what this plugin wants)
 *   :::youtube{...}  3 colons -> container directive (multi-line body)
 *
 * Markup only - no styles or scripts are emitted here. The responsive
 * frame lives in src/styles/embed.scss.
 */

/** Directive names the engine owns rather than delegating to a provider. */
const GENERIC_NAME = "embed";

/**
 * Attributes consumed by the engine itself. They're still forwarded to
 * providers in `params` (a provider is free to look at `title`), but the
 * engine is the one that acts on them.
 */
const ENGINE_ATTRIBUTES = new Set(["url", "provider", "ratio", "class"]);

/**
 * A conservative shape check for an author-supplied aspect-ratio, so a
 * typo fails the build instead of emitting a broken style attribute.
 * Covers "16 / 9", "16/9", "1.5" and "auto".
 */
const RATIO_PATTERN = /^(auto|[\d.]+(\s*\/\s*[\d.]+)?)$/;

/** name/alias -> provider. Built once, with duplicate names caught early. */
const registry = new Map();
for (const provider of embedProviders) {
  if (!provider?.name || typeof provider.build !== "function") {
    throw new Error(
      `[remarkEmbed] invalid provider listed in src/plugins/embeds/index.mjs: every provider needs a "name" and a "build" function (got ${JSON.stringify(provider?.name)}).`,
    );
  }
  for (const key of [provider.name, ...(provider.aliases || [])]) {
    if (registry.has(key)) {
      throw new Error(
        `[remarkEmbed] duplicate provider name/alias "${key}" in src/plugins/embeds/ - "${registry.get(key).name}" and "${provider.name}" both claim it.`,
      );
    }
    registry.set(key, provider);
  }
}
if (registry.has(GENERIC_NAME)) {
  throw new Error(
    `[remarkEmbed] a provider claims the reserved name "${GENERIC_NAME}", which is the generic URL-dispatch directive. Rename it in src/plugins/embeds/.`,
  );
}

/** Directive names, for error messages. */
function knownNames() {
  return [...registry.keys()].sort().join(", ");
}

/**
 * Run every one of a provider's `match` patterns against the URL and merge
 * their named capture groups. All patterns are tried (not just the first
 * that hits) so one regex can own the path and another the query string;
 * first match wins per key.
 */
function paramsFromUrl(provider, url) {
  const found = {};
  for (const pattern of provider.match || []) {
    const groups = url.match(pattern)?.groups;
    if (!groups) continue;
    for (const [key, value] of Object.entries(groups)) {
      if (value !== undefined && found[key] === undefined) found[key] = value;
    }
  }
  return found;
}

/** The param a provider needs in order to render anything at all. */
function requiredParam(provider) {
  return provider.requires || "id";
}

/** First provider whose patterns can pull its required param out of `url`. */
function providerForUrl(url) {
  for (const provider of embedProviders) {
    if (!provider.match?.length) continue;
    if (paramsFromUrl(provider, url)[requiredParam(provider)] !== undefined) {
      return provider;
    }
  }
  return undefined;
}

export function remarkEmbed() {
  return (tree, file) => {
    visit(tree, (node, index, parent) => {
      const isDirective =
        node.type === "leafDirective" ||
        node.type === "containerDirective" ||
        node.type === "textDirective";
      if (!isDirective) return;

      const isGeneric = node.name === GENERIC_NAME;
      const named = registry.get(node.name);
      if (!isGeneric && !named) return;
      if (!parent || index === undefined) return;

      // --- Wrong directive kind -------------------------------------
      // Both of these parse fine as some other node type, so without an
      // explicit check the embed would silently render as prose.
      if (node.type !== "leafDirective") {
        const colons = node.type === "textDirective" ? ":" : ":::";
        const kind =
          node.type === "textDirective" ? "text" : "container";
        const hint =
          node.type === "containerDirective"
            ? ` An embed has no body; put any caption in brackets instead: \`::${node.name}[My caption]{...}\`.`
            : "";
        file.fail(
          `Unexpected \`${colons}${node.name}\` ${kind} directive - embeds are leaf directives and need exactly two colons: \`::${node.name}{...}\`.${hint}`,
          node,
        );
        return;
      }

      const attributes = node.attributes || {};

      // --- Resolve the provider -------------------------------------
      let provider = named;
      if (isGeneric) {
        if (attributes.provider) {
          provider = registry.get(attributes.provider);
          if (!provider) {
            file.fail(
              `Unknown embed provider "${attributes.provider}". Known providers: ${knownNames()}. Add a new one in src/plugins/embeds/.`,
              node,
            );
            return;
          }
        } else if (attributes.url) {
          provider = providerForUrl(attributes.url);
          if (!provider) {
            file.fail(
              `No embed provider recognises the URL "${attributes.url}". Known providers: ${knownNames()}. Either use the provider directive directly (e.g. \`::youtube{id="..."}\`) or add a matcher in src/plugins/embeds/.`,
              node,
            );
            return;
          }
        } else {
          file.fail(
            `\`::embed\` needs either a \`url\` to dispatch on or an explicit \`provider\`, e.g. \`::embed{url="https://youtu.be/..."}\` or \`::embed{provider="youtube" id="..."}\`. Known providers: ${knownNames()}.`,
            node,
          );
          return;
        }
      }

      // --- Resolve params -------------------------------------------
      // URL-derived groups first, then explicit attributes on top, so
      // `::youtube{url="..." start="30"}` lets the attribute win over a
      // timestamp already in the link.
      const params = attributes.url
        ? { ...paramsFromUrl(provider, attributes.url), ...stripUndefined(attributes) }
        : { ...stripUndefined(attributes) };

      const required = requiredParam(provider);
      if (params[required] === undefined || params[required] === "") {
        file.fail(
          attributes.url
            ? `Could not find a ${provider.label} \`${required}\` in the URL "${attributes.url}". Pass it directly instead: \`::${node.name}{${required}="..."}\`.`
            : `Missing \`${required}\` on the \`::${node.name}\` embed. Give it \`{${required}="..."}\`${required === "id" ? ` (or the shorthand \`{#...}\`)` : ""}, or a \`{url="..."}\` to pull it from.`,
          node,
        );
        return;
      }

      if (provider.idPattern && !provider.idPattern.test(params[required])) {
        file.fail(
          `"${params[required]}" doesn't look like a valid ${provider.label} ${required} (expected ${provider.idPattern}). A wrong id builds fine and fails silently in the browser, so it's rejected here.`,
          node,
        );
        return;
      }

      // --- Caption and accessible name ------------------------------
      // The label is kept as mdast so a caption can hold links and
      // emphasis; the flattened form is reused as the element's title.
      const captionChildren = node.children?.length ? node.children : undefined;
      const labelText = captionChildren ? mdastToString(node).trim() : "";
      const title = attributes.title || labelText || `${provider.label} embed`;

      if (!attributes.title && !labelText) {
        file.message(
          `\`::${node.name}\` has no caption or \`title\`, so it falls back to the generic accessible name "${title}". Screen-reader users get nothing useful from that - add \`::${node.name}[Some caption]{...}\` or \`{title="..."}\`.`,
          node,
        );
      }

      // --- Ratio ----------------------------------------------------
      const ratio = attributes.ratio || provider.aspectRatio || "16 / 9";
      if (!RATIO_PATTERN.test(String(ratio).trim())) {
        file.fail(
          `Invalid \`ratio\` "${ratio}" on \`::${node.name}\`. Expected a CSS aspect-ratio like "16 / 9" or "1.5", or "auto".`,
          node,
        );
        return;
      }
      const isAuto = String(ratio).trim() === "auto";

      // --- Build ----------------------------------------------------
      const descriptor = provider.build({ params, attributes, title });
      if (!descriptor?.hName) {
        file.fail(
          `Provider "${provider.name}" returned no element for \`::${node.name}\` - its build() must return { hName, hProperties }.`,
          node,
        );
        return;
      }

      const mediaData = {
        hName: descriptor.hName,
        hProperties: descriptor.hProperties || {},
      };
      if (descriptor.hChildren) mediaData.hChildren = descriptor.hChildren;

      const media = { type: "paragraph", data: mediaData, children: [] };

      const frame = {
        type: "paragraph",
        data: {
          hName: "div",
          hProperties: {
            className: isAuto
              ? ["embed__frame", "embed__frame--auto"]
              : ["embed__frame"],
            ...(isAuto ? {} : { style: `--embed-aspect: ${ratio}` }),
          },
        },
        children: [media],
      };

      const children = [frame];
      if (captionChildren) {
        children.push({
          type: "paragraph",
          data: {
            hName: "figcaption",
            hProperties: { className: ["embed__caption"] },
          },
          children: captionChildren,
        });
      }

      const figure = {
        type: "paragraph",
        data: {
          hName: "figure",
          hProperties: {
            className: [
              "embed",
              `embed--${provider.name}`,
              ...(attributes.class ? String(attributes.class).split(/\s+/) : []),
            ],
          },
        },
        children,
      };

      parent.children[index] = figure;
      // Nothing inside the replacement is a directive; skip re-walking it.
      return [SKIP, index + 1];
    });
  };
}

/** Drop attributes that were written bare with no value at all. */
function stripUndefined(attributes) {
  const out = {};
  for (const [key, value] of Object.entries(attributes)) {
    if (value === undefined || value === null) continue;
    if (value === "" && ENGINE_ATTRIBUTES.has(key)) continue;
    out[key] = value;
  }
  return out;
}
