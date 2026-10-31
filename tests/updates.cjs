const test=require('node:test'),assert=require('node:assert/strict'),vm=require('node:vm'),fs=require('node:fs'),{EventEmitter}=require('node:events');
function harness({available=true,failBackup=false}={}){
 const updater=new EventEmitter(),handlers={},calls=[],messages=[];
 Object.assign(updater,{checkForUpdates:async()=>{updater.emit(available?'update-available':'update-not-available');return {updateInfo:{version:'0.9.2'}}},
 downloadUpdate:async()=>{calls.push('download');updater.emit('download-progress',{percent:42,transferred:42,total:100,bytesPerSecond:10});updater.emit('update-downloaded');},
 quitAndInstall:()=>calls.push('install')});
 const file={writeFile:async data=>{assert.equal(JSON.parse(data).revision,7);calls.push('backup')},sync:async()=>calls.push('sync'),close:async()=>{}};
 const fakeFs={mkdir:async()=>{},open:async()=>{if(failBackup)throw Error('disk');return file}};
 const electron={app:{isPackaged:true,getVersion:()=> '0.9.1',getPath:()=>'/data'},ipcMain:{handle:(n,f)=>handlers[n]=f}};
 const exports={};vm.runInNewContext(fs.readFileSync('dist/updates.js','utf8'),{exports,process:{platform:'win32'},require:n=>n==='electron'?electron:n==='electron-updater'?{autoUpdater:updater}:n==='node:fs/promises'?fakeFs:require(n)});
 exports.setupUpdates({isDestroyed:()=>false,setProgressBar:()=>{},webContents:{send:(_n,s)=>messages.push(s),once:()=>{}}},{read:()=>({revision:7})});
 return {updater,handlers,calls,messages};
}
test('nenhum download ocorre sem consentimento na tela',async()=>{const h=harness();await h.handlers['update-check']();assert.deepEqual(h.calls,[]);assert.equal(h.handlers['update-state']().available,true);assert.equal(h.updater.autoDownload,false);assert.equal(h.updater.autoInstallOnAppQuit,false)});
test('progresso do download disponível para a interface',async()=>{const h=harness();await h.handlers['update-check']();await h.handlers['update-download']();assert.equal(h.handlers['update-state']().ready,true);assert.equal(h.handlers['update-state']().percent,100);assert(h.messages.some(s=>s.percent===42&&s.downloading))});
test('backup sincronizado antes de instalar',async()=>{const h=harness();await h.handlers['update-check']();await h.handlers['update-download']();assert.equal(await h.handlers['update-install'](),true);assert.deepEqual(h.calls,['download','backup','sync','install'])});
test('erro no backup impede instalação',async()=>{const h=harness({failBackup:true});await h.handlers['update-check']();await h.handlers['update-download']();assert.equal(await h.handlers['update-install'](),false);assert.deepEqual(h.calls,['download'])});
test('sem atualização não baixa',async()=>{const h=harness({available:false});await h.handlers['update-check']();await h.handlers['update-download']();assert.deepEqual(h.calls,[])});
test('download pode ser repetido após erro',async()=>{const h=harness();let tries=0;h.updater.downloadUpdate=async()=>{if(++tries===1)throw Error('network');h.updater.emit('update-downloaded')};await h.handlers['update-check']();await h.handlers['update-download']();assert.equal(h.handlers['update-state']().ready,false);await h.handlers['update-download']();assert.equal(tries,2);assert.equal(h.handlers['update-state']().ready,true)});
