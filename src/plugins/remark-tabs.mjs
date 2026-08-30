import { visit } from "unist-util-visit";
import { toString as mdastToString } from "mdast-util-to-string";

/**
 * remarkTabs
 *
 * Requires `remark-directive` to be registered BEFORE this plugin in your
 * remark pipeline (it does the actual `:::`/`::` parsing into
 * containerDirective/leafDirective/textDirective nodes - this plugin just
 * transforms the resulting `tabs` / `tab` directives into markup).
 *
 * Astro config:
 *   import remarkDirective from "remark-directive";
 *   import { remarkTabs } from "./src/plugins/remarkTabs.js";
 *
 *   export default defineConfig({
 *     markdown: {
 *       remarkPlugins: [remarkDirective, remarkTabs, /* ...remarkCanvasDemo etc *\/],
 *     },
 *   });
 *
 * Usage in a post:
 *
 * IMPORTANT: remark-directive distinguishes directive kinds by colon
 * COUNT, not just presence of colons:
 *   - `:name[..]`   (1 colon)  = text directive  (inline)
 *   - `::name[..]`  (2 colons) = leaf directive   (single line, NO body -
 *                                 content after it is just a separate,
 *                                 unrelated paragraph, not part of it)
 *   - `:::name`     (3+ colons) = container directive (spans multiple
 *                                 lines/blocks until a matching closing
 *                                 fence of the same or greater length)
 *
 * Each `::tab[...]` here needs to be a CONTAINER directive (3 colons) so
 * it can wrap multi-line content, and the outer `tabs` wrapper needs MORE
 * colons than its children (4) so the parser can tell an inner closing
 * fence apart from the outer one - exactly the same rule as nesting a
 * ``` code fence inside a longer ```` fence.
 *
 *   ::::tabs
 *   :::tab[Native AWT]
 *   ![native awt screenshot](../../assets/native-awt.png)
 *   Runs on desktop Java, no browser involved.
 *   :::
 *
 *   :::tab[Canvas2D]
 *   ![canvas2d screenshot](../../assets/canvas2d.png)
 *   :::
 *
 *   :::tab[WebGL]
 *   ![webgl screenshot](../../assets/webgl.png)
 *   :::
 *   ::::
 *
 * Each `:::tab[Label]` panel can contain any normal markdown - images,
 * prose, even nested code blocks - since remark-directive just parses the
 * fenced region as regular block content.
 *
 * Optionally give a tab an explicit stable key instead of deriving one
 * from the label (useful if two tabs would otherwise slugify to the same
 * name, or if you want the key stable across a label rename):
 *
 *   :::tab[Native AWT]{name="native-awt"}
 *
 * Reuses the same tab-switching contract as remarkCanvasDemo.js
 * (data-tab-group / data-tab-btn / data-tab-panel + the shared, guarded
 * window.switchTab), but renders into its own "tabs-container" class
 * rather than remarkCanvasDemo's "code-demo-tabs" - the two have
 * different sizing needs (this one auto-sizes to content and has
 * padding; the canvas demo uses a fixed height suited to a code editor +
 * rendered canvas side by side), so they share behavior but not layout.
 * See tabs-container.css for the matching styles.
 */
export function remarkTabs() {
  return (tree, file) => {
    let groupCounter = 0;

    // Catch the wrong directive kind early with a clear, file-anchored
    // error instead of letting it silently mis-render. This is exactly
    // the mistake that's easy to make by hand: `::tabs` (2 colons) or
    // `:tabs` (1 colon) parse successfully as a *different* directive
    // kind (leaf / text) rather than failing outright, and a leaf/text
    // "tabs"/"tab" directive can't hold the multi-line block content
    // this plugin expects - so without this check, content just quietly
    // falls through as plain, unstyled paragraphs with no indication of
    // what went wrong.
    visit(tree, (node) => {
      if (
        (node.type === "leafDirective" || node.type === "textDirective") &&
        (node.name === "tabs" || node.name === "tab")
      ) {
        const colons = node.type === "leafDirective" ? "::" : ":";
        file.fail(
          `Unexpected \`${colons}${node.name}\` ${node.type === "leafDirective" ? "leaf" : "text"} directive - "${node.name}" must be a container directive (3+ colons) so it can hold multi-line content. Use \`:::${node.name}\`${node.name === "tabs" ? " (outer wrapper needs 4 colons: ::::tabs)" : ""} instead.`,
          node,
        );
      }
    });

    visit(tree, "containerDirective", (node, index, parent) => {
      if (node.name !== "tabs" || !parent) return;

      groupCounter += 1;
      const groupId = `tabs-${groupCounter}`;

      const tabNodes = node.children.filter(
        (child) => child.type === "containerDirective" && child.name === "tab",
      );

      if (tabNodes.length === 0) {
        console.warn(
          `[remarkTabs] ":::tabs" block at line ${node.position?.start?.line} has no "::tab[...]" children - skipping.`,
        );
        return;
      }

      const usedKeys = new Set();
      const buttons = [];
      const panels = [];

      tabNodes.forEach((tabNode, i) => {
        // remark-directive marks the `[Label]` bracket content as a
        // paragraph with data.directiveLabel = true, as the first child.
        const labelIndex = tabNode.children.findIndex(
          (c) => c.data && c.data.directiveLabel,
        );
        const label =
          labelIndex !== -1
            ? mdastToString(tabNode.children[labelIndex])
            : `Tab ${i + 1}`;

        const contentChildren =
          labelIndex !== -1
            ? tabNode.children.filter((_, idx) => idx !== labelIndex)
            : tabNode.children;

        let key = tabNode.attributes?.name || slugify(label) || `tab-${i}`;
        // Guard against duplicate keys (e.g. two tabs both labeled "AWTea")
        // silently colliding on the same data-tab-panel value.
        if (usedKeys.has(key)) {
          let n = 2;
          while (usedKeys.has(`${key}-${n}`)) n += 1;
          console.warn(
            `[remarkTabs] duplicate tab key "${key}" in group "${groupId}" - renamed to "${key}-${n}". Give it an explicit {name="..."} to control this.`,
          );
          key = `${key}-${n}`;
        }
        usedKeys.add(key);

        const isActive = i === 0;

        buttons.push({
          type: "paragraph",
          data: {
            hName: "button",
            hProperties: {
              className: isActive ? "tab-btn active" : "tab-btn",
              type: "button",
              "data-tab-btn": true,
              onclick: `switchTab(this, '${key}')`,
            },
          },
          children: [{ type: "text", value: label }],
        });

        panels.push({
          type: "paragraph",
          data: {
            hName: "div",
            hProperties: {
              className: isActive ? "tab-content active" : "tab-content",
              "data-tab-panel": key,
            },
          },
          children: contentChildren,
        });
      });

      const header = {
        type: "paragraph",
        data: {
          hName: "div",
          hProperties: { className: "tab-buttons" },
        },
        children: buttons,
      };

      const outerContainer = {
        type: "paragraph",
        data: {
          hName: "div",
          hProperties: {
            className: "tabs-container",
            "data-tab-group": groupId,
          },
        },
        children: [header, ...panels],
      };

      parent.children[index] = outerContainer;
    });
  };
}

/**
 * Minimal slugify for deriving a stable tab key from its label
 * ("Native AWT" -> "native-awt"). Falls back to empty string if the label
 * has no alphanumeric content, in which case the caller falls back to
 * `tab-${i}`.
 */
function slugify(text) {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
