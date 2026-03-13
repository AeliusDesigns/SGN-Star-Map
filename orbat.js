/* ══════════════════════════════════════════
   SGN — ORDER OF BATTLE
   ══════════════════════════════════════════ */

const STORE_KEY  = 'sgn_orbat_v1';
const PW_SESSION = 'starmap_editor_ok';
let orbats     = [];   // array of ORBAT documents
let activeId   = null;  // currently selected ORBAT id
let _editorPW  = null;
let editorOK   = sessionStorage.getItem(PW_SESSION) === '1';

/* ── Utility ── */
function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function genId() { return 'OB_' + Date.now().toString(36).toUpperCase() + '_' + Math.random().toString(36).slice(2,5).toUpperCase(); }
function fmId() { return 'FM_' + Date.now().toString(36).toUpperCase() + '_' + Math.random().toString(36).slice(2,6).toUpperCase(); }

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('visible');
  setTimeout(() => el.classList.remove('visible'), 2000);
}

/* ── Formation type definitions (from AEN Doctrine) ── */
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

/* ── Password ── */
(async function loadPW() {
  try {
    const r = await fetch('./editor.json', { cache: 'no-store' });
    if (r.ok) { const d = await r.json(); if (typeof d.pw === 'string' && d.pw.length) _editorPW = d.pw; }
  } catch {}
})();

function requireEditor() {
  if (editorOK) return true;
  if (_editorPW === null) { alert('Editor not available.'); return false; }
  const pw = prompt('Enter editor password:');
  if (pw === _editorPW) { editorOK = true; sessionStorage.setItem(PW_SESSION, '1'); return true; }
  alert('Incorrect password.');
  return false;
}

/* ══════════════════════════════════════════
   LOAD / SAVE
   ══════════════════════════════════════════ */
async function load() {
  let fileData = null, localData = null;
  try {
    const r = await fetch('./orbat.json', { cache: 'no-store' });
    if (r.ok) fileData = await r.json();
  } catch {}
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) localData = JSON.parse(raw) || [];
  } catch {}

  if (fileData && localData) {
    const merged = new Map();
    for (const e of fileData) merged.set(e.id, e);
    for (const e of localData) {
      const existing = merged.get(e.id);
      if (!existing || (e.updated || 0) > (existing.updated || 0)) merged.set(e.id, e);
    }
    orbats = Array.from(merged.values());
  } else if (fileData) {
    orbats = fileData;
  } else if (localData) {
    orbats = localData;
  } else {
    orbats = [];
  }
}

function save() {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(orbats)); }
  catch (e) { if (e.name === 'QuotaExceededError') toast('⚠ Storage full — use SAVE TO REPO'); }
  updateCount();
}

function updateCount() {
  const el = document.getElementById('hud-count');
  if (el) el.textContent = `${orbats.length} ORBAT${orbats.length !== 1 ? 'S' : ''}`;
}

/* ══════════════════════════════════════════
   SIDEBAR
   ══════════════════════════════════════════ */
function renderList() {
  const list = document.getElementById('orbat-list');
  const query = (document.getElementById('search').value || '').toLowerCase();
  let filtered = orbats;
  if (query) filtered = filtered.filter(o => (o.name||'').toLowerCase().includes(query));
  filtered.sort((a, b) => (b.updated || 0) - (a.updated || 0));

  list.innerHTML = filtered.map(o => {
    const totalVessels = countVessels(o.root);
    const fType = FORMATION_TYPES.find(f => f.key === (o.root?.type || ''));
    return `
    <div class="orbat-entry ${o.id === activeId ? 'active' : ''}" data-id="${o.id}">
      <div class="oe-name">${esc(o.name || 'Untitled')}</div>
      <div class="oe-meta">${esc(fType?.name || 'FORMATION')} · <span class="oe-size">${totalVessels} vessels</span></div>
    </div>`;
  }).join('');

  list.querySelectorAll('.orbat-entry').forEach(el => {
    el.addEventListener('click', () => {
      activeId = el.dataset.id;
      renderList();
      renderTree();
    });
  });
}

document.getElementById('search').addEventListener('input', () => renderList());

/* ── Count vessels recursively ── */
function countVessels(node) {
  if (!node) return 0;
  let total = (node.ships || []).reduce((s, sh) => s + (sh.qty || 0), 0);
  (node.children || []).forEach(c => { total += countVessels(c); });
  return total;
}

/* ── Count formations recursively ── */
function countFormations(node) {
  if (!node) return 0;
  let total = 1;
  (node.children || []).forEach(c => { total += countFormations(c); });
  return total;
}

/* ══════════════════════════════════════════
   NEW / DELETE ORBAT
   ══════════════════════════════════════════ */
document.getElementById('btn-new').addEventListener('click', () => {
  if (!requireEditor()) return;
  const name = prompt('Name for new Order of Battle:', 'New ORBAT');
  if (!name) return;
  const orbat = {
    id: genId(),
    name: name.trim(),
    root: { id: fmId(), type: 'fleet', name: name.trim(), commander: '', rankTitle: '', ships: [], children: [] },
    updated: Date.now()
  };
  orbats.push(orbat);
  save();
  activeId = orbat.id;
  renderList();
  renderTree();
  toast('ORBAT created');
});

document.getElementById('btn-save-repo').addEventListener('click', () => {
  if (!requireEditor()) return;
  const blob = new Blob([JSON.stringify(orbats, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'orbat.json';
  a.click();
  URL.revokeObjectURL(a.href);
  toast('orbat.json downloaded');
});

/* ══════════════════════════════════════════
   TREE RENDERING
   ══════════════════════════════════════════ */
function renderTree() {
  const scroll = document.getElementById('tree-scroll');
  const orbat = orbats.find(o => o.id === activeId);
  if (!orbat || !orbat.root) {
    scroll.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⟐</div><div class="empty-state-text">Select or create an Order of Battle</div></div>';
    updateSummary(null);
    return;
  }

  const totalV = countVessels(orbat.root);
  const totalF = countFormations(orbat.root);

  scroll.innerHTML = `
    <div class="tree-header">
      <div class="tree-header-info">
        <div class="tree-title">${esc(orbat.name)}</div>
        <div class="tree-subtitle">${esc(FORMATION_TYPES.find(f=>f.key===orbat.root.type)?.name||'FORMATION')}</div>
        <div class="tree-actions">
          <button class="pbtn" id="tree-edit-root">✎ EDIT ORBAT</button>
          <button class="pbtn danger" id="tree-del-orbat">✕ DELETE ORBAT</button>
        </div>
      </div>
      <div class="tree-stats">
        <div class="tree-stat">VESSELS: <span>${totalV}</span></div>
        <div class="tree-stat">FORMATIONS: <span>${totalF}</span></div>
      </div>
    </div>
    <div class="formation-tree" id="fm-tree">
      ${renderNode(orbat.root, orbat)}
    </div>`;

  updateSummary(orbat.root);
  wireTreeActions(orbat);
}

function renderNode(node, orbat) {
  if (!node) return '';
  const ft = FORMATION_TYPES.find(f => f.key === node.type) || {};
  const vessels = (node.ships || []).reduce((s, sh) => s + (sh.qty || 0), 0);
  const totalVessels = countVessels(node);
  const hasChildren = (node.children || []).length > 0;

  const manifestHTML = (node.ships || []).length ? `
    <div class="fm-manifest">
      ${node.ships.map(s => `<span class="fm-ship-tag"><span class="qty">${s.qty}×</span><span class="cls">${esc(s.name)}</span></span>`).join('')}
    </div>` : '';

  const childrenHTML = hasChildren ? `
    <div class="fm-children">
      ${node.children.map(c => `<div class="fm-child">${renderNode(c, orbat)}</div>`).join('')}
    </div>` : '';

  return `
    <div class="fm-node" data-fmid="${node.id}">
      <div class="fm-card ${node.type || ''}">
        ${hasChildren ? `<button class="fm-toggle" data-fmid="${node.id}">▾</button>` : ''}
        <div class="fm-icon ${node.type || ''}">${esc(ft.icon || '◈')}</div>
        <div class="fm-info">
          <div class="fm-name">${esc(node.name || 'Unnamed Formation')}</div>
          <div class="fm-type-label">${esc(ft.name || '')}${ft.range ? ' · ' + ft.range + ' vessels' : ''}</div>
          ${node.commander ? `<div class="fm-commander">${node.rankTitle ? '<span class="rank">' + esc(node.rankTitle) + '</span> ' : ''}${esc(node.commander)}</div>` : ''}
          ${manifestHTML}
        </div>
        <div class="fm-right">
          <div class="fm-vessel-count">${totalVessels}</div>
          <div class="fm-vessel-label">vessels</div>
        </div>
        <div class="fm-card-actions">
          <button class="fm-act" data-action="add-child" data-fmid="${node.id}" title="Add sub-formation">+</button>
          <button class="fm-act" data-action="edit" data-fmid="${node.id}" title="Edit">✎</button>
          ${node.id !== orbat.root?.id ? `<button class="fm-act del" data-action="delete" data-fmid="${node.id}" title="Delete">✕</button>` : ''}
        </div>
      </div>
      ${childrenHTML}
    </div>`;
}

function wireTreeActions(orbat) {
  const scroll = document.getElementById('tree-scroll');

  /* toggle collapse */
  scroll.querySelectorAll('.fm-toggle').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const node = btn.closest('.fm-node');
      const children = node.querySelector('.fm-children');
      if (!children) return;
      const collapsed = children.style.display === 'none';
      children.style.display = collapsed ? '' : 'none';
      btn.textContent = collapsed ? '▾' : '▸';
    });
  });

  /* formation actions */
  scroll.querySelectorAll('.fm-act').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      if (!requireEditor()) return;
      const action = btn.dataset.action;
      const fmid = btn.dataset.fmid;

      if (action === 'add-child') {
        const parent = findNode(orbat.root, fmid);
        if (!parent) return;
        if (!parent.children) parent.children = [];
        const child = { id: fmId(), type: 'talon', name: 'New Formation', commander: '', rankTitle: '', ships: [], children: [] };
        parent.children.push(child);
        orbat.updated = Date.now();
        save();
        renderTree();
        toast('Sub-formation added');
      }
      if (action === 'edit') {
        editFormation(orbat, fmid);
      }
      if (action === 'delete') {
        if (!confirm('Delete this formation and all its children?')) return;
        removeNode(orbat.root, fmid);
        orbat.updated = Date.now();
        save();
        renderTree();
        toast('Formation deleted');
      }
    });
  });

  /* edit orbat meta */
  document.getElementById('tree-edit-root')?.addEventListener('click', () => {
    if (!requireEditor()) return;
    editFormation(orbat, orbat.root.id, true);
  });

  /* delete orbat */
  document.getElementById('tree-del-orbat')?.addEventListener('click', () => {
    if (!requireEditor()) return;
    if (!confirm(`Delete entire ORBAT "${orbat.name}"?`)) return;
    orbats = orbats.filter(o => o.id !== orbat.id);
    save();
    activeId = null;
    renderList();
    renderTree();
    toast('ORBAT deleted');
  });
}

/* ── Tree helpers ── */
function findNode(node, id) {
  if (!node) return null;
  if (node.id === id) return node;
  for (const c of (node.children || [])) {
    const found = findNode(c, id);
    if (found) return found;
  }
  return null;
}

function removeNode(parent, id) {
  if (!parent || !parent.children) return false;
  const idx = parent.children.findIndex(c => c.id === id);
  if (idx >= 0) { parent.children.splice(idx, 1); return true; }
  for (const c of parent.children) {
    if (removeNode(c, id)) return true;
  }
  return false;
}

/* ══════════════════════════════════════════
   EDIT FORMATION
   ══════════════════════════════════════════ */
function editFormation(orbat, fmid, isRoot) {
  const node = findNode(orbat.root, fmid);
  if (!node) return;
  const scroll = document.getElementById('tree-scroll');

  const typeOpts = FORMATION_TYPES.map(f =>
    `<option value="${f.key}" ${node.type === f.key ? 'selected' : ''}>${f.name} (${f.range})</option>`
  ).join('');

  const shipOpts = SHIP_CLASSES.map(s =>
    `<option value="${esc(s.name)}">${esc(s.name)}</option>`
  ).join('');

  const shipsHTML = (node.ships || []).map((s, i) => `
    <div class="editable-row" data-idx="${i}">
      <select class="sci-select sh-name" style="flex:2;">${SHIP_CLASSES.map(c =>
        `<option value="${esc(c.name)}" ${s.name === c.name ? 'selected' : ''}>${esc(c.name)}</option>`
      ).join('')}</select>
      <input class="sci-input sh-qty" type="number" min="1" value="${s.qty || 1}" style="max-width:70px;"/>
      <button class="row-del sh-del">✕</button>
    </div>`).join('');

  scroll.innerHTML = `
    <div class="edit-form">
      <div class="edit-form-title">${isRoot ? 'Edit ORBAT' : 'Edit Formation'}</div>

      ${isRoot ? `
      <div class="edit-section">
        <div class="edit-section-title">ORBAT Identity</div>
        <div class="form-row"><span class="fl">ORBAT Name</span><input id="ed-orbat-name" class="sci-input" type="text" value="${esc(orbat.name || '')}"/></div>
      </div>` : ''}

      <div class="edit-section">
        <div class="edit-section-title">Formation</div>
        <div class="form-row"><span class="fl">Name</span><input id="ed-fm-name" class="sci-input" type="text" value="${esc(node.name || '')}" placeholder="e.g. Task Force Silverthorn"/></div>
        <div class="form-row"><span class="fl">Type</span><select id="ed-fm-type" class="sci-select">${typeOpts}</select></div>
        <div class="form-row"><span class="fl">Commander</span><input id="ed-fm-cmdr" class="sci-input" type="text" value="${esc(node.commander || '')}" placeholder="e.g. Thalion Vaerendil"/></div>
        <div class="form-row"><span class="fl">Rank (Elvish)</span><input id="ed-fm-rank" class="sci-input" type="text" value="${esc(node.rankTitle || '')}" placeholder="e.g. Tanar"/></div>
      </div>

      <div class="edit-section">
        <div class="edit-section-title">Assigned Vessels</div>
        <div id="ed-ships">${shipsHTML}</div>
        <button class="add-row-btn" id="add-ship">+ ADD SHIP CLASS</button>
      </div>

      <div class="edit-actions">
        <button class="pbtn success" id="ed-save" style="flex:1;">✓ SAVE</button>
        <button class="pbtn" id="ed-cancel">CANCEL</button>
      </div>
    </div>`;

  /* wire ship add/remove */
  document.getElementById('add-ship').onclick = () => {
    const container = document.getElementById('ed-ships');
    const row = document.createElement('div');
    row.className = 'editable-row';
    row.innerHTML = `
      <select class="sci-select sh-name" style="flex:2;">${shipOpts}</select>
      <input class="sci-input sh-qty" type="number" min="1" value="1" style="max-width:70px;"/>
      <button class="row-del sh-del">✕</button>`;
    container.appendChild(row);
    row.querySelector('.sh-del').onclick = () => row.remove();
  };
  scroll.querySelectorAll('.sh-del').forEach(btn => {
    btn.onclick = () => btn.closest('.editable-row').remove();
  });

  /* save */
  document.getElementById('ed-save').onclick = () => {
    if (isRoot) {
      orbat.name = document.getElementById('ed-orbat-name').value.trim() || orbat.name;
    }
    node.name = document.getElementById('ed-fm-name').value.trim();
    node.type = document.getElementById('ed-fm-type').value;
    node.commander = document.getElementById('ed-fm-cmdr').value.trim();
    node.rankTitle = document.getElementById('ed-fm-rank').value.trim();

    node.ships = [];
    document.querySelectorAll('#ed-ships .editable-row').forEach(row => {
      const name = row.querySelector('.sh-name')?.value;
      const qty = parseInt(row.querySelector('.sh-qty')?.value) || 1;
      if (name) node.ships.push({ name, qty });
    });

    orbat.updated = Date.now();
    save();
    renderList();
    renderTree();
    toast('Formation saved');
  };

  /* cancel */
  document.getElementById('ed-cancel').onclick = () => renderTree();
}

/* ══════════════════════════════════════════
   SUMMARY BAR
   ══════════════════════════════════════════ */
function updateSummary(root) {
  const totalEl = document.getElementById('sum-total');
  const fmEl = document.getElementById('sum-formations');
  if (!root) {
    if (totalEl) totalEl.innerHTML = 'TOTAL: <span>0</span>';
    if (fmEl) fmEl.innerHTML = 'FORMATIONS: <span>0</span>';
    return;
  }
  const tv = countVessels(root);
  const tf = countFormations(root);
  if (totalEl) totalEl.innerHTML = `TOTAL: <span>${tv}</span>`;
  if (fmEl) fmEl.innerHTML = `FORMATIONS: <span>${tf}</span>`;
}

/* ══════════════════════════════════════════
   BOOT
   ══════════════════════════════════════════ */
(async function boot() {
  await load();
  renderList();
  updateCount();
  renderTree();
})();
