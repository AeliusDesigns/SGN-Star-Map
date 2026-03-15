/* ══════════════════════════════════════════
   SGN — LANGUAGE FORGE
   Main Application Controller
   ══════════════════════════════════════════ */

const STORE_KEY = 'sgn_language_v1';
const PW_SESSION = 'starmap_editor_ok';
let langData = null;
let entries = [];
let activeWordId = null;
let sidebarMode = 'alpha';
let _editorPW = null;
let editorOK = sessionStorage.getItem(PW_SESSION) === '1';

/* ── Utility ── */
function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
function toast(msg) { const el = document.getElementById('toast'); el.textContent = msg; el.classList.add('visible'); setTimeout(() => el.classList.remove('visible'), 2200); }

/* ── Password ── */
(async function loadPW() {
  try { const r = await fetch('./editor.json', { cache: 'no-store' }); if (r.ok) { const d = await r.json(); if (typeof d.pw === 'string' && d.pw.length) _editorPW = d.pw; } } catch {}
})();
function requireEditor() {
  if (editorOK) return true;
  if (_editorPW === null) { alert('Editor not available (no editor.json found).'); return false; }
  const pw = prompt('Enter editor password:');
  if (pw === _editorPW) { editorOK = true; sessionStorage.setItem(PW_SESSION, '1'); return true; }
  alert('Incorrect password.'); return false;
}

/* ══════════════════════════════════════════
   DATA LOADING
   ══════════════════════════════════════════ */

async function load() {
  let fileData = null, localData = null;

  // Load from JSON file
  try {
    const r = await fetch('./arandori-language.json', { cache: 'no-store' });
    if (r.ok) fileData = await r.json();
  } catch {}

  // Load from localStorage
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (raw) localData = JSON.parse(raw);
  } catch {}

  // Merge: file is canonical, localStorage can overlay
  if (fileData) {
    langData = fileData;
    entries = fileData.dictionary?.entries || [];
  }

  if (localData && localData.entries) {
    // Merge entries by ID, localStorage wins for newer
    const merged = new Map();
    for (const e of entries) merged.set(e.id, e);
    for (const e of localData.entries) {
      const x = merged.get(e.id);
      if (!x || (e.updated || 0) > (x.updated || 0)) merged.set(e.id, e);
    }
    entries = Array.from(merged.values());
  }

  // Initialize composition engine with dictionary
  CompositionEngine.setDictionary(entries);

  // Give semantic network access to dictionary for fallback searches
  SemanticNetwork.setDictRef(entries);
}

function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ entries, updated: Date.now() }));
  } catch (e) {
    if (e.name === 'QuotaExceededError') toast('Storage full. Use SAVE TO REPO.');
  }
  updateCounts();
}

function updateCounts() {
  const total = entries.length;
  const roots = entries.filter(e => e.pos?.includes('root') || e.tags?.includes('root')).length;
  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-roots').textContent = roots;
  document.getElementById('hud-count').textContent = `${total} ENTRIES`;
}

/* ══════════════════════════════════════════
   SIDEBAR: WORD LIST
   ══════════════════════════════════════════ */

function renderWordList() {
  const searchVal = document.getElementById('sb-search').value.toLowerCase().trim();
  let filtered = entries.slice();

  // Filter by search
  if (searchVal) {
    filtered = filtered.filter(e =>
      e.word.toLowerCase().includes(searchVal) ||
      e.definitions?.some(d => d.toLowerCase().includes(searchVal)) ||
      e.tags?.some(t => t.toLowerCase().includes(searchVal)) ||
      (e.ipa && e.ipa.toLowerCase().includes(searchVal))
    );
  }

  // Sort by mode
  if (sidebarMode === 'alpha') {
    filtered.sort((a, b) => a.word.localeCompare(b.word));
  } else if (sidebarMode === 'english') {
    filtered.sort((a, b) => (a.definitions?.[0] || '').localeCompare(b.definitions?.[0] || ''));
  } else if (sidebarMode === 'roots') {
    filtered = filtered.filter(e => e.pos?.includes('root') || e.tags?.includes('root'));
    filtered.sort((a, b) => a.word.localeCompare(b.word));
  } else if (sidebarMode === 'pos') {
    filtered.sort((a, b) => (a.pos || '').localeCompare(b.pos || ''));
  }

  const list = document.getElementById('word-list');
  list.innerHTML = filtered.map(e => `
    <div class="dict-item${e.id === activeWordId ? ' active' : ''}" data-id="${e.id}">
      <div style="display:flex;justify-content:space-between;align-items:baseline;">
        <span class="dict-item-word">${esc(e.word)}</span>
        <span class="dict-item-pos">${esc(e.pos || '')}</span>
      </div>
      <div class="dict-item-ipa">${esc(e.ipa || '')}</div>
      <div class="dict-item-def">${esc((e.definitions || []).join(', '))}</div>
    </div>
  `).join('');
}

/* ══════════════════════════════════════════
   TAB: DICTIONARY VIEW
   ══════════════════════════════════════════ */

function viewEntry(id) {
  const e = entries.find(x => x.id === id);
  if (!e) return;
  activeWordId = id;
  renderWordList();

  const container = document.getElementById('dict-entry');
  document.getElementById('dict-empty').style.display = 'none';
  container.style.display = 'block';

  const isNoun = e.pos?.includes('noun') && !e.pos?.includes('verb');
  const isVerb = e.pos?.includes('verb');
  const isRoot = e.pos?.includes('root') || e.tags?.includes('root');

  let html = `
    <div class="entry-header">
      <div class="entry-word">${esc(e.word)}</div>
      <div class="entry-ipa">${esc(e.ipa || PhonologicalCore.toIPA(e.word))}</div>
      <div class="entry-pos">${esc(e.pos || 'unknown')}</div>
    </div>
    <div class="section-label">Definitions</div>
    <div class="entry-defs">
      ${(e.definitions || []).map(d => `<div class="entry-def">${esc(d)}</div>`).join('')}
    </div>
  `;

  if (e.etymology) {
    html += `<div class="section-label">Etymology</div><div class="entry-etym">${esc(e.etymology)}</div>`;
  }

  // Tags
  if (e.tags?.length) {
    html += `<div class="entry-tags">${e.tags.map(t => `<span class="entry-tag">${esc(t)}</span>`).join('')}</div>`;
  }

  // Noun declension table
  if (isNoun || isRoot) {
    const decl = MorphologicalEngine.declineAll(e.word);
    html += `<div class="section-label">Declension</div>
      <table class="inflection-table">
        <tr><th>Case</th><th>Form</th><th>Usage</th></tr>
        ${Object.entries(decl).map(([name, info]) => `
          <tr><td>${name}</td><td>${esc(info.form)}</td><td>${esc(info.desc)}</td></tr>
        `).join('')}
      </table>`;

    // Plurals
    html += `<div class="section-label">Number</div>
      <table class="inflection-table">
        <tr><th>Type</th><th>Form</th><th>Usage</th></tr>
        <tr><td>Singular</td><td>${esc(e.word)}</td><td>One</td></tr>
        <tr><td>Plural</td><td>${esc(MorphologicalEngine.pluralize(e.word, 'standard'))}</td><td>Multiple</td></tr>
        <tr><td>Collective</td><td>${esc(MorphologicalEngine.pluralize(e.word, 'collective'))}</td><td>All of a kind</td></tr>
        <tr><td>Dual</td><td>${esc(MorphologicalEngine.pluralize(e.word, 'dual'))}</td><td>Exactly two</td></tr>
      </table>`;
  }

  // Verb conjugation table
  if (isVerb) {
    const stem = e.word.replace(/[aeiouë]$/, '') || e.word;
    html += `<div class="section-label">Conjugation</div>`;
    for (const [tense, tInfo] of Object.entries(MorphologicalEngine.TENSES)) {
      html += `<div class="gram-block-title" style="margin-top:12px;">${tInfo.label}</div>
        <table class="inflection-table">
          <tr><th>Person</th><th>Form</th><th>Negated</th></tr>`;
      for (const [person, pSuffix] of Object.entries(MorphologicalEngine.PERSON_SUFFIXES)) {
        const form = MorphologicalEngine.conjugate(stem, tense, person);
        html += `<tr><td>${person}</td><td>${esc(form)}</td><td>${esc(MorphologicalEngine.negate(form))}</td></tr>`;
      }
      html += `</table>`;
    }
  }

  // Semantic connections
  if (isRoot) {
    const concepts = SemanticNetwork.conceptsForRoot(e.word);
    if (concepts.length) {
      html += `<div class="section-label">Semantic Connections</div>
        <div class="concept-grid">
          ${concepts.map(c => `<div class="concept-chip">${esc(c.id)} <span style="color:var(--text-muted);font-size:10px;">${c.cat}</span></div>`).join('')}
        </div>`;
    }
    const meta = SemanticNetwork.getMetaphor(e.word);
    if (meta) {
      html += `<div class="metaphor-card">
        <div class="metaphor-literal">${esc(meta.literal)}</div>
        <div class="metaphor-desc">${esc(meta.desc)}</div>
      </div>`;
    }
  }

  // Related words
  const related = entries.filter(x =>
    x.id !== e.id &&
    x.etymology && e.word.length >= 3 &&
    x.etymology.toLowerCase().includes(e.word.toLowerCase())
  );
  if (related.length) {
    html += `<div class="section-label">Related Words</div>
      <div style="display:flex;flex-wrap:wrap;gap:6px;">
        ${related.map(r => `<span class="entry-tag" style="cursor:pointer;color:var(--cyan-dim);" onclick="viewEntry('${r.id}')">${esc(r.word)}</span>`).join('')}
      </div>`;
  }

  container.innerHTML = html;
}

/* ══════════════════════════════════════════
   TAB: PHONOLOGY
   ══════════════════════════════════════════ */

function renderPhonology() {
  if (!langData?.phonology) return;
  const p = langData.phonology;
  const pane = document.getElementById('pane-phonology');

  let html = '<div class="section-label">Consonants</div><div class="phon-grid">';
  for (const c of p.consonants) {
    html += `<div class="phon-card">
      <div class="phon-letter">${esc(c.letter)}</div>
      <div class="phon-info"><div class="phon-ipa">${esc(c.ipa)}</div><div class="phon-desc">${esc(c.description)}</div></div>
    </div>`;
  }
  html += '</div>';

  html += '<div class="section-label">Vowels</div><div class="phon-grid">';
  for (const v of p.vowels) {
    html += `<div class="phon-card">
      <div class="phon-letter">${esc(v.letter)}</div>
      <div class="phon-info"><div class="phon-ipa">${esc(v.ipa)}</div><div class="phon-desc">${esc(v.description)}</div></div>
    </div>`;
  }
  html += '</div>';

  html += '<div class="section-label">Diphthongs</div><div class="phon-grid">';
  for (const d of p.diphthongs) {
    html += `<div class="phon-card">
      <div class="phon-letter">${esc(d.letter)}</div>
      <div class="phon-info"><div class="phon-ipa">${esc(d.ipa)}</div><div class="phon-desc">${esc(d.description)}</div></div>
    </div>`;
  }
  html += '</div>';

  html += '<div class="section-label">Phonotactic Rules</div>';
  for (const r of p.phonotacticRules) {
    html += `<div class="phon-rule">
      <div class="phon-rule-name">${esc(r.rule.replace(/([A-Z])/g, ' $1').trim())}${r.pattern ? ' · ' + esc(r.pattern) : ''}</div>
      <div class="phon-rule-desc">${esc(r.description)}</div>
    </div>`;
  }

  // Stress rules
  html += `<div class="section-label">Stress Assignment</div>
    <div class="phon-rule">
      <div class="phon-rule-name">Penultimate Default</div>
      <div class="phon-rule-desc">Stress falls on the second-to-last syllable. Words ending in -ë shift stress to the third-to-last syllable (antepenultimate). Monosyllabic words are stressed on their only syllable.</div>
    </div>
    <div class="phon-rule">
      <div class="phon-rule-name">Vowel Harmony</div>
      <div class="phon-rule-desc">Within a single root, front vowels (e, i) and back vowels (o, u) tend not to mix. The vowel 'a' is neutral and combines freely. Compound words may cross harmony boundaries at the join point.</div>
    </div>`;

  pane.innerHTML = html;
}

/* ══════════════════════════════════════════
   TAB: GRAMMAR
   ══════════════════════════════════════════ */

function renderGrammar() {
  if (!langData?.grammar) return;
  const g = langData.grammar;
  const pane = document.getElementById('pane-grammar');

  let html = '';

  // Word order
  html += `<div class="section-label">Word Order</div>
    <div class="gram-block">
      <div class="gram-block-title">Standard (everyday)</div>
      <div class="gram-example">VSO: Verb - Subject - Object</div>
      <div class="gram-note">${esc(g.wordOrder.description)}</div>
    </div>`;

  // Articles
  html += `<div class="section-label">Articles</div>
    <div class="gram-block">
      <div class="gram-example">i = the (definite) · na = a/an (indefinite)</div>
      <div class="gram-note">${esc(g.articles.description)}</div>
    </div>`;

  // Cases
  html += `<div class="section-label">Noun Cases (7-case system)</div>
    <table class="inflection-table">
      <tr><th>Case</th><th>Suffix</th><th>Function</th><th>Example</th></tr>
      ${g.nounCases.map(c => `<tr>
        <td>${esc(c.case)}</td>
        <td style="color:var(--cyan);font-family:'Rajdhani',sans-serif;font-weight:600;">${esc(c.suffix)}</td>
        <td>${esc(c.description)}</td>
        <td style="color:var(--gold);font-style:italic;">${esc(c.example)}</td>
      </tr>`).join('')}
    </table>`;

  // Plurals
  html += `<div class="section-label">Plurals</div>
    <div class="gram-block">
      <div class="gram-example">-i (standard) · -ath (collective) · -at (dual)</div>
      <div class="gram-note">${esc(g.plurals.description)}</div>
      ${g.plurals.rules.map(r => `<div class="gram-note" style="margin-top:4px;padding-left:10px;border-left:2px solid var(--border2);">${esc(r)}</div>`).join('')}
    </div>`;

  // Verbs
  html += `<div class="section-label">Verb Conjugation</div>
    <table class="inflection-table">
      <tr><th>Tense</th><th>Suffix</th><th>Example</th></tr>
      ${g.verbs.tenses.map(t => `<tr>
        <td>${esc(t.tense)}</td>
        <td style="color:var(--cyan);font-family:'Rajdhani',sans-serif;font-weight:600;">${esc(t.suffix)}</td>
        <td style="color:var(--gold);font-style:italic;">${esc(t.example)}</td>
      </tr>`).join('')}
    </table>
    <table class="inflection-table" style="margin-top:10px;">
      <tr><th>Person</th><th>Suffix</th><th>Example</th></tr>
      ${g.verbs.personSuffixes.map(p => `<tr>
        <td>${esc(p.person)}</td>
        <td style="color:var(--cyan);font-family:'Rajdhani',sans-serif;font-weight:600;">${esc(p.suffix)}</td>
        <td style="color:var(--gold);font-style:italic;">${esc(p.example)}</td>
      </tr>`).join('')}
    </table>
    <div class="gram-block" style="margin-top:10px;">
      <div class="gram-block-title">Negation</div>
      <div class="gram-note">${esc(g.verbs.negation)}</div>
    </div>`;

  // Adjectives
  html += `<div class="section-label">Adjectives</div>
    <div class="gram-block">
      <div class="gram-note">Placement: <span style="color:var(--cyan);">${esc(g.adjectives.placement)}</span>. ${esc(g.adjectives.agreement)}</div>
      <div class="gram-note" style="margin-top:4px;">${esc(g.adjectives.formation)}</div>
      <div class="gram-example" style="margin-top:4px;">Comparative: ${esc(g.adjectives.comparative)} · Superlative: ${esc(g.adjectives.superlative)}</div>
    </div>`;

  // Compound formation
  html += `<div class="section-label">Compound Formation</div>
    <div class="gram-block">
      <div class="gram-block-title">${esc(g.compoundFormation.order)} order</div>
      <div class="gram-note">${esc(g.compoundFormation.description)}</div>
      ${g.compoundFormation.joiningRules.map(r => `<div class="gram-note" style="margin-top:4px;padding-left:10px;border-left:2px solid var(--border2);">${esc(r)}</div>`).join('')}
    </div>`;

  // Pronouns
  html += `<div class="section-label">Pronouns</div>
    <table class="inflection-table">
      <tr><th>English</th><th>Elvish</th><th>Note</th></tr>
      ${g.pronouns.map(p => `<tr>
        <td>${esc(p.person)}</td>
        <td style="color:var(--cyan);font-family:'Rajdhani',sans-serif;font-weight:600;">${esc(p.elvish)}</td>
        <td style="color:var(--text-dim);font-size:11px;">${esc(p.note || '')}</td>
      </tr>`).join('')}
    </table>`;

  // Prepositions
  html += `<div class="section-label">Prepositions</div>
    <table class="inflection-table">
      <tr><th>Elvish</th><th>Meaning</th></tr>
      ${g.prepositions.map(p => `<tr>
        <td style="color:var(--cyan);font-family:'Rajdhani',sans-serif;font-weight:600;">${esc(p.elvish)}</td>
        <td>${esc(p.meaning)}</td>
      </tr>`).join('')}
    </table>`;

  // Conjunctions
  html += `<div class="section-label">Conjunctions</div>
    <table class="inflection-table">
      <tr><th>Elvish</th><th>Meaning</th></tr>
      ${g.conjunctions.map(c => `<tr>
        <td style="color:var(--cyan);font-family:'Rajdhani',sans-serif;font-weight:600;">${esc(c.elvish)}</td>
        <td>${esc(c.meaning)}</td>
      </tr>`).join('')}
    </table>`;

  // Numbers
  html += `<div class="section-label">Numbers</div>
    <table class="inflection-table">
      <tr><th>Elvish</th><th>Value</th></tr>
      ${g.numbers.map(n => `<tr>
        <td style="color:var(--cyan);font-family:'Rajdhani',sans-serif;font-weight:600;">${esc(n.elvish)}</td>
        <td>${esc(n.meaning)}</td>
      </tr>`).join('')}
    </table>`;

  pane.innerHTML = html;
}

/* ══════════════════════════════════════════
   TAB: WORD FORGE
   ══════════════════════════════════════════ */

function runWordForge() {
  const input = document.getElementById('wf-input').value.trim();
  if (!input) { toast('Enter an English concept first'); return; }

  const result = CompositionEngine.generateWord(input);
  const container = document.getElementById('wf-results');

  if (!result.success) {
    container.innerHTML = `<div class="empty-state" style="height:auto;padding:30px;">
      <div class="empty-state-icon">✕</div>
      <div class="empty-state-text">${esc(result.error)}<br>Try a different concept or check the semantic network.</div>
    </div>`;
    return;
  }

  if (!result.candidates.length) {
    container.innerHTML = `<div class="empty-state" style="height:auto;padding:30px;">
      <div class="empty-state-icon">◎</div>
      <div class="empty-state-text">No valid candidates generated. The concept may need more roots in the dictionary.</div>
    </div>`;
    return;
  }

  container.innerHTML = `
    <div style="font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--text-muted);letter-spacing:1px;margin-bottom:8px;">
      ${result.candidates.length} CANDIDATES FOR "${esc(input.toUpperCase())}"
    </div>
    <div class="candidate-grid">
      ${result.candidates.map((c, i) => {
        const euph = c.euphony || { score: 0, grade: 'unknown' };
        return `
        <div class="candidate-card" id="wf-card-${i}">
          <div class="candidate-register">${esc(c.register)}</div>
          <div class="candidate-word">${esc(c.word)}</div>
          <div class="candidate-ipa">${esc(PhonologicalCore.toIPA(c.word))}</div>
          <div class="candidate-literal">"${esc(c.literal)}"</div>
          <div class="candidate-etym">${esc(c.etymology)}</div>
          <div class="euphony-meter" style="margin-top:8px;">
            <span class="euphony-score">${(euph.score * 100).toFixed(0)}</span>
            <div class="euphony-bar"><div class="euphony-fill ${euph.grade}" style="width:${euph.score * 100}%"></div></div>
            <span class="euphony-label ${euph.grade}">${euph.grade.toUpperCase()}</span>
          </div>
          <div class="candidate-score">Roots: ${esc(c.roots.join(' + '))} · Semantic: ${c.score.toFixed(2)} · Final: ${(c.finalScore || c.score).toFixed(2)}</div>
          <div class="candidate-actions">
            <button class="forge-btn green" onclick="approveCandidate(${i}, '${esc(input)}')">APPROVE</button>
            <button class="forge-btn" onclick="document.getElementById('wf-card-${i}').remove()">DISMISS</button>
          </div>
        </div>
      `}).join('')}
    </div>`;

  // Store candidates for approval
  window._wfCandidates = result.candidates;
}

function approveCandidate(idx, concept) {
  if (!requireEditor()) return;
  const c = window._wfCandidates?.[idx];
  if (!c) return;

  // Check if word already exists
  if (entries.some(e => e.word === c.word)) {
    toast(`"${c.word}" already exists in the dictionary`);
    return;
  }

  const newEntry = {
    id: 'GEN_' + Date.now().toString(36).toUpperCase(),
    word: c.word,
    ipa: PhonologicalCore.toIPA(c.word),
    pos: 'noun',
    definitions: [concept, c.literal],
    etymology: c.etymology,
    tags: ['generated', c.register, ...c.roots],
    updated: Date.now()
  };

  entries.push(newEntry);
  CompositionEngine.setDictionary(entries);
  SemanticNetwork.setDictRef(entries);
  save();
  renderWordList();
  toast(`"${c.word}" added to dictionary`);

  const card = document.getElementById(`wf-card-${idx}`);
  if (card) card.classList.add('approved');
}

/* ══════════════════════════════════════════
   TAB: NAME FORGE
   ══════════════════════════════════════════ */

function runNameForge() {
  const category = document.getElementById('nf-category').value;
  const gender = document.getElementById('nf-gender').value || null;
  const bias = document.getElementById('nf-bias').value.trim();

  const result = CompositionEngine.generateName(category, {
    gender,
    meaningBias: bias,
    maxSyllables: 5,
    minSyllables: 2
  });

  const container = document.getElementById('nf-results');

  if (!result.success || !result.candidates.length) {
    container.innerHTML = `<div class="empty-state" style="height:auto;padding:30px;">
      <div class="empty-state-icon">◎</div>
      <div class="empty-state-text">No names generated. Try adjusting the constraints or adding more roots to the dictionary.</div>
    </div>`;
    return;
  }

  container.innerHTML = `
    <div style="font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--text-muted);letter-spacing:1px;margin-bottom:8px;">
      ${result.candidates.length} NAMES · ${category.toUpperCase()}${gender ? ' · ' + gender.toUpperCase() : ''}${bias ? ' · BIAS: ' + bias.toUpperCase() : ''}
    </div>
    <div class="name-result-grid">
      ${result.candidates.map(c => `
        <div class="name-card">
          <div class="name-card-name">${esc(c.name)}</div>
          <div class="name-card-ipa">${esc(c.ipa)}</div>
          <div class="name-card-etym">${esc(c.etymology)}</div>
          <div class="name-card-meta">${c.syllables} SYL · ${esc(c.category)}${c.gender !== 'n/a' ? ' · ' + esc(c.gender) : ''}</div>
        </div>
      `).join('')}
    </div>`;
}

/* ══════════════════════════════════════════
   TAB: TRANSLATOR
   ══════════════════════════════════════════ */

function runTranslator() {
  const input = document.getElementById('tr-input').value.trim();
  const register = document.getElementById('tr-register').value;
  if (!input) { toast('Enter an English phrase first'); return; }

  const result = CompositionEngine.constructPhrase(input, register);
  const container = document.getElementById('tr-results');

  container.innerHTML = `
    <div class="translator-output">
      <div class="translator-elvish">${esc(result.elvish)}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin:6px 0;">
        <span class="translator-register-tag">${esc(register)}</span>
        <span class="translator-register-tag" style="border-color:var(--border2);">${esc(result.parsedType || 'statement')}</span>
        <span class="translator-register-tag" style="border-color:var(--border2);">${esc(result.tense || 'present')}</span>
        <span class="translator-register-tag" style="border-color:var(--border2);">${esc(result.person || '3s')}</span>
        ${result.negated ? '<span class="translator-register-tag" style="border-color:rgba(255,59,59,.3);color:var(--red-alert);">NEGATED</span>' : ''}
      </div>

      <div class="section-label" style="margin-top:14px;">Interlinear Gloss</div>
      <table class="gloss-table">
        <tr><th>English</th><th>Elvish</th><th>Gloss</th></tr>
        ${result.gloss.map(g => `<tr>
          <td>${esc(g.english)}</td>
          <td class="elvish-cell">${esc(g.elvish)}</td>
          <td class="gloss-cell">${esc(g.gloss)}</td>
        </tr>`).join('')}
      </table>

      ${result.notes.length ? `
        <div class="section-label" style="margin-top:14px;">Grammar Notes</div>
        <div class="translator-notes">
          ${result.notes.map(n => `<div class="translator-note">${esc(n)}</div>`).join('')}
        </div>
      ` : ''}
    </div>`;
}

/* ══════════════════════════════════════════
   TAB: PHRASES / IDIOMS
   ══════════════════════════════════════════ */

let idiomFilter = 'all';

function renderPhrases() {
  const themes = CulturalLayer.getThemes();
  const filtersEl = document.getElementById('idiom-filters');
  filtersEl.innerHTML = `
    <button class="sb-toggle${idiomFilter === 'all' ? ' active' : ''}" data-filter="all">ALL</button>
    ${themes.map(t => `<button class="sb-toggle${idiomFilter === t ? ' active' : ''}" data-filter="${t}">${t.toUpperCase()}</button>`).join('')}
  `;

  let idioms = CulturalLayer.allIdioms();

  // Also include common phrases from the JSON data
  const commonPhrases = langData?.dictionary?.commonPhrases || [];

  if (idiomFilter !== 'all') {
    idioms = idioms.filter(i => i.theme === idiomFilter);
  }

  const listEl = document.getElementById('idiom-list');
  let html = '';

  for (const i of idioms) {
    html += `<div class="idiom-row">
      <div class="idiom-elvish">${esc(i.elvish)}</div>
      <div class="idiom-literal">${esc(i.literal)}</div>
      <div class="idiom-meaning">${esc(i.meaning)}</div>
      <div class="idiom-meta">
        <span class="idiom-register ${i.register}">${i.register.toUpperCase()}</span>
        <span class="idiom-theme">${i.theme.toUpperCase()}</span>
      </div>
      ${i.notes ? `<div class="idiom-notes">${esc(i.notes)}</div>` : ''}
    </div>`;
  }

  // Append common phrases from JSON that aren't in the idiom bank
  const idiomSet = new Set(idioms.map(i => i.elvish));
  for (const cp of commonPhrases) {
    if (idiomSet.has(cp.elvish)) continue;
    if (idiomFilter !== 'all') continue; // Only show extra phrases in ALL mode
    html += `<div class="idiom-row">
      <div class="idiom-elvish">${esc(cp.elvish)}</div>
      <div class="idiom-literal">${esc(cp.literal)}</div>
      <div class="idiom-meaning">${esc(cp.meaning)}</div>
      <div class="idiom-meta">
        <span class="idiom-register formal">DATA FILE</span>
      </div>
    </div>`;
  }

  listEl.innerHTML = html || '<div class="empty-state" style="height:auto;padding:30px;"><div class="empty-state-text">No idioms match this filter.</div></div>';
}

/* ══════════════════════════════════════════
   TAB: WORD ANALYZER (Reverse Decomposition)
   ══════════════════════════════════════════ */

function runAnalyzer() {
  const input = document.getElementById('az-input').value.trim();
  if (!input) { toast('Enter an Elvish word to analyze'); return; }

  const result = CompositionEngine.decomposeUnknown(input);
  const container = document.getElementById('az-results');

  let html = '';

  // Header: the word with IPA and syllables
  html += `<div style="margin-top:16px;">
    <span style="font-family:'Rajdhani',sans-serif;font-size:28px;font-weight:700;color:var(--cyan);letter-spacing:1px;">${esc(input)}</span>
    <span style="font-family:'Share Tech Mono',monospace;font-size:14px;color:var(--text-dim);margin-left:12px;">${esc(result.ipa)}</span>
  </div>`;

  if (result.syllables) {
    html += `<div style="font-family:'Share Tech Mono',monospace;font-size:11px;color:var(--text-muted);margin-top:4px;">
      SYLLABLES: ${result.syllables.map(s => `<span style="color:var(--text);padding:0 2px;">${esc(s)}</span>`).join(' · ')}
      (${result.syllables.length} syl)
    </div>`;
  }

  // Validation status
  html += `<div class="section-label" style="margin-top:16px;">Phonological Validation</div>`;
  if (result.validation.valid) {
    html += `<div class="validation-pass">✓ VALID — This word conforms to Eldarindëva phonotactic rules</div>`;
  } else {
    html += `<div class="validation-fail">✕ INVALID — This word violates phonotactic rules:</div>`;
    for (const err of result.validation.errors) {
      html += `<div class="validation-error">${esc(err)}</div>`;
    }
  }

  // Euphony score
  html += `<div class="section-label" style="margin-top:16px;">Euphony Score</div>`;
  const euph = result.euphony;
  html += `<div class="euphony-meter">
    <span class="euphony-score">${(euph.score * 100).toFixed(0)}</span>
    <div class="euphony-bar"><div class="euphony-fill ${euph.grade}" style="width:${euph.score * 100}%"></div></div>
    <span class="euphony-label ${euph.grade}">${euph.grade.toUpperCase()}</span>
  </div>`;

  // Euphony breakdown
  if (euph.breakdown && Object.keys(euph.breakdown).length) {
    html += `<div class="euphony-breakdown">`;
    for (const [key, val] of Object.entries(euph.breakdown)) {
      const label = key.replace(/([A-Z])/g, ' $1').replace(/^./, s => s.toUpperCase());
      html += `<span>${label}: ${esc(val)}</span>`;
    }
    html += `</div>`;
  }

  // Exact match
  if (result.found && result.exactMatch) {
    const e = result.exactMatch;
    html += `<div class="section-label" style="margin-top:16px;">Dictionary Match</div>
      <div class="decomp-card" style="border-color:var(--green-dim);">
        <div class="decomp-type">EXACT MATCH FOUND</div>
        <div style="font-family:'Rajdhani',sans-serif;font-size:18px;font-weight:600;color:var(--cyan);">${esc(e.word)}</div>
        <div style="font-size:12px;color:var(--gold);margin-top:2px;">${esc(e.pos || '')}</div>
        <div style="font-size:14px;color:var(--text);margin-top:4px;">${esc((e.definitions || []).join(', '))}</div>
        ${e.etymology ? `<div style="font-size:12px;color:var(--text-dim);margin-top:4px;font-style:italic;">${esc(e.etymology)}</div>` : ''}
      </div>`;
  }

  // Decompositions
  if (result.decompositions && result.decompositions.length) {
    html += `<div class="section-label" style="margin-top:16px;">Possible Decompositions</div>`;
    for (const d of result.decompositions) {
      html += `<div class="decomp-card">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div class="decomp-type">${esc(d.type.replace(/[_+]/g, ' '))}</div>
          <div class="decomp-confidence">
            ${(d.confidence * 100).toFixed(0)}% CONFIDENCE
            <div class="decomp-confidence-bar"><div class="decomp-confidence-fill" style="width:${d.confidence * 100}%"></div></div>
          </div>
        </div>
        <div class="decomp-parts">`;

      for (let pi = 0; pi < d.parts.length; pi++) {
        const part = d.parts[pi];
        if (pi > 0) html += `<span class="decomp-plus">+</span>`;
        html += `<div>
          <span class="decomp-root">${esc(part.root)}</span>
          <span class="decomp-root-meaning">${esc(part.meaning)}</span>
        </div>`;
      }

      if (d.suffix) {
        html += `<span class="decomp-plus">+</span>
          <div>
            <span class="decomp-suffix">-${esc(d.suffix.form)}</span>
            <span class="decomp-root-meaning">${esc(d.suffix.meaning)}</span>
          </div>`;
      }

      html += `</div>
        <div class="decomp-literal">"${esc(d.literal)}"</div>
      </div>`;
    }
  } else if (!result.found) {
    html += `<div class="section-label" style="margin-top:16px;">Decomposition</div>
      <div class="decomp-card" style="border-color:rgba(255,59,59,.2);">
        <div class="decomp-type" style="color:var(--amber);">NO DECOMPOSITION FOUND</div>
        <div style="font-size:13px;color:var(--text-dim);margin-top:4px;">
          This word does not match any known root combinations in the current dictionary.
          It may be a valid neologism, a proper noun, or it may need more roots in the dictionary to decompose.
        </div>
      </div>`;
  }

  container.innerHTML = html;
}

/* ══════════════════════════════════════════
   EVENT WIRING
   ══════════════════════════════════════════ */

function initEvents() {
  // Sidebar word list clicks
  document.getElementById('word-list').addEventListener('click', e => {
    const item = e.target.closest('.dict-item');
    if (!item) return;
    const id = item.dataset.id;
    // Switch to dictionary tab
    switchTab('dictionary');
    viewEntry(id);
  });

  // Sidebar search
  document.getElementById('sb-search').addEventListener('input', renderWordList);

  // Sidebar toggle mode
  document.getElementById('sb-toggles').addEventListener('click', e => {
    const btn = e.target.closest('.sb-toggle');
    if (!btn) return;
    sidebarMode = btn.dataset.mode;
    document.querySelectorAll('#sb-toggles .sb-toggle').forEach(b => b.classList.toggle('active', b === btn));
    renderWordList();
  });

  // Main tab switching
  document.getElementById('main-tabs').addEventListener('click', e => {
    const tab = e.target.closest('.tab');
    if (!tab) return;
    switchTab(tab.dataset.tab);
  });

  // Word Forge
  document.getElementById('wf-generate').addEventListener('click', runWordForge);
  document.getElementById('wf-input').addEventListener('keydown', e => { if (e.key === 'Enter') runWordForge(); });

  // Name Forge
  document.getElementById('nf-generate').addEventListener('click', runNameForge);

  // Translator
  document.getElementById('tr-translate').addEventListener('click', runTranslator);
  document.getElementById('tr-input').addEventListener('keydown', e => { if (e.key === 'Enter') runTranslator(); });

  // Analyzer
  document.getElementById('az-analyze').addEventListener('click', runAnalyzer);
  document.getElementById('az-input').addEventListener('keydown', e => { if (e.key === 'Enter') runAnalyzer(); });

  // Idiom filters
  document.getElementById('idiom-filters').addEventListener('click', e => {
    const btn = e.target.closest('.sb-toggle');
    if (!btn) return;
    idiomFilter = btn.dataset.filter;
    renderPhrases();
  });

  // Save to repo
  document.getElementById('sb-save-repo').addEventListener('click', async () => {
    if (!requireEditor()) return;

    await SGNGitHub.loadConfig();
    if (!SGNGitHub.isAvailable()) {
      toast('GitHub credentials not found in editor.json');
      return;
    }

    const btn = document.getElementById('sb-save-repo');
    const origText = btn.textContent;
    btn.textContent = 'SAVING...';
    btn.disabled = true;

    try {
      // Build full language JSON for export
      const exportData = JSON.parse(JSON.stringify(langData || {}));
      exportData.dictionary = exportData.dictionary || {};
      exportData.dictionary.entries = entries;
      exportData.dictionary.totalEntries = entries.length;

      await SGNGitHub.commitFile('arandori-language.json', JSON.stringify(exportData, null, 2), 'Language: update arandori-language.json');
      toast('arandori-language.json committed to GitHub');
    } catch (err) {
      console.error('GitHub save failed:', err);
      toast('Save failed: ' + err.message);
    } finally {
      btn.textContent = origText;
      btn.disabled = false;
    }
  });

  // Keyboard shortcut: / handled by global search.js
}

function switchTab(tabId) {
  document.querySelectorAll('#main-tabs .tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tabId));
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.toggle('active', p.id === 'pane-' + tabId));

  // Lazy render tabs
  if (tabId === 'phrases') renderPhrases();
}

/* ══════════════════════════════════════════
   INIT
   ══════════════════════════════════════════ */

(async function init() {
  await load();
  renderPhonology();
  renderGrammar();
  renderWordList();
  updateCounts();
  initEvents();

  // Register deep-link handler for global search navigation
  if (window.SGNSearch && SGNSearch.onDeepLink) {
    SGNSearch.onDeepLink(function(params) {
      if (params.word) {
        const target = entries.find(e => e.word.toLowerCase() === params.word.toLowerCase());
        if (target) { switchTab('dictionary'); viewEntry(target.id); }
      } else if (params.phrase) {
        switchTab('phrases');
        renderPhrases();
      }
    });
  }
})();
