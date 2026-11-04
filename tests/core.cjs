const {test}=require('node:test');const assert=require('node:assert/strict');const C=require('../dist/core');
test('generate exact workloads, valid resources and distinct schedules',()=>{const d=C.demo();const a=C.generate(d,'2027.1',undefined,12),b=C.generate(d,'2027.1',undefined,44);assert.deepEqual(C.hardIssues(d,a.lessons),[]);assert.deepEqual(C.completeness(d,a),[]);assert.notEqual(C.signature(a),C.signature(b));});
test('locked lessons preserved and periods isolated',()=>{const d=C.demo();d.periods.push('2027.2');const a=C.generate(d,'2027.1',undefined,7);a.lessons[0].locked=true;const b=C.generate(d,'2027.1',a,98);assert.deepEqual(b.lessons.find(l=>l.id===a.lessons[0].id),a.lessons[0]);assert.throws(()=>C.generate(d,'2027.2',undefined,2));});
test('red blocked move does not mutate original',()=>{const d=C.demo(),p=C.generate(d,'2027.1',undefined,7);p.lessons[0].locked=true;const before=JSON.stringify(p);const r=C.move(d,p,p.lessons[0].id,0,0,'r1');assert(r.red.length);assert.equal(JSON.stringify(p),before);});
test('yellow student conflict and alternate offering selection',()=>{const d=C.demo();d.offers.forEach(o=>o.load=2);let p={id:'p',name:'Test',period:'2027.1',created:'',lessons:[{id:'l1',offer:'o2',day:0,slot:0,length:2,room:'r1',locked:false},{id:'l2',offer:'o3',day:1,slot:0,length:2,room:'r2',locked:false}]};assert(C.graduateReport(d,p)[0].ok);const r=C.move(d,p,'l2',0,0,'r2');assert.equal(r.red.length,0);assert.equal(r.yellow.length,1);d.offers.push({...d.offers[1],id:'o4',cohort:'c2'});r.plan.lessons.push({id:'l3',offer:'o4',day:2,slot:0,length:2,room:'r1',locked:false});assert(C.graduateReport(d,r.plan)[0].ok);});
test('both directions of swap checked',()=>{const d=C.demo();d.offers.forEach(o=>o.load=2);const p={id:'p',name:'Test',period:'2027.1',created:'',lessons:[{id:'a',offer:'o1',day:0,slot:0,length:2,room:'r1',locked:false},{id:'b',offer:'o2',day:1,slot:0,length:2,room:'r1',locked:false}]};d.teachers[1].available[0]=0;assert(C.move(d,p,'a',1,0,'r1').red.some(s=>s.includes('não está marcado como disponível')));});
test('invalid references and impossible availability',()=>{let d=C.demo();d.offers[0].teacher='missing';assert.throws(()=>C.validate(d));d=C.demo();d.teachers[0].available.fill(0);assert.throws(()=>C.generate(d,'2027.1',undefined,1));});
test('SQLite persistence and backup round trip',()=>{const {DatabaseSync}=require('node:sqlite');const fs=require('node:fs'),os=require('node:os'),path=require('node:path');const dir=fs.mkdtempSync(path.join(os.tmpdir(),'celgrade-'));const file=path.join(dir,'test.sqlite');let sql=new DatabaseSync(file);sql.exec('CREATE TABLE state(data TEXT)');const d=C.demo();d.plans.push(C.generate(d,'2027.1',undefined,9));sql.prepare('INSERT INTO state VALUES(?)').run(JSON.stringify(d));sql.close();sql=new DatabaseSync(file);const result=JSON.parse(sql.prepare('SELECT data FROM state').get().data);C.validate(result);assert.deepEqual(result,d);sql.close();});

test('0.8.4: erros de oferta identificam campo e disciplina',()=>{
 const d=C.demo();d.offers[0].teacher='missing';
 assert.throws(()=>C.validate(d),e=>/professor selecionado não está cadastrado/.test(e.message)&&/Algoritmos/.test(e.message));
});
test('0.8.4: cargas de turma listam disciplinas e excesso',()=>{
 const d=C.demo();d.offers[0].load=30;
 assert.throws(()=>C.validate(d),e=>/Computação A/.test(e.message)&&/34 aulas/.test(e.message)&&/limite é 30/.test(e.message));
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

test('0.9.0: nome da alternativa inclui periodo e horario sem segundos',()=>{
  const d=C.demo(), p=C.generate(d,'2027.1',undefined,8);
  assert.match(p.name,/^Alternativa 2027\.1 - \d{2}:\d{2}$/);
  assert(!/\d{2}:\d{2}:\d{2}/.test(p.name));
});
test('0.9.0: avisos explicam causa da indisponibilidade ou ocupação',()=>{
  const d=C.demo();d.offers.forEach(o=>o.load=2);
  d.rooms[0].available[0]=0;
  const a={id:'a',offer:'o1',day:0,slot:0,length:2,room:'r1',locked:false};
  const b={id:'b',offer:'o2',day:0,slot:0,length:2,room:'r1',locked:false};
  const issues=C.hardIssues(d,[a,b]);
  assert(issues.some(s=>s.includes('não está marcada como disponível')&&s.includes('Algoritmos')));
  assert(issues.some(s=>s.includes('já está ocupada por')&&s.includes('Algoritmos')&&s.includes('Cálculo I')));
});

test('0.9.2: nomes antigos de salas podem ser separados sem perder IDs',()=>{
 const d=C.demo();d.rooms[0].name='Sala 06 - Módulo I';
 C.normalizeRooms(d);
 assert.equal(d.rooms[0].name,'Sala 06');
 assert.equal(d.rooms[0].module,'Módulo I');
 assert.equal(C.roomLabel(d.rooms[0]),'Sala 06 - Módulo I');
 C.validate(d);
});

test('0.9.4: janelas calculadas por turma e demanda dos formandos',()=>{
 const d=C.demo();d.offers.forEach(o=>o.load=2);
 const p={id:'p',period:'2027.1',created:'',name:'Teste',lessons:[
  {id:'a',offer:'o1',day:0,slot:0,length:2,room:'r1',locked:false},
  {id:'b',offer:'o2',day:0,slot:3,length:2,room:'r1',locked:false}
 ]};
 assert.deepEqual(C.cohortGaps(d,p).map(x=>x.slot),[2]);
 const count=C.graduateDemand(d,'2027.1');assert(Array.isArray(count));
 assert(count.every(x=>x.count>=1));
});

test('0.9.8: excluir período remove só ofertas, formandos e grades dele',()=>{
 const d=C.demo();
 d.periods.push('2027.2');
 d.offers.push({id:'ox',subject:'s1',teacher:'t2',cohort:'c2',period:'2027.2',load:2});
 d.graduates.push({id:'gx',name:'Ana',period:'2027.2',subjects:['s1'],active:true});
 d.plans.push({id:'px',name:'Grade 2',period:'2027.2',created:'2027-01-01',lessons:[{id:'lx',offer:'ox',day:0,slot:0,length:2,room:'r1',locked:false}]});
 const before=JSON.stringify(d);
 assert.deepEqual(C.periodImpact(d,'2027.2'),{offers:1,graduates:1,plans:1,lessons:1});
 const n=C.deletePeriod(d,'2027.2');
 assert.equal(JSON.stringify(d),before,'o original não pode ser alterado');
 assert.deepEqual(n.periods,['2027.1']);
 assert(n.offers.every(o=>o.period==='2027.1')&&n.offers.length===d.offers.length-1);
 assert(n.graduates.every(g=>g.period==='2027.1'));
 assert.equal(n.plans.length,0);
 for(const k of ['rooms','teachers','subjects','cohorts'])assert.equal(n[k].length,d[k].length);
 C.validate(n);
 assert.throws(()=>C.deletePeriod(n,'2027.1'),/único período/);
 assert.throws(()=>C.deletePeriod(d,'2030.1'),/não está cadastrado/);
});

test('0.9.8: código da disciplina é normalizado, único e opcional só em registros antigos',()=>{
 assert.equal(C.normalizeSubjectCode('  mat   101 '),'MAT 101');
 assert(C.SUBJECT_CODE_PATTERN.test('MAT101')&&C.SUBJECT_CODE_PATTERN.test('CET-053.A'));
 assert(!C.SUBJECT_CODE_PATTERN.test('')&&!C.SUBJECT_CODE_PATTERN.test('MÁT1')&&!C.SUBJECT_CODE_PATTERN.test('A'.repeat(21)));
 assert.equal(C.subjectLabel({name:'Cálculo I',code:'MAT101'}),'MAT101 · Cálculo I');
 assert.equal(C.subjectLabel({name:'Cálculo I'}),'Cálculo I');
 const d=C.demo();C.validate(d); // disciplinas antigas, sem código, continuam válidas
 d.subjects[0].code='ALG1';d.subjects[1].code='mat101';C.validate(d);
 d.subjects[1].code=' alg1 ';
 assert.throws(()=>C.validate(d),/código ALG1 já pertence/);
 d.subjects[1].code='Cálculo';
 assert.throws(()=>C.validate(d),/inválido/);
});
