export type Resource = {
    id: string;
    name: string;
    available: number[];
    description?: string;
};
export type Subject = {
    id: string;
    name: string;
};
export type Cohort = {
    id: string;
    name: string;
    stage: number;
    room: string;
};
export type Offer = {
    id: string;
    subject: string;
    teacher: string;
    cohort: string;
    period: string;
    load: number;
};
export type Graduate = {
    id: string;
    name: string;
    period: string;
    subjects: string[];
    active: boolean;
};
export type Lesson = {
    id: string;
    offer: string;
    day: number;
    slot: number;
    length: number;
    room: string;
    locked: boolean;
};
export type Plan = {
    id: string;
    name: string;
    period: string;
    lessons: Lesson[];
    created: string;
};
export type DB = {
    revision: number;
    periods: string[];
    rooms: Resource[];
    teachers: Resource[];
    subjects: Subject[];
    cohorts: Cohort[];
    offers: Offer[];
    graduates: Graduate[];
    plans: Plan[];
};
export const times = ['07:30–08:20', '08:20–09:10', '09:20–10:10', '10:10–11:00', '11:00–11:50', '11:50–12:40'];
export const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
export function empty(): DB { return { revision: 0, periods: ['2027.1'], rooms: [], teachers: [], subjects: [], cohorts: [], offers: [], graduates: [], plans: [] }; }
export function validate(d: DB) {
    const fail = (ok: unknown, msg: string) => { if (!ok)
        throw Error(msg); };
    fail(d && Number.isInteger(d.revision), 'Banco inválido');
    fail(Array.isArray(d.periods) && d.periods.length > 0 && d.periods.every(p => /^\d{4}\.[12]$/.test(p)) && new Set(d.periods).size === d.periods.length, 'Períodos devem ter formato 2027.1 ou 2027.2');
    for (const k of ['rooms', 'teachers', 'subjects', 'cohorts', 'offers', 'graduates', 'plans'] as const) {
        fail(Array.isArray(d[k]) && d[k].length <= 1000, 'Coleção inválida: ' + k);
        const ids = new Set();
        for (const x of d[k]) {
            fail(x && typeof x.id === 'string' && /^[A-Za-z0-9_-]{1,120}$/.test(x.id) && !ids.has(x.id), 'ID inválido');
            ids.add(x.id);
        }
    }
    const has = (key: 'rooms' | 'teachers' | 'subjects' | 'cohorts', id: string) => d[key].some(x => x.id === id);
    for (const r of [...d.rooms, ...d.teachers])
        fail(Array.isArray(r.available) && r.available.length === 30 && r.available.every(x => x === 0 || x === 1), 'Disponibilidade inválida');
    for (const r of [...d.rooms, ...d.teachers, ...d.subjects, ...d.cohorts, ...d.graduates, ...d.plans])
        fail(typeof r.name === 'string' && r.name.trim().length > 0 && r.name.length <= 200, 'Nome obrigatório, até 200 caracteres');
    for (const c of d.cohorts)
        fail(Number.isInteger(c.stage) && c.stage > 0 && (!c.room || has('rooms', c.room)), 'Etapa ou sala da turma inválida');
    for (const o of d.offers)
        fail(has('subjects', o.subject) && has('teachers', o.teacher) && has('cohorts', o.cohort) && d.periods.includes(o.period) && Number.isInteger(o.load) && o.load > 0 && o.load <= 30, 'Oferta inválida: confira vínculos e carga');
    for (const c of d.cohorts)
        for (const p of d.periods)
            fail(d.offers.filter(o => o.cohort === c.id && o.period === p).reduce((n, o) => n + o.load, 0) <= 30, 'Turma ' + c.name + ' excede 30 aulas semanais');
    for (const g of d.graduates)
        fail(typeof g.active === 'boolean' && d.periods.includes(g.period) && Array.isArray(g.subjects) && g.subjects.every(s => has('subjects', s)) && new Set(g.subjects).size === g.subjects.length, 'Formando inválido');
    for (const p of d.plans) {
        fail(d.periods.includes(p.period) && Array.isArray(p.lessons) && p.lessons.length <= 1500, 'Grade inválida');
        const ids = new Set();
        for (const l of p.lessons) {
            fail(l && typeof l.id === 'string' && /^[A-Za-z0-9_-]{1,120}$/.test(l.id) && !ids.has(l.id), 'Aula duplicada');
            ids.add(l.id);
            fail(d.offers.some(o => o.id === l.offer && o.period === p.period) && has('rooms', l.room) && Number.isInteger(l.day) && l.day >= 0 && l.day < 5 && Number.isInteger(l.slot) && l.slot >= 0 && Number.isInteger(l.length) && l.length >= 1 && l.length <= 2 && l.slot + l.length <= 6 && typeof l.locked === 'boolean', 'Aula inválida');
        }
    }
}
function overlap(a: Lesson, b: Lesson) { return a.day === b.day && a.slot < b.slot + b.length && b.slot < a.slot + a.length; }
export function hardIssues(d: DB, lessons: Lesson[], focus?: Set<string>): string[] {
    const issues = new Set<string>();
    for (let i = 0; i < lessons.length; i++) {
        const a = lessons[i], o = d.offers.find(x => x.id === a.offer);
        if (!o) {
            issues.add('Oferta inexistente');
            continue;
        }
        const r = d.rooms.find(x => x.id === a.room), t = d.teachers.find(x => x.id === o.teacher);
        if (!r || !t) {
            issues.add('Sala ou professor inexistente');
            continue;
        }
        if ((!focus || focus.has(a.id)) && (a.day < 0 || a.day > 4 || a.slot < 0 || a.slot + a.length > 6 || (a.length === 2 && a.slot % 2 !== 0)))
            issues.add('A dupla deve ocupar um bloco completo: 07:30, 09:20 ou 11:00');
        for (let k = 0; k < a.length && (!focus || focus.has(a.id)); k++) {
            if (!r.available[a.day * 6 + a.slot + k])
                issues.add('Sala indisponível: ' + r.name);
            if (!t.available[a.day * 6 + a.slot + k])
                issues.add('Professor indisponível: ' + t.name);
        }
        for (let j = 0; j < i; j++) {
            const b = lessons[j], ob = d.offers.find(x => x.id === b.offer);
            if (!ob || !overlap(a, b) || (focus && !focus.has(a.id) && !focus.has(b.id)))
                continue;
            if (a.room === b.room)
                issues.add('Sala ocupada: ' + r.name);
            if (o.teacher === ob.teacher)
                issues.add('Professor em outra aula: ' + t.name);
            if (o.cohort === ob.cohort)
                issues.add('Choque na turma: ' + d.cohorts.find(x => x.id === o.cohort)?.name);
        }
    }
    return [...issues];
}
export function completeness(d: DB, p: Plan) { return d.offers.filter(o => o.period === p.period).filter(o => p.lessons.filter(l => l.offer === o.id).reduce((n, l) => n + l.length, 0) !== o.load).map(o => 'Carga incompleta: ' + d.subjects.find(s => s.id === o.subject)?.name + ' / ' + d.cohorts.find(c => c.id === o.cohort)?.name); }
function lessonMask(l: Lesson): number { return ((1 << l.length) - 1) << (l.day * 6 + l.slot); }
function bitCount(x: number): number { let n = 0; while (x) {
    x &= x - 1;
    n++;
} return n; }
export function graduateReport(d: DB, p: Plan) {
    const masks = new Map<string, number>(), loads = new Map<string, number>();
    for (const l of p.lessons) {
        masks.set(l.offer, (masks.get(l.offer) || 0) | lessonMask(l));
        loads.set(l.offer, (loads.get(l.offer) || 0) + l.length);
    }
    const offers = d.offers.filter(o => o.period === p.period), names = new Map(d.subjects.map(s => [s.id, s.name]));
    return d.graduates.filter(g => g.active && g.period === p.period).map(g => {
        const groups = g.subjects.map(subject => ({ subject, choices: offers.filter(o => o.subject === subject && loads.get(o.id) === o.load) })).sort((a, b) => a.choices.length - b.choices.length);
        let best: string[] = [], nodes = 0, limited = false;
        function choose(i: number, picked: string[], used: number) {
            if (picked.length > best.length)
                best = [...picked];
            if (best.length === groups.length || picked.length + groups.length - i <= best.length)
                return;
            if (++nodes > 20000) {
                limited = true;
                return;
            }
            if (i === groups.length)
                return;
            for (const o of groups[i].choices) {
                const m = masks.get(o.id) || 0;
                if (!(used & m))
                    choose(i + 1, [...picked, o.id], used | m);
                if (best.length === groups.length)
                    return;
            }
            choose(i + 1, picked, used);
        }
        choose(0, [], 0);
        const fulfilled = new Set(best.map(id => offers.find(o => o.id === id)!.subject));
        const missingIds = g.subjects.filter(id => !fulfilled.has(id));
        return { id: g.id, name: g.name, offers: best, ok: best.length === g.subjects.length, limited: limited && best.length !== g.subjects.length, missingIds, missing: missingIds.map(id => names.get(id)!), reasons: missingIds.map(id => { const candidates = offers.filter(o => o.subject === id); return names.get(id) + ': ' + (!candidates.length ? 'sem oferta no período' : !groups.find(x => x.subject === id)!.choices.length ? 'carga ainda incompleta na grade' : 'sem encaixe na combinação encontrada'); }) };
    });
}
export function graduateChanges(d: DB, before: Plan, after: Plan): string[] {
    const old = new Map(graduateReport(d, before).map(r => [r.id, r]));
    return graduateReport(d, after).filter(r => { const b = old.get(r.id)!; return !r.ok && (r.limited || r.offers.length < b.offers.length || r.missingIds.some(id => !b.missingIds.includes(id))); }).map(r => r.name + ': ' + (r.limited ? 'verificação inconclusiva; confira a grade individual. ' : '') + 'pendências após a mudança: ' + r.missing.join(', '));
}
export function quality(d: DB, p: Plan) {
    const reports = graduateReport(d, p);
    let roomChanges = 0, gaps = 0;
    for (const c of d.cohorts) {
        const ls = p.lessons.filter(l => d.offers.find(o => o.id === l.offer)?.cohort === c.id);
        roomChanges += ls.filter(l => c.room && l.room !== c.room).reduce((n, l) => n + l.length, 0);
        for (let day = 0; day < 5; day++) {
            const slots = ls.filter(l => l.day === day).flatMap(l => Array.from({ length: l.length }, (_, k) => l.slot + k));
            if (slots.length)
                gaps += Math.max(...slots) - Math.min(...slots) + 1 - new Set(slots).size;
        }
    }
    return { attended: reports.filter(r => r.ok).length, total: reports.length, fulfilled: reports.reduce((n, r) => n + r.offers.length, 0), roomChanges, gaps };
}
export function move(d: DB, p: Plan, id: string, day: number, slot: number, room: string) {
    const next = structuredClone(p);
    if (!Number.isInteger(day) || day < 0 || day > 4 || !Number.isInteger(slot) || slot < 0 || slot > 5 || !d.rooms.some(r => r.id === room))
        return { plan: next, red: ['Destino inválido'], yellow: [] };
    const source = next.lessons.find(l => l.id === id);
    if (!source)
        return { plan: next, red: ['Aula não encontrada'], yellow: [] };
    if (source.locked)
        return { plan: next, red: ['Destrave a aula antes de mover'], yellow: [] };
    const offer = d.offers.find(o => o.id === source.offer)!;
    const target = next.lessons.find(l => l.id !== id && d.offers.find(o => o.id === l.offer)?.cohort === offer.cohort && l.day === day && slot >= l.slot && slot < l.slot + l.length);
    if (target) {
        if (target.locked || target.length !== source.length || target.slot !== slot)
            return { plan: next, red: ['Troca exige blocos do mesmo tamanho, alinhados e destravados'], yellow: [] };
        const old = { day: source.day, slot: source.slot, room: source.room };
        Object.assign(source, { day, slot, room });
        Object.assign(target, old);
    }
    else
        Object.assign(source, { day, slot, room });
    const red = hardIssues(d, next.lessons, new Set([source.id, ...(target ? [target.id] : [])]));
    const yellow = red.length ? [] : graduateChanges(d, p, next);
    return { plan: next, red, yellow };
}
/** Bounded randomized backtracking with 30-bit availability and occupancy masks. */
export function generate(d: DB, period: string, base: Plan | undefined, seed: number): Plan {
    validate(d);
    if (base && base.period !== period)
        throw Error('A grade base pertence a outro período.');
    const offers = d.offers.filter(o => o.period === period);
    if (!offers.length)
        throw Error('Cadastre ofertas para este período.');
    if (!d.rooms.length)
        throw Error('Cadastre salas.');
    const available = (r: Resource) => r.available.reduce((m, v, i) => m | (v << i), 0);
    const ti = new Map(d.teachers.map((r, i) => [r.id, i])), ci = new Map(d.cohorts.map((r, i) => [r.id, i])), ri = new Map(d.rooms.map((r, i) => [r.id, i]));
    const teacherFree = d.teachers.map(available), roomFree = d.rooms.map(available);
    const fixed = structuredClone(base?.lessons.filter(l => l.locked) || []);
    const invalid = hardIssues(d, fixed);
    if (invalid.length)
        throw Error('Aulas fixas inválidas: ' + invalid.join('; '));
    for (const teacher of d.teachers) {
        const load = offers.filter(o => o.teacher === teacher.id).reduce((n, o) => n + o.load, 0), free = bitCount(teacherFree[ti.get(teacher.id)!]);
        if (load > free)
            throw Error(teacher.name + ' precisa de ' + load + ' aulas, mas tem apenas ' + free + ' horários disponíveis.');
    }
    const demand = offers.reduce((n, o) => n + o.load, 0), capacity = roomFree.reduce((n, m) => n + bitCount(m), 0);
    if (demand > capacity)
        throw Error('As salas oferecem ' + capacity + ' horários; a carga exige ' + demand + '.');
    let rng = seed >>> 0;
    const random = () => { rng = (1664525 * rng + 1013904223) >>> 0; return rng / 4294967296; };
    const start = Date.now();
    let anyTimeout = false;
    const si = new Map(d.subjects.map((s, i) => [s.id, i])), related = d.subjects.map(() => new Map<number, number>());
    for (const g of d.graduates.filter(g => g.active && g.period === period))
        for (const a of g.subjects)
            for (const b of g.subjects)
                if (a !== b) {
                    const ai = si.get(a)!, bi = si.get(b)!;
                    related[ai].set(bi, (related[ai].get(bi) || 0) + 1);
                }
    for (const paired of [true, false]) {
        const deadline = start + (paired ? 1000 : 3000);
        let expired = false, nodes = 0;
        const tb = d.teachers.map(() => 0), rb = d.rooms.map(() => 0), cb = d.cohorts.map(() => 0), sc = d.subjects.map(() => Array<number>(30).fill(0));
        const lessons = structuredClone(fixed);
        for (const l of lessons) {
            const o = offers.find(o => o.id === l.offer);
            if (!o)
                throw Error('Oferta de aula fixa não encontrada.');
            const m = lessonMask(l);
            tb[ti.get(o.teacher)!] |= m;
            rb[ri.get(l.room)!] |= m;
            cb[ci.get(o.cohort)!] |= m;
            for (let k = 0; k < l.length; k++)
                sc[si.get(o.subject)!][l.day * 6 + l.slot + k]++;
        }
        type Choice = {
            start: number;
            room: number;
            mask: number;
            tie: number;
        };
        type Task = {
            o: Offer;
            t: number;
            c: number;
            s: number;
            length: number;
            preferred: number;
            choices: Choice[];
        };
        const tasks: Task[] = [];
        for (const o of offers) {
            let remaining = o.load - fixed.filter(l => l.offer === o.id).reduce((n, l) => n + l.length, 0);
            if (remaining < 0)
                throw Error('Aulas fixas excedem a carga de ' + d.subjects.find(s => s.id === o.subject)?.name);
            while (remaining) {
                const length = paired ? Math.min(2, remaining) : 1, t = ti.get(o.teacher)!, c = ci.get(o.cohort)!;
                const choices: Choice[] = [];
                for (let day = 0; day < 5; day++)
                    for (let sl = 0; sl <= 6 - length; sl++) {
                        if (length === 2 && sl % 2)
                            continue;
                        const start = day * 6 + sl, mask = ((1 << length) - 1) << start;
                        if ((teacherFree[t] & mask) !== mask)
                            continue;
                        for (let room = 0; room < roomFree.length; room++)
                            if ((roomFree[room] & mask) === mask)
                                choices.push({ start, room, mask, tie: random() });
                    }
                tasks.push({ o, t, c, s: si.get(o.subject)!, length, preferred: ri.get(d.cohorts[c].room) ?? -1, choices });
                remaining -= length;
            }
        }
        const used = tasks.map(() => false);
        function search(left: number): boolean {
            if (!left)
                return true;
            if (++nodes > 150000 || Date.now() > deadline) {
                expired = true;
                return false;
            }
            let best = -1, options: Choice[] = [];
            const seen = new Set<string>();
            for (let i = 0; i < tasks.length; i++)
                if (!used[i]) {
                    const task = tasks[i], key = task.o.id + ':' + task.length;
                    if (seen.has(key))
                        continue;
                    seen.add(key);
                    const busy = tb[task.t] | cb[task.c];
                    const valid = task.choices.filter(ch => !(ch.mask & (busy | rb[ch.room])));
                    if (!valid.length)
                        return false;
                    if (best < 0 || valid.length < options.length) {
                        best = i;
                        options = valid;
                        if (valid.length === 1)
                            break;
                    }
                }
            const task = tasks[best];
            const scored = options.map(ch => { let conflict = 0; for (const [sub, weight] of related[task.s])
                for (let k = 0; k < task.length; k++)
                    if (sc[sub][ch.start + k])
                        conflict += weight; return { ch, score: conflict * 8 + (task.preferred >= 0 && ch.room !== task.preferred ? 2 : 0) + ch.tie }; }).sort((a, b) => a.score - b.score);
            used[best] = true;
            for (const { ch } of scored) {
                tb[task.t] |= ch.mask;
                cb[task.c] |= ch.mask;
                rb[ch.room] |= ch.mask;
                for (let k = 0; k < task.length; k++)
                    sc[task.s][ch.start + k]++;
                lessons.push({ id: uid(), offer: task.o.id, day: Math.floor(ch.start / 6), slot: ch.start % 6, length: task.length, room: d.rooms[ch.room].id, locked: false });
                if (search(left - 1))
                    return true;
                lessons.pop();
                tb[task.t] &= ~ch.mask;
                cb[task.c] &= ~ch.mask;
                rb[ch.room] &= ~ch.mask;
                for (let k = 0; k < task.length; k++)
                    sc[task.s][ch.start + k]--;
                if (expired)
                    break;
            }
            used[best] = false;
            return false;
        }
        if (search(tasks.length))
            return { id: uid(), name: 'Alternativa ' + new Date().toLocaleTimeString('pt-BR'), period, lessons, created: new Date().toISOString() };
        anyTimeout ||= expired;
    }
    throw Error(anyTimeout ? 'Limite de busca atingido; isso não prova que não existe solução.' : 'Não existe grade viável com estas disponibilidades e aulas fixas.');
}
export function signature(p: Plan) { return p.lessons.flatMap(l => Array.from({ length: l.length }, (_, k) => [l.offer, l.day, l.slot + k, l.room].join(':'))).sort().join('|'); }
export function demo(): DB { const d = empty(); const all = () => Array(30).fill(1); d.rooms = [{ id: 'r1', name: 'Sala 101', available: all() }, { id: 'r2', name: 'Laboratório', available: all() }]; d.teachers = [{ id: 't1', name: 'Ana Oliveira', available: all() }, { id: 't2', name: 'Carlos Santos', available: all() }]; d.subjects = [{ id: 's1', name: 'Algoritmos' }, { id: 's2', name: 'Cálculo I' }, { id: 's3', name: 'Banco de Dados' }]; d.cohorts = [{ id: 'c1', name: 'Computação A', stage: 1, room: 'r1' }, { id: 'c2', name: 'Computação B', stage: 5, room: 'r2' }]; d.offers = [{ id: 'o1', subject: 's1', teacher: 't1', cohort: 'c1', period: '2027.1', load: 4 }, { id: 'o2', subject: 's2', teacher: 't2', cohort: 'c1', period: '2027.1', load: 4 }, { id: 'o3', subject: 's3', teacher: 't1', cohort: 'c2', period: '2027.1', load: 4 }]; d.graduates = [{ id: 'g1', name: 'João (exemplo)', period: '2027.1', subjects: ['s2', 's3'], active: true }]; return d; }
