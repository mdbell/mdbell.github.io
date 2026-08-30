/**
 * Tab switching for every tab widget on the site.
 *
 * Both `remarkCanvasDemo` (code + live canvas) and `remarkTabs`
 * (`::::tabs` in a post) emit the same markup contract, and this module is
 * the only thing that implements it:
 *
 *   <div data-tab-group="<id>">
 *     <div role="tablist">
 *       <button role="tab" data-tab-btn="<key>" aria-selected="true|false"> …
 *     <div role="tabpanel" data-tab-panel="<key>"> …
 *
 * The active tab is whichever button/panel carries `.active`; the plugins
 * render that state into the HTML, so tabs are correct before any JS runs
 * and there is nothing to initialise on load.
 *
 * Listeners are delegated from `document`, which means: no per-widget setup,
 * no inline `onclick` handlers, no global function for the plugins to
 * depend on existing, and no re-initialisation after an Astro view
 * transition (the document survives the swap).
 */

const GROUP = "[data-tab-group]";
const BTN = "[data-tab-btn]";

/** Buttons/panels belonging to `group` itself, not to a nested tab group. */
function own(group: HTMLElement, selector: string): HTMLElement[] {
  return [...group.querySelectorAll<HTMLElement>(selector)].filter(
    (el) => el.closest<HTMLElement>(GROUP) === group,
  );
}

function activate(group: HTMLElement, key: string, moveFocus = false): void {
  for (const btn of own(group, BTN)) {
    const selected = btn.dataset.tabBtn === key;
    btn.classList.toggle("active", selected);
    btn.setAttribute("aria-selected", String(selected));
    // Roving tabindex: only the selected tab is in the tab order, so Tab
    // moves past the tablist rather than through every tab in it.
    btn.tabIndex = selected ? 0 : -1;
    if (selected && moveFocus) btn.focus();
  }

  for (const panel of own(group, "[data-tab-panel]")) {
    panel.classList.toggle("active", panel.dataset.tabPanel === key);
  }
}

function buttonFrom(event: Event): HTMLElement | null {
  const target = event.target;
  return target instanceof Element ? target.closest<HTMLElement>(BTN) : null;
}

document.addEventListener("click", (event) => {
  const btn = buttonFrom(event);
  const group = btn?.closest<HTMLElement>(GROUP);
  if (!btn?.dataset.tabBtn || !group) return;

  activate(group, btn.dataset.tabBtn);
});

// Arrow/Home/End navigation between tabs, per the WAI-ARIA tabs pattern.
document.addEventListener("keydown", (event) => {
  const btn = buttonFrom(event);
  const group = btn?.closest<HTMLElement>(GROUP);
  if (!btn || !group) return;

  const buttons = own(group, BTN);
  const current = buttons.indexOf(btn);
  if (current === -1) return;

  let next: number;
  switch (event.key) {
    case "ArrowLeft":
      next = (current - 1 + buttons.length) % buttons.length;
      break;
    case "ArrowRight":
      next = (current + 1) % buttons.length;
      break;
    case "Home":
      next = 0;
      break;
    case "End":
      next = buttons.length - 1;
      break;
    default:
      return;
  }

  const key = buttons[next]?.dataset.tabBtn;
  if (!key) return;

  event.preventDefault();
  activate(group, key, true);
});
