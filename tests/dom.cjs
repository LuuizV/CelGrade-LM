const {test}=require('node:test'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom'),fs=require('node:fs'),path=require('node:path'),os=require('node:os'),C=require('../dist/core'),{Store}=require('../dist/storage');
const tick=()=>new Promise(r=>setTimeout(r,10));
async function app(){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'celgrade-dom-')),store=new Store(path.join(dir,'test.sqlite'));const d=C.demo();d.offers.forEach(o=>o.load=2);d.plans=[{id:'p',name:'Grade',period:'2027.1',created:'2027-01-01',lessons:[{id:'a',offer:'o1',day:2,slot:0,length:2,room:'r1',locked:false},{id:'b',offer:'o2',day:0,slot:0,length:2,room:'r1',locked:false},{id:'c',offer:'o3',day:1,slot:0,length:2,room:'r2',locked:false}]}];store.save(d);const dom=new JSDOM(fs.readFileSync(path.join(__dirname,'../web/index.html'),'utf8'),{url:'https://celgrade.test',runScripts:'outside-only'});const w=dom.window;w.structuredClone=structuredClone;w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');this.dispatchEvent(new w.Event('close'));};let decision=true,confirmations=[],pdfs=0;w.confirm=msg=>{confirmations.push(msg);return decision;};w.desktop={read:async()=>store.read(),save:async(d,r)=>store.save(d,r),history:async()=>store.history(),restoreHistory:async(id,rev)=>store.restore(id,rev),pdf:async()=>{pdfs++;return true;},folder:async()=>{},export:async()=>true,import:async()=>null};w.eval(fs.readFileSync(path.join(__dirname,'../web/core.js'),'utf8'));w.eval(fs.readFileSync(path.join(__dirname,'../web/renderer.js'),'utf8'));await tick();w.document.querySelector('#release-history')?.close();await tick();const $=s=>{const el=w.document.querySelector(s);assert(el,'Missing '+s);return el;};return {w,$,store,confirmations,get pdfs(){return pdfs;},setDecision(v){decision=v;},async close(){w.close();store.close();fs.rmSync(dir,{recursive:true,force:true});}};}
test('renderer: yellow cancel/accept, red block, context room and undo',async()=>{const a=await app();try{const {w,$,store}=a;assert.equal(w.document.querySelectorAll('.grid').length,2);const before=store.read();$('.lesson[data-lesson="c"]').click();const dest=$('td[data-cohort="c2"][data-day="0"][data-slot="0"]');assert(dest.classList.contains('yellow'));a.setDecision(false);dest.click();await tick();assert.deepEqual(store.read(),before);a.setDecision(true);$('.lesson[data-lesson="c"]').click();$('td[data-cohort="c2"][data-day="0"][data-slot="0"]').click();await tick();assert.equal(store.read().plans[0].lessons.find(l=>l.id==='c').day,0);assert(a.confirmations.at(-1).includes('João'));const revision=store.read().revision;$('.lesson[data-lesson="c"]').click();const red=$('td[data-cohort="c2"][data-day="2"][data-slot="0"]');assert(red.classList.contains('red'));red.click();await tick();assert.equal(store.read().revision,revision);assert($('#notice').textContent.includes('bloqueado'));$('#undo').click();await tick();assert.equal(store.read().plans[0].lessons.find(l=>l.id==='c').day,1);assert.equal(w.document.querySelector('#move-room'),null);$('.lesson[data-lesson="b"]').dispatchEvent(new w.MouseEvent('contextmenu',{bubbles:true,cancelable:true}));$('#room-select').value='r2';$('#room-select').dispatchEvent(new w.Event('change'));$('#room-save').click();await tick();assert.equal(store.read().plans[0].lessons.find(l=>l.id==='b').day,0);$('.lesson[data-lesson="b"]').click();$('td[data-cohort="c1"][data-day="3"][data-slot="0"]').click();await tick();assert.equal(store.read().plans[0].lessons.find(l=>l.id==='b').room,'r2');}finally{await a.close();}});
test('renderer: actual rename form, editing, recovery and individual notes',async()=>{const a=await app();try{const {$,w,store}=a;$('#rename-plan').click();$('input[name="name"]').value='Alternativa revisada';$('#form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await tick();assert.equal(store.read().plans[0].name,'Alternativa revisada');$('[data-page="teachers"]').click();$('[data-edit="t1"]').click();$('input[name="name"]').value='Ana Revisada';$('#form').dispatchEvent(new w.Event('submit',{bubbles:true,cancelable:true}));await tick();assert.equal(store.read().teachers[0].name,'Ana Revisada');$('[data-page="backup"]').click();$('#recovery').click();await tick();$('[data-recover]').click();await tick();assert.equal(store.read().teachers[0].name,'Ana Oliveira');$('[data-page="schedule"]').click();$('#view').value='graduate';$('#view').dispatchEvent(new w.Event('change'));assert.equal(w.document.querySelectorAll('.grid').length,1);assert($('#tables').textContent.includes('Todas as disciplinas'));$('#pdf').click();await tick();assert.equal(a.pdfs,1);}finally{await a.close();}});
test('worker cancellation preserves original plans',async()=>{const a=await app();try{let terminated=false;a.w.Worker=class{postMessage(){}terminate(){terminated=true;}};const before=a.store.read();a.$('#generate').click();assert.equal(a.$('#cancel-generation').hidden,false);assert(a.$('#period').disabled);a.$('#cancel-generation').click();await tick();assert(terminated);assert.deepEqual(a.store.read(),before);assert(!a.$('#period').disabled);}finally{await a.close();}});


test('room editor keyboard access, failed save, retry and undo',async()=>{const a=await app();try{const {w,$,store}=a;const before=store.read();$('.lesson[data-lesson="b"]').dispatchEvent(new w.KeyboardEvent('keydown',{key:'F10',shiftKey:true,bubbles:true}));assert($('#room-editor').open);$('#room-select').value='r2';$('#room-select').dispatchEvent(new w.Event('change'));const original=w.desktop.save;w.desktop.save=async()=>{throw Error('disco cheio')};$('#room-save').click();await tick();assert.deepEqual(store.read(),before);assert($('#room-status').textContent.includes('disco cheio'));w.desktop.save=original;$('#room-save').click();await tick();assert.equal(w.document.querySelector('#room-editor'),null);assert.equal(store.read().plans[0].lessons.find(l=>l.id==='b').room,'r2');$('#undo').click();await tick();assert.equal(store.read().plans[0].lessons.find(l=>l.id==='b').room,'r1');}finally{await a.close()}});

test('visual refresh preserves controls and expandable graduate details',async()=>{const a=await app();try{const {$,w,store}=a;const before=store.read();assert.equal(w.document.querySelectorAll('.command-group').length,3);for(const id of ['generate','plans','undo','rename-plan','pdf','view'])assert($('#'+id));const detail=$('.graduate-list details');assert(!detail.open);$('#expand-graduates').click();assert(detail.open);$('#expand-graduates').click();assert(!detail.open);assert.deepEqual(store.read(),before);assert($('.lesson').className.includes('subject-'));}finally{await a.close()}});

test('indicadores da grade e ícones de navegação permanecem acessíveis',async()=>{
 const a=await app();try{
  const {w,$}=a;
  const cards=[...w.document.querySelectorAll('.metrics .metric-card')];
  assert.equal(cards.length,4);
  assert.deepEqual(cards.map(c=>c.querySelector('.metric-label')?.textContent),[
   'Aulas semanais','Formandos atendidos','Blocos fixos','Janelas nas turmas'
  ]);
  assert(cards.every(c=>c.querySelector('.metric-icon svg[aria-hidden="true"]')));
  assert.equal(w.document.querySelectorAll('nav button[data-page] .ui-icon').length,10);
  assert($('#generate').querySelector('svg'));
  assert($('#undo').querySelector('svg'));
  assert($('#pdf').querySelector('svg'));
 }finally{await a.close();}
});

test('0.8.3: SVG dos cadeados, informação de erro e tooltip junto ao mouse',async()=>{
 const a=await app();try{
  const {w,$}=a;
  const lock=$('[data-lock]');
  assert(lock.querySelector('.lock-shackle'));
  lock.click();await tick();
  assert($('[data-lock]').querySelector('.lock-shackle'));
  $('.lesson[data-lesson="c"]').click();
  const cell=$('td[data-cohort="c2"][data-day="0"][data-slot="0"]');
  cell.dispatchEvent(new w.MouseEvent('mousemove',{clientX:110,clientY:90,bubbles:true}));
  assert.equal($('#tip').hidden,false);
  assert($('#tip').style.left.endsWith('px'));
  assert($('#tip').style.top.endsWith('px'));
  assert($('#tip').textContent.includes('Segunda'));
 }finally{await a.close();}
});

test('0.8.5: relatório dos formandos usa explicação clara do choque',async()=>{
 const a=await app();try{
  const {w}=a;
  const txt=w.document.querySelector('.graduate-list')?.textContent||'';
  assert(!txt.includes('sem encaixe na combinação encontrada'));
  assert(!txt.includes('Como resolver:'));
 }finally{await a.close();}
});
