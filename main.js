const { app, BrowserWindow, ipcMain, dialog, Menu, inAppPurchase } = require('electron');
const path = require('path');
const fs = require('fs');

const PRODUCT_ID = 'com.eregionlabs.inkblot.fullaccess';
const iconPath = path.join(__dirname, 'build', 'icon_1024.png');

let mainWindow;

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
          label: 'Open',
          accelerator: 'CmdOrCtrl+O',
          click: () => mainWindow.webContents.send('menu-open'),
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
      ],
    },
    {
      label: 'View',
      submenu: [
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

app.whenReady().then(createWindow);

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
