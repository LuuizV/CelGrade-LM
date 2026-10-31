import { app, BrowserWindow, ipcMain } from 'electron';
import { autoUpdater } from 'electron-updater';
import fs from 'node:fs/promises';
import path from 'node:path';
import type { Store } from './storage';

type State = {text:string;ready:boolean;available:boolean;checking:boolean;downloading:boolean;version:string;percent:number;transferred:number;total:number;bytesPerSecond:number};
export function setupUpdates(win: BrowserWindow, store: Store) {
    const enabled=app.isPackaged && process.platform==='win32';
    let checking=false,downloading=false,ready=false,installing=false,available=false,version='';
    let state:State={text:'Versão '+app.getVersion(),ready:false,available:false,checking:false,downloading:false,version:'',percent:0,transferred:0,total:0,bytesPerSecond:0};
    const send=(text:string,progress?:Partial<State>)=>{
        state={...state,...progress,text,ready,available,checking,downloading,version};
        if(!win.isDestroyed())win.webContents.send('update-status',state);
    };
    autoUpdater.autoDownload=false;
    autoUpdater.autoInstallOnAppQuit=false;
    autoUpdater.allowPrerelease=false;
    autoUpdater.allowDowngrade=false;
    autoUpdater.on('update-available',()=>{available=true;});
    autoUpdater.on('update-not-available',()=>{available=false;});
    autoUpdater.on('error',()=>{
        downloading=false;checking=false;win.setProgressBar(-1);
        send('Não foi possível atualizar. Você pode tentar novamente.');
    });
    autoUpdater.on('download-progress',p=>{
        win.setProgressBar(p.percent/100);
        send('Baixando atualização…',{percent:p.percent,transferred:p.transferred,total:p.total,bytesPerSecond:p.bytesPerSecond});
    });
    autoUpdater.on('update-downloaded',()=>{
        ready=true;downloading=false;win.setProgressBar(-1);
        send('Download concluído. Instale quando terminar seu trabalho.',{percent:100});
    });
    async function check(manual:boolean){
        if(!enabled){send('Atualizações disponíveis apenas no aplicativo Windows instalado.');return;}
        if(checking||downloading||installing||ready)return;
        checking=true;
        try{
            if(manual)send('Verificando atualizações…');
            const result=await autoUpdater.checkForUpdates();
            if(!result||!available){if(manual)send('Você já está usando a versão atual: '+app.getVersion());return;}
            version=result.updateInfo.version;
            send('A versão '+version+' está disponível para download.');
        }catch{
            send('Não foi possível consultar atualizações. O aplicativo continua disponível.');
        }finally{checking=false;send(state.text);}
    }
    async function download(){
        if(!enabled||!available||checking||downloading||ready||installing)return;
        downloading=true;
        send('Iniciando download…',{percent:0,transferred:0,total:0,bytesPerSecond:0});
        try{await autoUpdater.downloadUpdate();}
        catch{downloading=false;win.setProgressBar(-1);send('Falha no download. Você pode tentar novamente.');}
    }
    ipcMain.handle('update-state',()=>state);
    ipcMain.handle('update-check',()=>check(true));
    ipcMain.handle('update-download',()=>download());
    ipcMain.handle('update-install',async()=>{
        if(!ready||installing)return false;
        installing=true;
        try{
            const dir=path.join(app.getPath('userData'),'backups-atualizacao');
            await fs.mkdir(dir,{recursive:true});
            const file=path.join(dir,'antes-'+app.getVersion()+'-'+Date.now()+'.json');
            const handle=await fs.open(file,'wx',0o600);
            try{await handle.writeFile(JSON.stringify(store.read(),null,2));await handle.sync();}
            finally{await handle.close();}
            send('Backup criado. O CelGrade será reiniciado com a nova versão…');
            // NSIS instala em modo silencioso após fechar a aplicação; conserva o reinício.
            autoUpdater.quitAndInstall(true,true);
            return true;
        }catch{send('Não foi possível criar o backup ou iniciar o instalador. Seus dados foram preservados.');return false;}
        finally{installing=false;}
    });
    win.webContents.once('did-finish-load',()=>{send(state.text);if(enabled)void check(false);});
}
