/* ══════════════════════════════════════════
   SGN — LANGUAGE FORGE · LAYER 5
   Cultural / Idiom Layer
   Idioms, register, metaphor engine
   ══════════════════════════════════════════ */

const CulturalLayer = (() => {

  /* ── Register definitions ── */
  const REGISTERS = {
    casual:   { label: 'Casual',   order: 'VSO', desc: 'Everyday speech: shorter words, contractions', color: 'var(--green)' },
    formal:   { label: 'Formal',   order: 'SOV', desc: 'Full forms, honorific prefixes, diplomatic address', color: 'var(--cyan)' },
    military: { label: 'Military', order: 'SOV', desc: 'Clipped imperatives, standardized commands, rank-prefixed', color: 'var(--red-alert)' },
    poetic:   { label: 'Poetic',   order: 'free', desc: 'Free word order, archaic vocabulary, extended compounds', color: 'var(--purple)' },
    sacred:   { label: 'Sacred',   order: 'SOV', desc: 'Reserved vocabulary, ceremonial contexts only', color: 'var(--gold)' }
  };

  /* ── Idiom bank ── */
  const IDIOMS = [
    // Greetings
    {
      id: 'IDM001',
      elvish: 'Elen síla lúmenna',
      literal: 'Star shines upon-hour-your',
      meaning: 'A star shines upon the hour of our meeting',
      register: 'formal',
      theme: 'greeting',
      notes: 'The most common formal greeting. Used when meeting someone of equal or higher rank.'
    },
    {
      id: 'IDM002',
      elvish: 'Namárië',
      literal: 'Be-well',
      meaning: 'Farewell',
      register: 'casual',
      theme: 'farewell',
      notes: 'Warm, affectionate farewell. Appropriate among friends and family.'
    },
    {
      id: 'IDM003',
      elvish: 'Ú-mahta, sérë na le',
      literal: 'Not-fight, peace to you',
      meaning: 'We come in peace',
      register: 'formal',
      theme: 'greeting',
      notes: 'Diplomatic greeting. Used at first contact or treaty negotiations.'
    },

    // Blessings
    {
      id: 'IDM004',
      elvish: 'Na vardalum le tirnuva',
      literal: 'May sacred-light you guard-will',
      meaning: 'May the sacred light guard you',
      register: 'sacred',
      theme: 'blessing',
      notes: 'A priestly blessing, invoking the protection of Vardalum. Used at departures, before battle, and at ceremonies.'
    },
    {
      id: 'IDM005',
      elvish: 'Ael calima or le síla',
      literal: 'Star bright upon you shines',
      meaning: 'May a bright star shine upon you',
      register: 'formal',
      theme: 'blessing',
      notes: 'A general well-wishing used between friends and allies.'
    },
    {
      id: 'IDM006',
      elvish: 'Fëa le na sérëssë',
      literal: 'Soul your at peace-in',
      meaning: 'May your soul find peace',
      register: 'sacred',
      theme: 'blessing',
      notes: 'Spoken over the dead or dying. A final benediction.'
    },

    // Military commands
    {
      id: 'IDM007',
      elvish: 'Tirno i rimba',
      literal: 'Guard-command the fleet',
      meaning: 'Guard the fleet!',
      register: 'military',
      theme: 'command',
      notes: 'Standard fleet defense order.'
    },
    {
      id: 'IDM008',
      elvish: 'Hasta an i aeleni',
      literal: 'Sail toward the stars',
      meaning: 'Set course for the stars / Depart',
      register: 'military',
      theme: 'command',
      notes: 'Naval command to begin void-travel. Also used poetically for death.'
    },
    {
      id: 'IDM009',
      elvish: 'Hosta i ohtar',
      literal: 'Gather the warriors',
      meaning: 'Muster the troops',
      register: 'military',
      theme: 'command',
      notes: 'Assembly order. Pre-battle preparation.'
    },
    {
      id: 'IDM010',
      elvish: 'Ortao thalon',
      literal: 'Rise-command shields',
      meaning: 'Raise shields!',
      register: 'military',
      theme: 'command',
      notes: 'Defensive order. Used both in ground combat and void-warfare (activate shields).'
    },
    {
      id: 'IDM011',
      elvish: 'Alcar i Arandorë',
      literal: 'Glory the High-Realm',
      meaning: 'Glory to the High Realm',
      register: 'military',
      theme: 'salute',
      notes: 'Patriotic salute and battle cry. Spoken with fist to heart.'
    },

    // Proverbs
    {
      id: 'IDM012',
      elvish: 'Estel ná',
      literal: 'Hope is',
      meaning: 'There is hope / Hope endures',
      register: 'casual',
      theme: 'proverb',
      notes: 'Simple affirmation. Spoken in dark times as reassurance.'
    },
    {
      id: 'IDM013',
      elvish: 'Na aelin i fëa',
      literal: 'At still-water the soul',
      meaning: 'The soul finds its still water',
      register: 'poetic',
      theme: 'proverb',
      notes: 'About inner peace. A reminder that tranquility comes from within.'
    },
    {
      id: 'IDM014',
      elvish: 'Mor ú-ná naur; cala ú-ná var',
      literal: 'Shadow not-is fire; light not-is eternal',
      meaning: 'Shadow is not evil; light does not last forever',
      register: 'poetic',
      theme: 'proverb',
      notes: 'Core Arandori philosophical tenet. Shadow and light are both natural and necessary.'
    },
    {
      id: 'IDM015',
      elvish: 'I galadh tulca lindala mi vael',
      literal: 'The tree strong sings-continuous in wind',
      meaning: 'The strong tree sings in the wind',
      register: 'poetic',
      theme: 'proverb',
      notes: 'About resilience. Strength is not rigidity but the ability to endure and find beauty in adversity.'
    },
    {
      id: 'IDM016',
      elvish: 'Vesta hauria, fëa lanta',
      literal: 'Oath breaks, soul falls',
      meaning: 'When an oath breaks, the soul falls',
      register: 'formal',
      theme: 'proverb',
      notes: 'Warning against oath-breaking. The Arandori consider broken vows a spiritual wound.'
    },

    // Questions / Reporting
    {
      id: 'IDM017',
      elvish: 'Mana cental?',
      literal: 'What speak-you?',
      meaning: 'What do you say? / What is your report?',
      register: 'military',
      theme: 'question',
      notes: 'Standard request for a status report.'
    },
    {
      id: 'IDM018',
      elvish: 'Man tiral?',
      literal: 'Who watches?',
      meaning: 'Who has the watch? / Who stands guard?',
      register: 'military',
      theme: 'question',
      notes: 'Watch rotation query aboard ship.'
    },

    // Oaths & Ceremonies
    {
      id: 'IDM019',
      elvish: 'Ni vesta or i aeleni ar i vardalum',
      literal: 'I swear upon the stars and the sacred-light',
      meaning: 'I swear by the stars and the sacred light',
      register: 'sacred',
      theme: 'oath',
      notes: 'The most binding oath in Arandori culture. Cannot be spoken lightly.'
    },
    {
      id: 'IDM020',
      elvish: 'Oialë tirnuvalmlë',
      literal: 'Forever guard-will-we',
      meaning: 'We shall guard forever',
      register: 'military',
      theme: 'oath',
      notes: 'The oath of the fleet. Spoken at commissioning ceremonies.'
    }
  ];

  /* ── Query functions ── */

  function getIdiomsByTheme(theme) {
    return IDIOMS.filter(i => i.theme === theme);
  }

  function getIdiomsByRegister(register) {
    return IDIOMS.filter(i => i.register === register);
  }

  function searchIdioms(query) {
    const q = query.toLowerCase();
    return IDIOMS.filter(i =>
      i.elvish.toLowerCase().includes(q) ||
      i.meaning.toLowerCase().includes(q) ||
      i.literal.toLowerCase().includes(q) ||
      i.theme.includes(q) ||
      i.register.includes(q)
    );
  }

  function getRegister(name) {
    return REGISTERS[name] || null;
  }

  function allIdioms() { return IDIOMS; }
  function allRegisters() { return REGISTERS; }

  function getThemes() {
    const themes = new Set(IDIOMS.map(i => i.theme));
    return Array.from(themes).sort();
  }

  /* ── Metaphor engine integration ── */
  function applyMetaphorBias(concept, rootCandidates) {
    const SN = window.SemanticNetwork;
    const metaphor = SN.getMetaphor(concept);
    if (!metaphor) return rootCandidates;

    // Boost roots that align with the cultural metaphor
    return rootCandidates.map(r => ({
      ...r,
      score: (r.score || 0) + (metaphor.roots.includes(r.word) ? 0.5 : 0)
    })).sort((a, b) => b.score - a.score);
  }

  /* ── Register-aware word order ── */
  function applyWordOrder(parts, register) {
    const reg = REGISTERS[register];
    if (!reg || !parts.subject || !parts.verb || !parts.object) return null;

    switch (reg.order) {
      case 'VSO': return [parts.verb, parts.subject, parts.object];
      case 'SOV': return [parts.subject, parts.object, parts.verb];
      case 'free': return [parts.subject, parts.verb, parts.object]; // default for display
      default: return [parts.verb, parts.subject, parts.object];
    }
  }

  /* ── Public API ── */
  return {
    REGISTERS,
    IDIOMS,
    getIdiomsByTheme,
    getIdiomsByRegister,
    searchIdioms,
    getRegister,
    allIdioms,
    allRegisters,
    getThemes,
    applyMetaphorBias,
    applyWordOrder
  };

})();

if (typeof window !== 'undefined') window.CulturalLayer = CulturalLayer;
