const {test}=require('node:test');const assert=require('node:assert/strict');const C=require('../dist/core');
test('generate exact workloads, valid resources and distinct schedules',()=>{const d=C.demo();const a=C.generate(d,'2027.1',undefined,12),b=C.generate(d,'2027.1',undefined,44);assert.deepEqual(C.hardIssues(d,a.lessons),[]);assert.deepEqual(C.completeness(d,a),[]);assert.notEqual(C.signature(a),C.signature(b));});
test('locked lessons preserved and periods isolated',()=>{const d=C.demo();d.periods.push('2027.2');const a=C.generate(d,'2027.1',undefined,7);a.lessons[0].locked=true;const b=C.generate(d,'2027.1',a,98);assert.deepEqual(b.lessons.find(l=>l.id===a.lessons[0].id),a.lessons[0]);assert.throws(()=>C.generate(d,'2027.2',undefined,2));});
test('red blocked move does not mutate original',()=>{const d=C.demo(),p=C.generate(d,'2027.1',undefined,7);p.lessons[0].locked=true;const before=JSON.stringify(p);const r=C.move(d,p,p.lessons[0].id,0,0,'r1');assert(r.red.length);assert.equal(JSON.stringify(p),before);});
test('yellow student conflict and alternate offering selection',()=>{const d=C.demo();d.offers.forEach(o=>o.load=2);let p={id:'p',name:'Test',period:'2027.1',created:'',lessons:[{id:'l1',offer:'o2',day:0,slot:0,length:2,room:'r1',locked:false},{id:'l2',offer:'o3',day:1,slot:0,length:2,room:'r2',locked:false}]};assert(C.graduateReport(d,p)[0].ok);const r=C.move(d,p,'l2',0,0,'r2');assert.equal(r.red.length,0);assert.equal(r.yellow.length,1);d.offers.push({...d.offers[1],id:'o4',cohort:'c2'});r.plan.lessons.push({id:'l3',offer:'o4',day:2,slot:0,length:2,room:'r1',locked:false});assert(C.graduateReport(d,r.plan)[0].ok);});
test('both directions of swap checked',()=>{const d=C.demo();d.offers.forEach(o=>o.load=2);const p={id:'p',name:'Test',period:'2027.1',created:'',lessons:[{id:'a',offer:'o1',day:0,slot:0,length:2,room:'r1',locked:false},{id:'b',offer:'o2',day:1,slot:0,length:2,room:'r1',locked:false}]};d.teachers[1].available[0]=0;assert(C.move(d,p,'a',1,0,'r1').red.some(s=>s.includes('indisponível')));});
test('invalid references and impossible availability',()=>{let d=C.demo();d.offers[0].teacher='missing';assert.throws(()=>C.validate(d));d=C.demo();d.teachers[0].available.fill(0);assert.throws(()=>C.generate(d,'2027.1',undefined,1));});
test('SQLite persistence and backup round trip',()=>{const {DatabaseSync}=require('node:sqlite');const fs=require('node:fs'),os=require('node:os'),path=require('node:path');const dir=fs.mkdtempSync(path.join(os.tmpdir(),'celgrade-'));const file=path.join(dir,'test.sqlite');let sql=new DatabaseSync(file);sql.exec('CREATE TABLE state(data TEXT)');const d=C.demo();d.plans.push(C.generate(d,'2027.1',undefined,9));sql.prepare('INSERT INTO state VALUES(?)').run(JSON.stringify(d));sql.close();sql=new DatabaseSync(file);const result=JSON.parse(sql.prepare('SELECT data FROM state').get().data);C.validate(result);assert.deepEqual(result,d);sql.close();});

test('0.8.4: erros de oferta identificam campo e disciplina',()=>{
 const d=C.demo();d.offers[0].teacher='missing';
 assert.throws(()=>C.validate(d),e=>/professor selecionado não está cadastrado/.test(e.message)&&/Algoritmos/.test(e.message));
});
test('0.8.4: cargas de turma listam disciplinas e excesso',()=>{
 const d=C.demo();d.offers[0].load=30;
 assert.throws(()=>C.validate(d),e=>/Computação A/.test(e.message)&&/Cálculo I/.test(e.message)&&/34 aulas/.test(e.message));
});
test('0.8.4: disponibilidade identifica dia e intervalo',()=>{
 const d=C.demo();d.rooms[0].available[8]=3;
 assert.throws(()=>C.validate(d),e=>/Sala 101/.test(e.message));
});
test('0.8.4: formando aponta disciplina ausente',()=>{
 const d=C.demo();d.graduates[0].subjects=['unknown'];
 assert.throws(()=>C.validate(d),e=>/João/.test(e.message)&&/disciplina unknown não está cadastrada/.test(e.message));
});
test('0.8.4: aula inválida indica grade, disciplina e campo',()=>{
 const d=C.demo();d.plans=[{id:'p',name:'Minha Grade',period:'2027.1',created:'',lessons:[{id:'a',offer:'o1',day:1,slot:2,length:2,room:'inexistente',locked:false}]}];
 assert.throws(()=>C.validate(d),e=>/Minha Grade/.test(e.message)&&/Algoritmos/.test(e.message)&&/sala selecionada não está cadastrada/.test(e.message));
});

test('0.8.5: pendências nomeiam as disciplinas realmente sobrepostas',()=>{
 const d=C.demo();d.offers.forEach(o=>o.load=2);
 const p={id:'p',name:'Teste',period:'2027.1',created:'',lessons:[
   {id:'a',offer:'o2',day:0,slot:0,length:2,room:'r1',locked:false},
   {id:'b',offer:'o3',day:0,slot:0,length:2,room:'r2',locked:false}
 ]};
 const report=C.graduateReport(d,p)[0];
 assert(!report.ok);
 assert(report.reasons.some(x=>x.includes('Banco de Dados')&&x.includes('Cálculo I')&&x.includes('coincide')));
 assert(!report.reasons.some(x=>/encaixe|combinação encontrada|Como resolver|\d{2}:\d{2}/.test(x)));
});
test('0.8.5: pendência mostra todas as disciplinas com choque real',()=>{
 const d=C.demo();d.offers[0].load=2;d.offers[1].load=2;d.offers[2].load=4;
 d.graduates[0].subjects=['s1','s2','s3'];
 const p={id:'p',name:'Teste',period:'2027.1',created:'',lessons:[
   {id:'a',offer:'o1',day:0,slot:0,length:2,room:'r1',locked:false},
   {id:'b',offer:'o2',day:0,slot:2,length:2,room:'r1',locked:false},
   {id:'c',offer:'o3',day:0,slot:0,length:2,room:'r2',locked:false},
   {id:'d',offer:'o3',day:0,slot:2,length:2,room:'r2',locked:false}
 ]};
 const report=C.graduateReport(d,p)[0];
 assert(report.reasons.some(x=>x.includes('Banco de Dados')&&x.includes('Algoritmos')&&x.includes('Cálculo I')));
});
