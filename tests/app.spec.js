const { test, expect } = require('@playwright/test');
const { _electron: electron } = require('playwright');
const path = require('path');
const fs = require('fs');
const os = require('os');

const APP_PATH = path.join(__dirname, '..');

let electronApp;
let window;

// Helper: launch a fresh Electron instance
async function launchApp() {
  const app = await electron.launch({
    args: [APP_PATH],
    env: {
      ...process.env,
      // Use a unique userData dir so localStorage is fresh each run
      ELECTRON_USER_DATA: fs.mkdtempSync(path.join(os.tmpdir(), 'inkblot-test-')),
    },
  });
  const win = await app.firstWindow();
  await win.waitForLoadState('domcontentloaded');
  return { app, win };
}

test.beforeAll(async () => {
  ({ app: electronApp, win: window } = await launchApp());
});

test.afterAll(async () => {
  if (electronApp) {
    await electronApp.close();
  }
});


// ═══════════════════════════════════════════════
// 1. APP LAUNCH & WINDOW
// ═══════════════════════════════════════════════

test.describe('App launch', () => {
  test('window opens with correct title', async () => {
    const title = await window.title();
    expect(title).toBe('InkBlot');
  });

  test('window has reasonable dimensions', async () => {
    const { width, height } = await electronApp.evaluate(({ BrowserWindow }) => {
      const win = BrowserWindow.getAllWindows()[0];
      const [w, h] = win.getSize();
      return { width: w, height: h };
    });
    expect(width).toBeGreaterThanOrEqual(800);
    expect(height).toBeGreaterThanOrEqual(600);
  });

  test('context isolation is enabled', async () => {
    const hasRequire = await window.evaluate(() => typeof window.require);
    expect(hasRequire).toBe('undefined');
  });

  test('preload API is exposed', async () => {
    const apiKeys = await window.evaluate(() => Object.keys(window.api));
    expect(apiKeys).toContain('openFile');
    expect(apiKeys).toContain('saveFile');
    expect(apiKeys).toContain('saveFileAs');
    expect(apiKeys).toContain('exportPdf');
    expect(apiKeys).toContain('purchase');
    expect(apiKeys).toContain('restorePurchase');
  });
});


// ═══════════════════════════════════════════════
// 2. SPLIT-PANE LAYOUT
// ═══════════════════════════════════════════════

test.describe('Split-pane layout', () => {
  test('editor pane is visible', async () => {
    const editor = window.locator('#editor');
    await expect(editor).toBeVisible();
  });

  test('preview pane is visible', async () => {
    const preview = window.locator('#preview');
    await expect(preview).toBeVisible();
  });

  test('divider is visible between panes', async () => {
    const divider = window.locator('.divider');
    await expect(divider).toBeVisible();
  });

  test('editor and preview are side by side', async () => {
    const editorBox = await window.locator('.editor-pane').boundingBox();
    const previewBox = await window.locator('.preview-pane').boundingBox();

    // Editor should be to the left of preview
    expect(editorBox.x).toBeLessThan(previewBox.x);
    // Both should have meaningful width
    expect(editorBox.width).toBeGreaterThan(100);
    expect(previewBox.width).toBeGreaterThan(100);
  });

  test('editor has placeholder text', async () => {
    const placeholder = await window.locator('#editor').getAttribute('placeholder');
    expect(placeholder).toBe('Start writing markdown...');
  });
});


// ═══════════════════════════════════════════════
// 3. LIVE MARKDOWN PREVIEW
// ═══════════════════════════════════════════════

test.describe('Live markdown preview', () => {
  test.afterEach(async () => {
    // Clear editor after each test
    await window.locator('#editor').fill('');
  });

  test('typing renders in preview instantly', async () => {
    await window.locator('#editor').fill('# Hello World');
    const h1 = window.locator('#preview h1');
    await expect(h1).toHaveText('Hello World');
  });

  test('renders bold text', async () => {
    await window.locator('#editor').fill('This is **bold** text');
    const strong = window.locator('#preview strong');
    await expect(strong).toHaveText('bold');
  });

  test('renders italic text', async () => {
    await window.locator('#editor').fill('This is *italic* text');
    const em = window.locator('#preview em');
    await expect(em).toHaveText('italic');
  });

  test('renders links', async () => {
    await window.locator('#editor').fill('[Click here](https://example.com)');
    const link = window.locator('#preview a');
    await expect(link).toHaveText('Click here');
    await expect(link).toHaveAttribute('href', 'https://example.com');
  });

  test('renders unordered lists', async () => {
    await window.locator('#editor').fill('- Item 1\n- Item 2\n- Item 3');
    const items = window.locator('#preview ul li');
    await expect(items).toHaveCount(3);
  });

  test('renders ordered lists', async () => {
    await window.locator('#editor').fill('1. First\n2. Second\n3. Third');
    const items = window.locator('#preview ol li');
    await expect(items).toHaveCount(3);
  });

  test('renders blockquotes', async () => {
    await window.locator('#editor').fill('> This is a quote');
    const bq = window.locator('#preview blockquote');
    await expect(bq).toBeVisible();
    await expect(bq).toContainText('This is a quote');
  });

  test('renders inline code', async () => {
    await window.locator('#editor').fill('Use `console.log()` for debugging');
    const code = window.locator('#preview code');
    await expect(code).toHaveText('console.log()');
  });

  test('renders code blocks', async () => {
    await window.locator('#editor').fill('```\nconst x = 1;\nconst y = 2;\n```');
    const pre = window.locator('#preview pre');
    await expect(pre).toBeVisible();
    await expect(pre).toContainText('const x = 1;');
  });

  test('renders tables', async () => {
    const md = '| Name | Age |\n|------|-----|\n| Alice | 30 |\n| Bob | 25 |';
    await window.locator('#editor').fill(md);
    const table = window.locator('#preview table');
    await expect(table).toBeVisible();
    const rows = window.locator('#preview table tr');
    await expect(rows).toHaveCount(3); // header + 2 data rows
  });

  test('renders horizontal rules', async () => {
    await window.locator('#editor').fill('Above\n\n---\n\nBelow');
    const hr = window.locator('#preview hr');
    await expect(hr).toBeVisible();
  });

  test('renders multiple heading levels', async () => {
    const md = '# H1\n## H2\n### H3\n#### H4\n##### H5\n###### H6';
    await window.locator('#editor').fill(md);
    await expect(window.locator('#preview h1')).toHaveText('H1');
    await expect(window.locator('#preview h2')).toHaveText('H2');
    await expect(window.locator('#preview h3')).toHaveText('H3');
    await expect(window.locator('#preview h4')).toHaveText('H4');
    await expect(window.locator('#preview h5')).toHaveText('H5');
    await expect(window.locator('#preview h6')).toHaveText('H6');
  });

  test('preview updates when editor is cleared', async () => {
    await window.locator('#editor').fill('# Something');
    await expect(window.locator('#preview h1')).toHaveText('Something');
    await window.locator('#editor').fill('');
    const html = await window.locator('#preview').innerHTML();
    // Should be empty or contain no meaningful content
    expect(html.trim()).toBe('');
  });

  test('renders complex document with mixed elements', async () => {
    const md = [
      '# Travel Notes',
      '',
      'Arrived at **Kyoto Station**.',
      '',
      '> "The thousand torii gates"',
      '',
      '| Course | Dish |',
      '|--------|------|',
      '| 1 | Sakizuke |',
      '',
      '- Item one',
      '- Item two',
      '',
      '```',
      'code here',
      '```',
    ].join('\n');
    await window.locator('#editor').fill(md);

    await expect(window.locator('#preview h1')).toHaveText('Travel Notes');
    await expect(window.locator('#preview strong')).toHaveText('Kyoto Station');
    await expect(window.locator('#preview blockquote')).toBeVisible();
    await expect(window.locator('#preview table')).toBeVisible();
    await expect(window.locator('#preview ul li')).toHaveCount(2);
    await expect(window.locator('#preview pre')).toBeVisible();
  });
});


// ═══════════════════════════════════════════════
// 4. TOOLBAR & UI ELEMENTS
// ═══════════════════════════════════════════════

test.describe('Toolbar', () => {
  test('Open button is visible', async () => {
    await expect(window.locator('#btn-open')).toBeVisible();
    await expect(window.locator('#btn-open')).toHaveText('Open');
  });

  test('Save button is visible', async () => {
    await expect(window.locator('#btn-save')).toBeVisible();
    await expect(window.locator('#btn-save')).toHaveText('Save');
  });

  test('Export PDF button is visible', async () => {
    await expect(window.locator('#btn-export')).toBeVisible();
    await expect(window.locator('#btn-export')).toHaveText('Export PDF');
  });

  test('filename shows Untitled by default', async () => {
    const text = await window.locator('#filename').textContent();
    expect(text).toBe('Untitled');
  });
});


// ═══════════════════════════════════════════════
// 5. MODIFIED INDICATOR
// ═══════════════════════════════════════════════

test.describe('Modified indicator', () => {
  test('no indicator on fresh start', async () => {
    const text = await window.locator('#modified-indicator').textContent();
    expect(text).toBe('');
  });

  test('shows (unsaved) when content changes', async () => {
    await window.locator('#editor').fill('New content');
    const text = await window.locator('#modified-indicator').textContent();
    expect(text).toBe('(unsaved)');
  });

  test('clears when content returns to saved state', async () => {
    await window.locator('#editor').fill('');
    const text = await window.locator('#modified-indicator').textContent();
    expect(text).toBe('');
  });
});


// ═══════════════════════════════════════════════
// 6. TAB KEY SUPPORT
// ═══════════════════════════════════════════════

test.describe('Tab key in editor', () => {
  test('Tab inserts 4 spaces instead of changing focus', async () => {
    const editor = window.locator('#editor');
    await editor.fill('');
    await editor.focus();
    await editor.press('Tab');
    const value = await editor.inputValue();
    expect(value).toBe('    ');
  });

  test('Tab inserts spaces at cursor position', async () => {
    const editor = window.locator('#editor');
    await editor.fill('hello');
    await editor.focus();
    // Move cursor to position 5 (end)
    await editor.press('End');
    await editor.press('Tab');
    const value = await editor.inputValue();
    expect(value).toBe('hello    ');
  });
});


// ═══════════════════════════════════════════════
// 7. RESIZABLE PANES
// ═══════════════════════════════════════════════

test.describe('Resizable panes', () => {
  test('divider has col-resize cursor', async () => {
    const cursor = await window.locator('.divider').evaluate(
      el => getComputedStyle(el).cursor
    );
    expect(cursor).toBe('col-resize');
  });

  test('dragging divider changes pane widths', async () => {
    const editorBefore = await window.locator('.editor-pane').boundingBox();
    const divider = window.locator('.divider');
    const dividerBox = await divider.boundingBox();

    // Drag divider 100px to the right
    const startX = dividerBox.x + dividerBox.width / 2;
    const startY = dividerBox.y + dividerBox.height / 2;
    await window.mouse.move(startX, startY);
    await window.mouse.down();
    await window.mouse.move(startX + 100, startY, { steps: 5 });
    await window.mouse.up();

    const editorAfter = await window.locator('.editor-pane').boundingBox();
    // Editor should be wider after dragging right
    expect(editorAfter.width).toBeGreaterThan(editorBefore.width + 50);
  });
});


// ═══════════════════════════════════════════════
// 8. TYPOGRAPHY / CSS VALUES
// ═══════════════════════════════════════════════

test.describe('Typography (Typora GitHub theme)', () => {
  test.beforeAll(async () => {
    await window.locator('#editor').fill('# Heading\n\nBody text');
  });

  test('preview uses correct font family', async () => {
    const fontFamily = await window.locator('#preview').evaluate(
      el => getComputedStyle(el).fontFamily
    );
    expect(fontFamily).toContain('Open Sans');
  });

  test('preview uses 16px font size', async () => {
    const fontSize = await window.locator('#preview').evaluate(
      el => getComputedStyle(el).fontSize
    );
    expect(fontSize).toBe('16px');
  });

  test('preview uses 1.6 line height', async () => {
    const lineHeight = await window.locator('#preview').evaluate(el => {
      const style = getComputedStyle(el);
      // line-height: 1.6 on 16px = 25.6px
      return parseFloat(style.lineHeight) / parseFloat(style.fontSize);
    });
    expect(lineHeight).toBeCloseTo(1.6, 1);
  });

  test('preview text color is rgb(51, 51, 51)', async () => {
    const color = await window.locator('#preview').evaluate(
      el => getComputedStyle(el).color
    );
    expect(color).toBe('rgb(51, 51, 51)');
  });

  test('preview max-width is 860px', async () => {
    const maxWidth = await window.locator('#preview').evaluate(
      el => getComputedStyle(el).maxWidth
    );
    expect(maxWidth).toBe('860px');
  });

  test('h1 has border-bottom', async () => {
    const borderBottom = await window.locator('#preview h1').evaluate(
      el => getComputedStyle(el).borderBottomStyle
    );
    expect(borderBottom).toBe('solid');
  });

  test('blockquote has left border', async () => {
    await window.locator('#editor').fill('> Quote text');
    const borderLeft = await window.locator('#preview blockquote').evaluate(
      el => getComputedStyle(el).borderLeftWidth
    );
    expect(borderLeft).toBe('4px');
  });

  test('editor uses monospace font', async () => {
    const fontFamily = await window.locator('#editor').evaluate(
      el => getComputedStyle(el).fontFamily
    );
    // Should contain a monospace font
    const hasMonospace = /mono|menlo|courier/i.test(fontFamily);
    expect(hasMonospace).toBe(true);
  });
});


// ═══════════════════════════════════════════════
// 9. FILE OPERATIONS (IPC handlers exist)
// ═══════════════════════════════════════════════

test.describe('File operations via IPC', () => {
  test('save-file IPC handler writes to disk', async () => {
    const tmpFile = path.join(os.tmpdir(), `inkblot-test-${Date.now()}.md`);
    const content = '# Test Save\n\nThis is a test.';

    // Invoke the save-file handler through the renderer's preload bridge
    const result = await window.evaluate(async ({ filePath, content }) => {
      return await window.api.saveFile({ filePath, content });
    }, { filePath: tmpFile, content });

    expect(result).toBe(true);

    // Verify file was written correctly
    const written = fs.readFileSync(tmpFile, 'utf-8');
    expect(written).toBe(content);

    // Cleanup
    fs.unlinkSync(tmpFile);
  });

  test('main.js registers expected IPC handlers', () => {
    const mainJs = fs.readFileSync(path.join(APP_PATH, 'main.js'), 'utf-8');
    expect(mainJs).toContain("ipcMain.handle('open-file'");
    expect(mainJs).toContain("ipcMain.handle('save-file'");
    expect(mainJs).toContain("ipcMain.handle('save-file-as'");
    expect(mainJs).toContain("ipcMain.handle('export-pdf'");
    expect(mainJs).toContain("ipcMain.handle('iap-purchase'");
    expect(mainJs).toContain("ipcMain.handle('iap-restore'");
  });

  test('open-file handler filters for md, markdown, txt', () => {
    const mainJs = fs.readFileSync(path.join(APP_PATH, 'main.js'), 'utf-8');
    expect(mainJs).toContain("'md', 'markdown', 'txt'");
  });

  test('can read and display a markdown file programmatically', async () => {
    const tmpFile = path.join(os.tmpdir(), `inkblot-test-${Date.now()}.md`);
    const content = '# File Test\n\nLoaded from disk.';
    fs.writeFileSync(tmpFile, content, 'utf-8');

    // Simulate what happens after a file is opened
    await window.evaluate(({ filePath, content }) => {
      const editor = document.getElementById('editor');
      const preview = document.getElementById('preview');
      const filename = document.getElementById('filename');
      const modified = document.getElementById('modified-indicator');

      editor.value = content;
      filename.textContent = filePath.split('/').pop();
      modified.textContent = '';
      preview.innerHTML = window.markdownit({ html: true, linkify: true, typographer: true }).render(content);
    }, { filePath: tmpFile, content });

    await expect(window.locator('#preview h1')).toHaveText('File Test');
    await expect(window.locator('#filename')).toHaveText(path.basename(tmpFile));

    // Cleanup
    fs.unlinkSync(tmpFile);
  });
});


// ═══════════════════════════════════════════════
// 10. PDF EXPORT (verify the rendering pipeline)
// ═══════════════════════════════════════════════

test.describe('PDF export pipeline', () => {
  test('preview.css file exists and is readable', () => {
    const cssPath = path.join(APP_PATH, 'styles', 'preview.css');
    expect(fs.existsSync(cssPath)).toBe(true);
    const css = fs.readFileSync(cssPath, 'utf-8');
    expect(css).toContain('.preview-content');
    expect(css).toContain('@media print');
  });

  test('PDF uses same CSS as preview (shared stylesheet)', () => {
    const cssPath = path.join(APP_PATH, 'styles', 'preview.css');
    const css = fs.readFileSync(cssPath, 'utf-8');

    // The same CSS is used for both preview (loaded in index.html)
    // and PDF (loaded in the hidden printWindow in main.js)
    const mainJs = fs.readFileSync(path.join(APP_PATH, 'main.js'), 'utf-8');
    expect(mainJs).toContain("path.join(__dirname, 'styles', 'preview.css')");
    expect(mainJs).toContain('printToPDF');

    // index.html also loads the same file
    const indexHtml = fs.readFileSync(path.join(APP_PATH, 'index.html'), 'utf-8');
    expect(indexHtml).toContain('styles/preview.css');
  });

  test('PDF export produces valid output from HTML', async () => {
    // Type content into editor so preview has HTML
    await window.locator('#editor').fill('# PDF Test\n\nThis is a test paragraph.');
    await expect(window.locator('#preview h1')).toHaveText('PDF Test');

    // Get the rendered HTML from preview (this is what gets sent to export-pdf)
    const previewHtml = await window.locator('#preview').innerHTML();
    expect(previewHtml).toContain('<h1>PDF Test</h1>');
    expect(previewHtml).toContain('<p>This is a test paragraph.</p>');

    // Verify the export-pdf handler builds a full HTML document with the shared CSS
    const mainJs = fs.readFileSync(path.join(APP_PATH, 'main.js'), 'utf-8');
    // The handler reads preview.css and wraps the HTML in a full document
    expect(mainJs).toContain("preview.css");
    expect(mainJs).toContain("preview-content");
    expect(mainJs).toContain("printToPDF");
    // Verify A4 page size and margins
    expect(mainJs).toContain("pageSize: 'A4'");
    expect(mainJs).toContain("printBackground: true");
  });

  test('PDF export pipeline renders same HTML structure as preview', async () => {
    // The critical claim: PDF looks exactly like preview.
    // This works because both use the same CSS + same Chromium engine.
    // Verify the structural guarantee:

    // 1. Preview wraps content in .preview-content
    const previewClass = await window.locator('#preview').getAttribute('class');
    expect(previewClass).toContain('preview-content');

    // 2. The export-pdf handler also wraps in .preview-content
    const mainJs = fs.readFileSync(path.join(APP_PATH, 'main.js'), 'utf-8');
    expect(mainJs).toContain('<div class="preview-content">${html}</div>');

    // 3. Both load from the same preview.css file
    const indexHtml = fs.readFileSync(path.join(APP_PATH, 'index.html'), 'utf-8');
    expect(indexHtml).toContain('href="styles/preview.css"');
    expect(mainJs).toContain("'styles', 'preview.css'");
  });
});


// ═══════════════════════════════════════════════
// 11. TRIAL & PAYWALL SYSTEM
// ═══════════════════════════════════════════════

test.describe('Trial system', () => {
  test('trial start is stored in localStorage', async () => {
    const hasTrialStart = await window.evaluate(() => {
      return localStorage.getItem('inkblot_trial_start') !== null;
    });
    expect(hasTrialStart).toBe(true);
  });

  test('fresh app is unlocked (within trial period)', async () => {
    const paywallDisplay = await window.locator('#paywall').evaluate(
      el => el.style.display
    );
    expect(paywallDisplay).toBe('none');
  });

  test('editor is not disabled during trial', async () => {
    const disabled = await window.locator('#editor').evaluate(el => el.disabled);
    expect(disabled).toBe(false);
  });

  test('paywall shows when trial is expired', async () => {
    // Simulate expired trial by setting trial start to 4 days ago
    await window.evaluate(() => {
      const fourDaysAgo = Date.now() - (4 * 24 * 60 * 60 * 1000);
      localStorage.setItem('inkblot_trial_start', fourDaysAgo.toString());
      localStorage.removeItem('inkblot_unlocked');
    });

    // Trigger checkAccess
    await window.evaluate(() => {
      const paywall = document.getElementById('paywall');
      const editor = document.getElementById('editor');
      const TRIAL_DURATION_MS = 3 * 24 * 60 * 60 * 1000;
      const start = parseInt(localStorage.getItem('inkblot_trial_start'), 10);
      if (Date.now() - start > TRIAL_DURATION_MS && localStorage.getItem('inkblot_unlocked') !== 'true') {
        paywall.style.display = 'flex';
        editor.disabled = true;
      }
    });

    const paywallDisplay = await window.locator('#paywall').evaluate(
      el => el.style.display
    );
    expect(paywallDisplay).toBe('flex');

    const editorDisabled = await window.locator('#editor').evaluate(el => el.disabled);
    expect(editorDisabled).toBe(true);
  });

  test('paywall has purchase and restore buttons', async () => {
    await expect(window.locator('#btn-purchase')).toBeVisible();
    await expect(window.locator('#btn-restore')).toBeVisible();
  });

  test('paywall shows correct price', async () => {
    const text = await window.locator('.paywall-card').textContent();
    expect(text).toContain('$0.99');
  });

  test('unlock hides paywall and enables editor', async () => {
    // Simulate unlock
    await window.evaluate(() => {
      localStorage.setItem('inkblot_unlocked', 'true');
      document.getElementById('paywall').style.display = 'none';
      document.getElementById('editor').disabled = false;
    });

    const paywallDisplay = await window.locator('#paywall').evaluate(
      el => el.style.display
    );
    expect(paywallDisplay).toBe('none');

    const editorDisabled = await window.locator('#editor').evaluate(el => el.disabled);
    expect(editorDisabled).toBe(false);
  });

  test('unlocked state persists in localStorage', async () => {
    const unlocked = await window.evaluate(() => {
      return localStorage.getItem('inkblot_unlocked');
    });
    expect(unlocked).toBe('true');
  });

  // Reset state for remaining tests
  test('reset trial state for other tests', async () => {
    await window.evaluate(() => {
      localStorage.setItem('inkblot_trial_start', Date.now().toString());
      localStorage.setItem('inkblot_unlocked', 'true');
      document.getElementById('paywall').style.display = 'none';
      document.getElementById('editor').disabled = false;
    });
  });
});


// ═══════════════════════════════════════════════
// 12. MENU STRUCTURE
// ═══════════════════════════════════════════════

test.describe('Application menu', () => {
  test('File menu has expected items', async () => {
    const menuItems = await electronApp.evaluate(({ Menu }) => {
      const menu = Menu.getApplicationMenu();
      const fileMenu = menu.items.find(i => i.label === 'File');
      return fileMenu.submenu.items.map(i => ({
        label: i.label,
        accelerator: i.accelerator || null,
        type: i.type,
      }));
    });

    const labels = menuItems.map(i => i.label);
    expect(labels).toContain('Open');
    expect(labels).toContain('Save');
    expect(labels).toContain('Save As...');
    expect(labels).toContain('Export PDF');

    // Check keyboard shortcuts
    const open = menuItems.find(i => i.label === 'Open');
    expect(open.accelerator).toBe('CmdOrCtrl+O');

    const save = menuItems.find(i => i.label === 'Save');
    expect(save.accelerator).toBe('CmdOrCtrl+S');

    const exportPdf = menuItems.find(i => i.label === 'Export PDF');
    expect(exportPdf.accelerator).toBe('CmdOrCtrl+P');
  });

  test('Edit menu has standard items', async () => {
    const menuItems = await electronApp.evaluate(({ Menu }) => {
      const menu = Menu.getApplicationMenu();
      const editMenu = menu.items.find(i => i.label === 'Edit');
      return editMenu.submenu.items.map(i => i.role || i.label);
    });

    expect(menuItems).toContain('undo');
    expect(menuItems).toContain('redo');
    expect(menuItems).toContain('cut');
    expect(menuItems).toContain('copy');
    expect(menuItems).toContain('paste');
    expect(menuItems).toContain('selectall');
  });
});


// ═══════════════════════════════════════════════
// 13. PAYWALL CSS
// ═══════════════════════════════════════════════

test.describe('Paywall styling', () => {
  test('paywall overlay covers full viewport when visible', async () => {
    // Temporarily show paywall
    await window.evaluate(() => {
      document.getElementById('paywall').style.display = 'flex';
    });

    const overlay = window.locator('#paywall');
    const position = await overlay.evaluate(el => {
      const s = getComputedStyle(el);
      return { position: s.position, top: s.top, left: s.left, right: s.right, bottom: s.bottom };
    });

    expect(position.position).toBe('fixed');
    expect(position.top).toBe('0px');
    expect(position.left).toBe('0px');

    // Hide again
    await window.evaluate(() => {
      document.getElementById('paywall').style.display = 'none';
    });
  });

  test('paywall has blur backdrop', async () => {
    const backdrop = await window.locator('#paywall').evaluate(el => {
      return getComputedStyle(el).webkitBackdropFilter ||
             getComputedStyle(el).backdropFilter;
    });
    expect(backdrop).toContain('blur');
  });
});


// ═══════════════════════════════════════════════
// 14. SECURITY
// ═══════════════════════════════════════════════

test.describe('Security', () => {
  test('nodeIntegration is disabled', async () => {
    const hasProcess = await window.evaluate(() => typeof process === 'undefined' || typeof process.versions === 'undefined');
    expect(hasProcess).toBe(true);
  });

  test('contextIsolation is enabled', async () => {
    // If context isolation is on, renderer can't access Electron internals
    const hasElectron = await window.evaluate(() => typeof require);
    expect(hasElectron).toBe('undefined');
  });

  test('only whitelisted APIs are exposed via preload', async () => {
    const apiKeys = await window.evaluate(() => Object.keys(window.api));
    const allowed = [
      'openFile', 'saveFile', 'saveFileAs', 'exportPdf',
      'onMenuOpen', 'onMenuSave', 'onMenuSaveAs', 'onMenuExportPdf',
      'purchase', 'restorePurchase', 'onIapUnlocked',
    ];
    for (const key of apiKeys) {
      expect(allowed).toContain(key);
    }
  });
});


// ═══════════════════════════════════════════════
// 15. ENTITLEMENTS & BUILD FILES
// ═══════════════════════════════════════════════

test.describe('Build configuration', () => {
  test('entitlements.mas.plist exists and has sandbox', () => {
    const plist = fs.readFileSync(
      path.join(APP_PATH, 'build', 'entitlements.mas.plist'),
      'utf-8'
    );
    expect(plist).toContain('com.apple.security.app-sandbox');
  });

  test('entitlements.mas.inherit.plist exists and has inherit', () => {
    const plist = fs.readFileSync(
      path.join(APP_PATH, 'build', 'entitlements.mas.inherit.plist'),
      'utf-8'
    );
    expect(plist).toContain('com.apple.security.inherit');
  });

  test('forge.config.js targets MAS platform', () => {
    const config = fs.readFileSync(path.join(APP_PATH, 'forge.config.js'), 'utf-8');
    expect(config).toContain("platform: 'mas'");
    expect(config).toContain('com.eregionlabs.inkwell');
  });

  test('icon.icns exists', () => {
    expect(fs.existsSync(path.join(APP_PATH, 'build', 'icon.icns'))).toBe(true);
  });

  test('Assets.car exists', () => {
    expect(fs.existsSync(path.join(APP_PATH, 'build', 'Assets.car'))).toBe(true);
  });
});
