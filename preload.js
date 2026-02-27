const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  openFile: () => ipcRenderer.invoke('open-file'),
  saveFile: (data) => ipcRenderer.invoke('save-file', data),
  saveFileAs: (data) => ipcRenderer.invoke('save-file-as', data),
  exportPdf: (data) => ipcRenderer.invoke('export-pdf', data),

  onMenuOpen: (cb) => ipcRenderer.on('menu-open', cb),
  onMenuSave: (cb) => ipcRenderer.on('menu-save', cb),
  onMenuSaveAs: (cb) => ipcRenderer.on('menu-save-as', cb),
  onMenuExportPdf: (cb) => ipcRenderer.on('menu-export-pdf', cb),

  // In-app purchase
  purchase: () => ipcRenderer.invoke('iap-purchase'),
  restorePurchase: () => ipcRenderer.invoke('iap-restore'),
  onIapUnlocked: (cb) => ipcRenderer.on('iap-unlocked', cb),
});
