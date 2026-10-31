import { app, Menu, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import { setupUpdates } from './updates';
import { Store } from './storage';
import path from 'node:path';
import fs from 'node:fs/promises';
import { empty, validate, DB } from './core';
let win: BrowserWindow;
let store: Store;
const dataPath = () => path.join(app.getPath('userData'), 'celgrade.sqlite');
function read(): DB { return store.read(); }
if (!app.requestSingleInstanceLock())
    app.quit();
else
    app.whenReady().then(() => {
        Menu.setApplicationMenu(null);
        store = new Store(dataPath());
        win = new BrowserWindow({ width: 1440, height: 920, minWidth: 900, minHeight: 600, title: 'CelGrade LM', titleBarStyle: 'hidden', titleBarOverlay: { color: '#135F49', symbolColor: '#FFFFFF', height: 38 }, backgroundColor: '#F6F7F5', webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, sandbox: true } });
        win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
        win.webContents.on('will-navigate', e => e.preventDefault());
        ipcMain.handle('release-seen', () => store.seenRelease());
        ipcMain.handle('release-ack', () => store.markReleaseSeen(app.getVersion()));
        ipcMain.handle('read', () => read());
        ipcMain.handle('save', (_e, next: DB, reason: string) => store.save(next, typeof reason === 'string' ? reason : 'Alteração'));
        ipcMain.handle('history', () => store.history());
        ipcMain.handle('restore-history', (_e, id: number, revision: number) => store.restore(id, revision));
        ipcMain.handle('folder', () => shell.openPath(app.getPath('userData')));
        ipcMain.handle('export', async () => { const out = await dialog.showSaveDialog(win, { defaultPath: 'CelGrade-LM-backup.json', filters: [{ name: 'Backup JSON', extensions: ['json'] }] }); if (!out.canceled && out.filePath) {
            await fs.writeFile(out.filePath, JSON.stringify(read(), null, 2));
            return true;
        } return false; });
        ipcMain.handle('import', async () => { const pick = await dialog.showOpenDialog(win, { filters: [{ name: 'Backup CelGrade LM', extensions: ['json'] }], properties: ['openFile'] }); if (pick.canceled)
            return null; const stat = await fs.stat(pick.filePaths[0]); if (stat.size > 10e6)
            throw Error('Backup maior que 10 MB'); const d = JSON.parse(await fs.readFile(pick.filePaths[0], 'utf8')); validate(d); d.revision = read().revision; return d; });
        ipcMain.handle('pdf', async () => { const out = await dialog.showSaveDialog(win, { defaultPath: 'CelGrade-LM.pdf', filters: [{ name: 'PDF', extensions: ['pdf'] }] }); if (out.canceled || !out.filePath)
            return false; const bytes = await win.webContents.printToPDF({ landscape: true, printBackground: true, pageSize: 'A4', preferCSSPageSize: true }); await fs.writeFile(out.filePath, bytes); return true; });
        app.on('second-instance', () => { if (win.isMinimized())
            win.restore(); win.focus(); });
        setupUpdates(win, store);
        win.loadFile(path.join(__dirname, '../web/index.html'));
    }).catch(error => { dialog.showErrorBox('CelGrade LM — não foi possível abrir', String(error) + '\nNenhum banco foi apagado. Preserve a pasta de dados.'); app.quit(); });
app.on('window-all-closed', () => app.quit());
app.on('before-quit', () => store?.close());


