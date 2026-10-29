const fs=require('fs');
fs.writeFileSync('web/core.js','var Core={};(function(exports){\n'+fs.readFileSync('dist/core.js','utf8')+'\n})(Core);');
fs.writeFileSync('web/renderer.js','(function(exports){\n'+fs.readFileSync('dist/renderer.js','utf8')+'\n})({});');
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
