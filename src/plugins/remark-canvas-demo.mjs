import { visit } from "unist-util-visit";

export function remarkCanvasDemo() {
  return (tree) => {
    visit(tree, "code", (node, index, parent) => {
      if (
        node.meta && typeof node.meta === "string" && node.meta.includes("live")
      ) {
        const rawCode = node.value || "";

        const idMatch = rawCode.match(/getElementById\(["']([^"']+)["']\)/) ||
          rawCode.match(/querySelector\(["']#([^"']+)["']\)/);

        if (!idMatch) return;
        const canvasId = idMatch[1];

        // Header node
        const tabHeader = {
          type: "html",
          value: `
            <div class="tab-buttons">
              <button class="tab-btn active" type="button" onclick="switchCanvasTab(this, 'code')">JavaScript</button>
              <button class="tab-btn" type="button" onclick="switchCanvasTab(this, 'preview')">Live Preview</button>
            </div>
          `.trim(),
        };

        // Tab wrapper for original code block
        const codeTabWrapper = {
          type: "paragraph",
          data: {
            hName: "div",
            hProperties: { className: "tab-content tab-code active" },
          },
          children: [node],
        };

        // Preview panel node
        const previewTabWrapper = {
          type: "html",
          value: `
            <div class="tab-content tab-preview">
              <div class="canvas-wrapper">
                <canvas id="${canvasId}" width="300" height="320"></canvas>
              </div>
            </div>
            <script>
              if (typeof window.switchCanvasTab !== 'function') {
                window.switchCanvasTab = function(btn, tabName) {
                  const container = btn.closest('.code-demo-tabs');
                  container.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
                  container.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                  
                  btn.classList.add('active');
                  container.querySelector('.tab-' + tabName).classList.add('active');
                };
              }

              (() => {
                try {
                  ${rawCode}
                } catch (e) {
                  console.error("Failed to execute live canvas demo:", e);
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
            hProperties: { className: "code-demo-tabs" },
          },
          children: [tabHeader, codeTabWrapper, previewTabWrapper],
        };

        parent.children[index] = outerContainer;
      }
    });
  };
}
