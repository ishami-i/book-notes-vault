// scripts/search.js
export function compileRegex(input, flags = "") {
    if (!input) return null;
    // Allow users to enter with or without delimiters: /pattern/flags
    let pattern = input;
    let userFlags = flags || "";
    const wrapped = /^\/(.+)\/([gimuy]*)$/;
    const m = pattern.match(wrapped);
    if (m) { pattern = m[1]; userFlags = userFlags + m[2]; }
    try {
      return new RegExp(pattern, userFlags.includes("i") ? userFlags : userFlags + "i");
    } catch (e) {
      return null; // invalid regex
    }
  }
  
  export function highlightMatches(text, re) {
    if (!re || !text) return escapeHtml(text);
    // Use safe replacement: we will split and rebuild to avoid HTML injection risk
    const parts = [];
    let lastIndex = 0;
    let match;
    // Use global flag for iterative matching
    const flags = re.flags.includes("g") ? re.flags : re.flags + "g";
    const gRe = new RegExp(re.source, flags);
    while ((match = gRe.exec(text)) !== null) {
      const before = text.slice(lastIndex, match.index);
      parts.push(escapeHtml(before));
      parts.push(`<mark>${escapeHtml(match[0])}</mark>`);
      lastIndex = match.index + match[0].length;
      if (match[0].length === 0) {
        gRe.lastIndex++; // prevent zero-length infinite loop
      }
    }
    parts.push(escapeHtml(text.slice(lastIndex)));
    return parts.join("");
  }
  
  export function escapeHtml(str){
    return String(str || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
  