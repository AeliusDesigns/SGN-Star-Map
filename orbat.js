/* ══════════════════════════════════════════
   SGN — ORDER OF BATTLE
   ══════════════════════════════════════════ */

const STORE_KEY  = 'sgn_orbat_v1';
const PW_SESSION = 'starmap_editor_ok';
let orbats     = [];
let activeId   = null;
let _editorPW  = null;
let editorOK   = sessionStorage.getItem(PW_SESSION) === '1';

function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function genId() { return 'OB_' + Date.now().toString(36).toUpperCase() + '_' + Math.random().toString(36).slice(2,5).toUpperCase(); }
function fmId() { return 'FM_' + Date.now().toString(36).toUpperCase() + '_' + Math.random().toString(36).slice(2,6).toUpperCase(); }
function toast(msg) { const el = document.getElementById('toast'); el.textContent = msg; el.classList.add('visible'); setTimeout(() => el.classList.remove('visible'), 2000); }

const FORMATION_TYPES = [
  { key:'celestial-host', name:'Celestial Host', range:'1,500–2,500', icon:'✦', rank:'Ambaron / Arandur Eäcalion' },
  { key:'grand-armada',   name:'Grand Armada',   range:'700–1,200',   icon:'⟐', rank:'Eldamar' },
  { key:'host',           name:'Host',           range:'300–450',     icon:'⬡', rank:'Mithrand' },
  { key:'fleet',          name:'Fleet',          range:'100–200',     icon:'◈', rank:'Rimbalen' },
  { key:'task-force',     name:'Task Force',     range:'30–60',       icon:'◇', rank:'Rimbaer' },
  { key:'battlegroup',    name:'Battlegroup',    range:'12–25',       icon:'▣', rank:'Tanar' },
  { key:'lance',          name:'Lance',          range:'6–10',        icon:'▷', rank:'Aran' },
  { key:'talon',          name:'Talon',          range:'3–5',         icon:'▹', rank:'Thalion' },
];

const SHIP_CLASSES = [
  { name:'Aerandor SCV',   full:'AERANDOR-CLASS SUPERCARRIER',   cat:'capital' },
  { name:'Tirion BS',      full:'TIRION-CLASS BATTLESHIP',       cat:'capital' },
  { name:'Silvaron CV',    full:'SILVARON-CLASS CARRIER',        cat:'capital' },
  { name:'Calarion CRS',   full:'CALARION-CLASS CRUISER',        cat:'capital' },
  { name:'Vaelisar DD',    full:'VAELISAR-CLASS DESTROYER',      cat:'escort' },
  { name:'Aelindor FF',    full:'AELINDOR-CLASS FRIGATE',        cat:'escort' },
  { name:'Thalasrën LF',   full:'THALASRËN-CLASS LIGHT FRIGATE', cat:'escort' },
  { name:'Thalanis PHT',   full:'THALANIS-CLASS PHANTOM',        cat:'escort' },
  { name:'Eryndor CRV',    full:'ERYNDOR-CLASS CORVETTE',        cat:'screen' },
  { name:'Sentinel-Θ',     full:'SENTINEL-Θ AUTONOMOUS UNIT',    cat:'screen' },
  { name:'Elenir LW',      full:'ELENIR-CLASS LANCEWING',        cat:'screen' },
  { name:'Lómiël INT',     full:'LÓMIËL-CLASS INTERCEPTOR',      cat:'screen' },
  { name:'Talasir TPT',    full:'TALASIR-CLASS TRANSPORT',       cat:'support'},
];

const FLEET_TO_ORBAT_MAP = {
  'AERANDOR-CLASS SUPERCARRIER':'Aerandor SCV','TIRION-CLASS BATTLESHIP':'Tirion BS',
  'SILVARON-CLASS CARRIER':'Silvaron CV','CALARION-CLASS CRUISER':'Calarion CRS',
  'VAELISAR-CLASS DESTROYER':'Vaelisar DD','AELINDOR-CLASS FRIGATE':'Aelindor FF',
  'THALASRËN-CLASS LIGHT FRIGATE':'Thalasrën LF','THALANIS-CLASS PHANTOM':'Thalanis PHT',
  'ERYNDOR-CLASS CORVETTE':'Eryndor CRV','SENTINEL-Θ AUTONOMOUS UNIT':'Sentinel-Θ',
  'ELENIR-CLASS LANCEWING':'Elenir LW','LÓMIËL-CLASS INTERCEPTOR':'Lómiël INT',
  'TALASIR-CLASS TRANSPORT':'Talasir TPT',
};

/* ── Password ── */
(async function loadPW() {
  try { const r = await fetch('./editor.json',{cache:'no-store'}); if(r.ok){const d=await r.json();if(typeof d.pw==='string'&&d.pw.length) _editorPW=d.pw;} } catch{}
})();
function requireEditor() {
  if(window.SGNAuth && SGNAuth.currentLevel() >= SGNAuth.TIER.ADMIN){
    editorOK = true;
    return true;
  }
  if(editorOK) return true;
  if(_editorPW !== null){
    const pw = prompt('Enter editor password:');
    if(pw === _editorPW){ editorOK = true; sessionStorage.setItem(PW_SESSION,'1'); return true; }
    alert('Incorrect password.'); return false;
  }
  if(window.SGNAuthUI){ SGNAuthUI.promptLogin(SGNAuth.TIER.ADMIN); return false; }
  alert('Sign in via the badge in the top-right to edit.');
  return false;
}

/* ── Load / Save ── */
async function load() {
  let fileData=null,localData=null;
  try{const r=await fetch('./orbat.json',{cache:'no-store'});if(r.ok) fileData=await r.json();}catch{}
  try{const raw=localStorage.getItem(STORE_KEY);if(raw) localData=JSON.parse(raw)||[];}catch{}
  if(fileData&&localData){const m=new Map();for(const e of fileData)m.set(e.id,e);for(const e of localData){const x=m.get(e.id);if(!x||(e.updated||0)>(x.updated||0))m.set(e.id,e);}orbats=Array.from(m.values());}
  else if(fileData)orbats=fileData;else if(localData)orbats=localData;else orbats=[];
}
function save(){try{localStorage.setItem(STORE_KEY,JSON.stringify(orbats));}catch(e){if(e.name==='QuotaExceededError')toast('⚠ Storage full');}updateCount();}
function updateCount(){const el=document.getElementById('hud-count');if(el)el.textContent=`${orbats.length} ORBAT${orbats.length!==1?'S':''}`;}

/* ── Sidebar ── */
function renderList(){
  const list=document.getElementById('orbat-list'),query=(document.getElementById('search').value||'').toLowerCase();
  let filtered=orbats;if(query)filtered=filtered.filter(o=>(o.name||'').toLowerCase().includes(query));
  filtered.sort((a,b)=>(b.updated||0)-(a.updated||0));
  list.innerHTML=filtered.map(o=>{const tv=countVessels(o.root),ft=FORMATION_TYPES.find(f=>f.key===(o.root?.type||''));
    return`<div class="orbat-entry ${o.id===activeId?'active':''}" data-id="${o.id}"><div class="oe-name">${esc(o.name||'Untitled')}</div><div class="oe-meta">${esc(ft?.name||'FORMATION')} · <span class="oe-size">${tv} vessels</span></div></div>`;}).join('');
  list.querySelectorAll('.orbat-entry').forEach(el=>{el.addEventListener('click',()=>{activeId=el.dataset.id;renderList();renderTree();});});
}
document.getElementById('search').addEventListener('input',()=>renderList());

function countVessels(node){if(!node)return 0;let t=(node.ships||[]).reduce((s,sh)=>s+(sh.qty||0),0);(node.children||[]).forEach(c=>{t+=countVessels(c);});return t;}
function countFormations(node){if(!node)return 0;let t=1;(node.children||[]).forEach(c=>{t+=countFormations(c);});return t;}

/* ── New / Delete ORBAT ── */
document.getElementById('btn-new').addEventListener('click',()=>{
  if(!requireEditor())return;const name=prompt('Name for new Order of Battle:','New ORBAT');if(!name)return;
  const orbat={id:genId(),name:name.trim(),root:{id:fmId(),type:'fleet',name:name.trim(),commander:'',rankTitle:'',ships:[],children:[]},updated:Date.now()};
  orbats.push(orbat);save();activeId=orbat.id;renderList();renderTree();toast('ORBAT created');
});
document.getElementById('btn-save-repo').addEventListener('click', async () => {
  if(!requireEditor())return;

  const btn = document.getElementById('btn-save-repo');
  const origText = btn.textContent;
  btn.textContent = 'SAVING...';
  btn.disabled = true;

  try {
    await SGNGitHub.commitFile('orbat.json', JSON.stringify(orbats, null, 2), 'ORBAT: update orbat.json');
    toast('orbat.json committed to GitHub');
  } catch (err) {
    console.error('GitHub save failed:', err);
    toast('Save failed: ' + err.message);
  } finally {
    btn.textContent = origText;
    btn.disabled = false;
  }
});

/* ══════════════════════════════════════════
   TREE RENDERING
   ══════════════════════════════════════════ */
function renderTree(){
  const scroll=document.getElementById('tree-scroll'),orbat=orbats.find(o=>o.id===activeId);
  if(!orbat||!orbat.root){scroll.innerHTML='<div class="empty-state"><div class="empty-state-icon">⟐</div><div class="empty-state-text">Select or create an Order of Battle</div></div>';updateSummary(null);return;}
  const totalV=countVessels(orbat.root),totalF=countFormations(orbat.root);
  scroll.innerHTML=`<div class="tree-header"><div class="tree-header-info"><div class="tree-title">${esc(orbat.name)}</div><div class="tree-subtitle">${esc(FORMATION_TYPES.find(f=>f.key===orbat.root.type)?.name||'FORMATION')}</div><div class="tree-actions"><button class="pbtn" id="tree-edit-root">✎ EDIT ORBAT</button><button class="pbtn danger" id="tree-del-orbat">✕ DELETE ORBAT</button></div></div><div class="tree-stats"><div class="tree-stat">VESSELS: <span>${totalV}</span></div><div class="tree-stat">FORMATIONS: <span>${totalF}</span></div></div></div><div class="formation-tree" id="fm-tree">${renderNode(orbat.root,orbat)}</div>`;
  updateSummary(orbat.root);wireTreeActions(orbat);
}

function renderNode(node,orbat){
  if(!node)return'';const ft=FORMATION_TYPES.find(f=>f.key===node.type)||{};
  const totalVessels=countVessels(node),hasChildren=(node.children||[]).length>0;
  const manifestHTML=(node.ships||[]).length?`<div class="fm-manifest">${node.ships.map(s=>`<span class="fm-ship-tag"><span class="qty">${s.qty}×</span><span class="cls">${esc(s.name)}</span></span>`).join('')}</div>`:'';
  const childrenHTML=hasChildren?`<div class="fm-children">${node.children.map(c=>`<div class="fm-child">${renderNode(c,orbat)}</div>`).join('')}</div>`:'';
  return`<div class="fm-node" data-fmid="${node.id}"><div class="fm-card ${node.type||''}">
    ${hasChildren?`<button class="fm-toggle" data-fmid="${node.id}">▾</button>`:''}
    <div class="fm-icon ${node.type||''}">${esc(ft.icon||'◈')}</div>
    <div class="fm-info"><div class="fm-name">${esc(node.name||'Unnamed Formation')}</div><div class="fm-type-label">${esc(ft.name||'')}${ft.range?' · '+ft.range+' vessels':''}</div>${node.commander?`<div class="fm-commander">${node.rankTitle?'<span class="rank">'+esc(node.rankTitle)+'</span> ':''}${esc(node.commander)}</div>`:''}${manifestHTML}</div>
    <div class="fm-right"><div class="fm-vessel-count">${totalVessels}</div><div class="fm-vessel-label">vessels</div></div>
    <div class="fm-card-actions">
      <button class="fm-act" data-action="import-fleet" data-fmid="${node.id}" title="Import fleet">⬡</button>
      <button class="fm-act" data-action="add-child" data-fmid="${node.id}" title="Add sub-formation">+</button>
      <button class="fm-act" data-action="edit" data-fmid="${node.id}" title="Edit">✎</button>
      ${node.id!==orbat.root?.id?`<button class="fm-act del" data-action="delete" data-fmid="${node.id}" title="Delete">✕</button>`:''}
    </div></div>${childrenHTML}</div>`;
}

function wireTreeActions(orbat){
  const scroll=document.getElementById('tree-scroll');
  scroll.querySelectorAll('.fm-toggle').forEach(btn=>{btn.addEventListener('click',e=>{e.stopPropagation();const node=btn.closest('.fm-node'),children=node.querySelector('.fm-children');if(!children)return;const c=children.style.display==='none';children.style.display=c?'':'none';btn.textContent=c?'▾':'▸';});});
  scroll.querySelectorAll('.fm-act').forEach(btn=>{btn.addEventListener('click',e=>{
    e.stopPropagation();if(!requireEditor())return;
    const action=btn.dataset.action,fmid=btn.dataset.fmid;
    if(action==='add-child'){const p=findNode(orbat.root,fmid);if(!p)return;if(!p.children)p.children=[];p.children.push({id:fmId(),type:'talon',name:'New Formation',commander:'',rankTitle:'',ships:[],children:[]});orbat.updated=Date.now();save();renderTree();toast('Sub-formation added');}
    if(action==='edit')editFormation(orbat,fmid);
    if(action==='delete'){if(!confirm('Delete this formation and all its children?'))return;removeNode(orbat.root,fmid);orbat.updated=Date.now();save();renderTree();toast('Formation deleted');}
    if(action==='import-fleet')openFleetImportModal(orbat,fmid);
  });});
  document.getElementById('tree-edit-root')?.addEventListener('click',()=>{if(!requireEditor())return;editFormation(orbat,orbat.root.id,true);});
  document.getElementById('tree-del-orbat')?.addEventListener('click',()=>{if(!requireEditor())return;if(!confirm(`Delete entire ORBAT "${orbat.name}"?`))return;orbats=orbats.filter(o=>o.id!==orbat.id);save();activeId=null;renderList();renderTree();toast('ORBAT deleted');});
}

function findNode(node,id){if(!node)return null;if(node.id===id)return node;for(const c of(node.children||[])){const f=findNode(c,id);if(f)return f;}return null;}
function removeNode(parent,id){if(!parent||!parent.children)return false;const i=parent.children.findIndex(c=>c.id===id);if(i>=0){parent.children.splice(i,1);return true;}for(const c of parent.children){if(removeNode(c,id))return true;}return false;}

/* ══════════════════════════════════════════
   FLEET IMPORT MODAL
   ══════════════════════════════════════════ */
async function loadFleets(){
  try{const r=localStorage.getItem('sgn_fleets_v1');if(r){const d=JSON.parse(r);if(Array.isArray(d)&&d.length)return d;}}catch{}
  try{const r=await fetch('./fleets.json',{cache:'no-store'});if(r.ok){const d=await r.json();if(Array.isArray(d)&&d.length)return d;}}catch{}
  return[];
}
async function loadSystems(){
  try{const r=localStorage.getItem('sgn_map_state_v1');if(r){const d=JSON.parse(r);if(d.systems?.length)return d.systems;}}catch{}
  try{const r=await fetch('./systems.json',{cache:'no-store'});if(r.ok){const d=await r.json();if(d.systems?.length)return d.systems;}}catch{}
  return[];
}
function getSystemName(sid,sys){if(!sid)return'—';const s=sys.find(x=>x.id===sid);return s?.name||sid;}

async function openFleetImportModal(orbat,targetFmId){
  const node=findNode(orbat.root,targetFmId);if(!node)return;
  const ft=FORMATION_TYPES.find(f=>f.key===node.type)||{};
  const fleets=await loadFleets(),systems=await loadSystems();
  if(!fleets.length){toast('No fleets found — create fleets on the Star Chart first');return;}
  document.getElementById('fleet-import-modal')?.remove();

  const modal=document.createElement('div');modal.id='fleet-import-modal';
  modal.innerHTML=`<div class="fim-backdrop"></div><div class="fim-modal"><div class="fim-glow-top"></div>
    <div class="fim-header"><span class="fim-title">Import Fleet Composition</span><button class="fim-close">✕</button></div>
    <div class="fim-body">
      <div class="fim-section-title">Importing Into</div>
      <div class="fim-target"><div class="fim-target-icon">${esc(ft.icon||'◈')}</div><div class="fim-target-info"><div class="fim-target-name">${esc(node.name||'Unnamed')}</div><div class="fim-target-meta">${esc(ft.name||'FORMATION')}${node.commander?' · '+esc(node.commander):''}</div></div></div>
      <div class="fim-section-title">Select Fleet</div>
      <div class="fim-fleet-list" id="fim-fleet-list">${fleets.map((f,i)=>{
        const sc=(f.ships||[]).reduce((s,sh)=>s+(sh.qty||0),0),sn=getSystemName(f.systemId,systems);
        return`<div class="fim-fleet-item ${i===0?'selected':''}" data-fleet-idx="${i}"><div class="fim-diamond"></div><div class="fim-fleet-info"><div class="fim-fleet-name">${esc(f.name||'Unnamed Fleet')}</div><div class="fim-fleet-meta">${esc(f.status||'Stationed')} · ${esc(sn)}</div></div><div class="fim-fleet-ships">${sc} ships</div></div>`;
      }).join('')}</div>
      <div class="fim-preview" id="fim-preview">${renderFleetPreview(fleets[0])}</div>
      <div class="fim-options">
        <label class="fim-opt"><input type="radio" name="fim-mode" value="replace" checked/> Replace existing ships</label>
        <label class="fim-opt"><input type="radio" name="fim-mode" value="append"/> Append to existing</label>
      </div>
    </div>
    <div class="fim-footer"><button class="fim-btn" id="fim-cancel">CANCEL</button><button class="fim-btn success" id="fim-import">✓ IMPORT ${(fleets[0]?.ships||[]).reduce((s,sh)=>s+(sh.qty||0),0)} SHIPS</button></div>
  </div>`;
  document.body.appendChild(modal);

  let selIdx=0;
  modal.querySelectorAll('.fim-fleet-item').forEach(el=>{el.addEventListener('click',()=>{
    modal.querySelectorAll('.fim-fleet-item').forEach(e=>e.classList.remove('selected'));el.classList.add('selected');
    selIdx=parseInt(el.dataset.fleetIdx);document.getElementById('fim-preview').innerHTML=renderFleetPreview(fleets[selIdx]);
    const sc=(fleets[selIdx]?.ships||[]).reduce((s,sh)=>s+(sh.qty||0),0);document.getElementById('fim-import').textContent=`✓ IMPORT ${sc} SHIPS`;
  });});

  modal.querySelector('.fim-close').addEventListener('click',()=>modal.remove());
  modal.querySelector('.fim-backdrop').addEventListener('click',()=>modal.remove());
  modal.querySelector('#fim-cancel').addEventListener('click',()=>modal.remove());
  function onEsc(e){if(e.key==='Escape'){modal.remove();document.removeEventListener('keydown',onEsc);}}
  document.addEventListener('keydown',onEsc);

  modal.querySelector('#fim-import').addEventListener('click',()=>{
    const fleet=fleets[selIdx];if(!fleet)return;
    const mode=modal.querySelector('input[name="fim-mode"]:checked')?.value||'replace';
    const converted=(fleet.ships||[]).filter(s=>s.qty>0).map(s=>{const on=FLEET_TO_ORBAT_MAP[s.className]||s.className;const k=SHIP_CLASSES.find(c=>c.name===on);return{name:k?k.name:on,qty:s.qty};});
    if(mode==='replace'){node.ships=converted;}else{const ex=new Map((node.ships||[]).map(s=>[s.name,s.qty]));for(const s of converted)ex.set(s.name,(ex.get(s.name)||0)+s.qty);node.ships=Array.from(ex.entries()).map(([name,qty])=>({name,qty}));}
    orbat.updated=Date.now();save();renderTree();renderList();modal.remove();
    toast(`Imported ${converted.reduce((s,sh)=>s+sh.qty,0)} ships from ${fleet.name||'fleet'}`);
  });
}

function renderFleetPreview(fleet){
  if(!fleet)return'<div class="fim-preview-title">No fleet selected</div>';
  const ships=(fleet.ships||[]).filter(s=>s.qty>0);
  return`<div class="fim-preview-title">Ships to Import (${esc(fleet.name||'Fleet')})</div><div class="fim-ship-tags">${ships.length?ships.map(s=>`<span class="fim-ship-tag"><span class="qty">${s.qty}×</span> ${esc(FLEET_TO_ORBAT_MAP[s.className]||s.className)}</span>`).join(''):'<span style="color:var(--text-muted);font-size:11px;">No vessels assigned</span>'}</div>`;
}

/* ── Edit Formation ── */
function editFormation(orbat,fmid,isRoot){
  const node=findNode(orbat.root,fmid);if(!node)return;const scroll=document.getElementById('tree-scroll');
  const typeOpts=FORMATION_TYPES.map(f=>`<option value="${f.key}" ${node.type===f.key?'selected':''}>${f.name} (${f.range})</option>`).join('');
  const shipOpts=SHIP_CLASSES.map(s=>`<option value="${esc(s.name)}">${esc(s.name)}</option>`).join('');
  const shipsHTML=(node.ships||[]).map((s,i)=>`<div class="editable-row" data-idx="${i}"><select class="sci-select sh-name" style="flex:2;">${SHIP_CLASSES.map(c=>`<option value="${esc(c.name)}" ${s.name===c.name?'selected':''}>${esc(c.name)}</option>`).join('')}</select><input class="sci-input sh-qty" type="number" min="1" value="${s.qty||1}" style="max-width:70px;"/><button class="row-del sh-del">✕</button></div>`).join('');

  scroll.innerHTML=`<div class="edit-form"><div class="edit-form-title">${isRoot?'Edit ORBAT':'Edit Formation'}</div>
    ${isRoot?`<div class="edit-section"><div class="edit-section-title">ORBAT Identity</div><div class="form-row"><span class="fl">ORBAT Name</span><input id="ed-orbat-name" class="sci-input" type="text" value="${esc(orbat.name||'')}"/></div></div>`:''}
    <div class="edit-section"><div class="edit-section-title">Formation</div>
      <div class="form-row"><span class="fl">Name</span><input id="ed-fm-name" class="sci-input" type="text" value="${esc(node.name||'')}" placeholder="e.g. Task Force Silverthorn"/></div>
      <div class="form-row"><span class="fl">Type</span><select id="ed-fm-type" class="sci-select">${typeOpts}</select></div>
      <div class="form-row"><span class="fl">Commander</span><input id="ed-fm-cmdr" class="sci-input" type="text" value="${esc(node.commander||'')}" placeholder="e.g. Thalion Vaerendil"/></div>
      <div class="form-row"><span class="fl">Rank (Elvish)</span><input id="ed-fm-rank" class="sci-input" type="text" value="${esc(node.rankTitle||'')}" placeholder="e.g. Tanar"/></div></div>
    <div class="edit-section"><div class="edit-section-title">Assigned Vessels</div><div id="ed-ships">${shipsHTML}</div>
      <div style="display:flex;gap:6px;margin-top:4px;"><button class="add-row-btn" id="add-ship" style="flex:1;">+ ADD SHIP CLASS</button><button class="add-row-btn" id="import-fleet-btn" style="flex:1;border-color:var(--gold-dim);color:var(--gold);">⬡ IMPORT FLEET</button></div></div>
    <div class="edit-actions"><button class="pbtn success" id="ed-save" style="flex:1;">✓ SAVE</button><button class="pbtn" id="ed-cancel">CANCEL</button></div></div>`;

  document.getElementById('add-ship').onclick=()=>{const c=document.getElementById('ed-ships'),row=document.createElement('div');row.className='editable-row';row.innerHTML=`<select class="sci-select sh-name" style="flex:2;">${shipOpts}</select><input class="sci-input sh-qty" type="number" min="1" value="1" style="max-width:70px;"/><button class="row-del sh-del">✕</button>`;c.appendChild(row);row.querySelector('.sh-del').onclick=()=>row.remove();};
  scroll.querySelectorAll('.sh-del').forEach(btn=>{btn.onclick=()=>btn.closest('.editable-row').remove();});
  document.getElementById('import-fleet-btn')?.addEventListener('click',()=>openFleetImportModal(orbat,fmid));

  document.getElementById('ed-save').onclick=()=>{
    if(isRoot)orbat.name=document.getElementById('ed-orbat-name').value.trim()||orbat.name;
    node.name=document.getElementById('ed-fm-name').value.trim();node.type=document.getElementById('ed-fm-type').value;
    node.commander=document.getElementById('ed-fm-cmdr').value.trim();node.rankTitle=document.getElementById('ed-fm-rank').value.trim();
    node.ships=[];document.querySelectorAll('#ed-ships .editable-row').forEach(row=>{const name=row.querySelector('.sh-name')?.value,qty=parseInt(row.querySelector('.sh-qty')?.value)||1;if(name)node.ships.push({name,qty});});
    orbat.updated=Date.now();save();renderList();renderTree();toast('Formation saved');
  };
  document.getElementById('ed-cancel').onclick=()=>renderTree();
}

/* ── Summary Bar ── */
function updateSummary(root){
  const t=document.getElementById('sum-total'),f=document.getElementById('sum-formations');
  if(!root){if(t)t.innerHTML='TOTAL: <span>0</span>';if(f)f.innerHTML='FORMATIONS: <span>0</span>';return;}
  if(t)t.innerHTML=`TOTAL: <span>${countVessels(root)}</span>`;if(f)f.innerHTML=`FORMATIONS: <span>${countFormations(root)}</span>`;
}

/* ── Boot ── */
(async function boot(){await load();renderList();updateCount();renderTree();

  /* Deep-link from global search: #id=OB_xxx */
  if (window.SGNSearch && SGNSearch.onDeepLink) {
    SGNSearch.onDeepLink(function(params) {
      if (params.id) {
        const target = orbats.find(o => o.id === params.id);
        if (target) { activeId = target.id; renderList(); renderTree(); }
      }
    });
  }
})();
