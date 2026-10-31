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
const weekDays = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'];
function lessonWhen(day: number, slot: number): string {
    const dayName = weekDays[day] || 'Dia inválido (' + day + ')';
    return dayName + ', ' + (times[slot] || 'horário inválido (' + slot + ')');
}
function validationError(local: string, field: string, problem: string, solution: string): never {
    throw Error('Local: ' + local + '\nCampo: ' + field + '\nProblema: ' + problem + '\nComo resolver: ' + solution);
}
export function validate(d: DB) {
    if (!d || !Number.isInteger(d.revision))
        validationError('Dados e backup', 'Revisão do banco', 'Banco inválido: número de revisão ausente ou incorreto.', 'Restaure um backup válido ou reabra os dados originais.');
    if (!Array.isArray(d.periods) || !d.periods.length)
        validationError('Períodos letivos', 'Período', 'Nenhum período letivo foi cadastrado.', 'Cadastre um período como 2027.1.');
    const periods = new Set<string>();
    for (const p of d.periods) {
        if (typeof p !== 'string' || !/^\d{4}\.[12]$/.test(p))
            validationError('Períodos letivos', 'Período', 'Período inválido: "' + String(p) + '".', 'Use AAAA.1 ou AAAA.2 (ex.: 2027.1).');
        if (periods.has(p))
            validationError('Períodos letivos', 'Período', 'O período ' + p + ' está cadastrado mais de uma vez.', 'Remova o período repetido.');
        periods.add(p);
    }
    const collections: {key: keyof DB; label: string}[] = [
        {key:'rooms',label:'Salas'}, {key:'teachers',label:'Professores'},
        {key:'subjects',label:'Disciplinas'}, {key:'cohorts',label:'Turmas / etapas'},
        {key:'offers',label:'Ofertas de disciplinas'}, {key:'graduates',label:'Formandos'},
        {key:'plans',label:'Quadro de horários'}
    ];
    for (const {key,label} of collections) {
        const list = d[key];
        if (!Array.isArray(list) || list.length > 1000)
            validationError(label, 'Registros', 'Coleção inválida: ' + key + ' (ausente ou com mais de 1000 registros).', 'Verifique o arquivo de dados ou restaure um backup válido.');
        const ids = new Set<string>();
        for (const x of list as {id:string;name?:string}[]) {
            const where = label + ' — ' + (x?.name || 'registro sem nome') + ' (ID ' + String(x?.id) + ')';
            if (!x || typeof x.id !== 'string' || !/^[A-Za-z0-9_-]{1,120}$/.test(x.id))
                validationError(where, 'Identificador', 'ID inválido.', 'Restaure um backup íntegro; o identificador deve ter letras, números, _ ou -.');
            if (ids.has(x.id))
                validationError(where, 'Identificador', 'O ID "' + x.id + '" está duplicado em ' + label + '.', 'Remova ou corrija o registro duplicado no arquivo de dados.');
            ids.add(x.id);
        }
    }
    const display = (key: 'rooms' | 'teachers' | 'subjects' | 'cohorts', id: string) =>
        d[key].find(x => x.id === id)?.name || 'ID "' + String(id) + '"';
    const has = (key: 'rooms' | 'teachers' | 'subjects' | 'cohorts', id: string) => d[key].some(x => x.id === id);
    for (const [kind,label] of [['rooms','Salas'],['teachers','Professores']] as const) {
        for (const r of d[kind]) {
            const local = label + ' — ' + r.name;
            if (!Array.isArray(r.available) || r.available.length !== 30)
                validationError(local, 'Disponibilidade semanal', 'A disponibilidade deve conter exatamente 30 horários (5 dias × 6 aulas).', 'Abra o cadastro, revise a disponibilidade e salve novamente.');
            const invalid = r.available.findIndex(value => value !== 0 && value !== 1);
            if (invalid !== -1)
                validationError(local, 'Disponibilidade semanal', 'Valor inválido em ' + lessonWhen(Math.floor(invalid / 6), invalid % 6) + '.', 'Marque ou desmarque o horário correspondente.');
        }
    }
    for (const [key,label] of collections.filter(x => x.key !== 'offers') as {key:'rooms'|'teachers'|'subjects'|'cohorts'|'graduates'|'plans';label:string}[]) {
        for (const r of d[key] as {id:string;name:string}[]) {
            if (typeof r.name !== 'string' || !r.name.trim() || r.name.length > 200)
                validationError(label + ' — ' + (r.name || 'registro sem nome') + ' (ID ' + r.id + ')', 'Nome', 'Nome obrigatório, até 200 caracteres.', 'Preencha um nome válido, sem deixá-lo em branco.');
        }
    }
    for (const c of d.cohorts) {
        if (!Number.isInteger(c.stage) || c.stage <= 0)
            validationError('Turmas / etapas — ' + c.name, 'Semestre do curso', 'Semestre inválido: ' + c.stage + '.', 'Informe um número inteiro maior que zero.');
        if (c.room && !has('rooms', c.room))
            validationError('Turmas / etapas — ' + c.name, 'Sala preferencial', 'A sala "' + c.room + '" não está cadastrada.', 'Selecione uma sala existente ou Automática.');
    }
    for (const o of d.offers) {
        const local = 'Ofertas de disciplinas — ' + display('subjects',o.subject) + ' / ' + display('cohorts',o.cohort) + ' (ID ' + o.id + ')';
        if (!has('subjects',o.subject))
            validationError(local,'Disciplina','A disciplina "' + o.subject + '" não existe.', 'Selecione uma disciplina cadastrada.');
        if (!has('teachers',o.teacher))
            validationError(local,'Professor','O professor "' + o.teacher + '" não existe.', 'Selecione um professor cadastrado.');
        if (!has('cohorts',o.cohort))
            validationError(local,'Turma','A turma "' + o.cohort + '" não existe.', 'Selecione uma turma cadastrada.');
        if (!d.periods.includes(o.period))
            validationError(local,'Período letivo','O período "' + o.period + '" não existe.', 'Selecione um período letivo cadastrado.');
        if (!Number.isInteger(o.load) || o.load <= 0 || o.load > 30)
            validationError(local,'Aulas semanais de 50 minutos','Carga inválida: ' + String(o.load) + ' aula(s) por semana.', 'Informe um número inteiro de 1 a 30.');
    }
    for (const c of d.cohorts) for (const p of d.periods) {
        const offers = d.offers.filter(o => o.cohort === c.id && o.period === p);
        const total = offers.reduce((n, o) => n + o.load, 0);
        if (total > 30)
            validationError('Turmas / etapas — ' + c.name + ' · ' + p, 'Aulas semanais de 50 minutos', 'A turma tem ' + total + ' aulas por semana, mas o limite é 30 (' + offers.map(o => display('subjects',o.subject) + ': ' + o.load).join('; ') + ').', 'Reduza a carga de uma das ofertas dessa turma até o total ser no máximo 30.');
    }
    for (const g of d.graduates) {
        const local = 'Formandos — ' + g.name;
        if (typeof g.active !== 'boolean')
            validationError(local,'Ativo','O estado de participação é inválido.', 'Marque ou desmarque a opção de considerar no planejamento.');
        if (!d.periods.includes(g.period))
            validationError(local,'Período letivo','O período "' + g.period + '" não existe.', 'Vincule o formando a um período cadastrado.');
        if (!Array.isArray(g.subjects))
            validationError(local,'Disciplinas necessárias','A lista de disciplinas está inválida.', 'Selecione as disciplinas necessárias novamente.');
        for (const subject of g.subjects) {
            if (!has('subjects',subject))
                validationError(local,'Disciplinas necessárias','Disciplina não cadastrada (ID ' + subject + ').', 'Remova a referência ou cadastre a disciplina.');
        }
        if (new Set(g.subjects).size !== g.subjects.length)
            validationError(local,'Disciplinas necessárias','Uma disciplina foi selecionada mais de uma vez.', 'Deixe cada disciplina marcada apenas uma vez.');
    }
    for (const p of d.plans) {
        const local = 'Quadro de horários — ' + p.name;
        if (!d.periods.includes(p.period))
            validationError(local,'Período letivo','O período "' + p.period + '" não existe.', 'Selecione um período válido para a grade.');
        if (!Array.isArray(p.lessons) || p.lessons.length > 1500)
            validationError(local,'Aulas','A lista de aulas da grade está inválida.', 'Restaure um backup consistente.');
        const ids = new Set<string>();
        for (const l of p.lessons) {
            const offer = d.offers.find(o => o.id === l?.offer);
            const row = local + ' — ' + (offer ? display('subjects',offer.subject) : 'oferta ID ' + String(l?.offer)) + ' · ' + (l ? lessonWhen(l.day,l.slot) : 'sem horário');
            if (!l || typeof l.id !== 'string' || !/^[A-Za-z0-9_-]{1,120}$/.test(l.id))
                validationError(row,'Identificador da aula','Aula inválida: identificador ausente ou incorreto.', 'Restaure um backup íntegro.');
            if (ids.has(l.id))
                validationError(row,'Identificador da aula','Aula duplicada (ID ' + l.id + ').', 'Remova a duplicação no arquivo de dados.');
            ids.add(l.id);
            if (!offer || offer.period !== p.period)
                validationError(row,'Oferta','A aula referencia uma oferta ausente ou de outro período.', 'Verifique a oferta e o período da grade.');
            if (!has('rooms',l.room))
                validationError(row,'Sala','A sala "' + l.room + '" não existe.', 'Selecione uma sala cadastrada para a aula.');
            if (!Number.isInteger(l.day) || l.day < 0 || l.day >= 5)
                validationError(row,'Dia','Dia da semana inválido (' + l.day + ').', 'Selecione um dia entre segunda e sexta.');
            if (!Number.isInteger(l.slot) || l.slot < 0 || l.slot >= 6)
                validationError(row,'Horário','Índice de horário inválido (' + l.slot + ').', 'Use um dos seis horários válidos da grade.');
            if (!Number.isInteger(l.length) || l.length < 1 || l.length > 2 || l.slot + l.length > 6)
                validationError(row,'Duração','Aula inválida: duração ou posicionamento fora dos seis horários.', 'Use uma aula simples ou dupla dentro do mesmo dia.');
            if (typeof l.locked !== 'boolean')
                validationError(row,'Bloco fixo','O estado de travamento está inválido.', 'Restaure uma grade válida ou recrie a aula.');
        }
    }
}
function overlap(a: Lesson, b: Lesson) { return a.day === b.day && a.slot < b.slot + b.length && b.slot < a.slot + a.length; }
export function hardIssues(d: DB, lessons: Lesson[], focus?: Set<string>): string[] {
    const issues = new Set<string>();
    for (let i = 0; i < lessons.length; i++) {
        const a = lessons[i], o = d.offers.find(x => x.id === a.offer);
        if (!o) {
            issues.add('Aula ' + a.id + ': oferta inexistente (ID ' + a.offer + '). Confira a oferta cadastrada.');
            continue;
        }
        const r = d.rooms.find(x => x.id === a.room), t = d.teachers.find(x => x.id === o.teacher);
        if (!r || !t) {
            issues.add('Aula de ' + (d.subjects.find(x => x.id === o.subject)?.name || o.subject) + ' em ' + lessonWhen(a.day,a.slot) + ': ' + (!r ? 'sala ID ' + a.room + ' não cadastrada' : 'professor ID ' + o.teacher + ' não cadastrado') + '. Corrija o cadastro relacionado.');
            continue;
        }
        if ((!focus || focus.has(a.id)) && (a.day < 0 || a.day > 4 || a.slot < 0 || a.slot + a.length > 6 || (a.length === 2 && a.slot % 2 !== 0)))
            issues.add('Aula de ' + (d.subjects.find(x => x.id === o.subject)?.name || o.subject) + ' em ' + lessonWhen(a.day,a.slot) + ': a dupla deve começar às 07:30, 09:20 ou 11:00.');
        for (let k = 0; k < a.length && (!focus || focus.has(a.id)); k++) {
            if (!r.available[a.day * 6 + a.slot + k])
                issues.add('Sala indisponível: ' + r.name + ' em ' + lessonWhen(a.day,a.slot+k) + ' (disciplina ' + (d.subjects.find(x=>x.id===o.subject)?.name || o.subject) + '). Marque o horário na disponibilidade da sala ou escolha outro destino.');
            if (!t.available[a.day * 6 + a.slot + k])
                issues.add('Professor indisponível: ' + t.name + ' em ' + lessonWhen(a.day,a.slot+k) + ' (disciplina ' + (d.subjects.find(x=>x.id===o.subject)?.name || o.subject) + '). Ajuste a disponibilidade do professor ou escolha outro horário.');
        }
        for (let j = 0; j < i; j++) {
            const b = lessons[j], ob = d.offers.find(x => x.id === b.offer);
            if (!ob || !overlap(a, b) || (focus && !focus.has(a.id) && !focus.has(b.id)))
                continue;
            if (a.room === b.room)
                issues.add('Sala ocupada: ' + r.name + ' em ' + lessonWhen(a.day,Math.max(a.slot,b.slot)) + ' por ' + (d.subjects.find(x=>x.id===ob.subject)?.name || ob.subject) + '. Escolha outra sala ou horário.');
            if (o.teacher === ob.teacher)
                issues.add('Professor em outra aula: ' + t.name + ' em ' + lessonWhen(a.day,Math.max(a.slot,b.slot)) + ' (' + (d.subjects.find(x=>x.id===ob.subject)?.name || ob.subject) + '). Escolha outro horário.');
            if (o.cohort === ob.cohort)
                issues.add('Choque na turma: ' + d.cohorts.find(x => x.id === o.cohort)?.name + ' em ' + lessonWhen(a.day,Math.max(a.slot,b.slot)) + ' (' + (d.subjects.find(x=>x.id===o.subject)?.name || o.subject) + ' e ' + (d.subjects.find(x=>x.id===ob.subject)?.name || ob.subject) + '). Mova uma das aulas.');
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
/** Change only the room of one complete lesson block, never swap other lessons. */
export function changeRoom(d: DB, p: Plan, id: string, room: string) {
    const next = structuredClone(p), lesson = next.lessons.find(l => l.id === id);
    const blocked = (reason: string) => ({ plan: next, red: [reason], yellow: [] as string[] });
    if (!lesson) return blocked('Aula não encontrada.');
    if (!d.rooms.some(r => r.id === room)) return blocked('Sala não encontrada.');
    if (lesson.locked) return blocked('Destrave a aula antes de alterar a sala.');
    lesson.room = room;
    return { plan: next, red: hardIssues(d, next.lessons, new Set([id])), yellow: [] as string[] };
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

