// scripts/validators.js

// Regex patterns
export const PATTERNS = {
  // Title: forbid leading/trailing spaces and require at least one non-space
  title: /^\S(?:.*\S)?$/,
  // Numeric pages: integer or decimal with up to 2 decimals (but pages are integers typically) - pattern from spec
  numeric: /^(0|[1-9]\d*)(\.\d{1,2})?$/,
  // Date YYYY-MM-DD
  date: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
  // Tag/category: letters, spaces, hyphens
  tag: /^[A-Za-z]+(?:[ -][A-Za-z]+)*$/,
  // Advanced: duplicate-word detection (back-reference)
  duplicateWord: /\b(\w+)\s+\1\b/i
};

// sanitize and collapse multiple spaces inside text and trim
export function normalizeText(s){
  return String(s || "").replace(/\s{2,}/g, " ").trim();
}

export function validateRecord({ title, author, pages, tag, status, dateAdded }){
  const errs = [];

  // Title: no leading/trailing spaces
  if(!PATTERNS.title.test(title)) errs.push("Title must not have leading/trailing spaces.");
  // Author: allow empty or valid tag-like names (letters, spaces, hyphens)
  if(author && !PATTERNS.tag.test(author)) errs.push("Author contains invalid characters.");
  // Pages: must be integer >=1 (we'll use numeric regex + additional check)
  if(!PATTERNS.numeric.test(String(pages))) errs.push("Pages must be a positive number (max 2 decimals).");
  if(Number(pages) < 1) errs.push("Pages must be at least 1.");
  // Tag
  if(!PATTERNS.tag.test(tag)) errs.push("Tag must contain only letters, spaces, or hyphens.");
  // Status: must be one of the valid options
  if(!['unread', 'reading', 'done'].includes(status)) errs.push("Status must be unread, reading, or done.");
  // Date
  if(!PATTERNS.date.test(dateAdded)) errs.push("Date must be in YYYY-MM-DD format.");

  // Advanced: avoid duplicate words in title
  if(PATTERNS.duplicateWord.test(title)) errs.push("Title should not contain the same word twice in a row.");

  return errs;
}
