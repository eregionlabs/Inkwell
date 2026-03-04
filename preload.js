const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  openFile: () => ipcRenderer.invoke('open-file'),
  openFolder: () => ipcRenderer.invoke('open-folder'),
  readFile: (filePath) => ipcRenderer.invoke('read-file', filePath),
  saveFile: (data) => ipcRenderer.invoke('save-file', data),
  saveFileAs: (data) => ipcRenderer.invoke('save-file-as', data),
  exportPdf: (data) => ipcRenderer.invoke('export-pdf', data),
  watchFolder: (dirPath) => ipcRenderer.invoke('watch-folder', dirPath),
  unwatchFolder: () => ipcRenderer.invoke('unwatch-folder'),
  checkUnsaved: (fileName) => ipcRenderer.invoke('check-unsaved', fileName),
  setTitle: (title) => ipcRenderer.invoke('set-title', title),

  onMenuNew: (cb) => ipcRenderer.on('menu-new', cb),
  onMenuOpen: (cb) => ipcRenderer.on('menu-open', cb),
  onMenuOpenFolder: (cb) => ipcRenderer.on('menu-open-folder', cb),
  onMenuSave: (cb) => ipcRenderer.on('menu-save', cb),
  onMenuSaveAs: (cb) => ipcRenderer.on('menu-save-as', cb),
  onMenuExportPdf: (cb) => ipcRenderer.on('menu-export-pdf', cb),
  onMenuTogglePreview: (cb) => ipcRenderer.on('menu-toggle-preview', cb),
  onMenuToggleSidebar: (cb) => ipcRenderer.on('menu-toggle-sidebar', cb),
  onMenuFind: (cb) => ipcRenderer.on('menu-find', cb),

  // Find in page
  findInPage: (text, options) => ipcRenderer.invoke('find-in-page', text, options),
  stopFind: () => ipcRenderer.invoke('stop-find'),
  onFindResult: (cb) => ipcRenderer.on('find-result', (event, result) => cb(result)),

  // Folder sync
  onFolderChanged: (cb) => ipcRenderer.on('folder-changed', (event, tree) => cb(tree)),

  // In-app purchase
  purchase: () => ipcRenderer.invoke('iap-purchase'),
  restorePurchase: () => ipcRenderer.invoke('iap-restore'),
  onIapUnlocked: (cb) => ipcRenderer.on('iap-unlocked', cb),
});
