// ================================
// Validators + Regex patterns
// ================================
const PATTERNS = {
  title: /^\S(?:.*\S)?$/,
  numeric: /^(0|[1-9]\d*)(\.\d{1,2})?$/,
  date: /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/,
  tag: /^[A-Za-z]+(?:[ -][A-Za-z]+)*$/,
  duplicateWord: /\b(\w+)\s+\1\b/i
};

function normalizeText(s){
  return String(s || "").replace(/\s{2,}/g, " ").trim();
}

function validateRecord({ title, author, pages, tag, status, dateAdded }){
  const errs = [];

  if(!PATTERNS.title.test(title)) errs.push("Title must not have leading/trailing spaces.");
  if(author && !PATTERNS.tag.test(author)) errs.push("Author contains invalid characters.");
  if(!PATTERNS.numeric.test(String(pages))) errs.push("Pages must be a positive number (max 2 decimals).");
  if(Number(pages) < 1) errs.push("Pages must be at least 1.");
  if(!PATTERNS.tag.test(tag)) errs.push("Tag must contain only letters, spaces, or hyphens.");
  if(!['unread','reading','done'].includes(status)) errs.push("Status must be unread, reading, or done.");
  if(!PATTERNS.date.test(dateAdded)) errs.push("Date must be in YYYY-MM-DD format.");
  if(PATTERNS.duplicateWord.test(title)) errs.push("Title should not contain the same word twice in a row.");

  return errs;
}

// ================================
// Form logic + UI
// ================================
const rootForm = document.getElementById('regex-testing');

function clearHighlights() {
  ['title','author','pages','tag','status','dateAdded'].forEach(id => {
    const el = document.getElementById(id);
    if(el) el.classList.remove('field-error','field-success');
  });
  document.getElementById('status-badge').innerHTML = '';
}

function renderErrors(errors) {
  const feedback = document.getElementById('live-feedback');
  feedback.innerHTML = '';
  clearHighlights();

  if(!errors || errors.length === 0){
    feedback.innerHTML = '<div class="success">No validation errors ✅</div>';
    document.getElementById('status-badge').innerHTML = '<span class="badge ok">VALID</span>';
    ['title','author','pages','tag'].forEach(id => document.getElementById(id).classList.add('field-success'));
    return;
  }

  const ul = document.createElement('ul');
  errors.forEach(err => {
    const li = document.createElement('li');
    li.textContent = err;
    ul.appendChild(li);

    const e = err.toLowerCase();
    if(e.includes('title')) document.getElementById('title').classList.add('field-error');
    if(e.includes('author')) document.getElementById('author').classList.add('field-error');
    if(e.includes('pages')) document.getElementById('pages').classList.add('field-error');
    if(e.includes('tag')) document.getElementById('tag').classList.add('field-error');
    if(e.includes('status')) document.getElementById('status').classList.add('field-error');
    if(e.includes('date')) document.getElementById('dateAdded').classList.add('field-error');
  });

  feedback.appendChild(ul);
  document.getElementById('status-badge').innerHTML = '<span class="badge bad">INVALID</span>';
}

function getRecord() {
  return {
    title: document.getElementById('title').value,
    author: document.getElementById('author').value,
    pages: document.getElementById('pages').value,
    tag: document.getElementById('tag').value,
    status: document.getElementById('status').value,
    dateAdded: document.getElementById('dateAdded').value
  };
}

function normalizeForm() {
  ['title','author','tag','pages'].forEach(id => {
    const el = document.getElementById(id);
    el.value = normalizeText(el.value);
  });
}

function runValidation(){
  const rec = getRecord();
  renderErrors(validateRecord(rec));
}

// ================================
// Initialization
// ================================
function init(){
  // Set default date
  document.getElementById('dateAdded').value = new Date().toISOString().slice(0,10);

  // Live validation
  ['title','author','pages','tag','status','dateAdded'].forEach(id => {
    document.getElementById(id).addEventListener('input', runValidation);
  });

  document.getElementById('validate-btn').addEventListener('click', runValidation);
  document.getElementById('normalize-btn').addEventListener('click', () => { normalizeForm(); runValidation(); });
  document.getElementById('reset-btn').addEventListener('click', () => { clearHighlights(); document.getElementById('live-feedback').innerHTML=''; document.getElementById('status-badge').innerHTML=''; });
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', init);
}else{
  init();
}
