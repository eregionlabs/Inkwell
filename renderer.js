const md = window.markdownit({
  html: true,
  linkify: true,
  typographer: true,
});

const editor = document.getElementById('editor');
const preview = document.getElementById('preview');
const filenameEl = document.getElementById('filename');
const modifiedEl = document.getElementById('modified-indicator');

let currentFilePath = null;
let savedContent = '';

// --- Rendering ---

function renderPreview() {
  const text = editor.value;
  preview.innerHTML = md.render(text);
}

editor.addEventListener('input', () => {
  renderPreview();
  updateModifiedState();
});

function updateModifiedState() {
  const isModified = editor.value !== savedContent;
  modifiedEl.textContent = isModified ? '(unsaved)' : '';
}

function setFile(filePath, content) {
  currentFilePath = filePath;
  savedContent = content;
  editor.value = content;
  filenameEl.textContent = filePath
    ? filePath.split('/').pop()
    : 'Untitled';
  modifiedEl.textContent = '';
  renderPreview();
}

// --- File operations ---

async function openFile() {
  const result = await window.api.openFile();
  if (result) {
    setFile(result.filePath, result.content);
  }
}

async function saveFile() {
  if (currentFilePath) {
    await window.api.saveFile({
      filePath: currentFilePath,
      content: editor.value,
    });
    savedContent = editor.value;
    updateModifiedState();
  } else {
    await saveFileAs();
  }
}

async function saveFileAs() {
  const newPath = await window.api.saveFileAs({ content: editor.value });
  if (newPath) {
    currentFilePath = newPath;
    savedContent = editor.value;
    filenameEl.textContent = newPath.split('/').pop();
    updateModifiedState();
  }
}

async function exportPdf() {
  const html = preview.innerHTML;
  await window.api.exportPdf({ html });
}

// --- Toolbar buttons ---

document.getElementById('btn-open').addEventListener('click', openFile);
document.getElementById('btn-save').addEventListener('click', saveFile);
document.getElementById('btn-export').addEventListener('click', exportPdf);

// --- Menu shortcuts ---

window.api.onMenuOpen(() => openFile());
window.api.onMenuSave(() => saveFile());
window.api.onMenuSaveAs(() => saveFileAs());
window.api.onMenuExportPdf(() => exportPdf());

// --- Resizable divider ---

const divider = document.querySelector('.divider');
const editorPane = document.querySelector('.editor-pane');
const previewPane = document.querySelector('.preview-pane');

let isResizing = false;

divider.addEventListener('mousedown', (e) => {
  isResizing = true;
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
});

document.addEventListener('mousemove', (e) => {
  if (!isResizing) return;
  const container = document.querySelector('.main');
  const containerRect = container.getBoundingClientRect();
  const ratio = (e.clientX - containerRect.left) / containerRect.width;
  const clamped = Math.max(0.2, Math.min(0.8, ratio));
  editorPane.style.flex = `${clamped}`;
  previewPane.style.flex = `${1 - clamped}`;
});

document.addEventListener('mouseup', () => {
  if (isResizing) {
    isResizing = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }
});

// --- Tab key support in editor ---

editor.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    e.preventDefault();
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    editor.value =
      editor.value.substring(0, start) +
      '    ' +
      editor.value.substring(end);
    editor.selectionStart = editor.selectionEnd = start + 4;
    renderPreview();
  }
});

// --- Trial & Paywall ---

const TRIAL_DURATION_MS = 3 * 24 * 60 * 60 * 1000; // 3 days
const paywall = document.getElementById('paywall');

function isUnlocked() {
  return localStorage.getItem('inkblot_unlocked') === 'true';
}

function getTrialStart() {
  let start = localStorage.getItem('inkblot_trial_start');
  if (!start) {
    start = Date.now().toString();
    localStorage.setItem('inkblot_trial_start', start);
  }
  return parseInt(start, 10);
}

function isTrialExpired() {
  return Date.now() - getTrialStart() > TRIAL_DURATION_MS;
}

function showPaywall() {
  paywall.style.display = 'flex';
  editor.disabled = true;
}

function hidePaywall() {
  paywall.style.display = 'none';
  editor.disabled = false;
}

function checkAccess() {
  if (isUnlocked() || !isTrialExpired()) {
    hidePaywall();
  } else {
    showPaywall();
  }
}

function unlock() {
  localStorage.setItem('inkblot_unlocked', 'true');
  hidePaywall();
}

// Purchase button
document.getElementById('btn-purchase').addEventListener('click', async () => {
  const result = await window.api.purchase();
  // In non-MAS dev builds, unlock immediately for testing
  if (result.error && result.error.includes('non-MAS')) {
    unlock();
  }
});

// Restore button
document.getElementById('btn-restore').addEventListener('click', async () => {
  await window.api.restorePurchase();
});

// Listen for unlock from main process (MAS purchase/restore completed)
window.api.onIapUnlocked(() => unlock());

// Check access on launch and periodically
checkAccess();
setInterval(checkAccess, 60 * 1000); // recheck every minute

// --- Initial render ---

renderPreview();
