import type { DB, Plan, Lesson } from './core';
declare const ReleaseHistory: {version:string; releases: {version:string; date:string; title:string; changes:Record<string,string[]>}[]};
declare const Core: typeof import('./core');
declare global {
    interface Window {
        desktop?: {
            seenRelease?: () => Promise<string | null>;
            markReleaseSeen?: () => Promise<void>;
            updateState?: () => Promise<{text: string; ready: boolean; available?: boolean}>;
            checkUpdates?: () => Promise<void>;
            downloadUpdate?: () => Promise<void>;
            installUpdate?: () => Promise<boolean>;
            onUpdate?: (callback: (state: {text: string; ready: boolean; available?: boolean}) => void) => void;
            read: () => Promise<DB>;
            save: (d: DB, reason?: string) => Promise<DB>;
            history: () => Promise<{
                id: number;
                created: string;
                reason: string;
            }[]>;
            restoreHistory: (id: number, revision: number) => Promise<DB>;
            folder: () => Promise<void>;
            export: () => Promise<boolean>;
            import: () => Promise<DB | null>;
            pdf: () => Promise<boolean>;
        };
    }
}
const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector<T>(s)!;
const $$ = (s: string) => Array.from(document.querySelectorAll<HTMLElement>(s));
const esc = (x: unknown) => String(x ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!));
let db: DB, period = '', page = 'schedule', planId = '', busy = false, dragId = '', editing: string | null = null;
let undo: {plan: Plan; cohort: string}[] = [];
let noticeTimer: ReturnType<typeof setTimeout> | null = null;
let selectedView = 'cohort', saving = false;
let graduateExpanded = localStorage.getItem('celgrade-graduates-expanded') !== 'false';
let renamingPlan: string | null = null;
let lastRenderedPage: string | null = null;
const dropCache = new Map<HTMLElement, ReturnType<typeof Core.move>>();
const labels: Record<string, string> = { schedule: 'Quadro de horários', rooms: 'Salas', teachers: 'Professores', subjects: 'Disciplinas', cohorts: 'Turmas / etapas', offers: 'Ofertas de disciplinas', graduates: 'Formandos', periods: 'Períodos letivos', backup: 'Dados e backup', about: 'Sobre' };
// Ícones sem dependência de fontes ou bibliotecas externas: o mesmo traço em toda a interface.
const svgIcon = (paths: string) => '<svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">' + paths + '</svg>';
const iconPaths: Record<string,string> = {
    schedule: '<rect x="3.5" y="4.5" width="17" height="16" rx="2"/><path d="M3.5 10h17M9.2 10v10.5M14.8 10v10.5M8 2.5v4M16 2.5v4"/>',
    rooms: '<path d="M3 21h18M5 21V5l10-2v18M15 8h5v13M9 7h2M9 11h2M9 15h2M9 21v-3h3"/>',
    teachers: '<path d="M10 4h11v11h-7M14 8h4M14 11h4"/><circle cx="7" cy="10" r="3"/><path d="M2 21v-2a5 5 0 0 1 10 0v2"/>',
    subjects: '<path d="M12 6c-3-2-6-2.5-10-1.5v14c4-1 7-.5 10 2 3-2.5 6-3 10-2v-14C18 3.5 15 4 12 6ZM12 6v14.5"/>',
    cohorts: '<circle cx="9" cy="8" r="3"/><path d="M2.5 20v-2a6.5 6.5 0 0 1 13 0v2M16 5a3 3 0 0 1 0 6M18 14a5 5 0 0 1 3.5 5v1"/>',
    offers: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M9 3.5h6M9 9h6M9 13h6M9 17h3"/><path d="m14 17 2 2 4-4"/>',
    graduates: '<path d="m2 9 10-5 10 5-10 5L2 9Z"/><path d="M6 11v5c4 3 8 3 12 0v-5M22 9v6"/>',
    periods: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 11h18M8 15h3M14 15h3M8 18h3"/>',
    backup: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v7c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12v7c0 1.7 3.6 3 8 3s8-1.3 8-3v-7"/>',
    about: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',
    folder: '<path d="M3 7V5a2 2 0 0 1 2-2h4l2.5 3H19a2 2 0 0 1 2 2v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7Z"/><path d="M3 10h18"/>',
    edit: '<path d="M12 5H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"/><path d="m15 4 5 5M10 16l-3 1 1-3L17 5a2.1 2.1 0 0 1 3 3l-10 8Z"/>',
    delete: '<path d="M4 6h16M9 6V3h6v3M6 6l1 15h10l1-15M10 10v7M14 10v7"/>',
    generate: '<path d="m12 3 1.6 4.4L18 9l-4.4 1.6L12 15l-1.6-4.4L6 9l4.4-1.6L12 3ZM19 15l.9 2.1L22 18l-2.1.9L19 21l-.9-2.1L16 18l2.1-.9L19 15ZM4.5 14l.8 1.7L7 16.5l-1.7.8L4.5 19l-.8-1.7L2 16.5l1.7-.8L4.5 14Z"/>',
    add: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
    undo: '<path d="M3 8h12a6 6 0 0 1 0 12h-2M3 8l5-5M3 8l5 5"/>',
    pdf: '<path d="M6 3h9l4 4v14H6a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2ZM15 3v5h4M12 11v6m-3-3 3 3 3-3"/>',
    lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path class="lock-shackle" d="M8 10V7a4 4 0 1 1 8 0v3"/><path d="M12 14v3"/>',
    unlock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path class="lock-shackle" d="M8 10V7a4 4 0 0 1 7.5-2"/><path d="M12 14v3"/>',
    weekly: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 3v4M17 3v4M3 10h18M7 14h3M14 14h3M7 18h3M14 18h3"/>',
    attended: '<path d="m2 8 10-5 10 5-10 5L2 8Z"/><path d="M6 10v5c3 2.5 6 3 9 2M22 8v5M15 18l2.5 2.5L22 16"/>',
    gaps: '<rect x="3" y="4" width="17" height="17" rx="2"/><path d="M7 2.5v3M16 2.5v3M3 9h17M7 13h4M7 17h3"/><circle cx="17" cy="17" r="5"/><path d="M17 14.5v2.7l1.6 1"/>'
};
const navIcons: Record<string,string> = Object.fromEntries(
    Object.entries(iconPaths).map(([key, paths]) => [key, svgIcon(paths)])
);
function metricCard(kind: string, icon: string, value: number | string, label: string) {
    return '<div class="metric-card metric-card--' + kind + '"><span class="metric-icon" aria-hidden="true">' +
        navIcons[icon] + '</span><div class="metric-content"><strong class="metric-value">' + esc(value) +
        '</strong><span class="metric-label">' + esc(label) + '</span></div></div>';
}
const days = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta'];
function notice(s: string, bad = false, persistent = false) {
    if (noticeTimer) clearTimeout(noticeTimer);
    const el = $('#notice');
    $('#notice-text').textContent=s; el.className='visible'+(bad?' bad':'');
    $('#notice-close').onclick=()=>{el.classList.remove('visible');if(noticeTimer)clearTimeout(noticeTimer);noticeTimer=null;};
    if (!persistent) noticeTimer = setTimeout(() => { el.classList.remove('visible'); noticeTimer = null; }, bad ? 10000 : 4000);
}
function explainError(error: unknown, _location: string): string {
    const raw = error instanceof Error ? error.message : String(error);
    return raw.replace(/^Error:\s*/, '').replace(/^Local: [^\n]*\nCampo: [^\n]*\nProblema: /, '')
        .replace(/\nComo resolver: [\s\S]*$/, '');
}
function describeMovement(issues: string[], _location: string) {
    return issues.length ? issues.join('\n') : 'Movimento permitido';
}
function plan() { return db.plans.find(p => p.id === planId && p.period === period); }
function planStatus(p: Plan): 'green'|'yellow'|'red' {
    if (Core.hardIssues(db,p.lessons).length || Core.completeness(db,p).length) return 'red';
    if (Core.graduateReport(db,p).some(r=>!r.ok || r.limited)) return 'yellow';
    return 'green';
}
function updatePlanSelect() {
    const p=plan(), sel=$<HTMLSelectElement>('#plans');
    sel.dataset.status = p ? planStatus(p) : '';
    $('#rename-plan').toggleAttribute('disabled',!p);
    $('#delete-plan').toggleAttribute('disabled',!p);
    $('#delete-all-plans').toggleAttribute('disabled',!db.plans.some(x=>x.period===period));
}
function hasCohortUndo(cohort: string) {return undo.some(x=>x.plan.id===planId && x.cohort===cohort);}
async function deleteAllPlans() {
    const count=db.plans.filter(x=>x.period===period).length;
    if(!count || saving || busy) return;
    if(!await confirmInApp('Excluir todas as alternativas',
        'Excluir '+count+' alternativa(s) do período '+period+'? Os cadastros e as alternativas dos outros períodos serão preservados.',
        'Excluir todas',true))return;
    const n=structuredClone(db);n.plans=n.plans.filter(x=>x.period!==period);
    try{await save(n,'Antes de excluir todas as alternativas de '+period);planId='';undo=[];render();notice(count+' alternativa(s) excluída(s).');}
    catch(e){notice(explainError(e,'Excluir alternativas'),true)}
}
async function deletePlan() {
    const p=plan(); if (!p || busy || saving) return;
    if (!await confirmInApp('Excluir alternativa', 'Excluir "' + p.name + '"? As demais alternativas serão preservadas.', 'Excluir alternativa', true)) return;
    const n=structuredClone(db); n.plans=n.plans.filter(x=>x.id!==p.id);
    try {await save(n,'Antes de excluir alternativa');planId='';undo=[];render();notice('Alternativa excluída.');}
    catch(e){notice(explainError(e,'Excluir alternativa'),true);}
}
function name(kind: 'rooms' | 'teachers' | 'subjects' | 'cohorts', id: string) {
    const item=db[kind].find(x=>x.id===id);
    return item ? (kind==='rooms' ? Core.roomLabel(item as import('./core').Resource) : item.name) : 'Não encontrado';
}
function confirmInApp(title: string, message: string, action = 'Confirmar', dangerous = false): Promise<boolean> {
    return new Promise(resolve => {
        const dialog=document.createElement('dialog'); dialog.className='cel-confirm'; dialog.setAttribute('aria-label',title);
        dialog.innerHTML='<div class="cel-confirm-head"><span class="cel-confirm-icon">!</span><h2>'+esc(title)+'</h2></div>'+
          '<p class="cel-confirm-message">'+esc(message)+'</p><div class="cel-confirm-actions">'+
          '<button type="button" data-choice="cancel">Cancelar</button><button type="button" class="'+(dangerous?'confirm-danger':'primary')+'" data-choice="yes">'+esc(action)+'</button></div>';
        const previous=document.activeElement as HTMLElement|null;
        let finished=false;
        const finish=(ok:boolean)=>{if(finished)return;finished=true;dialog.close();dialog.remove();previous?.focus();resolve(ok);};
        dialog.querySelector<HTMLButtonElement>('[data-choice="cancel"]')!.onclick=()=>finish(false);
        dialog.querySelector<HTMLButtonElement>('[data-choice="yes"]')!.onclick=()=>finish(true);
        dialog.addEventListener('cancel',e=>{e.preventDefault();finish(false)});
        dialog.addEventListener('click',e=>{if(e.target===dialog)finish(false)});
        document.body.append(dialog);dialog.showModal();
        dialog.querySelector<HTMLButtonElement>('[data-choice="cancel"]')!.focus();
    });
}
async function save(next: DB, reason = 'Alteração de ' + (labels[page] || page)) {
    if (saving)
        throw Error('Aguarde o salvamento em andamento.');
    Core.validate(next);
    saving = true;
    try {
        if (window.desktop)
            db = await window.desktop.save(next, reason);
        else {
            const raw = localStorage.getItem('celgrade-lm-v2');
            if (raw && JSON.parse(raw).revision !== next.revision)
                throw Error('Dados alterados em outra aba. Recarregue.');
            next.revision++;
            localStorage.setItem('celgrade-lm-v2', JSON.stringify(next));
            db = next;
        }
    }
    finally {
        saving = false;
    }
}
window.addEventListener('unhandledrejection', event => { event.preventDefault(); notice('Não foi possível concluir: ' + String(event.reason), true); });
function button(id: string, text: string, cls = '') { const key = ({generate:'generate',add:'add',undo:'undo','rename-plan':'edit',pdf:'pdf',export:'backup',import:'folder'} as Record<string,string>)[id]; return `<button id="${id}" class="${cls}">${key ? navIcons[key] : ''}${text.replace(/^[✦+] /, '')}</button>`; }
function options(items: {
    id: string;
    name: string;
}[], value: string) { return items.map(x => `<option value="${esc(x.id)}" ${x.id === value ? 'selected' : ''}>${esc(x.name)}</option>`).join(''); }
function download(text: string, file: string) { const url = URL.createObjectURL(new Blob([text], { type: 'application/json' })); const a = document.createElement('a'); a.href = url; a.download = file; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
function render() {
    const changedPage=lastRenderedPage!==page;
    clearDrag();
    // Mantém o seletor fora do conteúdo antes que uma aba seja re-renderizada.
    const periodSelect=$<HTMLSelectElement>('#period');
    $('#period-anchor').append(periodSelect);
    $('#title').textContent = labels[page];
    $('#nav').innerHTML = Object.entries(labels).map(([key, label]) => `<button data-page="${key}" class="${page === key ? 'active' : ''}"><span class="nav-icon" aria-hidden="true">${navIcons[key]}</span>${label}</button>`).join('');
    $$('[data-page]').forEach(b => b.onclick = () => { if (busy)
        return; page = b.dataset.page!; render(); });
    $('#period').innerHTML = db.periods.map(p => `<option ${p === period ? 'selected' : ''}>${p}</option>`).join('');
    if (page === 'schedule')
        renderSchedule();
    else if (page === 'backup')
        renderBackup();
    else if (page === 'about')
        renderAbout();
    else if (page === 'periods')
        renderPeriods();
    else
        renderList();
    const content=$('#content');
    content.classList.remove('page-enter');
    if(changedPage){void content.offsetWidth;content.classList.add('page-enter');}
    lastRenderedPage=page;
}
function renderSchedule() {
    const plans = db.plans.filter(p => p.period === period);
    if (!plan())
        planId = plans.at(-1)?.id || '';
    const p = plan();
    $('#content').innerHTML = `<div class="panel no-print schedule-tools"><div id="schedule-status"></div><div class="actions"><div class="command-group"><small>GERAÇÃO</small><div class="actions">${button('generate','✦ Gerar outra alternativa','primary')}<select id="plans" aria-label="Selecionar alternativa" class="plan-select"><option value="">Selecione uma grade</option>${plans.map(x=>`<option value="${esc(x.id)}" data-status="${planStatus(x)}" ${x.id===planId?'selected':''}>${planStatus(x)==='green'?'🟢':planStatus(x)==='yellow'?'🟡':'🔴'} ${esc(x.name)}</option>`).join('')}</select>${button('rename-plan','Renomear')}${button('cancel-generation','Cancelar busca')}</div></div><div class="command-group"><small>ALTERNATIVAS</small><div class="actions"><div class="delete-pair"><button id="delete-plan" class="delete-action" type="button" title="Excluir apenas a alternativa selecionada">${navIcons.delete}Excluir uma</button><button id="delete-all-plans" class="delete-action" type="button" title="Excluir todas as alternativas deste período">Excluir todas</button></div></div></div><div class="command-group"><small>EXPORTAÇÃO E VISUALIZAÇÃO</small><div class="actions">${button('pdf','Baixar PDF')}<select id="view"><option value="cohort">Por turma</option><option value="teacher">Por professor</option><option value="graduate">Por formando</option></select></div></div></div><p class="muted">As alternativas anteriores são preservadas. O cadeado fixa uma aula. Arraste ou clique na aula e depois no destino para mover ou trocar blocos da mesma turma. Esc cancela. Botão direito altera a sala.</p><div id="schedule-diagnostics"></div>${!db.offers.length ? button('demo','Carregar exemplo fictício') : ''}</div><div id="report"></div><div id="tables"></div>`;
    $('#generate').onclick = generate;
    $('#cancel-generation').hidden = true;
    $<HTMLSelectElement>('#view').value = selectedView;
    $('#rename-plan').onclick = renamePlan;
    $('#plans').onchange = e => { planId = (e.target as HTMLSelectElement).value; undo = []; render(); };
    $('#delete-plan').onclick = deletePlan;
    $('#delete-all-plans').onclick = deleteAllPlans;
    updatePlanSelect();
    $('#pdf').onclick = pdf;
    $('#view').onchange = () => { selectedView = $<HTMLSelectElement>('#view').value; clearDrag(); renderTables(); };
    if ($('#demo'))
        $('#demo').onclick = async () => { if (!await confirmInApp('Carregar exemplo', 'Isso substituirá os cadastros e grades atuais.', 'Carregar exemplo', true))
            return; const n = Core.demo(); n.revision = db.revision; await save(n); period = db.periods[0]; render(); };
    if (p) {
        const q=Core.quality(db,p),reports=Core.graduateReport(db,p),hard=Core.hardIssues(db,p.lessons),missing=Core.completeness(db,p);
        const gaps=Core.cohortGaps(db,p);
        const attended=reports.filter(g=>g.ok).length;
        $('#schedule-status').innerHTML =
          '<div class="schedule-status-bar"><span class="schedule-status-heading">RESUMO DA ALTERNATIVA</span><div class="schedule-status-values">'+
          '<span class="status-pill" title="Aulas semanais">'+navIcons.weekly+'<strong>'+p.lessons.reduce((n,l)=>n+l.length,0)+'</strong> aulas</span>'+
          '<span class="status-pill" title="Blocos fixos">'+navIcons.lock+'<strong>'+p.lessons.filter(l=>l.locked).length+'</strong> blocos fixos</span>'+
          '<details id="gap-details" class="status-gaps"><summary class="status-pill" title="Ver janelas nas turmas">'+navIcons.gaps+'<strong>'+gaps.length+'</strong> janelas <span class="gap-chevron" aria-hidden="true">⌄</span></summary>'+
          '<div class="status-gaps-menu"><p class="muted">Janelas são horários vagos entre duas aulas da mesma turma no mesmo dia. Não são conflitos.</p>'+
          (gaps.length?'<div class="record-chips">'+gaps.map(x=>'<span class="record-chip">'+esc(db.cohorts.find(c=>c.id===x.cohort)?.name||'Turma')+' · '+esc(days[x.day])+' · '+esc(Core.times[x.slot])+'</span>').join('')+'</div>':'<p class="muted">Nenhuma janela nesta alternativa.</p>')+'</div></details></div></div>';
        $('#schedule-diagnostics').innerHTML = hard.length||missing.length?
          '<section class="diagnostics" role="status"><h3>⚠ Atenção à grade · '+(hard.length+missing.length)+' aviso(s)</h3>'+[...hard,...missing].map(s=>'<p>'+esc(s)+'</p>').join('')+'</section>':'';
        $('#report').innerHTML =
          '<div class="panel no-print graduate-dashboard"><div class="graduate-dashboard-top"><div class="graduate-title-group"><span class="graduate-title-icon" aria-hidden="true">'+navIcons.attended+'</span><div><h2>Formandos</h2><p class="muted">'+attended+' de '+reports.length+' atendidos · '+(reports.length?Math.round(attended*100/reports.length):0)+'% compatíveis</p></div></div><button id="toggle-graduate-dashboard" type="button" aria-expanded="'+graduateExpanded+'">'+(graduateExpanded?'Recolher':'Expandir')+'</button></div>'+
          '<div id="graduate-dashboard-body" '+(graduateExpanded?'':'hidden')+'>'+ 
          '<section class="graduate-list"><div class="section-heading"><h3>Formandos · '+attended+'/'+reports.length+' compatíveis</h3><button id="expand-graduates" type="button">Expandir todos</button></div>'+
          reports.map(g=>'<details class="summary '+(g.ok?'ok':'warning')+'"><summary><span class="avatar" aria-hidden="true">'+esc(g.name.slice(0,1))+'</span><b>'+esc(g.name)+'</b><span>'+(g.ok?'Disciplinas compatíveis':'Pendências')+'</span></summary><p>'+(g.ok?'Todas as disciplinas necessárias estão compatíveis.':esc(g.reasons.join('; ')))+(g.limited?' (nem todos os horários puderam ser conferidos)':'')+'</p></details>').join('')+
          '</section></div></div>';
        $('#toggle-graduate-dashboard').onclick=()=>{graduateExpanded=!graduateExpanded;localStorage.setItem('celgrade-graduates-expanded',String(graduateExpanded));$('#graduate-dashboard-body').hidden=!graduateExpanded;$('#toggle-graduate-dashboard').textContent=graduateExpanded?'Recolher':'Expandir';$('#toggle-graduate-dashboard').setAttribute('aria-expanded',String(graduateExpanded))};
    }
    if(!p) $('#schedule-status').innerHTML = '<div class="schedule-status-bar"><span class="schedule-status-heading">RESUMO DA ALTERNATIVA</span><span class="muted">Selecione ou gere uma alternativa para visualizar os indicadores.</span></div>';
    const expand=document.querySelector<HTMLButtonElement>('#expand-graduates');
    if(expand)expand.onclick=()=>{const entries=$$('.graduate-list details') as HTMLDetailsElement[];const open=entries.some(d=>!d.open);entries.forEach(d=>d.open=open);expand.textContent=open?'Recolher todos':'Expandir todos'};
    renderTables();
}
// Documento independente da interface: grade limpa para PDF e impressão A4.
function printDocument(groups: {id: string; title: string; lessons: Lesson[]}[], p: Plan, mode: string): string {
    const lessonList = (lessons: Lesson[], day: number, slot: number) => lessons
        .filter(l => l.day === day && slot >= l.slot && slot < l.slot + l.length)
        .sort((a,b) => a.id.localeCompare(b.id));
    const issues = [...Core.hardIssues(db,p.lessons),...Core.completeness(db,p)];
    const header = '<div class="print-document-header"><div class="print-kicker">PLANEJAMENTO ACADÊMICO</div>' +
        '<h1>Quadro de horários</h1><p>Período letivo ' + esc(period) + ' <span>·</span> ' + esc(p.name) + '</p></div>';
    const sheets = groups.map(g => {
        const rows = Core.times.map((time,slot) => {
            const cells = days.map((_,day) => {
                const active = lessonList(g.lessons,day,slot);
                const contents = active.length ? active.map(l => {
                    const o=db.offers.find(x=>x.id===l.offer);
                    if (!o) return '<div class="print-lesson">Aula sem disciplina cadastrada</div>';
                    return '<div class="print-lesson subject-' + subjectTone(o.subject) + '">' +
                        '<strong>' + esc(name('subjects',o.subject)) + '</strong>' +
                        '<span>' + esc(name('teachers',o.teacher)) + '</span>' +
                        '<span>' + esc(name('rooms',l.room)) + '</span></div>';
                }).join('') : '<span class="print-empty">—</span>';
                return '<td>' + contents + '</td>';
            }).join('');
            const interval = slot === 2
                ? '<tr class="print-interval" aria-label="Intervalo"><td colspan="6">INTERVALO <span>09:10–09:20</span></td></tr>'
                : '';
            return interval + '<tr class="print-slot-row"><th scope="row">' + esc(time) + '</th>' + cells + '</tr>';
        }).join('');
        const status = mode==='graduate' ? Core.graduateReport(db,p).find(r=>r.id===g.id) : null;
        const note = status && !status.ok ? '<p class="print-group-alert">Atendimento parcial: ' + esc(status.reasons.join('; ')) + '</p>' : '';
        return '<section class="print-sheet"><div class="print-group-heading"><h2>' + esc(g.title) +
            '</h2><span>' + esc(period) + '</span></div>' + note +
            '<table class="print-grid"><thead><tr><th scope="col">Horário</th>' +
            days.map(d=>'<th scope="col">'+esc(d)+'</th>').join('') +
            '</tr></thead><tbody>' + rows + '</tbody></table></section>';
    }).join('');
    return '<div id="print-document" aria-hidden="true">' + header +
        (issues.length ? '<p class="print-draft">RASCUNHO — a alternativa apresenta pendências.</p>' : '') +
        (sheets || '<p>Nenhuma turma ou aula disponível nesta visualização.</p>') + '</div>';
}
function renderTables() {
    const p = plan();
    if (!p) {
        $('#tables').innerHTML = '<div class="panel empty"><h2>Bem-vinda ao CelGrade LM</h2><p>Cadastre os recursos e as ofertas, ou carregue o exemplo para começar.</p></div>';
        return;
    }
    const mode = ($<HTMLSelectElement>('#view')?.value || 'cohort');
    let groups: {
        id: string;
        title: string;
        lessons: Lesson[];
    }[] = [];
    if (mode === 'cohort')
        groups = db.cohorts.filter(c => db.offers.some(o => o.cohort === c.id && o.period === period)).map(c => ({ id: c.id, title: c.name + ' · ' + c.stage + 'º semestre', lessons: p.lessons.filter(l => db.offers.find(o => o.id === l.offer)?.cohort === c.id) }));
    if (mode === 'teacher')
        groups = db.teachers.filter(t => p.lessons.some(l => db.offers.find(o => o.id === l.offer)?.teacher === t.id)).map(t => ({ id: t.id, title: t.name, lessons: p.lessons.filter(l => db.offers.find(o => o.id === l.offer)?.teacher === t.id) }));
    if (mode === 'graduate')
        groups = Core.graduateReport(db, p).map(g => ({ id: g.id, title: g.name + (g.ok ? '' : ' · atendimento parcial'), lessons: p.lessons.filter(l => g.offers.includes(l.offer)) }));
    const printHeader = '<div id="print-header"><div class="print-eyebrow">PLANEJAMENTO ACADÊMICO</div><h1>Quadro de horários</h1><p>Período letivo ' + esc(period) + ' · ' + esc(p.name) + '</p></div>';
    $('#tables').classList.add('schedule-tables');
    $('#tables').innerHTML = groups.map(g => `<article class="panel"><div class="group-heading"><h2>${esc(g.title)} <span class="tag">${period}</span></h2>${mode==='cohort'?`<div class="cohort-actions"><button type="button" data-undo-cohort="${esc(g.id)}" ${hasCohortUndo(g.id)?'':'disabled'}>${navIcons.undo}Desfazer movimento</button><label class="afternoon-switch"><input type="checkbox" disabled> Habilitar aulas à tarde</label><button type="button" disabled>${navIcons.add}Adicionar aula à tarde</button></div>`:''}</div>${mode==='cohort'?'<p class="afternoon-note">Aulas à tarde: em breve — aguardando definição dos horários.</p>':''}${mode === 'graduate' ? graduateNote(g.id, p) : ''}<div class="print-warning">${[...Core.hardIssues(db, p.lessons), ...Core.completeness(db, p)].length ? 'RASCUNHO — esta grade contém conflitos ou cargas incompletas.' : ''}</div><div class="scroll"><table class="grid"><thead><tr><th>Horário</th>${days.map(d => `<th>${d}</th>`).join('')}</tr></thead><tbody>${Core.times.map((t, slot) => `${slot === 2 ? '<tr class="break"><td colspan="6">09:10–09:20 · INTERVALO</td></tr>' : ''}<tr><td class="time">${t}</td>${days.map((_, day) => { const ls = g.lessons.filter(l => l.day === day && slot >= l.slot && slot < l.slot + l.length); return `<td data-cohort="${mode === 'cohort' ? esc(g.id) : ''}" data-day="${day}" data-slot="${slot}">${ls.map(l => { const o = db.offers.find(o => o.id === l.offer)!; return `<div class="lesson subject-${subjectTone(o.subject)} ${l.locked ? 'locked' : ''}" tabindex="0" role="button" aria-label="${l.locked ? 'Aula travada. Esta posição será preservada. Botão direito para alterar sala' : 'Selecionar aula; botão direito ou Shift+F10 para alterar sala'}" draggable="${mode === 'cohort' && !l.locked}" data-lesson="${l.id}">${slot === l.slot ? `<button data-lock="${l.id}" title="${l.locked ? 'Destravar aula' : 'Fixar aula'}">${navIcons[l.locked ? 'lock' : 'unlock']}</button>` : ''}<b>${esc(name('subjects', o.subject))}</b><small>${esc(name('teachers', o.teacher))}<br>${esc(name('rooms', l.room))}</small>${l.locked && slot === l.slot ? '<span class="lesson-lock-badge">Travada</span>' : ''}</div>`; }).join('') || '<div class="free">—</div>'}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div></article>`).join('') || '<div class="panel">Nenhum registro para esta visualização.</div>';
    $('#tables').insertAdjacentHTML('beforeend', printDocument(groups, p, mode));
    $$('[data-undo-cohort]').forEach(b => b.onclick = () => undoMove(b.dataset.undoCohort!));
    $$('[data-lesson]').forEach(el => {
        el.oncontextmenu = e => { e.preventDefault(); e.stopPropagation(); openRoomEditor(el.dataset.lesson!); };
        el.addEventListener('keydown', e => { if (e.target === el && (e.key === 'ContextMenu' || (e.shiftKey && e.key === 'F10'))) { e.preventDefault(); e.stopPropagation(); openRoomEditor(el.dataset.lesson!); } });
    });
    $$('[data-lock]').forEach(b => b.onclick = async (e) => { e.stopPropagation(); if (busy || saving)
        return; const n = structuredClone(db), p2 = n.plans.find(x => x.id === planId)!; const l = p2.lessons.find(x => x.id === b.dataset.lock)!; l.locked = !l.locked; await save(n, 'Antes de fixar/destravar aula'); undo = []; render(); const changed = document.querySelector<HTMLElement>('[data-lock="' + l.id + '"]'); changed?.classList.add('lock-transition'); changed?.addEventListener('animationend', () => changed.classList.remove('lock-transition'), {once:true}); });
    $$('[draggable=true]').forEach(el => {
        el.ondragstart = e => { dragId = el.dataset.lesson!; e.dataTransfer!.setData('text/plain', dragId); const ghost = document.createElement('div'); ghost.className = 'drag-preview'; ghost.setAttribute('aria-hidden', 'true'); document.body.append(ghost); e.dataTransfer!.setDragImage(ghost, 0, 0); setTimeout(() => ghost.remove(), 0); paintTargets(); };
        el.ondragend = clearDrag;
        el.onclick = e => { e.stopPropagation(); if (busy)
            return; const id = el.dataset.lesson!; if (dragId) {
            if (dragId === id) {
                clearDrag();
                return;
            }
            void applyDrop(el.closest('td')!);
            return;
        } dragId = id; paintTargets(); notice('Aula selecionada. Clique no destino; Esc cancela.'); };
        el.onkeydown = e => { if (e.target !== el)
            return; if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            el.click();
        } };
    });
    $$('td[data-cohort]').forEach(cell => {
        cell.tabIndex = 0;
        const show = (e: MouseEvent) => {
            if (!dragId) return;
            const r = checkDrop(cell);
            const lesson = plan()?.lessons.find(l => l.id === dragId);
            const offer = db.offers.find(o => o.id === lesson?.offer);
            const title = offer ? name('subjects', offer.subject) : 'Aula';
            const detail = days[Number(cell.dataset.day)] + ' · ' +
                Core.times[Number(cell.dataset.slot)] + '\n' + dropText(r);
            const tip = $('#tip');
            if (tip.dataset.dragTitle !== title || tip.dataset.dragDetail !== detail) {
                tip.innerHTML = '<div class="drag-tip-title">' + esc(title) + '</div>' +
                    '<div class="drag-tip-description">' + esc(detail) + '</div>';
                tip.dataset.dragTitle = title;
                tip.dataset.dragDetail = detail;
            }
            tip.hidden = false;
            positionDropTip(e.clientX, e.clientY);
        };
        cell.ondragover = e => { if (dragId) {
            e.preventDefault();
            show(e);
        } };
        cell.onmousemove = show;
        cell.onmouseleave = () => { $('#tip').hidden = true; };
        cell.ondrop = e => { e.preventDefault(); void applyDrop(cell); };
        cell.onclick = () => { if (dragId)
            void applyDrop(cell); };
        cell.onkeydown = e => { if (e.target !== cell)
            return; if (dragId && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            void applyDrop(cell);
        } };
    });
}
function subjectTone(id: string) { let hash = 0; for (const c of id) hash = (hash * 31 + c.charCodeAt(0)) >>> 0; return hash % 6; }
function graduateNote(id: string, p: Plan) { const r = Core.graduateReport(db, p).find(r => r.id === id)!; return `<p class="${r.ok ? 'ok' : 'warning'}">${r.ok ? 'Todas as disciplinas necessárias estão compatíveis.' : esc(r.reasons.join('; '))}${r.limited ? ' Nem todos os horários puderam ser conferidos.' : ''}</p>`; }
function dropText(r: ReturnType<typeof Core.move>) { return r.red.length ? describeMovement(r.red, 'Quadro de horários') : r.yellow.length ? 'Movimento exige confirmação:\n' + r.yellow.join('\n') : 'Movimento permitido'; }
function checkDrop(cell: HTMLElement) { const cached = dropCache.get(cell); if (cached)
    return cached; const p = plan()!, l = p.lessons.find(x => x.id === dragId); if (!l)
    return { plan: p, red: ['Aula não encontrada'], yellow: [] }; const o = db.offers.find(x => x.id === l.offer)!; if (cell.dataset.cohort !== o.cohort)
    return { plan: p, red: ['Mova dentro da mesma turma. A oferta não muda de turma pelo arraste.'], yellow: [] }; return Core.move(db, p, l.id, +cell.dataset.day!, +cell.dataset.slot!, l.room); }
function paintTargets() { dropCache.clear(); $$('td[data-cohort]').forEach(c => { c.classList.remove('red', 'yellow', 'green'); const r = checkDrop(c); dropCache.set(c, r); c.classList.add(r.red.length ? 'red' : r.yellow.length ? 'yellow' : 'green'); c.title = dropText(r); }); $$('[data-lesson]').forEach(el => el.classList.toggle('selected', el.dataset.lesson === dragId)); }
function clearDrag() { dragId = ''; dropCache.clear(); $('#tip').hidden = true; delete $('#tip').dataset.dragTitle; delete $('#tip').dataset.dragDetail; $$('td[data-cohort]').forEach(c => { c.classList.remove('red', 'yellow', 'green'); c.removeAttribute('title'); }); $$('.lesson.selected').forEach(c => c.classList.remove('selected')); }
window.addEventListener('keydown', e => { if (e.key === 'Escape')
    clearDrag(); });
async function applyDrop(cell: HTMLElement) {
    if (!dragId || busy || saving)
        return;
    const r = checkDrop(cell);
    clearDrag();
    if (r.red.length) {
        notice('Movimento bloqueado.\n' + describeMovement(r.red, 'Quadro de horários — movimentação de aula'), true);
        return;
    }
    if (r.yellow.length && !await confirmInApp('Confirmar exceção de horário', r.yellow.join('\n'), 'Permitir choque de horários'))
        return;
    const previous = structuredClone(plan()!);
    if (Core.signature(previous) === Core.signature(r.plan))
        return;
    const n = structuredClone(db);
    n.plans = n.plans.map(x => x.id === planId ? r.plan : x);
    try {
        await save(n, r.yellow.length ? 'Antes de movimento com exceção' : 'Antes de mover aula');
        const changed = r.plan.lessons.find(l=>{const old=previous.lessons.find(x=>x.id===l.id);return old&&(l.day!==old.day||l.slot!==old.slot||l.room!==old.room);});
        undo.push({plan:previous,cohort:db.offers.find(o=>o.id===changed?.offer)?.cohort||''});
        if (undo.length > 30)
            undo.shift();
        render();
        notice(r.yellow.length ? 'Alteração salva com exceção para formandos.' : 'Alteração salva.');
    }
    catch (e) {
        notice(explainError(e, labels[page] || 'Operação atual'), true);
    }
}
async function renamePlan() { const p = plan(); if (!p)
    return; renamingPlan = p.id; $('#edit-title').textContent = 'Renomear alternativa'; $('#error').textContent = ''; $('#fields').innerHTML = `<label>Nome da alternativa<input name="name" required maxlength="200" value="${esc(p.name)}"></label>`; $<HTMLDialogElement>('#editor').showModal(); }
async function undoMove(cohort: string) {
    const index=undo.map((x,i)=>x.cohort===cohort&&x.plan.id===planId?i:-1).filter(i=>i>=0).at(-1) ?? -1;
    if(index<0){notice('Não há movimento dessa turma para desfazer.');return;}
    const n=structuredClone(db), current=n.plans.find(p=>p.id===planId);
    if(!current)return;
    const ids=new Set(n.offers.filter(o=>o.cohort===cohort).map(o=>o.id));
    const previous=undo[index].plan;
    current.lessons=current.lessons.filter(l=>!ids.has(l.offer)).concat(previous.lessons.filter(l=>ids.has(l.offer)));
    if(Core.hardIssues(n,current.lessons).length>Core.hardIssues(db,plan()!.lessons).length){
       notice('Desfazer criaria novos conflitos na grade.',true);return;
    }
    try{await save(n,'Antes de desfazer movimento da turma');undo.splice(index,1);render();notice('Movimento desfeito.');}
    catch(e){notice(explainError(e,'Desfazer movimento'),true);}
}
async function pdf() { if (!plan()) {
    notice('Selecione uma grade primeiro.');
    return;
} const p = plan()!; const issues = [...Core.hardIssues(db, p.lessons), ...Core.completeness(db, p)]; if (issues.length && !await confirmInApp('Exportar grade com pendências', issues.join('\n'), 'Exportar rascunho'))
    return; try {
    if (window.desktop) {
        if (await window.desktop.pdf())
            notice('PDF salvo.');
    }
    else
        window.print();
}
catch (e) {
    notice(String(e), true);
} }
async function generate() {
    if (busy || saving)
        return;
    busy = true;
    clearDrag();
    const controls = $$('button,select').map(el => ({el, disabled: el.hasAttribute('disabled')}));
    controls.forEach(x => x.el.setAttribute('disabled', 'true'));
    notice('Comparando alternativas e atendimento dos formandos…', false, true);
    const worker = new Worker('worker.js');
    let ended = false;
    const finish = () => { if (ended)
        return; ended = true; clearTimeout(timer); worker.terminate(); busy = false; controls.forEach(x => { if (!x.disabled) x.el.removeAttribute('disabled'); }); $('#cancel-generation').hidden = true; };
    const timer = setTimeout(() => { finish(); notice('Busca interrompida pelo tempo limite. A grade anterior foi preservada.', true); }, 16000);
    $('#cancel-generation').hidden = false;
    $('#cancel-generation').removeAttribute('disabled');
    $('#cancel-generation').onclick = () => { finish(); notice('Busca cancelada. Nenhuma grade foi alterada.'); };
    worker.onmessage = async (e) => { if (ended)
        return; if (e.data.progress) {
        notice(e.data.progress, false, true);
        return;
    } clearTimeout(timer); $('#cancel-generation').setAttribute('disabled', 'true'); try {
        if (e.data.error)
            throw Error(e.data.error);
        const p = e.data.plan as Plan;
        const n = structuredClone(db);
        n.plans.push(p);
        await save(n, 'Antes de gerar alternativa');
        planId = p.id;
        undo = [];
        finish();
        render();
        notice('Nova alternativa salva. Foram comparadas ' + e.data.candidates + ' opções válidas nesta busca.');
    }
    catch (err) {
        finish();
        notice(explainError(err, labels[page] || 'Operação atual'), true);
    } };
    worker.onerror = e => { finish(); notice('Falha no gerador: ' + e.message, true); };
    worker.postMessage({ db, period, base: plan(), seed: Date.now() });
}
function renderList() {
    const key=page as 'rooms'|'teachers'|'subjects'|'cohorts'|'offers'|'graduates';
    const rows=db[key].filter(x=>!('period' in x)||x.period===period);
    const chips=(values:string[])=>'<div class="record-chips">'+values.map(v=>'<span class="record-chip">'+esc(v)+'</span>').join('')+'</div>';
    if(key==='graduates'||key==='offers'||key==='teachers'){
        const cards=rows.map(x=>{
            const id=x.id,title='name' in x?x.name:name('subjects',x.subject);
            let body='',subtitle='',badge='';
            if('subjects' in x){subtitle='Formando · '+period;badge='<span class="record-chip '+(x.active?'chip-ok':'chip-muted')+'">'+(x.active?'Ativo':'Inativo')+'</span>';
                body='<div class="record-card-label">DISCIPLINAS NECESSÁRIAS</div>'+chips(x.subjects.map(s=>name('subjects',s)));}
            else if('load' in x){subtitle='Oferta acadêmica · '+period;const cohort=db.cohorts.find(c=>c.id===x.cohort);
                body='<div class="record-card-pair"><div><span>PROFESSOR</span><strong>'+esc(name('teachers',x.teacher))+'</strong></div><div><span>TURMA</span><strong>'+esc(name('cohorts',x.cohort))+'</strong></div></div>'+
                chips([(cohort?cohort.stage+'º semestre':'Semestre não encontrado'),x.load+' aulas semanais']);}
            else if('available' in x){subtitle='Professor · '+period;badge='<span class="record-chip chip-ok">'+x.available.filter(Boolean).length+' horários</span>';
                const subjects=[...new Set(db.offers.filter(o=>o.teacher===x.id&&o.period===period).map(o=>name('subjects',o.subject)))];
                body='<div class="record-card-label">DISCIPLINAS MINISTRADAS</div>'+(subjects.length?chips(subjects):'<p class="muted">Sem ofertas neste período.</p>')+
                '<div class="record-card-label">DISPONIBILIDADE SEMANAL</div><div class="availability-mini">'+days.map((day,i)=>{
                    const count=x.available.slice(i*6,(i+1)*6).filter(Boolean).length;
                    return '<div><span>'+esc(day.slice(0,3))+'</span><strong>'+count+'/6</strong></div>';
                }).join('')+'</div>';}
            return '<article class="record-card"><div class="record-card-head"><span class="record-card-icon">'+(navIcons[key]||'')+'</span><div class="record-card-title"><h3>'+esc(title)+'</h3><small>'+esc(subtitle)+'</small></div>'+badge+'</div>'+
            '<div class="record-card-body">'+body+'</div><div class="record-card-actions"><button type="button" class="edit-action" data-edit="'+esc(id)+'">'+navIcons.edit+'Editar</button><button type="button" class="delete-action" data-delete="'+esc(id)+'">'+navIcons.delete+'Excluir</button></div></article>';
        }).join('');
        $('#content').innerHTML='<div class="panel records-panel record-card-panel"><div class="actions">'+button('add','+ Adicionar','primary')+
          '<span class="muted">Cadastros preservam as grades. Alterações podem deixar avisos de inconsistência.</span></div>'+
          '<div class="record-search-bar"><input id="record-search" type="search" placeholder="Buscar '+(key==='graduates'?'formando':key==='teachers'?'professor':'disciplina, professor ou turma')+'" aria-label="Buscar cadastros"><span id="record-count">'+rows.length+' registro(s)</span></div>'+
          '<div class="record-card-grid">'+cards+'</div>'+(rows.length?'':'<p class="muted">Nenhum cadastro ainda.</p>')+'</div>';
        const search=$<HTMLInputElement>('#record-search');
        search.oninput=()=>{const term=search.value.toLocaleLowerCase('pt-BR');let visible=0;$$('.record-card').forEach(el=>{const show=(el.textContent||'').toLocaleLowerCase('pt-BR').includes(term);el.hidden=!show;if(show)visible++});$('#record-count').textContent=visible+' registro(s)'};
    }else{
        const title=({rooms:'Sala',subjects:'Disciplina',cohorts:'Turma'} as Record<string,string>)[key];
        const body=rows.map(x=>{
            const label='name' in x?x.name:'';
            let details='',extra='';
            if('available' in x){details=chips([x.available.filter(Boolean).length+' horários disponíveis']);if(key==='rooms')extra='<td>'+chips([(x as import('./core').Resource).module||'Sem módulo'])+'</td>';}
            else if('stage' in x)details=chips([x.stage+'º semestre',x.room?name('rooms',x.room):'Sala automática']);
            return '<tr><td><span class="record-label">'+(navIcons[key]||'')+esc(label)+'</span></td>'+extra+'<td>'+details+'</td>'+
            '<td class="record-actions"><button class="edit-action" data-edit="'+esc(x.id)+'">'+navIcons.edit+'Editar</button> <button class="delete-action" data-delete="'+esc(x.id)+'">'+navIcons.delete+'Excluir</button></td></tr>';
        }).join('');
        $('#content').innerHTML='<div class="panel records-panel"><div class="actions">'+button('add','+ Adicionar','primary')+
        '<span class="muted">Cadastros preservam as grades. Alterações podem deixar avisos de inconsistência.</span></div><div class="record-table-scroll"><table><thead><tr><th>'+title+'</th>'+(key==='rooms'?'<th>Módulo</th>':'')+
        '<th>Detalhes</th><th>Ações</th></tr></thead><tbody>'+body+'</tbody></table></div>'+(rows.length?'':'<p class="muted">Nenhum cadastro ainda.</p>')+'</div>';
    }
    $('#add').onclick=()=>edit(null);
    $$('[data-edit]').forEach(b=>b.onclick=()=>edit(b.dataset.edit!));
    $$('[data-delete]').forEach(b=>b.onclick=()=>remove(b.dataset.delete!));
}

function edit(id: string | null) {
    renamingPlan = null;
    editing = id;
    const key = page as keyof DB;
    const list = db[key] as any[];
    const x = list.find(x => x.id === id) || {};
    $('#edit-title').textContent = (id ? 'Editar · ' : 'Adicionar · ') + labels[page];
    $('#error').textContent = '';
    let html = '';
    const field = (n: string, title: string, value: unknown = '', type = 'text') => `<label>${title}<input name="${n}" type="${type}" required value="${esc(value)}" ${type === 'number' ? 'min="1" max="30" step="1"' : 'maxlength="200"'}></label>`;
    const select = (n: string, title: string, items: {
        id: string;
        name: string;
    }[], value: string) => `<label>${title}<select name="${n}" ${n === 'room' ? '' : 'required'}>${options(items, value)}</select></label>`;
    if (page !== 'offers') html += field('name', 'Nome', x.name || '');
    if (page === 'rooms') html += field('module', 'Módulo', x.module || '');
    if (page === 'rooms' || page === 'teachers') {
        html += '<p>Disponibilidade semanal — marque quando pode receber aulas</p><div class="actions"><button type="button" id="all">Marcar todos</button><button type="button" id="none">Desmarcar todos</button></div><table class="availability"><tr><th>Horário</th>' + days.map(d => '<th>' + d + '</th>').join('') + '</tr>' + Core.times.map((t, slot) => '<tr><th>' + t + '</th>' + days.map((d, day) => `<td><input type="checkbox" name="available" aria-label="${d} ${t}" value="${day * 6 + slot}" ${(x.available || Array(30).fill(1))[day * 6 + slot] ? 'checked' : ''}></td>`).join('') + '</tr>').join('') + '</table>';

    }
    if (page === 'cohorts')
        html += field('stage', 'Semestre do curso', x.stage || 1, 'number') + select('room', 'Sala preferencial', [{ id: '', name: 'Automática' }, ...db.rooms], x.room || '');
    if (page === 'offers')
        html += select('subject', 'Disciplina', db.subjects, x.subject) + select('teacher', 'Professor', db.teachers, x.teacher) + select('cohort', 'Turma', db.cohorts, x.cohort) + field('load', 'Aulas semanais de 50 minutos', x.load || 2, 'number') + `<p class="muted">Oferta para ${period}. A disciplina pode ter outras ofertas em outras turmas.</p>`;
    if (page === 'graduates')
        html += `<label><input type="checkbox" name="active" ${x.active !== false ? 'checked' : ''}> Considerar no planejamento de ${period}</label><h3>Disciplinas necessárias</h3><div class="checks">${db.subjects.map(s => `<label><input type="checkbox" name="subject" value="${s.id}" ${(x.subjects || []).includes(s.id) ? 'checked' : ''}> ${esc(s.name)}</label>`).join('')}</div>`;
    $('#fields').innerHTML = html;
    if ($('#all'))
        $('#all').onclick = () => document.querySelectorAll<HTMLInputElement>('[name=available]').forEach(x => x.checked = true);
    if ($('#none'))
        $('#none').onclick = () => document.querySelectorAll<HTMLInputElement>('[name=available]').forEach(x => x.checked = false);
    $<HTMLDialogElement>('#editor').showModal();
}
async function remove(id: string) { if (!await confirmInApp('Excluir cadastro', 'Registros usados em ofertas ou grades não podem ser excluídos.', 'Excluir cadastro', true))
    return; const n = structuredClone(db); (n as any)[page] = (n as any)[page].filter((x: any) => x.id !== id); try {
    await save(n);
    render();
    if (typeof ReleaseHistory !== 'undefined') void initReleaseHistory();
}
catch (e) {
    notice(explainError(e, labels[page] + ' — exclusão'), true);
} }
$('#form').onsubmit = async (e) => { e.preventDefault(); if (renamingPlan) {
    const n = structuredClone(db);
    n.plans.find(p => p.id === renamingPlan)!.name = String(new FormData(e.target as HTMLFormElement).get('name')).trim();
    try {
        await save(n, 'Antes de renomear alternativa');
        renamingPlan = null;
        $<HTMLDialogElement>('#editor').close();
        render();
    }
    catch (err) {
        $('#error').textContent = explainError(err, $('#edit-title').textContent || 'Cadastro');
    }
    return;
} const f = new FormData(e.target as HTMLFormElement), n = structuredClone(db), rows = (n as any)[page] as any[], old = rows.find(x => x.id === editing); const x: any = { id: editing || Core.uid() }; if (page !== 'offers')
    x.name = String(f.get('name')).trim(); if (page === 'rooms' || page === 'teachers') {
    x.available = Array.from({ length: 30 }, (_, i) => f.getAll('available').includes(String(i)) ? 1 : 0);
    if (page === 'rooms') { x.module=String(f.get('module') || '').trim(); if (!x.module) { $('#error').textContent='Informe o módulo da sala.'; return; } }
} if (page === 'cohorts') {
    x.stage = Number(f.get('stage'));
    x.room = f.get('room');
} if (page === 'offers') {
    for (const k of ['subject', 'teacher', 'cohort'])
        x[k] = f.get(k);
    x.load = Number(f.get('load'));
    x.period = old?.period || period;
} if (page === 'graduates') {
    x.subjects = f.getAll('subject');
    x.active = f.has('active');
    x.period = old?.period || period;
} if (old)
    rows[rows.indexOf(old)] = x;
else
    rows.push(x); try {
    await save(n);
    undo = [];
    $<HTMLDialogElement>('#editor').close();
    render();
    notice('Cadastro salvo. Grades existentes foram preservadas; confira os avisos no quadro.');
}
catch (err) {
    $('#error').textContent = explainError(err, $('#edit-title').textContent || 'Cadastro');
} };
$('#cancel').onclick = () => $<HTMLDialogElement>('#editor').close();
function renderPeriods() {
    const items=db.periods.map(p=>'<div class="period-entry"><span class="period-entry-icon" aria-hidden="true">'+navIcons.periods+'</span><div class="period-entry-copy"><strong>'+esc(p)+'</strong><small>'+(p.endsWith('.1')?'1º semestre':'2º semestre')+' de '+esc(p.slice(0,4))+'</small></div>'+(p===period?'<span class="period-active-label">Em uso</span>':'<button type="button" data-use-period="'+esc(p)+'">Selecionar</button>')+'</div>').join('');
    $('#content').innerHTML='<section class="periods-page"><div class="period-cards">'+
      '<div class="panel period-card"><div class="period-card-heading"><span class="period-card-icon">'+navIcons.periods+'</span><div><h2>Período em uso</h2><p class="muted">Aplicado às demais abas</p></div></div><div id="period-mount"></div><p class="period-current">Período selecionado: <strong>'+esc(period)+'</strong></p></div>'+
      '<div class="panel period-card"><div class="period-card-heading"><span class="period-card-icon">'+navIcons.add+'</span><div><h2>Cadastrar novo período</h2><p class="muted">Formato: ano e semestre</p></div></div><label for="new-period">Novo período</label><input id="new-period" placeholder="Ex.: 2027.1" pattern="[0-9]{4}\\.[12]" inputmode="text"><div class="period-add-actions">'+button('add-period','Adicionar período','primary')+'</div></div>'+
      '</div><div class="panel periods-list"><div class="period-list-heading"><h2>Períodos cadastrados</h2><span>'+db.periods.length+' cadastrados</span></div>'+items+'</div>'+
      '<p class="muted period-note">2027.1 indica o primeiro semestre do ano. A etapa da turma (1º, 5º etc.) é cadastrada em Turmas / etapas.</p></section>';
    $('#period-mount').append($<HTMLSelectElement>('#period'));
    $$('[data-use-period]').forEach(button=>button.onclick=()=>{
        $<HTMLSelectElement>('#period').value=button.dataset.usePeriod!;
        $('#period').dispatchEvent(new Event('change',{bubbles:true}));
    });
    $('#add-period').onclick=async()=>{
        const value=$<HTMLInputElement>('#new-period').value.trim();
        if(!/^\d{4}\.[12]$/.test(value)){notice('Informe um período válido no formato AAAA.1 ou AAAA.2.',true);return;}
        if(db.periods.includes(value)){notice('Esse período já está cadastrado.',true);return;}
        const n=structuredClone(db);n.periods.push(value);n.periods.sort();
        try{await save(n);period=value;localStorage.setItem('celgrade-active-period',period);planId='';undo=[];render();notice('Período '+value+' cadastrado e selecionado.');}
        catch(e){notice(explainError(e,'Períodos letivos'),true);}
    };
}
function renderBackup() { $('#content').innerHTML = `<div class="panel"><h2>Seus dados, no seu computador</h2><p>${window.desktop ? 'Banco SQLite salvo na pasta de dados do CelGrade LM.' : 'Modo navegador: dados no armazenamento local deste navegador.'}</p><p class="muted">O backup inclui cadastros, formandos, períodos, alternativas e aulas fixas. PDF é para consulta; JSON permite restaurar o trabalho.</p><div class="actions">${button('export', 'Exportar backup JSON')}${button('import', 'Restaurar backup')}${button('recovery', 'Histórico de recuperação')}</div><input type="file" id="file" accept=".json" hidden><div id="recovery-list"></div></div>`; $('#recovery').onclick = showRecovery; $('#export').onclick = () => { if (window.desktop)
    window.desktop.export().catch(e => notice(String(e), true));
else
    download(JSON.stringify(db, null, 2), 'CelGrade-LM-backup.json'); }; async function restore(n: DB | null) { if (!n)
    return; if (!await confirmInApp('Restaurar backup', 'Isso substituirá todos os dados atuais. Exporte um backup antes de continuar.', 'Restaurar dados', true))
    return; n.revision = db.revision; await save(n, 'Antes de restaurar backup'); undo = []; period = db.periods[0]; planId = ''; render(); notice('Backup restaurado, incluindo grades.'); } $('#import').onclick = async () => { try {
    if (window.desktop)
        await restore(await window.desktop.import());
    else
        $<HTMLInputElement>('#file').click();
}
catch (e) {
    notice(String(e), true);
} }; $('#file').onchange = async () => { try {
    const f = $<HTMLInputElement>('#file').files?.[0];
    if (f) {
        if (f.size > 10e6)
            throw Error('Backup maior que 10 MB');
        await restore(JSON.parse(await f.text()));
    }
}
catch (e) {
    notice(String(e), true);
} }; }
async function showRecovery() {
    if (!window.desktop) {
        notice('Histórico automático disponível no aplicativo desktop.');
        return;
    }
    const rows = await window.desktop.history();
    $('#recovery-list').innerHTML = '<h3>Últimos 30 estados anteriores</h3><p class="muted">Restaurar substitui todos os dados. O estado atual também é guardado antes da restauração.</p>' + rows.map(r => `<p><button data-recover="${r.id}">Restaurar</button> ${esc(new Date(r.created).toLocaleString('pt-BR'))} · ${esc(r.reason)}</p>`).join('');
    $$('[data-recover]').forEach(b => b.onclick = async () => { if (!await confirmInApp('Recuperar dados', 'Todos os cadastros e grades serão restaurados para este ponto.', 'Restaurar dados', true))
        return; db = await window.desktop!.restoreHistory(Number(b.dataset.recover), db.revision); undo = []; period = db.periods[0]; planId = ''; render(); notice('Estado anterior restaurado. O estado substituído está no histórico.'); });
}
$('#period').onchange = () => { period = $<HTMLSelectElement>('#period').value; localStorage.setItem('celgrade-active-period',period); planId = ''; undo = []; render(); };
$('#folder').onclick = () => window.desktop ? window.desktop.folder() : notice('No navegador, use Dados e backup para exportar os dados.');
(async () => { try {
    db = window.desktop ? await window.desktop.read() : JSON.parse(localStorage.getItem('celgrade-lm-v2') || 'null') || Core.empty();
    Core.validate(db);
    const rememberedPeriod=localStorage.getItem('celgrade-active-period');
    period = rememberedPeriod && db.periods.includes(rememberedPeriod) ? rememberedPeriod : db.periods[0];
    render();
    if (typeof ReleaseHistory !== 'undefined') void initReleaseHistory();
}
catch (e) {
    notice('Falha ao abrir os dados: ' + String(e), true);
} })();

function initUpdateControls(dialog: HTMLDialogElement) {
    if (!window.desktop?.updateState) return;
    const status=document.createElement('section');status.className='update-card';
    status.innerHTML='<div class="update-card-top"><span class="update-card-icon" aria-hidden="true">↻</span><div class="update-card-copy"><strong id="update-heading">Verificar atualizações</strong><p id="update-message" role="status">Consulte a versão disponível sem sair do CelGrade.</p></div></div>'+
       '<div id="update-progress-wrap" hidden><div class="update-progress-bar" role="progressbar" aria-label="Progresso do download" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span id="update-progress"></span></div><div id="update-progress-detail"></div></div>'+
       '<div class="update-actions"><button type="button" id="update-check">Verificar atualizações</button><button type="button" class="primary" id="update-download" hidden>Baixar atualização</button><button type="button" class="primary" id="update-install" hidden>Instalar e reiniciar</button><button type="button" id="update-later" hidden>Mais tarde</button></div>';
    dialog.querySelector('#release-intro')!.after(status);
    status.querySelector<HTMLElement>('.update-card-top')!.append(status.querySelector<HTMLElement>('.update-actions')!);
    const heading=status.querySelector<HTMLElement>('#update-heading')!,message=status.querySelector<HTMLElement>('#update-message')!,
      check=status.querySelector<HTMLButtonElement>('#update-check')!,download=status.querySelector<HTMLButtonElement>('#update-download')!,
      install=status.querySelector<HTMLButtonElement>('#update-install')!,later=status.querySelector<HTMLButtonElement>('#update-later')!,
      wrap=status.querySelector<HTMLElement>('#update-progress-wrap')!,bar=status.querySelector<HTMLElement>('.update-progress-bar')!,
      fill=status.querySelector<HTMLElement>('#update-progress')!,details=status.querySelector<HTMLElement>('#update-progress-detail')!;
    const show=(s:{text:string;ready:boolean;available?:boolean;downloading?:boolean;checking?:boolean;version?:string;percent?:number;transferred?:number;total?:number;bytesPerSecond?:number})=>{
        message.textContent=s.text;
        const active=!!s.available||s.ready;
        heading.textContent=s.ready?'Atualização pronta para instalar':s.downloading?'Baixando atualização'+(s.version?' '+s.version:''):active?'Nova versão '+(s.version||'')+' disponível':s.checking?'Procurando atualizações…':'Atualizações';
        check.disabled=!!s.checking||!!s.downloading;
        download.hidden=!active||!!s.ready||!!s.downloading;
        download.disabled=!!s.checking;
        install.hidden=!s.ready;
        later.hidden=!active||!!s.downloading;
        wrap.hidden=!s.downloading;
        if(s.downloading){
          const percent=Math.max(0,Math.min(100,s.percent||0));
          fill.style.width=percent+'%';bar.setAttribute('aria-valuenow',String(Math.round(percent)));
          const mb=(x:number)=> (x/1048576).toFixed(1)+' MB';
          details.textContent=Math.round(percent)+'% · '+mb(s.transferred||0)+' de '+mb(s.total||0)+(s.bytesPerSecond?' · '+mb(s.bytesPerSecond)+'/s':'');
        }
        const version=$('#app-version');version.classList.toggle('update-available',active);version.textContent='Versão '+ReleaseHistory.version+' · '+(active?'! Atualização disponível':'Ver mudanças');
        version.title=active?s.text:'Histórico de atualizações';
    };
    window.desktop.onUpdate?.(show);void window.desktop.updateState().then(show).catch(()=>{});
    check.onclick=async()=>{check.disabled=true;try{await window.desktop!.checkUpdates!()}catch(e){notice(String(e),true)}finally{check.disabled=false}};
    download.onclick=async()=>{download.disabled=true;try{await window.desktop!.downloadUpdate!()}catch(e){notice(String(e),true)}finally{download.disabled=false}};
    later.onclick=()=>dialog.close();
    install.onclick=async()=>{
      if(busy||saving||document.querySelector('dialog[open]:not(#release-history)')){notice('Conclua a operação atual antes de instalar.',true);return;}
      if(!await confirmInApp('Instalar atualização','Será criado um backup antes de instalar e reiniciar o aplicativo.','Instalar e reiniciar'))return;
      try{await window.desktop!.installUpdate!()}catch(e){notice('Instalação não iniciada: '+String(e),true)}
    };
}

async function initReleaseHistory() {
    const button = document.querySelector<HTMLButtonElement>('#app-version');
    if (!button) return;
    button.textContent = `Versão ${ReleaseHistory.version} · Ver mudanças`;
    let seen: string | null = null;
    try { seen = window.desktop?.seenRelease ? await window.desktop.seenRelease() : localStorage.getItem('celgrade-seen-release'); } catch { /* Display again rather than silently lose the notice. */ }
    const newer = (a: string, b: string) => { const aa = a.split('.').map(Number), bb = b.split('.').map(Number); for (let i=0;i<3;i++) { if (aa[i] !== bb[i]) return aa[i] > bb[i]; } return false; };
    const unread = ReleaseHistory.releases.filter(r => seen && /^\d+\.\d+\.\d+$/.test(seen) ? newer(r.version, seen) : r.version === ReleaseHistory.version);
    const dialog = document.createElement('dialog'); dialog.id = 'release-history'; dialog.setAttribute('aria-labelledby', 'release-title');
    dialog.innerHTML = '<div class="release-heading"><div><small>CELGRADE LM</small><h2 id="release-title">Histórico de atualizações</h2></div><button type="button" id="release-close" aria-label="Fechar histórico">Fechar</button></div><p id="release-intro"></p><div id="release-list"></div><p id="release-error" role="status"></p>';
    const list = dialog.querySelector<HTMLElement>('#release-list')!;
    for (const r of ReleaseHistory.releases) {
        const details = document.createElement('details'); details.className = 'release-entry';
        details.open = unread.some(u => u.version === r.version) || r.version === ReleaseHistory.version;
        const summary = document.createElement('summary'); summary.textContent = `${r.version} — ${r.title} · ${r.date.split('-').reverse().join('/')}${r.version === ReleaseHistory.version ? ' · Atual' : ''}`; details.append(summary);
        for (const [category, items] of Object.entries(r.changes)) {
            const section=document.createElement('section');section.className='release-category';
            const h = document.createElement('h3'); h.textContent = category; const ul = document.createElement('ul');
            for (const text of items) { const li = document.createElement('li'); li.textContent = text; ul.append(li); }
            section.append(h,ul);details.append(section);
        }
        list.append(details);
    }
    document.body.append(dialog);
    initUpdateControls(dialog);
    const open = (automatic: boolean) => {
        if (dialog.open) return;
        dialog.querySelector('#release-title')!.textContent = automatic ? 'O que mudou no CelGrade LM' : 'Histórico de atualizações';
        dialog.querySelector('#release-intro')!.textContent = automatic ? `Você está na versão ${ReleaseHistory.version}. Confira as novidades abaixo. O histórico continua disponível pelo botão da versão.` : 'Consulte as novidades, melhorias e correções de cada versão. Clique em uma versão para expandir.';
        dialog.showModal();
    };
    dialog.querySelector<HTMLButtonElement>('#release-close')!.onclick = () => dialog.close();
    dialog.addEventListener('close', async () => {
        try { if (window.desktop?.markReleaseSeen) await window.desktop.markReleaseSeen(); else localStorage.setItem('celgrade-seen-release', ReleaseHistory.version); }
        catch { notice('Não foi possível registrar a leitura das novidades. O aviso poderá aparecer novamente.', true); }
        button.focus();
    });
    button.onclick = () => open(false);
    if (unread.length && !document.querySelector('dialog[open]')) open(true);
}


function openRoomEditor(id: string) {
    if (busy || saving || document.querySelector('dialog[open]')) return;
    clearDrag();
    const current = plan(), lesson = current?.lessons.find(l => l.id === id);
    if (!current || !lesson) return;
    if (lesson.locked) { notice('Destrave a aula antes de alterar a sala.', true); return; }
    const selectedPlan = current.id;
    const dialog = document.createElement('dialog'); dialog.id = 'room-editor'; dialog.setAttribute('aria-labelledby','room-title');
    dialog.innerHTML = `<h2 id="room-title">Alterar sala da aula</h2><p>O horário e a turma serão mantidos. A mudança vale para todo o bloco da aula.</p><label>Nova sala<select id="room-select">${options(db.rooms,lesson.room)}</select></label><p id="room-status" role="status"></p><div class="actions"><button id="room-cancel" type="button">Cancelar</button><button id="room-save" type="button" class="primary">Salvar sala</button></div>`;
    document.body.append(dialog);
    const select = dialog.querySelector<HTMLSelectElement>('#room-select')!, submit = dialog.querySelector<HTMLButtonElement>('#room-save')!, status = dialog.querySelector<HTMLElement>('#room-status')!;
    const check = () => { const p = plan(); return !p || p.id !== selectedPlan ? null : Core.changeRoom(db,p,id,select.value); };
    const preview = () => { const result = check(); status.textContent = result ? result.red.join('; ') || 'Sala disponível para este bloco.' : 'A grade mudou. Feche e tente novamente.'; status.className = !result || result.red.length ? 'bad' : 'ok'; submit.disabled = !result || !!result.red.length || select.value === lesson.room; };
    select.onchange = preview;
    const cancel = dialog.querySelector<HTMLButtonElement>('#room-cancel')!;
    let committing = false;
    cancel.onclick = () => { if (!committing) dialog.close(); };
    dialog.addEventListener('cancel', e => { if (committing) e.preventDefault(); });
    dialog.addEventListener('close', () => dialog.remove(), {once:true});
    submit.onclick = async () => {
        if (busy || saving) return;
        const result = check();
        if (!result || result.red.length) { preview(); return; }
        const previous = structuredClone(plan()!);
        if (Core.signature(previous) === Core.signature(result.plan)) { dialog.close(); return; }
        committing = true; cancel.disabled = true; submit.disabled = true; select.disabled = true;
        const n = structuredClone(db); n.plans = n.plans.map(p => p.id === selectedPlan ? result.plan : p);
        try { await save(n,'Antes de alterar sala'); undo.push({plan:previous,cohort:db.offers.find(o=>o.id===lesson.offer)?.cohort||''}); if(undo.length>30)undo.shift(); dialog.close(); render(); notice('Sala alterada. O horário e a turma foram mantidos.'); }
        catch (error) { status.textContent = explainError(error, 'Quadro de horários — alteração da sala'); status.className='bad'; committing=false; cancel.disabled=false; submit.disabled=false; select.disabled=false; }
    };
    preview(); dialog.showModal(); select.focus();
}


function positionDropTip(x: number, y: number) {
    const tip = $('#tip');
    const offset = 16, margin = 12;
    const width = tip.offsetWidth || 330, height = tip.offsetHeight || 90;
    const maxX = Math.max(margin, window.innerWidth - width - margin);
    const maxY = Math.max(margin, window.innerHeight - height - margin);
    const preferLeft = x + width + offset > window.innerWidth - margin;
    const preferAbove = y + height + offset > window.innerHeight - margin;
    const left = preferLeft ? x - width - offset : x + offset;
    const top = preferAbove ? y - height - offset : y + offset;
    tip.style.left = Math.max(margin, Math.min(maxX, left)) + 'px';
    tip.style.top = Math.max(margin, Math.min(maxY, top)) + 'px';
    tip.style.right = 'auto'; tip.style.bottom = 'auto';
}
function renderAbout() {
    const icon = {
        code: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 8-4 4 4 4M16 8l4 4-4 4M13.5 5l-3 14"/></svg>',
        cap: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m2 9 10-5 10 5-10 5L2 9Z"/><path d="M6 11.5V16c0 1.4 2.7 3 6 3s6-1.6 6-3v-4.5"/><path d="M22 9v6"/></svg>',
        heart: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5S3.5 15.4 3.5 9.3A4.6 4.6 0 0 1 12 7a4.6 4.6 0 0 1 8.5 2.3c0 6.1-8.5 11.2-8.5 11.2Z"/></svg>'
    };
    $('#content').innerHTML = `<article class="about">
<section class="about-hero">
<span class="about-badge">CelGrade LM</span>
<h2>Feito para facilitar o planejamento acadêmico</h2>
<p>Uma ferramenta criada para apoiar a organização dos horários, reduzir conflitos e dar mais espaço ao cuidado com cada estudante.</p>
</section>
<section class="panel about-section">
<h3><span class="about-icon">${icon.code}</span>Desenvolvedores</h3>
<div class="about-people">
<div class="about-person"><span class="about-avatar" aria-hidden="true">LJ</span><div><strong>Luiz Vicente Gomes Jirardi</strong><small>Desenvolvedor</small></div></div>
<div class="about-person"><span class="about-avatar" aria-hidden="true">MF</span><div><strong>Marcus Vinicius Magalhães França Filho</strong><small>Desenvolvedor</small></div></div>
</div>
<p class="about-note">Estudantes do 6º semestre de Ciência da Computação na Universidade Estadual do Sudoeste da Bahia (UESB).</p>
</section>
<section class="panel about-section">
<h3><span class="about-icon">${icon.cap}</span>Incentivo ao projeto</h3>
<p>Este projeto foi idealizado e desenvolvido com o incentivo do professor <strong>Roque Mendes Prado Trindade</strong>, no âmbito da disciplina de Análise de Algoritmos, aproximando os conhecimentos adquiridos em sala de aula das necessidades reais da comunidade acadêmica e demonstrando como a tecnologia pode contribuir para solucionar problemas do cotidiano.</p>
</section>
<blockquote class="about-dedication">
<span class="about-heart">${icon.heart}</span>
<h3>À Celina</h3>
<p>Dedicamos esta ferramenta à Celina, que, com carinho, paciência e dedicação, trabalha diariamente para tornar a jornada acadêmica dos estudantes mais leve e agradável. Seu compromisso em ajudar a todos faz a diferença nas nossas vidas.</p>
<p>Que o CelGrade LM possa contribuir para tornar suas tarefas mais simples e menos cansativas, retribuindo, pelo menos um pouco, todo o cuidado e a atenção que você dedica a nós. Esta ferramenta é também uma forma de expressar nossa gratidão por tudo o que você representa para os estudantes.</p>
<p>O jasmim foi escolhido como símbolo desta homenagem por representar delicadeza, serenidade e harmonia, qualidades que reconhecemos em Celina e no carinho que dedica aos estudantes.</p>
</blockquote>
</article>`;
}

