export const UI_THEME = {
  background: "#071117",
  panel: "rgba(10, 26, 34, 0.88)",
  panelStrong: "rgba(7, 17, 23, 0.96)",
  line: "rgba(164, 218, 219, 0.18)",
  text: "#eff8f8",
  muted: "#8faeb3",
  accent: "#54d6c7",
  accentStrong: "#b5fff0",
  warning: "#ffc66d",
  danger: "#ff776d",
  shadow: "0 20px 50px rgba(0, 0, 0, 0.32)",
  radius: "14px",
  font: "Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, Segoe UI, sans-serif"
} as const;

export function applyGlobalUiStyles(): void {
  const style = document.createElement("style");
  style.dataset.owner = "table-tennis-ultra-ui";
  style.textContent = [
    "* { box-sizing: border-box; }",
    "html, body, #game-root { width: 100%; height: 100%; margin: 0; overflow: hidden; }",
    "body { background: " + UI_THEME.background + "; color: " + UI_THEME.text + "; font-family: " + UI_THEME.font + "; }",
    "button { font: inherit; color: inherit; }",
    "[data-game-ui] { pointer-events: none; }",
    "[data-game-ui] button, [data-game-ui] input, [data-game-ui] select { pointer-events: auto; }",
    ".ttu-panel { background: " + UI_THEME.panel + "; border: 1px solid " + UI_THEME.line + "; border-radius: " + UI_THEME.radius + "; box-shadow: " + UI_THEME.shadow + "; backdrop-filter: blur(18px); }",
    ".ttu-chip { display: inline-flex; align-items: center; gap: 7px; padding: 7px 10px; border-radius: 999px; background: rgba(84,214,199,0.1); color: " + UI_THEME.accentStrong + "; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; }"
  ].join("\n");
  document.head.appendChild(style);
}