/* ══════════════════════════════════════════
   SGN — LANGUAGE FORGE · LAYER 2
   Morphological Engine
   Inflection, derivation, compound formation
   ══════════════════════════════════════════ */

const MorphologicalEngine = (() => {

  const PC = () => window.PhonologicalCore;

  /* ── Helpers ── */
  function endsInVowel(w) { return PC().VOWELS.has(w[w.length - 1]); }
  function endsInConsonant(w) { return !endsInVowel(w); }
  function stripFinalVowel(w) {
    if (endsInVowel(w)) return w.slice(0, -1);
    // Handle diaeresis ë
    if (w.endsWith('ë')) return w.slice(0, -1);
    return w;
  }
  function stemFor(w) {
    // Remove final -ë, -a, -o, -e for suffixing
    if (w.endsWith('ë') || w.endsWith('a') || w.endsWith('o') || w.endsWith('e')) {
      return w.slice(0, -1);
    }
    return w;
  }

  /* ══════════════════════════════════
     NOUN OPERATIONS
     ══════════════════════════════════ */

  const CASES = {
    nominative:   { suffix: '',      label: 'Nominative', desc: 'Subject (unmarked)' },
    accusative:   { suffix: 'a',     label: 'Accusative', desc: 'Direct object' },
    genitive:     { suffix: 'or',    label: 'Genitive', desc: 'Possession/origin' },
    dative:       { suffix: 'en',    label: 'Dative', desc: 'Indirect object' },
    locative:     { suffix: 'essë',  label: 'Locative', desc: 'Location (at/in)' },
    ablative:     { suffix: 'ello',  label: 'Ablative', desc: 'Motion from' },
    instrumental: { suffix: 'inen',  label: 'Instrumental', desc: 'By means of' }
  };

  function declineNoun(stem, caseName) {
    const c = CASES[caseName];
    if (!c) return stem;
    if (caseName === 'nominative') return stem;

    const suffix = c.suffix;
    if (endsInVowel(stem)) {
      // Vowel-final: may need to adjust
      if (suffix[0] && PC().isVowel(suffix[0])) {
        // Elide if both vowels
        return stemFor(stem) + suffix;
      }
      return stem + suffix;
    }
    // Consonant-final: add directly
    return stem + suffix;
  }

  function declineAll(stem) {
    const result = {};
    for (const [name, info] of Object.entries(CASES)) {
      result[name] = { form: declineNoun(stem, name), ...info };
    }
    return result;
  }

  /* ── Plurals ── */
  function pluralize(word, type = 'standard') {
    if (type === 'collective') {
      return endsInVowel(word) ? stripFinalVowel(word) + 'ath' : word + 'ath';
    }
    if (type === 'dual') {
      return endsInVowel(word) ? stripFinalVowel(word) + 'at' : word + 'at';
    }
    // Standard plural -i
    if (word.endsWith('a')) return word.slice(0, -1) + 'ai';
    if (word.endsWith('ë')) return word.slice(0, -1) + 'i';
    if (word.endsWith('e')) return word.slice(0, -1) + 'i';
    if (endsInVowel(word)) return word + 'i';
    return word + 'i';
  }

  /* ── Possessives ── */
  const POSSESSIVE = {
    '1s': 'nya', '2s': 'lya', '3s': 'rya'
  };

  function possessive(word, person) {
    const suffix = POSSESSIVE[person];
    if (!suffix) return word;
    if (endsInVowel(word)) return stripFinalVowel(word) + suffix;
    return word + suffix;
  }

  /* ══════════════════════════════════
     VERB OPERATIONS
     ══════════════════════════════════ */

  const TENSES = {
    present:      { suffix: 'a',   label: 'Present' },
    past:         { suffix: 'ië',  label: 'Past' },
    future:       { suffix: 'uva', label: 'Future' },
    imperative:   { suffix: 'o',   label: 'Imperative' },
    continuative: { suffix: 'ala', label: 'Continuative' }
  };

  const PERSON_SUFFIXES = {
    '1s':  'n',    // I
    '2s':  'l',    // you
    '3s':  '',     // he/she
    '1p':  'lmë',  // we
    '2p':  'ldë',  // you all
    '3p':  'ntë'   // they
  };

  function conjugate(root, tense, person = '3s') {
    const t = TENSES[tense];
    if (!t) return root;
    let stem = root;
    // If root ends in vowel, adjust for tense suffix
    if (endsInVowel(root) && t.suffix[0] && PC().isVowel(t.suffix[0])) {
      stem = stripFinalVowel(root);
    }
    let form = stem + t.suffix;
    // Add person suffix
    const pSuffix = PERSON_SUFFIXES[person] || '';
    if (pSuffix) form += pSuffix;
    return form;
  }

  function negate(verbForm) {
    return 'ú' + verbForm;
  }

  function conjugateAll(root) {
    const result = {};
    for (const [tense, info] of Object.entries(TENSES)) {
      result[tense] = {};
      for (const [person, suffix] of Object.entries(PERSON_SUFFIXES)) {
        result[tense][person] = {
          form: conjugate(root, tense, person),
          label: `${info.label} ${person}`,
          negated: negate(conjugate(root, tense, person))
        };
      }
    }
    return result;
  }

  /* ══════════════════════════════════
     DERIVATION
     ══════════════════════════════════ */

  const DERIVATIONS = {
    'noun_to_adj_ea':  { suffix: 'ëa',   desc: 'noun → adjective (having quality of)', example: 'morëa (shadowy)' },
    'noun_to_adj_in':  { suffix: 'in',    desc: 'noun → adjective (enduring quality)', example: 'valin (eternal)' },
    'verb_to_agent_no': { suffix: 'no',   desc: 'verb → agent noun', example: 'tirno (guardian)' },
    'verb_to_agent_ro': { suffix: 'ro',   desc: 'verb → agent noun (alt)', example: 'centro (speaker)' },
    'adj_to_abstract':  { suffix: 'lë',   desc: 'adjective → abstract noun', example: 'vanyalë (the quality of beauty)' },
    'noun_to_verb':     { suffix: 'ta',   desc: 'noun → verb (to make/do)', example: 'osta (to fortify)' },
    'comparative':      { prefix: 'ari',  desc: 'comparative (more X)', example: 'arivaelin (more beautiful)' },
    'superlative':      { prefix: 'amba', desc: 'superlative (most X)', example: 'ambavaelin (most beautiful)' }
  };

  function derive(word, operation) {
    const d = DERIVATIONS[operation];
    if (!d) return word;
    if (d.prefix) return d.prefix + word;
    if (d.suffix) {
      const stem = endsInVowel(word) ? stripFinalVowel(word) : word;
      return stem + d.suffix;
    }
    return word;
  }

  /* ══════════════════════════════════
     COMPOUND FORMATION
     ══════════════════════════════════ */

  const COMPOUND_SUFFIXES = {
    'ion':    { form: 'ion',     desc: 'son of / bearer of',    example: 'calarion' },
    'arion':  { form: 'arion',   desc: 'great bearer of',       example: 'calarion' },
    'iel':    { form: 'iel',     desc: 'daughter of / maiden of', example: 'eleniel' },
    'ithiel': { form: 'ithiel',  desc: 'maiden of (formal)',    example: 'elenithiel' },
    'ndor':   { form: 'ndor',    desc: 'land of / realm of',    example: 'arandor' },
    'dor':    { form: 'dor',     desc: 'realm of (after vowel)', example: 'arandor' },
    'rindë':  { form: 'rindë',   desc: 'kindred / people / folk', example: 'eldarindë' },
    'va':     { form: 'va',      desc: 'speech of / pertaining to', example: 'Eldarindëva' },
    'ëva':    { form: 'ëva',     desc: 'speech of (formal)',    example: 'Eldarindëva' },
    'ath':    { form: 'ath',     desc: 'collective totality',    example: 'elenath' }
  };

  function compound(first, second) {
    return PC().resolveCompoundJunction(first, second);
  }

  function addSuffix(word, suffixKey) {
    const s = COMPOUND_SUFFIXES[suffixKey];
    if (!s) return word;
    if (endsInVowel(word) && s.form[0] && PC().isVowel(s.form[0])) {
      return stripFinalVowel(word) + s.form;
    }
    if (endsInConsonant(word) && s.form[0] && PC().isConsonant(s.form[0])) {
      // Insert linking vowel
      return word + 'a' + s.form;
    }
    return word + s.form;
  }

  /* ── Public API ── */
  return {
    CASES,
    TENSES,
    PERSON_SUFFIXES,
    DERIVATIONS,
    COMPOUND_SUFFIXES,
    declineNoun,
    declineAll,
    pluralize,
    possessive,
    conjugate,
    conjugateAll,
    negate,
    derive,
    compound,
    addSuffix,
    stemFor,
    endsInVowel,
    endsInConsonant
  };

})();

if (typeof window !== 'undefined') window.MorphologicalEngine = MorphologicalEngine;
