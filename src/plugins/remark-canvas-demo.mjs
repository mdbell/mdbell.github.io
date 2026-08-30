import { visit } from "unist-util-visit";

/**
 * remarkCanvasDemo
 *
 * Transforms a fenced code block like:
 *
 *   ```js live canvasId="rect-canvas"
 *   const canvas = document.getElementById("rect-canvas");
 *   ...
 *   ```
 *
 * into a two-tab widget: the original source code, and a live-executed
 * preview rendered onto a <canvas> with the given id.
 *
 * Fixes applied vs. the original version:
 *  1. canvasId is read directly from the fence meta string instead of being
 *     regex-sniffed out of the code body. This removes a silent-failure mode
 *     where any live block not calling getElementById/querySelector in a
 *     recognizable way would just quietly render with no preview tab.
 *  2. The injected code is escaped for `</script>` so a stray literal
 *     "</script>" inside a snippet (e.g. in a comment or string) can't
 *     terminate the injected <script> tag early and corrupt the page.
 *  3. Tab switching uses generic data-attributes (data-tab-group /
 *     data-tab-btn / data-tab-panel) rather than bespoke class names, so
 *     remarkTabs reuses the exact same markup contract without duplicating
 *     any CSS or JS.
 *  4. The behaviour itself lives in src/scripts/tabs.ts, loaded once by
 *     BaseLayout.astro. This plugin emits markup only - no inline onclick
 *     handlers, and no global function that a page without a live demo
 *     would be missing.
 *
 * NOTE on Astro View Transitions: the tab listeners are delegated from
 * `document`, so they survive a client-side navigation without any
 * re-initialisation. The inline demo snippet below is a different story -
 * a raw <script> that has already been parsed won't re-run when it is
 * transitioned back in. That only matters if <ClientRouter /> is added to
 * the site (it currently isn't); the fix at that point is to wrap the
 * snippet in an astro:page-load listener.
 */
export function remarkCanvasDemo() {
  return (tree) => {
    visit(tree, "code", (node, index, parent) => {
      const meta = node.meta;
      if (!(meta && typeof meta === "string" && meta.includes("live"))) {
        return;
      }

      const idMatch = meta.match(/canvasId=["']([^"']+)["']/);
      if (!idMatch) {
        console.warn(
          `[remarkCanvasDemo] "live" code block is missing canvasId="..." in its fence meta (meta was: "${meta}"). Skipping preview tab.`,
        );
        return;
      }
      const canvasId = idMatch[1];
      // canvasId is required and unique per page, so it doubles as a stable
      // id for the tab group and its panels.
      const groupId = `canvas-demo-${canvasId}`;

      const rawCode = node.value || "";
      // Guard against a literal "</script>" inside the snippet (comment,
      // string, template literal, etc.) breaking out of the injected
      // <script> tag early.
      const safeCode = rawCode.replace(/<\/script/gi, "<\\/script");

      // Header node: tab buttons. Behaviour comes from the delegated
      // listeners in src/scripts/tabs.ts - see the contract documented
      // there; nothing is wired up per-instance.
      const tabHeader = {
        type: "html",
        value: `
          <div class="tab-buttons" role="tablist" aria-label="Code and live preview">
            <button class="tab-btn active" type="button" role="tab" data-tab-btn="code" aria-selected="true" aria-controls="${groupId}-panel-code" tabindex="0">JavaScript</button>
            <button class="tab-btn" type="button" role="tab" data-tab-btn="preview" aria-selected="false" aria-controls="${groupId}-panel-preview" tabindex="-1">Live Preview</button>
          </div>
        `.trim(),
      };

      // Tab wrapper for original code block
      const codeTabWrapper = {
        type: "paragraph",
        data: {
          hName: "div",
          hProperties: {
            className: "tab-content active",
            role: "tabpanel",
            id: `${groupId}-panel-code`,
            "data-tab-panel": "code",
          },
        },
        children: [node],
      };

      // Preview panel node (canvas + execution script). The only inline
      // script left here is the demo snippet itself, which has to be
      // inline because it *is* the post's content.
      const previewTabWrapper = {
        type: "html",
        value: `
          <div class="tab-content" role="tabpanel" id="${groupId}-panel-preview" data-tab-panel="preview">
            <div class="canvas-wrapper">
              <canvas id="${canvasId}" width="300" height="320"></canvas>
            </div>
          </div>
          <script>
            (() => {
              try {
${safeCode}
              } catch (e) {
                console.error("Failed to execute live canvas demo (${canvasId}):", e);
              }
            })();
          </script>
        `.trim(),
      };

      // Outer parent container
      const outerContainer = {
        type: "paragraph",
        data: {
          hName: "div",
          hProperties: {
            className: "code-demo-tabs",
            "data-tab-group": groupId,
          },
        },
        children: [tabHeader, codeTabWrapper, previewTabWrapper],
      };

      parent.children[index] = outerContainer;
    });
  };
}
