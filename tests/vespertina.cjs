const test = require('node:test');
const assert = require('node:assert/strict');
const Core = require('../dist/core.js');

function baseDB() {
  const d = Core.empty();
  const all = () => Array(30).fill(1);
  d.rooms = [
    { id: 'r1', name: 'Sala 101', module: 'Módulo 1', available: all() },
    { id: 'r2', name: 'Lab 01', module: 'Módulo 2', available: Array(30).fill(0) } // indisponível de manhã, mas disponível à tarde
  ];
  d.teachers = [
    { id: 't1', name: 'Ana Oliveira', available: all() },
    { id: 't2', name: 'Carlos Santos', available: all(), afternoonAvailable: all() }
  ];
  d.subjects = [
    { id: 's1', name: 'Algoritmos', code: 'ALG101' },
    { id: 's2', name: 'Estruturas de Dados', code: 'EST201' },
    { id: 's3', name: 'Projeto Integrador', code: 'PRJ301' }
  ];
  d.cohorts = [
    { id: 'c1', name: 'Computação A', stage: 1, room: 'r1' }
  ];
  return d;
}

test('horários vespertinos correspondem exatamente à especificação', () => {
  assert.deepEqual(Core.afternoonTimes, [
    '13:00–13:50',
    '13:50–14:40',
    '14:40–15:30',
    '15:30–16:30',
    '16:40–17:20',
    '17:20–18:20'
  ]);
  assert.deepEqual(Core.shiftTimes(false), Core.times);
  assert.deepEqual(Core.shiftTimes(true), Core.afternoonTimes);
});

test('oferta vespertina não exige turma, usa a sala selecionada e ignora indisponibilidade matutina da sala', () => {
  const d = baseDB();
  d.offers = [
    { id: 'o1', subject: 's3', teacher: 't1', cohort: '', room: 'r2', period: '2027.1', load: 4, afternoon: true }
  ];

  const plan = Core.generate(d, '2027.1', undefined, 42);
  assert.equal(Core.hardIssues(d, plan.lessons).length, 0);
  assert.equal(Core.completeness(d, plan).length, 0);
  assert.equal(plan.lessons.reduce((n, l) => n + l.length, 0), 4);
  assert.ok(plan.lessons.every(l => l.room === 'r2'));
});

test('oferta vespertina valida sala existente e mantém compatibilidade com registros antigos sem sala', () => {
  const d = baseDB();
  d.offers = [
    { id: 'o1', subject: 's3', teacher: 't1', cohort: '', period: '2027.1', load: 2, afternoon: true }
  ];
  assert.doesNotThrow(() => Core.validate(d));
  d.offers[0].room = 'sala_inexistente';
  assert.throws(() => Core.validate(d), /sala/i);
});

test('duas matérias vespertinas com professores e salas diferentes podem ocorrer no mesmo horário', () => {
  const d = baseDB();
  d.offers = [
    { id: 'o1', subject: 's2', teacher: 't1', cohort: '', room: 'r1', period: '2027.1', load: 2, afternoon: true },
    { id: 'o2', subject: 's3', teacher: 't2', cohort: '', room: 'r2', period: '2027.1', load: 2, afternoon: true }
  ];
  const lessons = [
    { id: 'l1', offer: 'o1', day: 0, slot: 0, length: 2, room: 'r1', locked: false },
    { id: 'l2', offer: 'o2', day: 0, slot: 0, length: 2, room: 'r2', locked: false }
  ];
  assert.deepEqual(Core.hardIssues(d, lessons), []);
});

test('aulas matutinas e vespertinas no mesmo dia e índice de slot não geram conflito', () => {
  const d = baseDB();
  d.offers = [
    { id: 'o1', subject: 's1', teacher: 't1', cohort: 'c1', period: '2027.1', load: 2, afternoon: false },
    { id: 'o2', subject: 's3', teacher: 't1', cohort: '', room: 'r1', period: '2027.1', load: 2, afternoon: true }
  ];
  const lessons = [
    { id: 'l1', offer: 'o1', day: 0, slot: 0, length: 2, room: 'r1', locked: false },
    { id: 'l2', offer: 'o2', day: 0, slot: 0, length: 2, room: 'r1', locked: false }
  ];
  assert.deepEqual(Core.hardIssues(d, lessons), []);

  // Formando que cursa ambas as disciplinas não tem choque entre manhã e tarde
  d.graduates = [{ id: 'g1', name: 'Maria', period: '2027.1', subjects: ['s1', 's3'], active: true }];
  const plan = { id: 'p1', name: 'Teste', period: '2027.1', lessons, created: new Date().toISOString() };
  const rep = Core.graduateReport(d, plan);
  assert.equal(rep[0].ok, true);
});

test('duas aulas vespertinas na mesma sala ou com o mesmo professor conflitam', () => {
  const d = baseDB();
  d.offers = [
    { id: 'o1', subject: 's2', teacher: 't1', cohort: '', room: 'r1', period: '2027.1', load: 2, afternoon: true },
    { id: 'o2', subject: 's3', teacher: 't1', cohort: '', room: 'r1', period: '2027.1', load: 2, afternoon: true }
  ];
  const lessons = [
    { id: 'l1', offer: 'o1', day: 1, slot: 2, length: 2, room: 'r1', locked: false },
    { id: 'l2', offer: 'o2', day: 1, slot: 2, length: 2, room: 'r1', locked: false }
  ];
  const issues = Core.hardIssues(d, lessons);
  assert.ok(issues.length >= 2);

  d.graduates = [{ id: 'g1', name: 'Maria', period: '2027.1', subjects: ['s2', 's3'], active: true }];
  const plan = { id: 'p1', name: 'Teste', period: '2027.1', lessons, created: new Date().toISOString() };
  const rep = Core.graduateReport(d, plan);
  assert.equal(rep[0].ok, false);
});

test('geração integrada respeita disponibilidade vespertina do professor e sala fixa da oferta', () => {
  const d = baseDB();
  const fridayFirstTwo = Array(30).fill(0);
  fridayFirstTwo[4 * 6 + 0] = 1;
  fridayFirstTwo[4 * 6 + 1] = 1;
  d.teachers[1].afternoonAvailable = fridayFirstTwo;

  d.offers = [
    { id: 'o1', subject: 's1', teacher: 't1', cohort: 'c1', period: '2027.1', load: 4 },
    { id: 'o2', subject: 's3', teacher: 't2', cohort: '', room: 'r2', period: '2027.1', load: 2, afternoon: true }
  ];

  const plan = Core.generate(d, '2027.1', undefined, 7);
  assert.equal(Core.hardIssues(d, plan.lessons).length, 0);
  assert.equal(Core.completeness(d, plan).length, 0);

  const afternoonLessons = plan.lessons.filter(l => l.offer === 'o2');
  assert.equal(afternoonLessons.reduce((n, l) => n + l.length, 0), 2);
  assert.ok(afternoonLessons.every(l => l.day === 4 && (l.slot === 0 || l.slot === 1) && l.room === 'r2'));
});

test('mover aula vespertina não troca com aula matutina no mesmo dia/slot', () => {
  const d = baseDB();
  d.offers = [
    { id: 'o1', subject: 's1', teacher: 't1', cohort: 'c1', period: '2027.1', load: 2, afternoon: false },
    { id: 'o2', subject: 's3', teacher: 't2', cohort: '', room: 'r1', period: '2027.1', load: 2, afternoon: true }
  ];
  const plan = {
    id: 'p1',
    name: 'Teste',
    period: '2027.1',
    lessons: [
      { id: 'l1', offer: 'o1', day: 0, slot: 0, length: 2, room: 'r1', locked: false },
      { id: 'l2', offer: 'o2', day: 2, slot: 0, length: 2, room: 'r1', locked: false }
    ],
    created: new Date().toISOString()
  };

  const res = Core.move(d, plan, 'l2', 0, 0, 'r1');
  assert.deepEqual(res.red, []);
  const movedMorning = res.plan.lessons.find(l => l.id === 'l1');
  const movedAfternoon = res.plan.lessons.find(l => l.id === 'l2');
  assert.equal(movedMorning.day, 0);
  assert.equal(movedAfternoon.day, 0);
});

test('limite de 30 aulas vespertinas por sala é validado', () => {
  const d = baseDB();
  d.offers = [
    { id: 'o1', subject: 's1', teacher: 't1', cohort: 'c1', period: '2027.1', load: 30, afternoon: false },
    { id: 'o2', subject: 's2', teacher: 't1', cohort: '', room: 'r1', period: '2027.1', load: 20, afternoon: true },
    { id: 'o3', subject: 's3', teacher: 't2', cohort: '', room: 'r1', period: '2027.1', load: 11, afternoon: true }
  ];
  assert.throws(() => Core.validate(d), /vespertinas/);
});
