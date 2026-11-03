const {test}=require('node:test');
const assert=require('node:assert/strict');
const Core=require('../dist/core.js');
test('eventos reais de busca preservam grade valida',()=>{
 const db=Core.demo(),events=[];
 const p=Core.generate(db,db.periods[0],undefined,42,e=>events.push(e));
 assert.deepEqual(Core.hardIssues(db,p.lessons),[]);
 assert.deepEqual(Core.completeness(db,p),[]);
 assert.ok(events.some(e=>e.kind==='phase-start'));
 assert.ok(events.some(e=>e.kind==='visit'));
 assert.ok(events.some(e=>e.kind==='solution'));
 for(const e of events){assert.ok(e.path.length<=e.total);assert.ok(e.visited>=0);}
});
