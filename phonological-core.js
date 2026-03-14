/* ══════════════════════════════════════════
   SGN — LANGUAGE FORGE · LAYER 1
   Phonological Core
   Sound validation, cluster resolution, stress
   ══════════════════════════════════════════ */

const PhonologicalCore = (() => {

  /* ── Sound inventory ── */
  const CONSONANTS = new Set(['c','d','f','g','h','l','m','n','r','s','t','v','y']);
  const DIGRAPH_CONSONANTS = new Set(['th','ny','ly']);
  const ALL_CONSONANTS = new Set([...CONSONANTS, ...DIGRAPH_CONSONANTS]);
  const VOWELS = new Set(['a','e','ë','i','o','u','û']);
  const DIPHTHONGS = ['ae','ai','au','ea','ei','oi','ui'];
  const FORBIDDEN_SOUNDS = new Set(['x','j','w','z']);
  const ALLOWED_FINALS = new Set(['n','r','l','s','th']);
  const ALLOWED_INITIAL_CLUSTERS = new Set(['th','ny','ly']);
  const FRONT_VOWELS = new Set(['e','ë','i']);
  const BACK_VOWELS = new Set(['o','u','û']);
  const NEUTRAL_VOWELS = new Set(['a']);

  /* ── Helpers ── */
  function isVowel(ch) { return VOWELS.has(ch); }
  function isConsonant(ch) { return CONSONANTS.has(ch); }

  function tokenize(word) {
    const tokens = [];
    let i = 0;
    const w = word.toLowerCase();
    while (i < w.length) {
      // Check digraphs first
      if (i + 1 < w.length) {
        const di = w[i] + w[i+1];
        if (DIGRAPH_CONSONANTS.has(di)) { tokens.push({ type: 'C', val: di }); i += 2; continue; }
        if (DIPHTHONGS.includes(di)) { tokens.push({ type: 'V', val: di }); i += 2; continue; }
      }
      if (VOWELS.has(w[i])) { tokens.push({ type: 'V', val: w[i] }); }
      else if (CONSONANTS.has(w[i])) { tokens.push({ type: 'C', val: w[i] }); }
      else if (w[i] === '-') { tokens.push({ type: 'SEP', val: '-' }); }
      else { tokens.push({ type: '?', val: w[i] }); }
      i++;
    }
    return tokens;
  }

  function syllabify(word) {
    const tokens = tokenize(word);
    const syllables = [];
    let current = '';
    let hasVowel = false;

    for (let i = 0; i < tokens.length; i++) {
      const t = tokens[i];
      if (t.type === 'SEP') {
        if (current) { syllables.push(current); current = ''; hasVowel = false; }
        continue;
      }
      if (t.type === 'V') {
        if (hasVowel) {
          // Start new syllable, potentially pulling back a consonant
          const last = current.length > 0 ? current : '';
          // Check if last char of current is a consonant to pull forward
          const toks = tokenize(last);
          if (toks.length > 1 && toks[toks.length - 1].type === 'C') {
            const onset = toks.pop();
            current = toks.map(x => x.val).join('');
            syllables.push(current);
            current = onset.val + t.val;
          } else {
            syllables.push(current);
            current = t.val;
          }
        } else {
          current += t.val;
        }
        hasVowel = true;
      } else {
        current += t.val;
      }
    }
    if (current) syllables.push(current);
    return syllables;
  }

  /* ── Validation ── */
  function validate(word) {
    const errors = [];
    const w = word.toLowerCase().replace(/[\s']/g, '');
    if (!w.length) return { valid: false, errors: ['Empty input'] };

    // Check forbidden sounds
    for (const ch of w) {
      if (FORBIDDEN_SOUNDS.has(ch)) {
        errors.push(`Forbidden sound '${ch}' is not part of Eldarindëva phonology`);
      }
    }

    // Check for forbidden sequences
    if (/(.)\1{1,}/g.test(w)) {
      const matches = w.match(/(.)\1{1,}/g);
      if (matches) {
        for (const m of matches) {
          const ch = m[0];
          if (VOWELS.has(ch) && ch !== 'ë') {
            errors.push(`Adjacent identical vowels '${m}' are forbidden`);
          }
        }
      }
    }

    // Check word-final consonant
    const tokens = tokenize(w);
    if (tokens.length > 0) {
      const last = tokens[tokens.length - 1];
      if (last.type === 'C' && !ALLOWED_FINALS.has(last.val)) {
        errors.push(`Word cannot end in '${last.val}'; allowed finals: n, r, l, s, th, or a vowel`);
      }
    }

    // Check initial cluster validity
    if (tokens.length >= 2 && tokens[0].type === 'C' && tokens[1].type === 'C') {
      const cluster = tokens[0].val + tokens[1].val;
      if (!ALLOWED_INITIAL_CLUSTERS.has(cluster)) {
        errors.push(`Initial consonant cluster '${cluster}' is not allowed; only th, ny, ly permitted`);
      }
    }

    // Check d placement (only word-initial or after n)
    for (let i = 0; i < w.length; i++) {
      if (w[i] === 'd' && i > 0 && w[i-1] !== 'n') {
        // Check if it's word-initial in a compound... allow if preceded by vowel in compounds
        // Relaxed: d after vowel is acceptable in compounds
      }
    }

    return { valid: errors.length === 0, errors, syllables: syllabify(w) };
  }

  /* ── Vowel harmony check ── */
  function checkVowelHarmony(root) {
    const tokens = tokenize(root);
    const vowels = tokens.filter(t => t.type === 'V').map(t => t.val[0]); // first char of diphthong
    const hasFront = vowels.some(v => FRONT_VOWELS.has(v));
    const hasBack = vowels.some(v => BACK_VOWELS.has(v));
    return {
      harmonic: !(hasFront && hasBack),
      frontDominant: hasFront && !hasBack,
      backDominant: hasBack && !hasFront,
      neutral: !hasFront && !hasBack,
      mixed: hasFront && hasBack
    };
  }

  /* ── Stress assignment ── */
  function assignStress(word) {
    const syls = syllabify(word);
    if (syls.length <= 1) return { syllables: syls, stressIndex: 0 };
    // Words ending in -ë: antepenultimate (3rd from last)
    if (word.endsWith('ë') && syls.length >= 3) {
      return { syllables: syls, stressIndex: syls.length - 3 };
    }
    // Default: penultimate
    return { syllables: syls, stressIndex: Math.max(0, syls.length - 2) };
  }

  /* ── Cluster resolution at compound boundaries ── */
  function resolveCompoundJunction(first, second) {
    const fToks = tokenize(first);
    const sToks = tokenize(second);
    if (!fToks.length || !sToks.length) return first + second;

    const fLast = fToks[fToks.length - 1];
    const sFirst = sToks[0];

    // Consonant + Consonant: insert linking vowel
    if (fLast.type === 'C' && sFirst.type === 'C') {
      const harmony = checkVowelHarmony(first);
      const linker = harmony.backDominant ? 'a' : 'i';
      return first + linker + second;
    }

    // Vowel + Vowel: elide first vowel if same
    if (fLast.type === 'V' && sFirst.type === 'V') {
      if (fLast.val === sFirst.val) {
        return first.slice(0, -fLast.val.length) + second;
      }
      // Different vowels: keep as-is (creates natural flow)
      return first + second;
    }

    // Voicing assimilation: t+v -> lv, s+d -> nd
    if (fLast.val === 't' && sFirst.val === 'v') {
      return first.slice(0, -1) + 'l' + second;
    }
    if (fLast.val === 's' && sFirst.val === 'd') {
      return first.slice(0, -1) + 'n' + second;
    }

    return first + second;
  }

  /* ── Generate IPA approximation ── */
  const IPA_MAP = {
    'a': 'a', 'e': 'ɛ', 'ë': 'ɛ', 'i': 'i', 'o': 'ɔ', 'u': 'u', 'û': 'uː',
    'ae': 'aɛ', 'ai': 'ai', 'au': 'au', 'ea': 'ɛa', 'ei': 'ɛi', 'oi': 'ɔi', 'ui': 'ui',
    'c': 'k', 'd': 'd', 'f': 'f', 'g': 'ɡ', 'h': 'h', 'l': 'l', 'm': 'm',
    'n': 'n', 'ny': 'ɲ', 'r': 'ɾ', 's': 's', 't': 't', 'th': 'θ', 'v': 'v',
    'y': 'j', 'ly': 'ʎ'
  };

  function toIPA(word) {
    const tokens = tokenize(word);
    const stress = assignStress(word);
    const syls = stress.syllables;
    let ipa = '/';
    let sylIdx = 0;
    let posInSyl = 0;

    for (const t of tokens) {
      if (sylIdx === stress.stressIndex && posInSyl === 0 && syls.length > 1) {
        ipa += 'ˈ';
      }
      ipa += IPA_MAP[t.val] || t.val;
      posInSyl += t.val.length;
      // Rough syllable boundary tracking
      const currentSyl = syls[sylIdx] || '';
      if (posInSyl >= currentSyl.length && sylIdx < syls.length - 1) {
        ipa += '.';
        sylIdx++;
        posInSyl = 0;
      }
    }
    ipa += '/';
    return ipa;
  }

  /* ── Euphony scoring ── */
  /* Rates how "Elvish" a word sounds on a 0.0-1.0 scale.
     Rewards: CV alternation, open syllables, vowel-richness,
              diphthong presence, soft consonants (l,r,n,s,v).
     Penalizes: consonant clusters, closed syllables, harsh
                stops in sequence, low vowel ratio. */

  const SOFT_CONSONANTS = new Set(['l','r','n','s','v','m','y','th','ly','ny']);
  const HARSH_PAIRS = [
    ['c','t'],['t','c'],['g','c'],['c','g'],['t','g'],['g','t']
  ];

  function scoreEuphony(word) {
    const w = word.toLowerCase();
    const tokens = tokenize(w);
    if (tokens.length < 2) return { score: 0.5, breakdown: {} };

    const vowelTokens = tokens.filter(t => t.type === 'V');
    const consTokens  = tokens.filter(t => t.type === 'C');
    const totalChars  = w.length;
    const syls = syllabify(w);

    let score = 0.5; // baseline
    const breakdown = {};

    // 1. Vowel ratio (Elvish is vowel-rich; ideal ~55-65% of characters)
    const vowelChars = vowelTokens.reduce((n, t) => n + t.val.length, 0);
    const vowelRatio = vowelChars / totalChars;
    if (vowelRatio >= 0.45 && vowelRatio <= 0.70) {
      const bonus = 0.15 - Math.abs(vowelRatio - 0.58) * 0.5;
      score += Math.max(0, bonus);
      breakdown.vowelRatio = `${(vowelRatio * 100).toFixed(0)}% (+${Math.max(0, bonus).toFixed(2)})`;
    } else {
      const penalty = vowelRatio < 0.35 ? -0.15 : (vowelRatio > 0.80 ? -0.05 : -0.08);
      score += penalty;
      breakdown.vowelRatio = `${(vowelRatio * 100).toFixed(0)}% (${penalty.toFixed(2)})`;
    }

    // 2. CV alternation (how much the token sequence alternates C-V-C-V)
    let alternations = 0;
    for (let i = 1; i < tokens.length; i++) {
      if (tokens[i].type !== tokens[i - 1].type && tokens[i].type !== 'SEP' && tokens[i - 1].type !== 'SEP') {
        alternations++;
      }
    }
    const altRatio = tokens.length > 1 ? alternations / (tokens.length - 1) : 0;
    const altBonus = (altRatio - 0.5) * 0.2; // reward above 50% alternation
    score += altBonus;
    breakdown.alternation = `${(altRatio * 100).toFixed(0)}% (${altBonus >= 0 ? '+' : ''}${altBonus.toFixed(2)})`;

    // 3. Consonant cluster penalty (sequences of 2+ consonant tokens)
    let clusterCount = 0;
    let run = 0;
    for (const t of tokens) {
      if (t.type === 'C') { run++; if (run >= 2) clusterCount++; }
      else { run = 0; }
    }
    const clusterPenalty = clusterCount * -0.08;
    score += clusterPenalty;
    if (clusterCount) breakdown.clusters = `${clusterCount} cluster(s) (${clusterPenalty.toFixed(2)})`;

    // 4. Open syllable bonus (syllables ending in a vowel)
    let openSyls = 0;
    for (const s of syls) {
      const lastChar = s[s.length - 1];
      if (VOWELS.has(lastChar)) openSyls++;
    }
    const openRatio = syls.length > 0 ? openSyls / syls.length : 0;
    const openBonus = (openRatio - 0.4) * 0.12;
    score += openBonus;
    breakdown.openSyllables = `${openSyls}/${syls.length} (${openBonus >= 0 ? '+' : ''}${openBonus.toFixed(2)})`;

    // 5. Soft consonant preference
    let softCount = 0;
    for (const t of consTokens) {
      if (SOFT_CONSONANTS.has(t.val)) softCount++;
    }
    const softRatio = consTokens.length > 0 ? softCount / consTokens.length : 1;
    const softBonus = (softRatio - 0.5) * 0.1;
    score += softBonus;
    breakdown.softConsonants = `${(softRatio * 100).toFixed(0)}% (${softBonus >= 0 ? '+' : ''}${softBonus.toFixed(2)})`;

    // 6. Harsh consonant pair penalty
    let harshPairs = 0;
    for (let i = 1; i < tokens.length; i++) {
      if (tokens[i].type === 'C' && tokens[i - 1].type === 'C') {
        for (const [a, b] of HARSH_PAIRS) {
          if (tokens[i - 1].val === a && tokens[i].val === b) { harshPairs++; break; }
        }
      }
    }
    if (harshPairs) {
      const hp = harshPairs * -0.1;
      score += hp;
      breakdown.harshPairs = `${harshPairs} (${hp.toFixed(2)})`;
    }

    // 7. Diphthong bonus (signature Arandori sound)
    const diphCount = vowelTokens.filter(t => t.val.length >= 2).length;
    if (diphCount > 0) {
      const db = Math.min(diphCount * 0.04, 0.1);
      score += db;
      breakdown.diphthongs = `${diphCount} (+${db.toFixed(2)})`;
    }

    // 8. Syllable count sweet spot (2-4 syllables is ideal for Elvish)
    if (syls.length >= 2 && syls.length <= 4) {
      score += 0.03;
      breakdown.syllableCount = `${syls.length} (+0.03)`;
    } else if (syls.length > 5) {
      score -= 0.04;
      breakdown.syllableCount = `${syls.length} (-0.04)`;
    }

    // Clamp to 0.0-1.0
    score = Math.max(0, Math.min(1, score));

    return {
      score: Math.round(score * 100) / 100,
      grade: score >= 0.75 ? 'excellent' : score >= 0.55 ? 'good' : score >= 0.40 ? 'fair' : 'poor',
      breakdown
    };
  }

  /* ── Reverse decomposition ──
     Given an unknown Elvish word, attempt to break it into known roots.
     Returns all plausible decompositions with meaning guesses. */

  function decomposeWord(word, knownRoots) {
    const w = word.toLowerCase();
    const results = [];

    // Strip known suffixes first to find the compound core
    const KNOWN_SUFFIXES = [
      { form: 'rindë', meaning: 'kindred/folk' },
      { form: 'ëva', meaning: 'speech of/pertaining to' },
      { form: 'va', meaning: 'pertaining to' },
      { form: 'arion', meaning: 'great bearer' },
      { form: 'ion', meaning: 'son of/bearer' },
      { form: 'iel', meaning: 'daughter of/maiden' },
      { form: 'ithiel', meaning: 'maiden of (formal)' },
      { form: 'ndor', meaning: 'realm of' },
      { form: 'dor', meaning: 'realm/land' },
      { form: 'ath', meaning: 'collective totality' },
      { form: 'essë', meaning: 'at/in (locative)' },
      { form: 'ello', meaning: 'from (ablative)' },
      { form: 'inen', meaning: 'by means of' },
      { form: 'ëa', meaning: 'having quality of (adj)' },
      { form: 'ea', meaning: 'having quality of (adj)' },
      { form: 'in', meaning: 'quality (adj)' },
      { form: 'no', meaning: 'agent (one who)' },
      { form: 'ro', meaning: 'agent (one who)' },
      { form: 'lë', meaning: 'abstract quality' },
      { form: 'ta', meaning: 'verbal/to make' },
      { form: 'ë', meaning: 'nominalizer' },
      { form: 'or', meaning: 'of (genitive)' },
      { form: 'en', meaning: 'to/for (dative)' },
      { form: 'a', meaning: 'object (accusative) / noun form' },
      { form: 'on', meaning: 'concrete entity' },
      { form: 'ar', meaning: 'agent/instrument' }
    ];

    // Sort by length descending so we try longest suffixes first
    const sortedSuffixes = KNOWN_SUFFIXES.slice().sort((a, b) => b.form.length - a.form.length);

    // Build root lookup (word -> entry)
    const rootMap = new Map();
    for (const r of knownRoots) {
      rootMap.set(r.word.toLowerCase(), r);
    }

    // Strategy 1: Direct dictionary match
    if (rootMap.has(w)) {
      const r = rootMap.get(w);
      results.push({
        type: 'exact',
        parts: [{ root: r.word, meaning: r.definitions[0] }],
        suffix: null,
        confidence: 1.0,
        literal: r.definitions[0]
      });
    }

    // Strategy 2: Root + suffix
    for (const suf of sortedSuffixes) {
      if (w.endsWith(suf.form) && w.length > suf.form.length) {
        const stem = w.slice(0, w.length - suf.form.length);
        // Direct stem match
        if (rootMap.has(stem)) {
          const r = rootMap.get(stem);
          results.push({
            type: 'root+suffix',
            parts: [{ root: r.word, meaning: r.definitions[0] }],
            suffix: { form: suf.form, meaning: suf.meaning },
            confidence: 0.9,
            literal: `${r.definitions[0]} + ${suf.meaning}`
          });
        }
        // Stem might have linking vowel stripped
        if (stem.length > 1) {
          const stemNoLink = stem.replace(/[ai]$/, '');
          if (stemNoLink.length >= 2 && rootMap.has(stemNoLink)) {
            const r = rootMap.get(stemNoLink);
            results.push({
              type: 'root+link+suffix',
              parts: [{ root: r.word, meaning: r.definitions[0] }],
              suffix: { form: suf.form, meaning: suf.meaning },
              confidence: 0.7,
              literal: `${r.definitions[0]} + ${suf.meaning}`
            });
          }
        }
      }
    }

    // Strategy 3: Two-root compound (sliding split point)
    for (let splitAt = 2; splitAt <= w.length - 2; splitAt++) {
      let left = w.slice(0, splitAt);
      let right = w.slice(splitAt);

      // Try with and without stripping linking vowels
      const leftVariants = [left];
      if (left.endsWith('a') || left.endsWith('i')) {
        leftVariants.push(left.slice(0, -1));
      }
      const rightVariants = [right];

      for (const lv of leftVariants) {
        for (const rv of rightVariants) {
          if (lv.length < 2 || rv.length < 2) continue;
          const lRoot = rootMap.get(lv);
          const rRoot = rootMap.get(rv);

          if (lRoot && rRoot) {
            results.push({
              type: 'compound',
              parts: [
                { root: lRoot.word, meaning: lRoot.definitions[0] },
                { root: rRoot.word, meaning: rRoot.definitions[0] }
              ],
              suffix: null,
              confidence: 0.85,
              literal: `${lRoot.definitions[0]}-${rRoot.definitions[0]}`
            });
          }

          // Right side might itself have a suffix
          if (lRoot && !rRoot) {
            for (const suf of sortedSuffixes) {
              if (rv.endsWith(suf.form) && rv.length > suf.form.length) {
                const rStem = rv.slice(0, rv.length - suf.form.length);
                const rStemRoot = rootMap.get(rStem);
                if (rStemRoot) {
                  results.push({
                    type: 'compound+suffix',
                    parts: [
                      { root: lRoot.word, meaning: lRoot.definitions[0] },
                      { root: rStemRoot.word, meaning: rStemRoot.definitions[0] }
                    ],
                    suffix: { form: suf.form, meaning: suf.meaning },
                    confidence: 0.75,
                    literal: `${lRoot.definitions[0]}-${rStemRoot.definitions[0]} + ${suf.meaning}`
                  });
                }
              }
            }
          }
        }
      }
    }

    // Deduplicate by literal meaning
    const seen = new Set();
    const unique = results.filter(r => {
      const key = r.parts.map(p => p.root).join('+') + (r.suffix?.form || '');
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    unique.sort((a, b) => b.confidence - a.confidence);
    return unique.slice(0, 8);
  }

  /* ── Public API ── */
  return {
    validate,
    syllabify,
    assignStress,
    checkVowelHarmony,
    resolveCompoundJunction,
    toIPA,
    tokenize,
    isVowel,
    isConsonant,
    scoreEuphony,
    decomposeWord,
    VOWELS,
    CONSONANTS,
    ALLOWED_FINALS,
    FRONT_VOWELS,
    BACK_VOWELS
  };

})();

if (typeof window !== 'undefined') window.PhonologicalCore = PhonologicalCore;
