/* ══════════════════════════════════════════
   SGN — PERSONNEL REGISTRY
   ══════════════════════════════════════════ */

const STORE_KEY  = 'sgn_personnel_v1';
const PW_SESSION = 'starmap_editor_ok';
let personnel = [];
let activeId  = null;
let filterBranch = 'all';
let _editorPW = null;
let editorOK  = sessionStorage.getItem(PW_SESSION) === '1';

/* ── Utility ── */
function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function genId() { return 'PER_' + Date.now().toString(36).toUpperCase() + '_' + Math.random().toString(36).slice(2,5).toUpperCase(); }

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('visible');
  setTimeout(() => el.classList.remove('visible'), 2000);
}

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

/* ── Load / Save ── */
async function load() {
  let fileData = null;
  let localData = null;

  /* try personnel.json first (canonical repo source) */
  try {
    const r = await fetch('./personnel.json', { cache: 'no-store' });
    if (r.ok) fileData = await r.json();
  } catch {}

  /* try localStorage */
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) localData = JSON.parse(raw) || [];
  } catch {}

  if (fileData && localData) {
    const merged = new Map();
    for (const e of fileData) merged.set(e.id, e);
    for (const e of localData) {
      const existing = merged.get(e.id);
      if (!existing || (e.updated || 0) > (existing.updated || 0)) {
        merged.set(e.id, e);
      }
    }
    personnel = Array.from(merged.values());
  } else if (fileData) {
    personnel = fileData;
  } else if (localData) {
    personnel = localData;
  } else {
    personnel = [];
  }
}

function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(personnel));
  } catch (e) {
    if (e.name === 'QuotaExceededError') {
      toast('⚠ Storage full — use SAVE TO REPO');
    }
  }
  updateCount();
}

function updateCount() {
  const el = document.getElementById('hud-count');
  if (el) el.textContent = `${personnel.length} RECORD${personnel.length !== 1 ? 'S' : ''}`;
}

/* ── Initials ── */
function getInitials(name) {
  return (name || '??').split(/\s+/).map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

/* ── Branch colors ── */
const BRANCH_CLASS = { navy: 'navy', marine: 'marine', intel: 'intel', command: 'command' };
function branchClass(branch) { return BRANCH_CLASS[branch] || 'navy'; }

const BRANCH_COLORS = {
  navy:    { bg: 'rgba(56,232,255,.08)',  color: 'var(--cyan)',   border: 'rgba(56,232,255,.25)' },
  marine:  { bg: 'rgba(92,219,122,.08)',  color: 'var(--green)',  border: 'rgba(92,219,122,.25)' },
  intel:   { bg: 'rgba(179,136,255,.08)', color: 'var(--purple)', border: 'rgba(179,136,255,.25)' },
  command: { bg: 'rgba(245,197,66,.08)',  color: 'var(--gold)',   border: 'rgba(245,197,66,.25)' }
};

function dividerClass(branch) {
  return { navy: 'cyan', marine: 'green', intel: 'purple', command: 'gold' }[branch] || 'cyan';
}

/* ── Sidebar rendering ── */
function renderList() {
  const list = document.getElementById('char-list');
  const query = document.getElementById('search').value.toLowerCase();
  let filtered = personnel;

  if (filterBranch === 'kia') {
    filtered = filtered.filter(p => p.status === 'KIA' || p.status === 'MIA');
  } else if (filterBranch !== 'all') {
    filtered = filtered.filter(p => p.branch === filterBranch);
  }

  if (query) {
    filtered = filtered.filter(p =>
      (p.name || '').toLowerCase().includes(query) ||
      (p.rank || '').toLowerCase().includes(query) ||
      (p.rankTitle || '').toLowerCase().includes(query) ||
      (p.posting || '').toLowerCase().includes(query) ||
      (p.faction || '').toLowerCase().includes(query)
    );
  }

  filtered.sort((a, b) => (b.updated || 0) - (a.updated || 0));

  list.innerHTML = filtered.map(p => {
    const isDeceased = p.status === 'KIA' || p.status === 'MIA';
    const statusDot = p.status ? `<span class="char-status-dot ${(p.status||'').toLowerCase()}"></span>` : '';
    return `
    <div class="char-item ${p.id === activeId ? 'active' : ''} ${isDeceased ? 'kia' : ''}" data-id="${p.id}">
      <div class="char-avatar ${branchClass(p.branch)}">${esc(getInitials(p.name))}</div>
      <div class="char-info">
        <div class="char-name ${isDeceased ? 'deceased' : ''}">${esc(p.name || 'Unnamed')}</div>
        <div class="char-meta">${statusDot}${esc(p.rankTitle || p.rank || '')} · ${esc(p.posting || 'Unassigned')}</div>
      </div>
    </div>`;
  }).join('');

  list.querySelectorAll('.char-item').forEach(el => {
    el.addEventListener('click', () => {
      activeId = el.dataset.id;
      renderList();
      viewRecord(activeId);
    });
  });
}

/* ── Filters ── */
document.getElementById('filters').addEventListener('click', e => {
  const btn = e.target.closest('.sb-filter');
  if (!btn) return;
  filterBranch = btn.dataset.branch;
  document.querySelectorAll('#filters .sb-filter').forEach(b => b.classList.toggle('active', b === btn));
  renderList();
});

document.getElementById('search').addEventListener('input', () => renderList());

/* ── New record ── */
document.getElementById('btn-new').addEventListener('click', () => {
  if (!requireEditor()) return;
  editRecord(null);
});

/* ── Save to repo ── */
document.getElementById('btn-save-repo').addEventListener('click', () => {
  if (!requireEditor()) return;
  const blob = new Blob([JSON.stringify(personnel, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'personnel.json';
  a.click();
  URL.revokeObjectURL(a.href);
  toast('personnel.json downloaded');
});

/* ══════════════════════════════════════════
   VIEW RECORD (DOSSIER)
   ══════════════════════════════════════════ */
function viewRecord(id) {
  const p = personnel.find(x => x.id === id);
  if (!p) return;
  const main = document.getElementById('main');
  const bc = branchClass(p.branch);
  const dc = dividerClass(p.branch);
  const isDeceased = p.status === 'KIA' || p.status === 'MIA';
  const statusClass = (p.status || 'active').toLowerCase();
  const branchLabel = (p.branch || 'navy').toUpperCase();

  const statsHTML = `
    <div class="dossier-stats">
      <div class="dossier-stat"><div class="ds-key">Status</div><div class="ds-val"><span class="status-badge ${statusClass}">${esc(p.status || 'Active')}</span></div></div>
      <div class="dossier-stat"><div class="ds-key">Branch</div><div class="ds-val" style="color:${BRANCH_COLORS[p.branch]?.color || 'var(--text)'};">${esc(branchLabel)}</div></div>
      <div class="dossier-stat"><div class="ds-key">Faction</div><div class="ds-val" style="color:var(--gold);">${esc(p.faction || '—')}</div></div>
      <div class="dossier-stat"><div class="ds-key">Current System</div><div class="ds-val">${esc(p.system || '—')}</div></div>
      <div class="dossier-stat"><div class="ds-key">Command</div><div class="ds-val">${esc(p.command || '—')}</div></div>
      <div class="dossier-stat"><div class="ds-key">Years of Service</div><div class="ds-val">${esc(p.yearsOfService || '—')}</div></div>
    </div>`;

  const bioHTML = p.bio ? `
    <div class="dossier-divider ${dc}"></div>
    <div class="section-label">Biography</div>
    <p class="bio-text">${esc(p.bio)}</p>` : '';

  const records = p.serviceRecord || [];
  const recordHTML = records.length ? `
    <div class="dossier-divider ${dc}"></div>
    <div class="section-label">Service Record</div>
    <div style="margin-bottom:20px;">
      ${records.map(r => `
        <div class="record-item">
          <div class="record-date">${esc(r.date || '')}</div>
          <div class="record-text">${esc(r.text || '')}</div>
        </div>`).join('')}
    </div>` : '';

  const rels = p.relationships || [];
  const relHTML = rels.length ? `
    <div class="dossier-divider ${dc}"></div>
    <div class="section-label">Known Relationships</div>
    <div>
      ${rels.map(r => {
        const target = personnel.find(x => x.id === r.targetId);
        const tName = target ? target.name : (r.targetName || 'Unknown');
        const tInitials = getInitials(tName);
        const tBranch = target ? target.branch : 'navy';
        const tDeceased = target ? (target.status === 'KIA' || target.status === 'MIA') : false;
        const bc2 = BRANCH_COLORS[tBranch] || BRANCH_COLORS.navy;
        return `
        <div class="rel-item" ${target ? `data-target="${target.id}"` : ''}>
          <div class="rel-avatar" style="background:${bc2.bg};color:${bc2.color};border:1px solid ${bc2.border};">${esc(tInitials)}</div>
          <div class="rel-info">
            <div class="rel-name" ${tDeceased ? 'style="text-decoration:line-through;color:var(--text-muted);"' : ''}>${esc(tName)}</div>
            <div class="rel-type ${(r.type || '').toLowerCase()}">${esc(r.type || '')}${r.detail ? ' · ' + esc(r.detail) : ''}</div>
          </div>
        </div>`;
      }).join('')}
    </div>` : '';

  main.innerHTML = `
    <div class="dossier">
      <div class="dossier-header">
        <div class="dossier-portrait ${bc}">${esc(getInitials(p.name))}</div>
        <div class="dossier-identity">
          <div class="dossier-branch">${esc(branchLabel)} · ${esc(p.status || 'ACTIVE SERVICE')}</div>
          <div class="dossier-name" ${isDeceased ? 'style="text-decoration:line-through;color:var(--text-muted);"' : ''}>${esc(p.name || 'Unnamed')}</div>
          <div class="dossier-rank">${esc(p.rankTitle || '')}${p.rank ? ' — ' + esc(p.rank) : ''}</div>
          <div class="dossier-posting">POSTED: ${esc(p.posting || 'UNASSIGNED')}</div>
        </div>
      </div>
      ${statsHTML}
      ${bioHTML}
      ${recordHTML}
      ${relHTML}
      <div class="dossier-divider ${dc}"></div>
      <div style="display:flex;gap:8px;">
        <button class="pbtn" id="dos-edit">✎ EDIT</button>
        <button class="pbtn" id="dos-dup">⊕ DUPLICATE</button>
        <button class="pbtn danger" id="dos-del">✕ DELETE</button>
      </div>
    </div>`;

  /* wire relationship clicks */
  main.querySelectorAll('.rel-item[data-target]').forEach(el => {
    el.addEventListener('click', () => {
      activeId = el.dataset.target;
      renderList();
      viewRecord(activeId);
    });
  });

  /* wire actions */
  document.getElementById('dos-edit').onclick = () => { if (requireEditor()) editRecord(id); };
  document.getElementById('dos-dup').onclick = () => {
    if (!requireEditor()) return;
    const dup = JSON.parse(JSON.stringify(p));
    dup.id = genId();
    dup.name = (dup.name || '') + ' (Copy)';
    dup.updated = Date.now();
    personnel.push(dup);
    save();
    renderList();
    activeId = dup.id;
    viewRecord(dup.id);
    toast('Record duplicated');
  };
  document.getElementById('dos-del').onclick = () => {
    if (!requireEditor()) return;
    if (!confirm(`Delete record for "${p.name}"?`)) return;
    personnel = personnel.filter(x => x.id !== id);
    save();
    activeId = null;
    renderList();
    main.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⊹</div><div class="empty-state-text">Select a personnel record</div></div>';
    toast('Record deleted');
  };
}

/* ══════════════════════════════════════════
   EDIT RECORD
   ══════════════════════════════════════════ */
function editRecord(id) {
  const isNew = !id;
  const p = id ? JSON.parse(JSON.stringify(personnel.find(x => x.id === id))) : {
    id: genId(), name: '', branch: 'navy', rank: '', rankTitle: '',
    status: 'Active', posting: '', faction: '', system: '', command: '',
    yearsOfService: '', bio: '', serviceRecord: [], relationships: [], updated: Date.now()
  };
  if (!p) return;

  const main = document.getElementById('main');
  const records = p.serviceRecord || [];
  const rels = p.relationships || [];

  const branchOpts = ['navy', 'marine', 'intel', 'command'].map(b =>
    `<option value="${b}" ${p.branch === b ? 'selected' : ''}>${b.toUpperCase()}</option>`
  ).join('');

  const statusOpts = ['Active', 'KIA', 'MIA', 'Retired', 'Classified'].map(s =>
    `<option value="${s}" ${p.status === s ? 'selected' : ''}>${s}</option>`
  ).join('');

  const relTypeOpts = ['Superior', 'Subordinate', 'Peer', 'Rival', 'Family'].map(t =>
    `<option value="${t}">${t}</option>`
  ).join('');

  /* build personnel select for relationships */
  const personnelOpts = personnel.filter(x => x.id !== p.id).map(x =>
    `<option value="${x.id}">${esc(x.name || x.id)}</option>`
  ).join('');

  main.innerHTML = `
    <div class="edit-form">
      <div class="edit-form-title">${isNew ? 'New Personnel Record' : 'Edit Record'}</div>

      <div class="edit-section">
        <div class="edit-section-title">Identity</div>
        <div class="form-row"><span class="fl">Full Name</span><input id="ed-name" class="sci-input" type="text" value="${esc(p.name || '')}" placeholder="e.g. Aelindor Eäcalion"/></div>
        <div class="form-row"><span class="fl">Branch</span><select id="ed-branch" class="sci-select">${branchOpts}</select></div>
        <div class="form-row"><span class="fl">Rank (English)</span><input id="ed-rank" class="sci-input" type="text" value="${esc(p.rank || '')}" placeholder="e.g. Admiral (O-10)"/></div>
        <div class="form-row"><span class="fl">Rank (Elvish)</span><input id="ed-rankTitle" class="sci-input" type="text" value="${esc(p.rankTitle || '')}" placeholder="e.g. Eldamar"/></div>
        <div class="form-row"><span class="fl">Status</span><select id="ed-status" class="sci-select">${statusOpts}</select></div>
        <div class="form-row"><span class="fl">Faction</span><input id="ed-faction" class="sci-input" type="text" value="${esc(p.faction || '')}" placeholder="e.g. Arandorë Eldainë"/></div>
      </div>

      <div class="edit-section">
        <div class="edit-section-title">Assignment</div>
        <div class="form-row"><span class="fl">Posting</span><input id="ed-posting" class="sci-input" type="text" value="${esc(p.posting || '')}" placeholder="e.g. AEN Vanyamar Naval Command"/></div>
        <div class="form-row"><span class="fl">System</span><input id="ed-system" class="sci-input" type="text" value="${esc(p.system || '')}" placeholder="e.g. Vanyamar"/></div>
        <div class="form-row"><span class="fl">Command</span><input id="ed-command" class="sci-input" type="text" value="${esc(p.command || '')}" placeholder="e.g. 3rd Grand Armada"/></div>
        <div class="form-row"><span class="fl">Years of Service</span><input id="ed-years" class="sci-input" type="text" value="${esc(p.yearsOfService || '')}" placeholder="e.g. 847"/></div>
      </div>

      <div class="edit-section">
        <div class="edit-section-title">Biography</div>
        <textarea id="ed-bio" class="sci-textarea" style="min-height:120px;" placeholder="Background, notable actions, personality...">${esc(p.bio || '')}</textarea>
      </div>

      <div class="edit-section">
        <div class="edit-section-title">Service Record</div>
        <div id="ed-records">
          ${records.map((r, i) => `
            <div class="editable-row" data-idx="${i}">
              <input class="sci-input sr-date" type="text" value="${esc(r.date || '')}" placeholder="Date" style="max-width:160px;"/>
              <input class="sci-input sr-text" type="text" value="${esc(r.text || '')}" placeholder="Event description"/>
              <button class="row-del sr-del">✕</button>
            </div>`).join('')}
        </div>
        <button class="add-row-btn" id="add-record">+ ADD RECORD</button>
      </div>

      <div class="edit-section">
        <div class="edit-section-title">Relationships</div>
        <div id="ed-rels">
          ${rels.map((r, i) => `
            <div class="editable-row" data-idx="${i}">
              <select class="sci-select rel-target" style="max-width:200px;">
                <option value="">— Select —</option>
                <option value="__custom" ${!personnel.find(x=>x.id===r.targetId) && r.targetName ? 'selected' : ''}>Custom name...</option>
                ${personnel.filter(x => x.id !== p.id).map(x =>
                  `<option value="${x.id}" ${r.targetId === x.id ? 'selected' : ''}>${esc(x.name || x.id)}</option>`
                ).join('')}
              </select>
              <input class="sci-input rel-custom-name" type="text" value="${esc(r.targetName || '')}" placeholder="Custom name" style="max-width:140px;${r.targetId && personnel.find(x=>x.id===r.targetId) ? 'display:none;' : ''}"/>
              <select class="sci-select rel-type-sel" style="max-width:120px;">
                ${['Superior','Subordinate','Peer','Rival','Family'].map(t =>
                  `<option value="${t}" ${r.type === t ? 'selected' : ''}>${t}</option>`
                ).join('')}
              </select>
              <input class="sci-input rel-detail" type="text" value="${esc(r.detail || '')}" placeholder="Detail" style="flex:1;"/>
              <button class="row-del rel-del">✕</button>
            </div>`).join('')}
        </div>
        <button class="add-row-btn" id="add-rel">+ ADD RELATIONSHIP</button>
      </div>

      <div class="edit-actions">
        <button class="pbtn success" id="ed-save" style="flex:1;">✓ ${isNew ? 'CREATE RECORD' : 'SAVE CHANGES'}</button>
        <button class="pbtn" id="ed-cancel">CANCEL</button>
      </div>
    </div>`;

  /* ── Wire add/remove for service records ── */
  document.getElementById('add-record').onclick = () => {
    const container = document.getElementById('ed-records');
    const idx = container.children.length;
    const row = document.createElement('div');
    row.className = 'editable-row';
    row.dataset.idx = idx;
    row.innerHTML = `
      <input class="sci-input sr-date" type="text" placeholder="Date" style="max-width:160px;"/>
      <input class="sci-input sr-text" type="text" placeholder="Event description"/>
      <button class="row-del sr-del">✕</button>`;
    container.appendChild(row);
    wireRowDel(row);
  };

  document.getElementById('add-rel').onclick = () => {
    const container = document.getElementById('ed-rels');
    const idx = container.children.length;
    const row = document.createElement('div');
    row.className = 'editable-row';
    row.dataset.idx = idx;
    row.innerHTML = `
      <select class="sci-select rel-target" style="max-width:200px;">
        <option value="">— Select —</option>
        <option value="__custom">Custom name...</option>
        ${personnel.filter(x => x.id !== p.id).map(x =>
          `<option value="${x.id}">${esc(x.name || x.id)}</option>`
        ).join('')}
      </select>
      <input class="sci-input rel-custom-name" type="text" placeholder="Custom name" style="max-width:140px;display:none;"/>
      <select class="sci-select rel-type-sel" style="max-width:120px;">
        ${['Superior','Subordinate','Peer','Rival','Family'].map(t =>
          `<option value="${t}">${t}</option>`).join('')}
      </select>
      <input class="sci-input rel-detail" type="text" placeholder="Detail" style="flex:1;"/>
      <button class="row-del rel-del">✕</button>`;
    container.appendChild(row);
    wireRowDel(row);
    wireRelTargetToggle(row);
  };

  function wireRowDel(row) {
    row.querySelector('.row-del').onclick = () => {
      row.style.opacity = '0';
      setTimeout(() => row.remove(), 150);
    };
  }

  function wireRelTargetToggle(row) {
    const sel = row.querySelector('.rel-target');
    const custom = row.querySelector('.rel-custom-name');
    sel.addEventListener('change', () => {
      custom.style.display = sel.value === '__custom' ? '' : 'none';
    });
  }

  /* wire existing row deletes and toggles */
  main.querySelectorAll('.editable-row').forEach(row => {
    wireRowDel(row);
    if (row.querySelector('.rel-target')) wireRelTargetToggle(row);
  });

  /* ── Save ── */
  document.getElementById('ed-save').onclick = () => {
    const updated = {
      id: p.id,
      name: document.getElementById('ed-name').value.trim(),
      branch: document.getElementById('ed-branch').value,
      rank: document.getElementById('ed-rank').value.trim(),
      rankTitle: document.getElementById('ed-rankTitle').value.trim(),
      status: document.getElementById('ed-status').value,
      faction: document.getElementById('ed-faction').value.trim(),
      posting: document.getElementById('ed-posting').value.trim(),
      system: document.getElementById('ed-system').value.trim(),
      command: document.getElementById('ed-command').value.trim(),
      yearsOfService: document.getElementById('ed-years').value.trim(),
      bio: document.getElementById('ed-bio').value.trim(),
      serviceRecord: [],
      relationships: [],
      updated: Date.now()
    };

    /* collect service records */
    document.querySelectorAll('#ed-records .editable-row').forEach(row => {
      const date = row.querySelector('.sr-date')?.value.trim();
      const text = row.querySelector('.sr-text')?.value.trim();
      if (date || text) updated.serviceRecord.push({ date, text });
    });

    /* collect relationships */
    document.querySelectorAll('#ed-rels .editable-row').forEach(row => {
      const targetSel = row.querySelector('.rel-target');
      const customName = row.querySelector('.rel-custom-name')?.value.trim();
      const type = row.querySelector('.rel-type-sel')?.value;
      const detail = row.querySelector('.rel-detail')?.value.trim();

      const rel = { type, detail };
      if (targetSel.value === '__custom' || !targetSel.value) {
        rel.targetName = customName || 'Unknown';
        rel.targetId = '';
      } else {
        rel.targetId = targetSel.value;
        rel.targetName = '';
      }
      if (rel.targetId || rel.targetName) updated.relationships.push(rel);
    });

    /* upsert */
    const idx = personnel.findIndex(x => x.id === updated.id);
    if (idx >= 0) personnel[idx] = updated;
    else personnel.push(updated);

    save();
    activeId = updated.id;
    renderList();
    viewRecord(updated.id);
    toast(isNew ? 'Record created' : 'Changes saved');
  };

  /* ── Cancel ── */
  document.getElementById('ed-cancel').onclick = () => {
    if (id) viewRecord(id);
    else {
      activeId = null;
      main.innerHTML = '<div class="empty-state"><div class="empty-state-icon">⊹</div><div class="empty-state-text">Select a personnel record</div></div>';
    }
  };
}

/* ══════════════════════════════════════════
   BOOT
   ══════════════════════════════════════════ */
(async function boot() {
  await load();
  renderList();
  updateCount();
})();
