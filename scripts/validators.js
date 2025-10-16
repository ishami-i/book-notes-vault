// scripts/validators.js

// Regex patterns
export const PATTERNS = {
  // Title: forbid leading/trailing spaces and require at least one non-space
  title: /^\S(?:.*\S)?$/,
  // Numeric pages: integer >= 1
  numeric: /^[1-9]\d*$/,
  // Date YYYY-MM-DD
  date: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
  // Tag/category: letters, spaces, hyphens, repeated groups allowed
  tag: /^[A-Za-z]+(?:[ \-][A-Za-z]+)*$/,
  // Advanced: duplicate-word detection (back-reference)
  duplicateWord: /\b(\w+)\s+\1\b/i
};

// sanitize and collapse multiple spaces inside text and trim
export function normalizeText(s) {
  return String(s || "").replace(/\s{2,}/g, " ").trim();
}

/**
 * Validate a record payload.
 * Returns an array of error messages (empty if valid).
 */
export function validateRecord({ title, author, pages, tag, status, dateAdded }) {
  const errs = [];

  if (!title || typeof title !== "string" || !PATTERNS.title.test(title)) errs.push("Title must not have leading/trailing spaces and must contain text.");
  if (author && !PATTERNS.tag.test(author)) errs.push("Author contains invalid characters. (Allowed: letters, spaces, hyphens)");
  if (pages === "" || pages === null || pages === undefined || !PATTERNS.numeric.test(String(pages))) errs.push("Pages must be a positive integer (>= 1).");
  if (Number(pages) < 1) errs.push("Pages must be at least 1.");
  if (!tag || !PATTERNS.tag.test(tag)) errs.push("Tag must contain only letters, spaces, or hyphens.");
  if (!['unread', 'reading', 'done'].includes(status)) errs.push("Status must be unread, reading, or done.");
  if (!dateAdded || !PATTERNS.date.test(dateAdded)) errs.push("Date must be in YYYY-MM-DD format.");
  if (PATTERNS.duplicateWord.test(title)) errs.push("Title should not contain the same word twice in a row.");

  return errs;
}