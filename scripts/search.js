// scripts/search.js
// Utilities for compiling regex, escaping HTML and highlighting matches.

/**
 * Escape text to use safely in RegExp as literal
 */
export function escapeRegExp(s = "") {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Escape HTML to avoid XSS in inserted text
 */
export function escapeHtml(s = "") {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Compile a query string into a RegExp.
 * Accepts either:
 *   - /pattern/flags  (e.g. /foo/i)
 *   - plain text -> treated as literal substring search
 * Returns RegExp or null on invalid input.
 */
export function compileRegex(query, extraFlags = "") {
  if (!query || typeof query !== "string") return null;
  query = query.trim();
  try {
    // If user provided /pattern/flags syntax
    if (query.startsWith("/") && query.lastIndexOf("/") > 0) {
      const lastSlash = query.lastIndexOf("/");
      const pattern = query.slice(1, lastSlash);
      // flags provided by pattern plus any extra flags passed in
      const providedFlags = query.slice(lastSlash + 1);
      const flagsSet = Array.from(new Set((providedFlags + extraFlags).split("").filter(Boolean))).join("");
      return new RegExp(pattern, flagsSet);
    }
    // Otherwise treat as literal substring
    const flags = extraFlags || "i";
    return new RegExp(escapeRegExp(query), flags);
  } catch (e) {
    // invalid regex
    console.warn("Invalid regex:", e);
    return null;
  }
}

/**
 * Highlight matches inside text using <mark>. Returns safe HTML string.
 * Uses escapeHtml for text safety.
 */
export function highlightMatches(text = "", re) {
  if (!re) return escapeHtml(text);
  // Ensure we can iterate matches, create a global regex to find all matches
  let flags = re.flags.includes("g") ? re.flags : re.flags + "g";
  let g = null;
  try {
    g = new RegExp(re.source, flags);
  } catch (e) {
    return escapeHtml(text);
  }
  let lastIndex = 0;
  let out = "";
  let m;
  while ((m = g.exec(text)) !== null) {
    const before = text.slice(lastIndex, m.index);
    out += escapeHtml(before);
    const matched = m[0];
    out += `<mark>${escapeHtml(matched)}</mark>`;
    lastIndex = g.lastIndex;
    // avoid infinite loops for zero-length matches
    if (m.index === g.lastIndex) g.lastIndex++;
  }
  out += escapeHtml(text.slice(lastIndex));
  return out;
}