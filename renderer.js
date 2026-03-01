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

// --- Full-screen preview toggle ---

const mainEl = document.querySelector('.main');
const btnPreview = document.getElementById('btn-preview-fullscreen');
let previewFullscreen = false;

function togglePreviewFullscreen() {
  previewFullscreen = !previewFullscreen;
  mainEl.classList.toggle('preview-fullscreen', previewFullscreen);
  btnPreview.classList.toggle('active', previewFullscreen);
}

// --- Open folder / sidebar ---

const sidebar = document.getElementById('sidebar');
const sidebarDivider = document.getElementById('sidebar-divider');
const sidebarFiles = document.getElementById('sidebar-files');
const sidebarTitle = document.getElementById('sidebar-title');
let folderTree = null;
let folderPath = null;

async function openFolder() {
  const result = await window.api.openFolder();
  if (!result) return;
  folderPath = result.dirPath;
  folderTree = result.tree;
  sidebarTitle.textContent = folderPath.split('/').pop();
  renderSidebar();
  sidebar.style.display = 'flex';
  sidebarDivider.style.display = '';
}

function renderSidebar() {
  sidebarFiles.innerHTML = '';
  if (!folderTree) return;
  renderTree(folderTree, sidebarFiles);
}

function renderTree(items, container) {
  for (const item of items) {
    const el = document.createElement('div');
    el.className = 'sidebar-item' + (item.type === 'folder' ? ' folder' : '');

    // Indentation
    for (let i = 0; i < item.depth; i++) {
      const indent = document.createElement('span');
      indent.className = 'indent';
      el.appendChild(indent);
    }

    const icon = document.createElement('span');
    icon.className = 'icon';

    if (item.type === 'folder') {
      icon.textContent = item._open ? '\u25BE' : '\u25B8';
      el.appendChild(icon);
      el.appendChild(document.createTextNode(item.name));
      el.addEventListener('click', () => {
        item._open = !item._open;
        renderSidebar();
      });
      container.appendChild(el);
      if (item._open && item.children) {
        renderTree(item.children, container);
      }
    } else {
      icon.textContent = '\u2514';
      el.appendChild(icon);
      el.appendChild(document.createTextNode(item.name));
      if (item.path === currentFilePath) {
        el.classList.add('active');
      }
      el.addEventListener('click', () => openSidebarFile(item.path));
      container.appendChild(el);
    }
  }
}

async function openSidebarFile(filePath) {
  const result = await window.api.readFile(filePath);
  if (result) {
    setFile(result.filePath, result.content);
    renderSidebar(); // refresh active highlight
  }
}

function closeSidebar() {
  sidebar.style.display = 'none';
  sidebarDivider.style.display = 'none';
  folderTree = null;
  folderPath = null;
}

document.getElementById('sidebar-close').addEventListener('click', closeSidebar);

// --- Toolbar buttons ---

document.getElementById('btn-open').addEventListener('click', openFile);
document.getElementById('btn-open-folder').addEventListener('click', openFolder);
document.getElementById('btn-save').addEventListener('click', saveFile);
document.getElementById('btn-export').addEventListener('click', exportPdf);
btnPreview.addEventListener('click', togglePreviewFullscreen);

// --- Menu shortcuts ---

window.api.onMenuOpen(() => openFile());
window.api.onMenuOpenFolder(() => openFolder());
window.api.onMenuSave(() => saveFile());
window.api.onMenuSaveAs(() => saveFileAs());
window.api.onMenuExportPdf(() => exportPdf());
window.api.onMenuTogglePreview(() => togglePreviewFullscreen());

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
  if (isSidebarResizing) {
    isSidebarResizing = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }
});

// --- Sidebar divider resize ---

let isSidebarResizing = false;

sidebarDivider.addEventListener('mousedown', (e) => {
  isSidebarResizing = true;
  document.body.style.cursor = 'col-resize';
  document.body.style.userSelect = 'none';
});

document.addEventListener('mousemove', (e) => {
  if (!isSidebarResizing) return;
  const newWidth = Math.max(140, Math.min(400, e.clientX));
  sidebar.style.width = newWidth + 'px';
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
