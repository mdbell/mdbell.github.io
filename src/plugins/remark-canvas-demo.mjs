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
 *  3. Tab switching now uses generic data-attributes (data-tab-group /
 *     data-tab-btn / data-tab-panel) and a single shared window.switchTab,
 *     instead of bespoke class names + a canvas-specific function. This is
 *     the same mechanism a future tabbed-screenshot-comparison plugin can
 *     reuse without duplicating CSS/JS.
 *  4. See the NOTE at the bottom re: Astro View Transitions - if the site
 *     uses client-side navigation, the inline <script> execution strategy
 *     here may need to move to an astro:page-load listener. This can't be
 *     fixed blind without knowing the site's routing config, so it's left
 *     as a call-out rather than a silent behavior change.
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

      const rawCode = node.value || "";
      // Guard against a literal "</script>" inside the snippet (comment,
      // string, template literal, etc.) breaking out of the injected
      // <script> tag early.
      const safeCode = rawCode.replace(/<\/script/gi, "<\\/script");

      // Header node: tab buttons
      const tabHeader = {
        type: "html",
        value: `
          <div class="tab-buttons" data-tab-btn-group>
            <button class="tab-btn active" type="button" data-tab-btn data-tab-target="code" onclick="switchTab(this, 'code')">JavaScript</button>
            <button class="tab-btn" type="button" data-tab-btn data-tab-target="preview" onclick="switchTab(this, 'preview')">Live Preview</button>
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
            "data-tab-panel": "code",
          },
        },
        children: [node],
      };

      // Preview panel node (canvas + execution script)
      // The switchTab function is defined inline here (guarded by a
      // typeof check) so this block still works standalone with no extra
      // setup required elsewhere. If you later add the shared
      // `tabSwitchScript` export to your base layout, this guard means
      // it simply won't redefine it - no conflict either way.
      const previewTabWrapper = {
        type: "html",
        value: `
          <div class="tab-content" data-tab-panel="preview">
            <div class="canvas-wrapper">
              <canvas id="${canvasId}" width="300" height="320"></canvas>
            </div>
          </div>
          <script>
            if (typeof window.switchTab !== 'function') {
              window.switchTab = function (btn, tabName) {
                const container = btn.closest('[data-tab-group]');
                if (!container) return;
                container.querySelectorAll('[data-tab-btn]').forEach((b) => b.classList.remove('active'));
                container.querySelectorAll('[data-tab-panel]').forEach((c) => c.classList.remove('active'));
                btn.classList.add('active');
                const panel = container.querySelector('[data-tab-panel="' + tabName + '"]');
                if (panel) panel.classList.add('active');
              };
            }

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
          hProperties: { className: "code-demo-tabs", "data-tab-group": true },
        },
        children: [tabHeader, codeTabWrapper, previewTabWrapper],
      };

      parent.children[index] = outerContainer;
    });
  };
}

/**
 * Shared tab-switching script. Emit this ONCE globally (e.g. in your base
 * layout, or injected by the Astro integration that registers this remark
 * plugin) rather than per-instance. Both this plugin's markup and any future
 * tabbed-content plugin (e.g. a screenshot comparison widget) can drive off
 * this same function as long as they use the same data-tab-group /
 * data-tab-btn / data-tab-panel attributes.
 *
 * NOTE on Astro View Transitions: if the site has <ClientRouter /> /
 * transition:animate enabled anywhere, plain inline <script> tags injected
 * as raw HTML will generally NOT re-execute on client-side navigation
 * (browsers don't re-run scripts already present in a DOM node that's
 * transitioned in). If that's the case here, wrap the initialization in:
 *
 *   document.addEventListener('astro:page-load', () => { ... });
 *
 * instead of relying on the script tag simply being present in the page.
 * If the site does full MPA navigation between posts (no view transitions),
 * this is a non-issue and can be ignored.
 */
export const tabSwitchScript = `
  if (typeof window.switchTab !== 'function') {
    window.switchTab = function (btn, tabName) {
      const container = btn.closest('[data-tab-group]');
      if (!container) return;
      container.querySelectorAll('[data-tab-btn]').forEach((b) => b.classList.remove('active'));
      container.querySelectorAll('[data-tab-panel]').forEach((c) => c.classList.remove('active'));
      btn.classList.add('active');
      const panel = container.querySelector('[data-tab-panel="' + tabName + '"]');
      if (panel) panel.classList.add('active');
    };
  }
`.trim();
