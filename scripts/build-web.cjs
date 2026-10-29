const fs=require('fs');
const manifest=JSON.parse(fs.readFileSync('package.json','utf8'));
const releases=JSON.parse(fs.readFileSync('changelog.json','utf8'));
if(!Array.isArray(releases)||releases[0]?.version!==manifest.version)throw Error('Registre as mudanças da versão atual em changelog.json antes de compilar.');
const versions=new Set();let previous;
for(const r of releases){
 if(!/^\d+\.\d+\.\d+$/.test(r.version)||versions.has(r.version)||!/^\d{4}-\d{2}-\d{2}$/.test(r.date)||!r.title||!Object.values(r.changes||{}).some(a=>Array.isArray(a)&&a.length))throw Error('Entrada inválida no histórico.');
 if(previous){const a=previous.split('.').map(Number),b=r.version.split('.').map(Number);let order=0;for(let i=0;i<3&&!order;i++)order=a[i]-b[i];if(order<=0)throw Error('Ordene o histórico da versão mais recente para a mais antiga.');}
 for(const items of Object.values(r.changes))if(!Array.isArray(items)||items.some(x=>typeof x!=='string'||!x.trim()))throw Error('Mudanças devem ser textos não vazios.');
 versions.add(r.version);previous=r.version;
}
const history='var ReleaseHistory='+JSON.stringify({version:manifest.version,releases})+';\n';
fs.writeFileSync('web/core.js','var Core={};(function(exports){\n'+fs.readFileSync('dist/core.js','utf8')+'\n})(Core);');
fs.writeFileSync('web/renderer.js',history+'(function(exports){\n'+fs.readFileSync('dist/renderer.js','utf8')+'\n})({});');
fs.writeFileSync('web/worker.js',`importScripts('core.js');
onmessage=e=>{
 const {db,period,base,seed}=e.data;
 try{
  const seen=new Set(db.plans.filter(p=>p.period===period).map(Core.signature));let best,quality,candidates=0,lastError;const deadline=Date.now()+11000;
  function better(a,b){return !b||a.attended>b.attended||(a.attended===b.attended&&(a.fulfilled>b.fulfilled||(a.fulfilled===b.fulfilled&&(a.gaps<b.gaps||(a.gaps===b.gaps&&a.roomChanges<b.roomChanges)))));}
  for(let i=0;i<6&&Date.now()<deadline;i++){
   postMessage({progress:'Comparando opção '+(i+1)+' de até 6…'});
   try{const p=Core.generate(db,period,base,seed+i*7919),sig=Core.signature(p);if(seen.has(sig))continue;seen.add(sig);candidates++;const q=Core.quality(db,p);if(better(q,quality)){best=p;quality=q;}}
   catch(error){lastError=error.message;if(!lastError.includes('Limite'))break;}
  }
  if(!best)throw Error(lastError||'Nenhuma alternativa diferente foi encontrada nesta tentativa. As anteriores foram preservadas.');postMessage({plan:best,candidates});
 }catch(error){postMessage({error:error.message});}
};`);
