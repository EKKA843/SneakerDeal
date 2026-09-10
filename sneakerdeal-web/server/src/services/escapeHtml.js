// Product fields (name, offer store names, urls, ...) are admin-entered
// but still get rendered into raw HTML strings on the server-rendered
// product page — escape them so a stray "<" or "&" can't break the page
// or, if a field were ever compromised, inject a script.
function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

module.exports = { escapeHtml };
