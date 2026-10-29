const test = require('node:test'), assert = require('node:assert/strict'), vm = require('node:vm'), fs = require('node:fs'), { EventEmitter } = require('node:events');
function harness({ available=true, answers=[0], failBackup=false }={}) {
 const updater=new EventEmitter(), handlers={}, calls=[], messages=[];
 Object.assign(updater,{checkForUpdates:async()=>{if(available)updater.emit('update-available');return {updateInfo:{version:'0.5.0'}}},downloadUpdate:async()=>{calls.push('download');updater.emit('update-downloaded')},quitAndInstall:()=>calls.push('install')});
 const file={writeFile:async data=>{assert.equal(JSON.parse(data).revision,7);calls.push('backup')},sync:async()=>calls.push('sync'),close:async()=>{}};
 const fakeFs={mkdir:async()=>{},open:async()=>{if(failBackup)throw Error('disk');return file}};
 const electron={app:{isPackaged:true,getVersion:()=> '0.4.0',getPath:()=>'/data'},ipcMain:{handle:(n,f)=>handlers[n]=f},dialog:{showMessageBox:async()=>({response:answers.shift()??0})}};
 const exports={}; vm.runInNewContext(fs.readFileSync('dist/updates.js','utf8'),{exports,process:{platform:'win32'},require:n=>n==='electron'?electron:n==='electron-updater'?{autoUpdater:updater}:n==='node:fs/promises'?fakeFs:require(n)});
 exports.setupUpdates({isDestroyed:()=>false,setProgressBar:()=>{},webContents:{send:(_n,s)=>messages.push(s),once:()=>{}}},{read:()=>({revision:7})});
 return {updater,handlers,calls,messages};
}
test('update download requires consent, normal quit cannot auto-install',async()=>{const h=harness();await h.handlers['update-check']();assert.deepEqual(h.calls,[]);assert.equal(h.updater.autoDownload,false);assert.equal(h.updater.autoInstallOnAppQuit,false)});
test('backup is synced before explicitly confirmed installation',async()=>{const h=harness({answers:[1,1]});await h.handlers['update-check']();assert.equal(h.handlers['update-state']().ready,true);await h.handlers['update-install']();assert.deepEqual(h.calls,['download','backup','sync','install'])});
test('backup failure prevents installation',async()=>{const h=harness({answers:[1,1],failBackup:true});await h.handlers['update-check']();assert.equal(await h.handlers['update-install'](),false);assert.deepEqual(h.calls,['download'])});
test('cancel installation preserves downloaded update',async()=>{const h=harness({answers:[1,0]});await h.handlers['update-check']();await h.handlers['update-install']();assert.deepEqual(h.calls,['download']);assert.equal(h.handlers['update-state']().ready,true)});
test('no available release does not download',async()=>{const h=harness({available:false,answers:[1]});await h.handlers['update-check']();assert.deepEqual(h.calls,[])});


test('download rejection without error event allows retry',async()=>{const h=harness({answers:[1,1]});let tries=0;h.updater.downloadUpdate=async()=>{if(++tries===1)throw Error('network');h.updater.emit('update-downloaded')};await h.handlers['update-check']();await h.handlers['update-check']();assert.equal(tries,2);assert.equal(h.handlers['update-state']().ready,true)});
