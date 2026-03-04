const { app, BrowserWindow, ipcMain, dialog, Menu, inAppPurchase } = require('electron');
const path = require('path');
const fs = require('fs');

const PRODUCT_ID = 'com.eregionlabs.inkblot.fullaccess';
const iconPath = path.join(__dirname, 'build', 'icon_dock.png');

let mainWindow;
let watchedFolder = null;
let fsWatcher = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    title: 'InkBlot',
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Set dock icon for development mode
  if (app.dock) {
    app.dock.setIcon(iconPath);
  }

  mainWindow.loadFile('index.html');

  const menu = Menu.buildFromTemplate([
    {
      label: 'File',
      submenu: [
        {
          label: 'New File',
          accelerator: 'CmdOrCtrl+N',
          click: () => mainWindow.webContents.send('menu-new'),
        },
        {
          label: 'Open File',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow.webContents.send('menu-open'),
        },
        {
          label: 'Open Folder',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: () => mainWindow.webContents.send('menu-open-folder'),
        },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => mainWindow.webContents.send('menu-save'),
        },
        {
          label: 'Save As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => mainWindow.webContents.send('menu-save-as'),
        },
        { type: 'separator' },
        {
          label: 'Export PDF',
          accelerator: 'CmdOrCtrl+P',
          click: () => mainWindow.webContents.send('menu-export-pdf'),
        },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' },
        { type: 'separator' },
        {
          label: 'Find',
          accelerator: 'CmdOrCtrl+F',
          click: () => mainWindow.webContents.send('menu-find'),
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Toggle Preview',
          accelerator: 'CmdOrCtrl+Shift+P',
          click: () => mainWindow.webContents.send('menu-toggle-preview'),
        },
        {
          label: 'Toggle Sidebar',
          accelerator: 'CmdOrCtrl+B',
          click: () => mainWindow.webContents.send('menu-toggle-sidebar'),
        },
        { type: 'separator' },
        { role: 'toggleDevTools' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { role: 'togglefullscreen' },
      ],
    },
  ]);
  Menu.setApplicationMenu(menu);
}

app.whenReady().then(() => {
  createWindow();

  // Relay find-in-page results back to renderer
  mainWindow.webContents.on('found-in-page', (event, result) => {
    mainWindow.webContents.send('find-result', {
      activeMatchOrdinal: result.activeMatchOrdinal,
      matches: result.matches,
    });
  });
});

ipcMain.handle('find-in-page', (event, text, options) => {
  if (!text) {
    mainWindow.webContents.stopFindInPage('clearSelection');
    return;
  }
  mainWindow.webContents.findInPage(text, options || {});
});

ipcMain.handle('stop-find', () => {
  mainWindow.webContents.stopFindInPage('clearSelection');
});

app.on('window-all-closed', () => {
  app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

// --- IPC Handlers ---

ipcMain.handle('open-file', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    filters: [
      { name: 'Markdown', extensions: ['md', 'markdown', 'txt'] },
      { name: 'All Files', extensions: ['*'] },
    ],
    properties: ['openFile'],
  });
  if (result.canceled) return null;
  const filePath = result.filePaths[0];
  const content = fs.readFileSync(filePath, 'utf-8');
  return { filePath, content };
});

ipcMain.handle('open-folder', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openDirectory'],
  });
  if (result.canceled) return null;
  const dirPath = result.filePaths[0];
  const tree = readDirTree(dirPath, dirPath);
  return { dirPath, tree };
});

function readDirTree(dirPath, rootPath, depth = 0) {
  const entries = [];
  let items;
  try {
    items = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return entries;
  }
  // Sort: folders first, then files, alphabetical within each
  items.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  });
  for (const item of items) {
    if (item.name.startsWith('.')) continue; // skip hidden
    if (item.name === 'node_modules') continue;
    const fullPath = path.join(dirPath, item.name);
    if (item.isDirectory()) {
      entries.push({
        name: item.name,
        path: fullPath,
        type: 'folder',
        depth,
        children: depth < 5 ? readDirTree(fullPath, rootPath, depth + 1) : [],
      });
    } else {
      entries.push({
        name: item.name,
        path: fullPath,
        type: 'file',
        depth,
      });
    }
  }
  return entries;
}

ipcMain.handle('read-file', async (event, filePath) => {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return { filePath, content };
  } catch (err) {
    return null;
  }
});

ipcMain.handle('watch-folder', (event, dirPath) => {
  if (fsWatcher) {
    fsWatcher.close();
    fsWatcher = null;
  }
  watchedFolder = dirPath;
  if (!dirPath) return;
  let debounceTimer = null;
  try {
    fsWatcher = fs.watch(dirPath, { recursive: true }, () => {
      // Debounce: rapid changes (git, bulk ops) trigger one refresh
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (mainWindow && watchedFolder) {
          const tree = readDirTree(watchedFolder, watchedFolder);
          mainWindow.webContents.send('folder-changed', tree);
        }
      }, 300);
    });
  } catch {
    // Folder may not be watchable
  }
});

ipcMain.handle('unwatch-folder', () => {
  if (fsWatcher) {
    fsWatcher.close();
    fsWatcher = null;
  }
  watchedFolder = null;
});

ipcMain.handle('check-unsaved', async (event, fileName) => {
  const result = await dialog.showMessageBox(mainWindow, {
    type: 'warning',
    buttons: ['Save', "Don't Save", 'Cancel'],
    defaultId: 0,
    cancelId: 2,
    message: `"${fileName}" has unsaved changes.`,
    detail: 'Do you want to save before continuing?',
  });
  return result.response; // 0=Save, 1=Don't Save, 2=Cancel
});

ipcMain.handle('set-title', (event, title) => {
  if (mainWindow) mainWindow.setTitle(title);
});

ipcMain.handle('save-file', async (event, { filePath, content }) => {
  fs.writeFileSync(filePath, content, 'utf-8');
  return true;
});

ipcMain.handle('save-file-as', async (event, { content }) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    filters: [
      { name: 'Markdown', extensions: ['md'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  if (result.canceled) return null;
  fs.writeFileSync(result.filePath, content, 'utf-8');
  return result.filePath;
});

ipcMain.handle('export-pdf', async (event, { html }) => {
  const previewCss = fs.readFileSync(
    path.join(__dirname, 'styles', 'preview.css'),
    'utf-8'
  );

  const printWindow = new BrowserWindow({
    show: false,
    webPreferences: { offscreen: true },
  });

  const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>${previewCss}</style>
</head>
<body>
  <div class="preview-content">${html}</div>
</body>
</html>`;

  await printWindow.loadURL(
    `data:text/html;charset=utf-8,${encodeURIComponent(fullHtml)}`
  );

  // Margins in inches — ~20mm matches Typora's defaults
  const pdfData = await printWindow.webContents.printToPDF({
    printBackground: true,
    margins: { top: 0.79, bottom: 0.79, left: 0.79, right: 0.79 },
    pageSize: 'A4',
  });

  printWindow.destroy();

  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: 'document.pdf',
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });

  if (result.canceled) return false;
  fs.writeFileSync(result.filePath, pdfData);
  return true;
});

// --- In-App Purchase Handlers ---

ipcMain.handle('iap-purchase', async () => {
  // inAppPurchase is only available in MAS builds; graceful fallback for dev
  if (!inAppPurchase || !inAppPurchase.canMakePayments()) {
    return { success: false, error: 'Purchases not available (non-MAS build)' };
  }
  try {
    const products = await inAppPurchase.getProducts([PRODUCT_ID]);
    if (products.length === 0) {
      return { success: false, error: 'Product not found' };
    }
    inAppPurchase.purchaseProduct(PRODUCT_ID);
    return { success: true, pending: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
});

ipcMain.handle('iap-restore', async () => {
  if (!inAppPurchase || !inAppPurchase.canMakePayments()) {
    return { success: false, error: 'Purchases not available (non-MAS build)' };
  }
  inAppPurchase.restoreCompletedTransactions();
  return { success: true };
});

// Listen for transaction updates (purchase completed/restored)
if (inAppPurchase) {
  inAppPurchase.on('transactions-updated', (event, transactions) => {
    for (const tx of transactions) {
      const isPurchased =
        tx.transactionState === 'purchased' ||
        tx.transactionState === 'restored';
      if (isPurchased && tx.payment.productIdentifier === PRODUCT_ID) {
        if (mainWindow) {
          mainWindow.webContents.send('iap-unlocked');
        }
        inAppPurchase.finishTransactionByDate(tx.transactionDate);
      }
    }
  });
}
