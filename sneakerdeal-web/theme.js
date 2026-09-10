// Light/dark theme toggle. The actual color values live in style.css under
// [data-theme="dark"] — this file only ever flips that attribute and
// remembers the choice.
const THEME_KEY = "sneakerdeal_theme";

function getStoredTheme() {
  try { return localStorage.getItem(THEME_KEY); } catch { return null; }
}

function setStoredTheme(theme) {
  try { localStorage.setItem(THEME_KEY, theme); } catch {}
}

function systemPrefersDark() {
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function currentTheme() {
  return getStoredTheme() || (systemPrefersDark() ? "dark" : "light");
}

function applyTheme(theme) {
  document.documentElement.setAttribute("data-theme", theme);
}

// Apply immediately (before app.js/DOMContentLoaded) so there's no
// light-then-dark flash on page load.
applyTheme(currentTheme());
