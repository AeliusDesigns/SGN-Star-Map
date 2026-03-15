/* ══════════════════════════════════════════════════════════════
   SGN — GLOBAL SEARCH OVERLAY
   Press "/" from any page to open. Searches across all data stores.
   Reads localStorage first, falls back to repo JSON files.
   ══════════════════════════════════════════════════════════════ */

(function () {
  'use strict';

  /* ── Data source keys (localStorage) + file fallbacks ── */
  const SOURCES = {
    map:       { lsKey: 'sgn_map_state_v1', file: './systems.json' },
    fleets:    { lsKey: 'sgn_fleets_v1',    file: './fleets.json' },
    orbat:     { lsKey: 'sgn_orbat_v1',     file: './orbat.json' },
    personnel: { lsKey: 'sgn_personnel_v1', file: './personnel.json' },
    codex:     { lsKey: 'sgn_codex_v1',     file: './codex.json' },
    language:  { lsKey: 'sgn_language_v1',   file: './arandori-language.json' }
  };

  /* ── Category meta ── */
  const CATEGORIES = {
    systems:   { label: 'SYSTEMS',   icon: '✦', cls: 'system',    page: 'Star Chart',  href: './index.html' },
    orbat:     { label: 'ORBAT',     icon: '⟐', cls: 'orbat',     page: 'ORBAT',       href: './orbat.html' },
    fleets:    { label: 'FLEETS',    icon: '◆', cls: 'fleet',     page: 'Star Chart',  href: './index.html' },
    personnel: { label: 'PERSONNEL', icon: '⊹', cls: 'personnel', page: 'Personnel',   href: './personnel.html' },
    codex:     { label: 'CODEX',     icon: '◈', cls: 'codex',     page: 'Codex',       href: './wiki.html' },
    language:  { label: 'LANGUAGE',  icon: '◉', cls: 'language',  page: 'Language',    href: './language.html' }
  };

  const FILTER_ORDER = ['all', 'systems', 'codex', 'personnel', 'orbat', 'fleets', 'language'];

  /* ── Fetch helper: localStorage first, then JSON file ── */
  async function loadSource(key) {
    const src = SOURCES[key];
    /* try localStorage */
    try {
      const raw = localStorage.getItem(src.lsKey);
      if (raw) { const d = JSON.parse(raw); if (d && (Array.isArray(d) ? d.length : Object.keys(d).length)) return d; }
    } catch {}
    /* fallback: fetch JSON file */
    try {
      const r = await fetch(src.file, { cache: 'no-store' });
      if (r.ok) return await r.json();
    } catch {}
    return null;
  }

  /* ── Build overlay DOM ── */
  function buildOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'sgn-search-overlay';
    overlay.innerHTML = `
      <div class="gs-backdrop"></div>
      <div class="gs-container">
        <div class="gs-bar-wrap">
          <span class="gs-icon">⊹</span>
          <input class="gs-bar" type="text" placeholder="Search everything..." autocomplete="off" spellcheck="false"/>
          <span class="gs-shortcut">ESC to close</span>
        </div>
        <div class="gs-filters" id="gs-filters">
          ${FILTER_ORDER.map(f => `<button class="gs-filter-btn ${f === 'all' ? 'active' : ''}" data-filter="${f}">${f.toUpperCase()}</button>`).join('')}
        </div>
        <div class="gs-results" id="gs-results"></div>
      </div>
    `;
    document.body.appendChild(overlay);
    return overlay;
  }

  /* ── Inject styles ── */
  function injectStyles() {
    if (document.getElementById('sgn-search-styles')) return;
    const style = document.createElement('style');
    style.id = 'sgn-search-styles';
    style.textContent = `
      #sgn-search-overlay { display: none; position: fixed; inset: 0; z-index: 9999; }
      #sgn-search-overlay.open { display: flex; }
      .gs-backdrop { position: absolute; inset: 0; background: rgba(5,8,16,.85); backdrop-filter: blur(12px); }
      .gs-container { position: relative; z-index: 1; width: 100%; max-width: 680px; margin: 0 auto; padding: 70px 24px 40px; display: flex; flex-direction: column; align-items: center; max-height: 100vh; }
      .gs-bar-wrap { width: 100%; position: relative; margin-bottom: 18px; flex-shrink: 0; }
      .gs-bar { width: 100%; background: rgba(8,13,24,.95); border: 1px solid var(--cyan-dim, #1a7090); border-radius: 4px; padding: 14px 18px 14px 44px; font-family: 'Exo 2', sans-serif; font-size: 16px; color: var(--text, #c8deff); outline: none; box-shadow: 0 0 20px rgba(56,232,255,.1); transition: border-color .15s, box-shadow .15s; }
      .gs-bar::placeholder { color: var(--text-muted, #2e4a66); }
      .gs-bar:focus { border-color: var(--cyan, #38e8ff); box-shadow: 0 0 30px rgba(56,232,255,.15); }
      .gs-icon { position: absolute; left: 16px; top: 50%; transform: translateY(-50%); font-size: 18px; color: var(--cyan-dim, #1a7090); pointer-events: none; }
      .gs-shortcut { position: absolute; right: 14px; top: 50%; transform: translateY(-50%); font-family: 'Share Tech Mono', monospace; font-size: 10px; color: var(--text-muted, #2e4a66); letter-spacing: 1px; border: 1px solid var(--border, #1a2d46); border-radius: 2px; padding: 2px 6px; pointer-events: none; }
      .gs-filters { display: flex; gap: 6px; margin-bottom: 16px; flex-shrink: 0; flex-wrap: wrap; justify-content: center; }
      .gs-filter-btn { font-family: 'Share Tech Mono', monospace; font-size: 10px; letter-spacing: 1px; text-transform: uppercase; padding: 4px 10px; border: 1px solid var(--border, #1a2d46); border-radius: 2px; background: transparent; color: var(--text-muted, #2e4a66); cursor: pointer; transition: all .12s; }
      .gs-filter-btn:hover { border-color: var(--border2, #243d5e); color: var(--text-dim, #5a7a99); }
      .gs-filter-btn.active { border-color: var(--cyan-dim, #1a7090); color: var(--cyan, #38e8ff); background: rgba(56,232,255,.06); }
      .gs-results { width: 100%; overflow-y: auto; flex: 1; scrollbar-width: thin; scrollbar-color: var(--border2, #243d5e) transparent; padding-bottom: 20px; }
      .gs-results::-webkit-scrollbar { width: 3px; }
      .gs-results::-webkit-scrollbar-thumb { background: var(--border2, #243d5e); border-radius: 2px; }
      .gs-group { margin-bottom: 14px; }
      .gs-group-header { font-family: 'Share Tech Mono', monospace; font-size: 10px; letter-spacing: 2px; text-transform: uppercase; color: var(--text-muted, #2e4a66); margin-bottom: 6px; padding-left: 4px; display: flex; align-items: center; gap: 8px; }
      .gs-group-header::after { content: ''; flex: 1; height: 1px; background: var(--border, #1a2d46); }
      .gs-group-count { color: var(--cyan-dim, #1a7090); }
      .gs-item { background: rgba(8,13,24,.7); border: 1px solid var(--border, #1a2d46); border-radius: 3px; padding: 10px 14px; margin-bottom: 4px; display: flex; align-items: center; gap: 12px; cursor: pointer; transition: all .12s; position: relative; overflow: hidden; text-decoration: none; color: inherit; }
      .gs-item::before { content: ''; position: absolute; left: 0; top: 0; width: 3px; height: 100%; border-radius: 3px 0 0 3px; }
      .gs-item:hover { border-color: var(--cyan-dim, #1a7090); background: rgba(12,18,32,.9); }
      .gs-item.system::before  { background: var(--cyan, #38e8ff); }
      .gs-item.codex::before   { background: var(--gold, #f5c542); }
      .gs-item.personnel::before { background: var(--green, #5cdb7a); }
      .gs-item.orbat::before   { background: var(--purple, #b388ff); }
      .gs-item.fleet::before   { background: var(--amber, #ff9e44); }
      .gs-item.language::before { background: var(--cyan, #38e8ff); }
      .gs-item-icon { width: 32px; height: 32px; border-radius: 3px; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0; border: 1px solid; }
      .gs-item-icon.system   { background: rgba(56,232,255,.08);  border-color: rgba(56,232,255,.2);  color: var(--cyan, #38e8ff); }
      .gs-item-icon.codex    { background: rgba(245,197,66,.08);  border-color: rgba(245,197,66,.2);  color: var(--gold, #f5c542); }
      .gs-item-icon.personnel{ background: rgba(92,219,122,.08);  border-color: rgba(92,219,122,.2);  color: var(--green, #5cdb7a); }
      .gs-item-icon.orbat    { background: rgba(179,136,255,.08); border-color: rgba(179,136,255,.2); color: var(--purple, #b388ff); }
      .gs-item-icon.fleet    { background: rgba(255,158,68,.08);  border-color: rgba(255,158,68,.2);  color: var(--amber, #ff9e44); }
      .gs-item-icon.language { background: rgba(56,232,255,.08);  border-color: rgba(56,232,255,.2);  color: var(--cyan, #38e8ff); }
      .gs-item-info { flex: 1; min-width: 0; }
      .gs-item-name { font-family: 'Rajdhani', sans-serif; font-weight: 600; font-size: 15px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .gs-item-name mark { background: none; color: var(--cyan, #38e8ff); font-weight: 700; text-decoration: underline; text-underline-offset: 2px; }
      .gs-item-meta { font-family: 'Share Tech Mono', monospace; font-size: 10px; color: var(--text-muted, #2e4a66); letter-spacing: .5px; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
      .gs-item-page { font-family: 'Share Tech Mono', monospace; font-size: 9px; letter-spacing: 1px; text-transform: uppercase; color: var(--text-muted, #2e4a66); flex-shrink: 0; border: 1px solid var(--border, #1a2d46); border-radius: 2px; padding: 2px 6px; }
      .gs-empty { text-align: center; padding: 40px 0; font-family: 'Share Tech Mono', monospace; font-size: 12px; color: var(--text-muted, #2e4a66); letter-spacing: 1.5px; }
      .gs-loading { text-align: center; padding: 30px 0; font-family: 'Share Tech Mono', monospace; font-size: 11px; color: var(--cyan-dim, #1a7090); letter-spacing: 2px; animation: gs-pulse 1.2s ease-in-out infinite; }
      @keyframes gs-pulse { 0%,100%{ opacity:.4; } 50%{ opacity:1; } }
    `;
    document.head.appendChild(style);
  }

  /* ── Highlight query in text ── */
  function highlight(text, query) {
    if (!query || !text) return escHtml(text || '');
    const esc = escHtml(text);
    const re = new RegExp(`(${escRegex(query)})`, 'gi');
    return esc.replace(re, '<mark>$1</mark>');
  }
  function escHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  function escRegex(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  /* ══════════════════════════════════════════
     ASYNC DATA GATHERING
     localStorage first → JSON file fallback
     ══════════════════════════════════════════ */

  /* Cache fetched file data so we don't re-fetch on every keystroke */
  const _fileCache = {};

  async function loadSourceData(key) {
    const src = SOURCES[key];
    /* try localStorage first */
    try {
      const raw = localStorage.getItem(src.lsKey);
      if (raw) {
        const d = JSON.parse(raw);
        const hasData = Array.isArray(d) ? d.length > 0 : (d && Object.keys(d).length > 0);
        if (hasData) return d;
      }
    } catch {}
    /* fallback: check cache, then fetch file */
    if (_fileCache[key] !== undefined) return _fileCache[key];
    try {
      const r = await fetch(src.file, { cache: 'no-store' });
      if (r.ok) { const d = await r.json(); _fileCache[key] = d; return d; }
    } catch {}
    _fileCache[key] = null;
    return null;
  }

  async function gatherData() {
    const results = { systems: [], fleets: [], orbat: [], personnel: [], codex: [], language: [] };

    /* Systems */
    const mapData = await loadSourceData('map');
    if (mapData) {
      (mapData.systems || []).forEach(s => {
        results.systems.push({
          name: s.name || s.id,
          meta: `${s.id}${s.owner ? ' · Owner: ' + s.owner : ''}${s.tags?.length ? ' · ' + s.tags.join(', ') : ''}`,
          href: `./index.html#system=${encodeURIComponent(s.id || '')}`,
          searchText: [s.name, s.id, s.owner, ...(s.tags || []), s.notes].filter(Boolean).join(' ')
        });
      });
    }

    /* Fleets */
    const fleetData = await loadSourceData('fleets');
    if (fleetData) {
      (Array.isArray(fleetData) ? fleetData : []).forEach(f => {
        const shipCount = (f.ships || []).reduce((s, sh) => s + (sh.qty || 0), 0);
        results.fleets.push({
          name: f.name || 'Unnamed Fleet',
          meta: `${f.status || 'Stationed'} · ${shipCount} ships${f.captain ? ' · ' + f.captain : ''}`,
          href: `./index.html#fleet=${encodeURIComponent(f.id || '')}&system=${encodeURIComponent(f.systemId || '')}`,
          searchText: [f.name, f.captain, f.designation, f.status, f.notes, ...(f.ships || []).map(s => s.className)].filter(Boolean).join(' ')
        });
      });
    }

    /* ORBAT */
    const orbatData = await loadSourceData('orbat');
    if (orbatData) {
      (Array.isArray(orbatData) ? orbatData : []).forEach(ob => {
        function walkNodes(node, path) {
          if (!node) return;
          results.orbat.push({
            name: node.name || 'Formation',
            meta: `${node.type || 'formation'}${node.commander ? ' · ' + node.commander : ''}${path ? ' · ' + path : ''}`,
            icon: node.type === 'battlegroup' ? '▣' : '⟐',
            href: `./orbat.html#id=${encodeURIComponent(ob.id || '')}`,
            searchText: [node.name, node.type, node.commander, node.rankTitle, ...(node.ships || []).map(s => s.name)].filter(Boolean).join(' ')
          });
          (node.children || []).forEach(c => walkNodes(c, node.name));
        }
        walkNodes(ob.root, '');
      });
    }

    /* Personnel */
    const persData = await loadSourceData('personnel');
    if (persData) {
      (Array.isArray(persData) ? persData : []).forEach(p => {
        results.personnel.push({
          name: p.name || 'Unknown',
          meta: `${p.rankTitle || p.rank || ''} · ${p.branch || 'Navy'} · ${p.status || 'Active'}${p.posting ? ' · ' + p.posting : ''}`,
          href: `./personnel.html#id=${encodeURIComponent(p.id || '')}`,
          searchText: [p.name, p.rank, p.rankTitle, p.branch, p.posting, p.system, p.command, p.faction, p.bio, ...(p.tags || [])].filter(Boolean).join(' ')
        });
      });
    }

    /* Codex */
    const codexData = await loadSourceData('codex');
    if (codexData) {
      (Array.isArray(codexData) ? codexData : []).forEach(e => {
        results.codex.push({
          name: e.title || 'Untitled',
          meta: `${e.category || 'Entry'}${e.designation ? ' · ' + e.designation : ''}`,
          href: `./wiki.html#id=${encodeURIComponent(e.id || '')}`,
          searchText: [e.title, e.category, e.designation, e.classification, e.role, e.body?.replace(/<[^>]+>/g, '')].filter(Boolean).join(' ')
        });
      });
    }

    /* Language (Eldarindëva dictionary) */
    const langData = await loadSourceData('language');
    if (langData) {
      let langEntries = [];
      if (langData.dictionary && langData.dictionary.entries) {
        langEntries = langData.dictionary.entries;
      } else if (langData.entries) {
        langEntries = langData.entries;
      } else if (Array.isArray(langData)) {
        langEntries = langData;
      }
      langEntries.forEach(e => {
        const defs = (e.definitions || []).join(', ');
        const tags = (e.tags || []).join(', ');
        results.language.push({
          name: e.word || 'Unknown',
          meta: `${e.ipa || ''} \u00b7 ${e.pos || ''} \u00b7 ${defs}`,
          href: `./language.html#word=${encodeURIComponent(e.word || '')}`,
          searchText: [e.word, defs, e.pos, e.etymology, tags, e.ipa].filter(Boolean).join(' ')
        });
      });
      const phrases = langData.dictionary?.commonPhrases || [];
      phrases.forEach(p => {
        results.language.push({
          name: p.elvish || '',
          meta: `Phrase \u00b7 ${p.meaning || ''}`,
          href: `./language.html#phrase=${encodeURIComponent(p.elvish || '')}`,
          searchText: [p.elvish, p.literal, p.meaning].filter(Boolean).join(' ')
        });
      });
    }

    return results;
  }

  /* ── Render results (async) ── */
  let _renderSeq = 0; // prevent stale renders from slow fetches

  async function renderResults(container, query, activeFilter) {
    const seq = ++_renderSeq;

    if (!query || query.length < 1) {
      container.innerHTML = '<div class="gs-empty">// TYPE TO SEARCH ACROSS ALL SGN DATA</div>';
      return;
    }

    container.innerHTML = '<div class="gs-loading">// SCANNING DATA STORES…</div>';

    const data = await gatherData();
    if (seq !== _renderSeq) return; // superseded by newer input

    const q = query.toLowerCase();
    let totalResults = 0;
    let html = '';

    const categoriesToSearch = activeFilter === 'all'
      ? Object.keys(CATEGORIES)
      : [activeFilter];

    for (const catKey of categoriesToSearch) {
      const cat = CATEGORIES[catKey];
      const items = data[catKey] || [];
      const matches = items.filter(item => item.searchText.toLowerCase().includes(q));
      if (!matches.length) continue;
      totalResults += matches.length;

      html += `<div class="gs-group">`;
      html += `<div class="gs-group-header">${cat.label} <span class="gs-group-count">${matches.length} result${matches.length !== 1 ? 's' : ''}</span></div>`;

      matches.slice(0, 10).forEach(item => {
        const icon = item.icon || cat.icon;
        html += `
          <a class="gs-item ${cat.cls}" href="${item.href}" data-search-nav>
            <div class="gs-item-icon ${cat.cls}">${icon}</div>
            <div class="gs-item-info">
              <div class="gs-item-name">${highlight(item.name, query)}</div>
              <div class="gs-item-meta">${escHtml(item.meta)}</div>
            </div>
            <span class="gs-item-page">${cat.page}</span>
          </a>`;
      });

      if (matches.length > 10) {
        html += `<div class="gs-empty" style="padding:8px;">… and ${matches.length - 10} more</div>`;
      }
      html += `</div>`;
    }

    if (!totalResults) {
      html = `<div class="gs-empty">// NO RESULTS FOR "${escHtml(query.toUpperCase())}"</div>`;
    }

    container.innerHTML = html;
  }

  /* ── Init ── */
  let overlay = null;
  let activeFilter = 'all';

  function open() {
    if (!overlay) { injectStyles(); overlay = buildOverlay(); }
    overlay.classList.add('open');
    const bar = overlay.querySelector('.gs-bar');
    bar.value = '';
    bar.focus();
    renderResults(overlay.querySelector('#gs-results'), '', activeFilter);
  }

  function close() { if (overlay) overlay.classList.remove('open'); }
  function isOpen() { return overlay && overlay.classList.contains('open'); }

  /* ── Event delegation ── */
  document.addEventListener('keydown', e => {
    const tag = document.activeElement?.tagName;
    const isEditable = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || document.activeElement?.isContentEditable;
    if (e.key === '/' && !isEditable) { e.preventDefault(); if (isOpen()) close(); else open(); return; }
    if (e.key === 'Escape' && isOpen()) { e.preventDefault(); e.stopPropagation(); close(); }
  });

  document.addEventListener('click', e => { if (isOpen() && e.target.classList.contains('gs-backdrop')) close(); });

  document.addEventListener('click', e => {
    const btn = e.target.closest('.gs-filter-btn');
    if (!btn || !isOpen()) return;
    activeFilter = btn.dataset.filter;
    overlay.querySelectorAll('.gs-filter-btn').forEach(b => b.classList.toggle('active', b === btn));
    const query = overlay.querySelector('.gs-bar').value.trim();
    renderResults(overlay.querySelector('#gs-results'), query, activeFilter);
  });

  /* Debounced search input */
  let _debounce = null;
  document.addEventListener('input', e => {
    if (!isOpen() || !e.target.classList.contains('gs-bar')) return;
    clearTimeout(_debounce);
    _debounce = setTimeout(() => {
      const query = e.target.value.trim();
      renderResults(overlay.querySelector('#gs-results'), query, activeFilter);
    }, 120);
  });

  /* ── Navigation: same-page deep link or cross-page ── */
  document.addEventListener('click', e => {
    const item = e.target.closest('[data-search-nav]');
    if (!item || !isOpen()) return;
    close();
    const href = item.getAttribute('href');
    if (!href) return;
    const hashIdx = href.indexOf('#');
    if (hashIdx < 0) return;
    const pagePart = href.slice(0, hashIdx);
    const hashPart = href.slice(hashIdx + 1);
    const currentPage = window.location.pathname.split('/').pop() || 'index.html';
    const targetPage = pagePart.replace('./', '') || 'index.html';
    if (targetPage === currentPage) {
      e.preventDefault();
      window.location.hash = '#' + hashPart;
      handleDeepLink();
    }
  });

  /* ══════════════════════════════════════════
     DEEP LINK API
     Each page registers via SGNSearch.onDeepLink(fn).
     Handler receives parsed hash params. Fires on
     registration if hash present (cross-page arrival).
     ══════════════════════════════════════════ */

  let _deepLinkHandler = null;

  function parseHash() {
    const hash = window.location.hash;
    if (!hash || hash.length < 2) return null;
    const params = {};
    hash.slice(1).split('&').forEach(p => {
      const eq = p.indexOf('=');
      if (eq > 0) params[p.slice(0, eq)] = decodeURIComponent(p.slice(eq + 1));
    });
    return Object.keys(params).length ? params : null;
  }

  function handleDeepLink() {
    const params = parseHash();
    if (!params || !_deepLinkHandler) return;
    _deepLinkHandler(params);
    history.replaceState(null, '', window.location.pathname + window.location.search);
  }

  function onDeepLink(fn) {
    _deepLinkHandler = fn;
    if (window.location.hash) setTimeout(handleDeepLink, 150);
  }

  window.SGNSearch = { open, close, isOpen, onDeepLink, handleDeepLink };
})();
