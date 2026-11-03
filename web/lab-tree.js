/* Laboratório da árvore — eventos reais amostrados de Backtracking. */
(()=>{'use strict';
const panel=document.createElement('section');
panel.id='lab-panel';panel.hidden=true;panel.setAttribute('aria-label','Árvore da busca');
panel.innerHTML='<header><div><b>Laboratório · Árvore do Backtracking</b><small>Eventos do algoritmo real, amostrados para preservar desempenho</small></div><button id="lab-close">Fechar</button></header>'+
'<nav><button id="lab-pause">Pausar animação</button><button id="lab-next">Próximo passo</button><button id="lab-reset">Limpar</button>'+
'<label>Velocidade <select id="lab-speed"><option value="220">Lenta</option><option value="85" selected>Normal</option><option value="20">Rápida</option></select></label><label><input type="checkbox" id="lab-follow" checked> Seguir ramo</label></nav>'+
'<div class="lab-numbers"><span>Nós explorados <b id="lab-count">0</b></span><span>Profundidade <b id="lab-depth">0</b></span><span>Tentativa <b id="lab-attempt">—</b></span><span>Fase <b id="lab-phase">—</b></span><span id="lab-state">Aguardando</span></div>'+
'<p class="lab-note">Janela de até 18 níveis do caminho atual. Pausar a animação não interrompe os cálculos.</p>'+
'<div id="lab-scroll"><svg id="lab-svg" xmlns="http://www.w3.org/2000/svg" aria-label="Ramos da busca"></svg></div>'+
'<footer><b id="lab-message">Clique em gerar para observar a árvore.</b><div id="lab-log"></div></footer>';
document.body.appendChild(panel);
const $=id=>document.getElementById(id),ns='http://www.w3.org/2000/svg';
const make=(tag,attrs={},txt='')=>{const el=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))el.setAttribute(k,String(v));el.textContent=txt;return el;};
let queue=[],history=[],paused=false,finished=false,lastFrame=0,current=null,offers=new Map(),rooms=new Map(),log=[];
function start(d){
queue=[];history=[];paused=false;finished=false;current=null;lastFrame=0;log=[];offers=new Map();rooms=new Map();
for(const subj of d.db?.subjects||[])offers.set('subject:'+subj.id,subj.name);
for(const offer of d.db?.offers||[])offers.set(offer.id,offers.get('subject:'+offer.subject)||offer.subject);
for(const room of d.db?.rooms||[])rooms.set(room.id,room.name);
$('lab-pause').textContent='Pausar animação';$('lab-count').textContent='0';$('lab-depth').textContent='0';
$('lab-attempt').textContent='—';$('lab-phase').textContent='—';$('lab-state').textContent='Buscando';
$('lab-message').textContent='Aguardando estados do gerador…';$('lab-log').replaceChildren();$('lab-svg').replaceChildren();panel.hidden=false;
}
function label(x){return (offers.get(x.offer)||x.offer)+' · '+['Seg','Ter','Qua','Qui','Sex'][x.day]+' '+(x.slot+1)+'ª · '+(rooms.get(x.room)||x.room);}
function frame(ev){
current=ev;history.push(ev);if(history.length>18)history.shift();
$('lab-count').textContent=Number(ev.visited).toLocaleString('pt-BR');
$('lab-depth').textContent=ev.path.length+' / '+ev.total;
$('lab-attempt').textContent=ev.attempt+' de até 6';
$('lab-phase').textContent=ev.phase==='duplas'?'Duplas':'Simples';
$('lab-state').textContent=ev.kind==='solution'?'Solução encontrada':ev.kind==='backtrack'?'Retrocesso':'Explorando';
const last=ev.path.at(-1),msg=ev.kind==='solution'?'Solução completa encontrada':ev.kind==='backtrack'?'Retrocesso (Backtracking)':ev.kind==='phase-start'?'Iniciando fase':ev.kind==='phase-end'?'Final da fase':last?'Explorando '+label(last):'Visitando a raiz';
$('lab-message').textContent=msg;
log.unshift('Nó '+ev.visited+' · '+msg);log=log.slice(0,5);$('lab-log').replaceChildren(...log.map(x=>{const p=document.createElement('p');p.textContent=x;return p;}));
draw();
}
function draw(){
const root={key:'raiz',title:'Início',children:new Map()},all=[];let active='';
for(const ev of history){
 const segments=[{key:'t'+ev.attempt+'-'+ev.phase,title:'Tentativa '+ev.attempt+' · '+ev.phase},...ev.path.slice(-18).map(s=>({key:s.offer+':'+s.day+':'+s.slot+':'+s.room,title:label(s)}))];
 let node=root;
 for(const seg of segments){const key=node.key+'/'+seg.key;if(!node.children.has(key))node.children.set(key,{key,title:seg.title,children:new Map()});node=node.children.get(key);}
 if(ev===current)active=node.key;
 if(ev.kind==='solution')node.success=true;
}
let leaves=0,depth=0;
function layout(n,d){n.depth=d;depth=Math.max(depth,d);const children=[...n.children.values()];for(const c of children)layout(c,d+1);n.y=children.length?(children[0].y+children.at(-1).y)/2:34+(leaves++)*49;n.x=18+d*178;all.push(n);}
layout(root,0);
const svg=$('lab-svg'),W=(depth+1)*178+16,H=Math.max(200,leaves*49+55);
svg.setAttribute('width',String(W));svg.setAttribute('height',String(H));svg.setAttribute('viewBox',`0 0 ${W} ${H}`);
const edge=make('g'),nodes=make('g');
for(const node of all){
for(const child of node.children.values())edge.appendChild(make('path',{d:`M${node.x+157} ${node.y} C${node.x+174} ${node.y},${child.x-18} ${child.y},${child.x} ${child.y}`,stroke:'#95ab9f','stroke-width':1.5,fill:'none'}));
const selected=!!active&&(active===node.key||active.startsWith(node.key+'/'));
nodes.appendChild(make('rect',{x:node.x,y:node.y-16,width:158,height:32,rx:7,fill:node.success?'#faebbc':selected?'#dcefe2':'#f4f7f4',stroke:node.success?'#b58c49':selected?'#368262':'#b6c6ba','stroke-width':selected?2:1}));
const short=node.title.length>21?node.title.slice(0,20)+'…':node.title;
nodes.appendChild(make('text',{x:node.x+7,y:node.y+4,'font-size':11,'font-family':'Segoe UI, sans-serif',fill:'#23493b'},short));
nodes.appendChild(make('title',{},node.title));
}
svg.replaceChildren(edge,nodes);
if($('lab-follow').checked){const s=$('lab-scroll'),activeNode=all.find(n=>n.key===active);if(activeNode){s.scrollLeft=Math.max(0,activeNode.x-s.clientWidth+220);s.scrollTop=Math.max(0,activeNode.y-s.clientHeight/2);}}
}
function enqueue(batch){if(!Array.isArray(batch))return;queue.push(...batch);if(queue.length>180){const jump=Math.ceil(queue.length/125);queue=queue.filter((x,i)=>i%jump===0||x.kind==='solution'||x.kind==='phase-start').slice(-180);}}
function animate(now){if(!paused&&queue.length&&now-lastFrame>=Number($('lab-speed').value)){frame(queue.shift());lastFrame=now;}if(finished&&!queue.length&&current)$('lab-state').textContent='Finalizada';requestAnimationFrame(animate);}
window.addEventListener('celgrade:lab-open',()=>{panel.hidden=false;});
window.addEventListener('celgrade:lab-start',e=>start(e.detail||{}));
window.addEventListener('celgrade:lab-trace',e=>enqueue(e.detail));
window.addEventListener('celgrade:lab-finish',()=>{finished=true;});
$('lab-close').onclick=()=>panel.hidden=true;
$('lab-pause').onclick=()=>{paused=!paused;$('lab-pause').textContent=paused?'Continuar animação':'Pausar animação';};
$('lab-next').onclick=()=>{paused=true;$('lab-pause').textContent='Continuar animação';if(queue.length)frame(queue.shift());};
$('lab-reset').onclick=()=>{queue=[];history=[];log=[];current=null;$('lab-svg').replaceChildren();$('lab-log').replaceChildren();$('lab-message').textContent='Árvore limpa.';};
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!panel.hidden)panel.hidden=true;});
requestAnimationFrame(animate);
})();