import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Store } from './storage';
export function setupUpdates(win: BrowserWindow, store: Store) {
    const enabled = app.isPackaged && process.platform === 'win32';
    let available = false;
    autoUpdater.on('update-available', () => { available = true; });
    let checking = false, downloading = false, ready = false, installing = false;
    let state = { text: 'Versão ' + app.getVersion(), ready: false };
    const send = (text: string) => { state = { text, ready }; if (!win.isDestroyed()) win.webContents.send('update-status', state); };
    autoUpdater.autoDownload = false;
    autoUpdater.autoInstallOnAppQuit = false;
    autoUpdater.allowPrerelease = false;
    autoUpdater.allowDowngrade = false;
    autoUpdater.on('error', () => { downloading = false; win.setProgressBar(-1); send('Não foi possível atualizar. Você pode continuar usando o programa e tentar novamente.'); });
    autoUpdater.on('download-progress', p => { win.setProgressBar(p.percent / 100); send(`Baixando atualização: ${Math.floor(p.percent)}%`); });
    autoUpdater.on('update-downloaded', () => { ready = true; downloading = false; win.setProgressBar(-1); send('Atualização pronta. Clique em Instalar e reiniciar quando terminar seu trabalho.'); });
    async function check(manual: boolean) {
        if (!enabled) { send('Atualizações disponíveis na versão instalada para Windows.'); return; }
        if (checking || downloading || installing || ready) return;
        checking = true; available = false;
        try {
            if (manual) send('Verificando atualizações…');
            const result = await autoUpdater.checkForUpdates();
            if (!result || !available) { if (manual) send('Você já está usando a versão atual: ' + app.getVersion()); return; }
            const answer = await dialog.showMessageBox(win, { type: 'info', title: 'CelGrade LM — nova versão', message: `A versão ${result.updateInfo.version} está disponível. Deseja baixar?`, detail: 'Você poderá continuar trabalhando durante o download. A instalação só acontecerá quando você escolher reiniciar.', buttons: ['Agora não', 'Baixar atualização'], defaultId: 0, cancelId: 0 });
            if (answer.response === 1) { downloading = true; send('Iniciando download…'); await autoUpdater.downloadUpdate(); }
        } catch { send('Não foi possível consultar ou baixar atualizações. O programa continua disponível.'); }
        finally { checking = false; }
    }
    ipcMain.handle('update-state', () => state);
    ipcMain.handle('update-check', () => check(true));
    ipcMain.handle('update-install', async () => {
        if (!ready || installing) return false;
        installing = true;
        try {
            const answer = await dialog.showMessageBox(win, { type: 'question', title: 'Instalar atualização', message: 'Criar um backup e reiniciar para instalar?', detail: 'Os dados salvos serão preservados. Conclua suas edições antes de continuar.', buttons: ['Agora não', 'Instalar e reiniciar'], defaultId: 0, cancelId: 0 });
            if (answer.response !== 1) return false;
            const dir = path.join(app.getPath('userData'), 'backups-atualizacao');
            await fs.mkdir(dir, { recursive: true });
            const file = path.join(dir, `antes-${app.getVersion()}-${Date.now()}.json`);
            const handle = await fs.open(file, 'wx', 0o600);
            try { await handle.writeFile(JSON.stringify(store.read(), null, 2)); await handle.sync(); } finally { await handle.close(); }
            autoUpdater.quitAndInstall(false, true);
            return true;
        } catch { send('Instalação cancelada: não foi possível preparar o backup ou iniciar o instalador. Seus dados foram preservados.'); return false; }
        finally { installing = false; }
    });
    win.webContents.once('did-finish-load', () => { send(state.text); if (enabled) void check(false); });
}
