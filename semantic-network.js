/* ══════════════════════════════════════════
   SGN — LANGUAGE FORGE · LAYER 3
   Semantic Network
   Concept graph, cultural metaphors, root mapping
   ══════════════════════════════════════════ */

const SemanticNetwork = (() => {

  /* ── Concept taxonomy ── */
  const CATEGORIES = {
    'nature':       { label: 'Nature & Elements', color: 'var(--green)' },
    'celestial':    { label: 'Celestial', color: 'var(--cyan)' },
    'emotion':      { label: 'Emotion & State', color: 'var(--purple)' },
    'social':       { label: 'Social & Political', color: 'var(--gold)' },
    'military':     { label: 'Military & Naval', color: 'var(--red-alert)' },
    'knowledge':    { label: 'Knowledge & Craft', color: 'var(--slate)' },
    'time':         { label: 'Time & Season', color: 'var(--amber)' },
    'spirit':       { label: 'Body & Spirit', color: 'var(--purple)' },
    'technology':   { label: 'Technology & Space', color: 'var(--cyan)' },
    'architecture': { label: 'Architecture', color: 'var(--gold)' }
  };

  /* ── Concept nodes with root associations ── */
  const CONCEPTS = [
    // Nature & Elements
    { id: 'sky',       cat: 'nature',    roots: ['aer'], weight: 1.0 },
    { id: 'water',     cat: 'nature',    roots: ['nén','uin','lin'], weight: 1.0 },
    { id: 'earth',     cat: 'nature',    roots: ['nor','ondo'], weight: 1.0 },
    { id: 'fire',      cat: 'nature',    roots: ['naur'], weight: 1.0 },
    { id: 'forest',    cat: 'nature',    roots: ['taur','sylva','galadh'], weight: 1.0 },
    { id: 'stone',     cat: 'nature',    roots: ['ondo'], weight: 0.9 },
    { id: 'wind',      cat: 'nature',    roots: ['vael'], weight: 1.0 },
    { id: 'flower',    cat: 'nature',    roots: ['loth'], weight: 0.9 },
    { id: 'tree',      cat: 'nature',    roots: ['galadh','alda'], weight: 1.0 },
    { id: 'mist',      cat: 'nature',    roots: ['fanya'], weight: 0.8 },
    { id: 'ocean',     cat: 'nature',    roots: ['uin','eärë'], weight: 1.0 },
    { id: 'lake',      cat: 'nature',    roots: ['aelin'], weight: 0.9 },
    { id: 'silver',    cat: 'nature',    roots: ['sil'], weight: 0.9 },

    // Celestial
    { id: 'star',      cat: 'celestial', roots: ['ael','elen'], weight: 1.0 },
    { id: 'sun',       cat: 'celestial', roots: ['anor','aurë'], weight: 1.0 },
    { id: 'moon',      cat: 'celestial', roots: ['ithil','sil'], weight: 1.0 },
    { id: 'light',     cat: 'celestial', roots: ['cal','cala','silmë'], weight: 1.0 },
    { id: 'shadow',    cat: 'celestial', roots: ['mor','morë'], weight: 1.0 },
    { id: 'starlight', cat: 'celestial', roots: ['silmë','ael','cal'], weight: 0.9 },
    { id: 'dawn',      cat: 'celestial', roots: ['anarë','aurë'], weight: 0.9 },
    { id: 'dusk',      cat: 'celestial', roots: ['andúnë','lómë'], weight: 0.9 },
    { id: 'void',      cat: 'celestial', roots: ['mor','umbra'], weight: 0.7 },

    // Emotion & State
    { id: 'love',      cat: 'emotion',   roots: ['mel','melda'], weight: 1.0 },
    { id: 'grief',     cat: 'emotion',   roots: ['lin','lanta','mor'], weight: 0.8, metaphor: 'fading song' },
    { id: 'hope',      cat: 'emotion',   roots: ['estel','ael','cal'], weight: 1.0, metaphor: 'starlight' },
    { id: 'peace',     cat: 'emotion',   roots: ['sérë','aelin'], weight: 1.0, metaphor: 'still water' },
    { id: 'courage',   cat: 'emotion',   roots: ['tulca','cal'], weight: 0.9, metaphor: 'steady flame' },
    { id: 'fear',      cat: 'emotion',   roots: ['mor','umbra'], weight: 0.7 },
    { id: 'wonder',    cat: 'emotion',   roots: ['elen','vanye'], weight: 0.8 },
    { id: 'beauty',    cat: 'emotion',   roots: ['vanye','vanya','loth'], weight: 1.0 },
    { id: 'rage',      cat: 'emotion',   roots: ['naur','val'], weight: 0.7 },

    // Social & Political
    { id: 'loyalty',   cat: 'social',    roots: ['vesta','nil'], weight: 0.9 },
    { id: 'betrayal',  cat: 'social',    roots: ['vesta','mor'], weight: 0.8, metaphor: 'broken oath' },
    { id: 'sovereignty', cat: 'social',  roots: ['aran','tara','heru'], weight: 1.0 },
    { id: 'exile',     cat: 'social',    roots: ['othar','rima'], weight: 0.7 },
    { id: 'justice',   cat: 'social',    roots: ['hérë','cal'], weight: 0.8 },
    { id: 'alliance',  cat: 'social',    roots: ['nilmë','vesta'], weight: 0.8 },
    { id: 'honor',     cat: 'social',    roots: ['cal','aran'], weight: 0.9, metaphor: 'bright name' },
    { id: 'home',      cat: 'social',    roots: ['thal','cal','dorë'], weight: 0.9, metaphor: 'sheltered light' },

    // Military & Naval
    { id: 'battle',    cat: 'military',  roots: ['mahta','ohtar'], weight: 1.0 },
    { id: 'fleet',     cat: 'military',  roots: ['rimba','cirya'], weight: 1.0 },
    { id: 'command',   cat: 'military',  roots: ['heru','cáno'], weight: 0.9 },
    { id: 'guard',     cat: 'military',  roots: ['tir','thal'], weight: 1.0 },
    { id: 'victory',   cat: 'military',  roots: ['alcar','cal','val'], weight: 0.9 },
    { id: 'defeat',    cat: 'military',  roots: ['lanta','mor'], weight: 0.7 },
    { id: 'shield',    cat: 'military',  roots: ['thal','thalon'], weight: 1.0 },
    { id: 'sword',     cat: 'military',  roots: ['macil'], weight: 0.9 },
    { id: 'ship',      cat: 'military',  roots: ['cirya'], weight: 1.0 },
    { id: 'war',       cat: 'military',  roots: ['mor','uin','ohtar'], weight: 0.8, metaphor: 'shadow-tide' },
    { id: 'voyage',    cat: 'military',  roots: ['hasta','cirya','ael'], weight: 0.9 },

    // Knowledge & Craft
    { id: 'wisdom',    cat: 'knowledge', roots: ['nolmë','saila','tir'], weight: 1.0, metaphor: 'deep seeing' },
    { id: 'lore',      cat: 'knowledge', roots: ['nolmë','ista'], weight: 0.9 },
    { id: 'craft',     cat: 'knowledge', roots: ['dalë'], weight: 1.0 },
    { id: 'song',      cat: 'knowledge', roots: ['lin','lindalë','linda'], weight: 1.0 },
    { id: 'art',       cat: 'knowledge', roots: ['dalë','vanye'], weight: 0.8 },
    { id: 'prophecy',  cat: 'knowledge', roots: ['tir','ael','cal'], weight: 0.7 },

    // Time & Season
    { id: 'summer',    cat: 'time',      roots: ['lairë'], weight: 0.9 },
    { id: 'winter',    cat: 'time',      roots: ['hrívë'], weight: 0.9 },
    { id: 'autumn',    cat: 'time',      roots: ['yavië'], weight: 0.9 },
    { id: 'spring',    cat: 'time',      roots: ['tuili'], weight: 0.9 },
    { id: 'night',     cat: 'time',      roots: ['lómë','mor'], weight: 0.9 },
    { id: 'day',       cat: 'time',      roots: ['aurë','anor'], weight: 0.9 },
    { id: 'eternity',  cat: 'time',      roots: ['var','oialë'], weight: 1.0 },

    // Body & Spirit
    { id: 'soul',      cat: 'spirit',    roots: ['fëa'], weight: 1.0 },
    { id: 'body',      cat: 'spirit',    roots: ['hroa'], weight: 1.0 },
    { id: 'death',     cat: 'spirit',    roots: ['hasta','oialë','lanta'], weight: 0.8, metaphor: 'the long sailing' },
    { id: 'life',      cat: 'spirit',    roots: ['cuivë','fëa'], weight: 0.9 },
    { id: 'healing',   cat: 'spirit',    roots: ['sérë','cal'], weight: 0.8 },

    // Architecture
    { id: 'tower',     cat: 'architecture', roots: ['mina'], weight: 1.0 },
    { id: 'fortress',  cat: 'architecture', roots: ['osto'], weight: 1.0 },
    { id: 'gate',      cat: 'architecture', roots: ['ando'], weight: 0.8 },
    { id: 'realm',     cat: 'architecture', roots: ['dorë','arandorë'], weight: 1.0 },
    { id: 'harbor',    cat: 'architecture', roots: ['cirya','aelin'], weight: 0.7 }
  ];

  /* ── Cultural metaphor mappings ── */
  const METAPHORS = {
    'hope':     { roots: ['ael','cal'],     literal: 'starlight',          desc: 'Hope is equated with the light of stars; to hope is to see stars in darkness' },
    'peace':    { roots: ['aelin','sérë'],  literal: 'still water',        desc: 'Peace is a lake without ripple, reflecting the stars perfectly' },
    'courage':  { roots: ['tulca','cal'],   literal: 'steady flame',       desc: 'Courage is fire that does not flicker or waver' },
    'grief':    { roots: ['lin','lanta'],    literal: 'fading song',        desc: 'Grief is a beautiful song that trails away into silence' },
    'betrayal': { roots: ['vesta','mor'],   literal: 'broken oath',        desc: 'Betrayal is the shadow that falls when an oath is shattered' },
    'death':    { roots: ['hasta','oialë'], literal: 'the long sailing',   desc: 'Death is a voyage with no charted return, sailing beyond the known void' },
    'wisdom':   { roots: ['nol','tir'],     literal: 'deep seeing',        desc: 'Wisdom is the ability to see beneath surface to truth' },
    'home':     { roots: ['thal','cal'],    literal: 'sheltered light',    desc: 'Home is where light is shielded, kept safe' },
    'honor':    { roots: ['cal','aran'],    literal: 'bright name',        desc: 'Honor is a name that shines, known and untarnished' },
    'war':      { roots: ['mor','uin'],     literal: 'shadow-tide',        desc: 'War is a rising tide of shadow that engulfs all' }
  };

  /* ── Concept relationship edges ── */
  const EDGES = [
    { from: 'hope', to: 'star', type: 'INVOLVES' },
    { from: 'hope', to: 'light', type: 'INVOLVES' },
    { from: 'peace', to: 'water', type: 'INVOLVES' },
    { from: 'courage', to: 'fire', type: 'INVOLVES' },
    { from: 'grief', to: 'song', type: 'INVOLVES' },
    { from: 'grief', to: 'defeat', type: 'RELATED_TO' },
    { from: 'betrayal', to: 'loyalty', type: 'OPPOSITE_OF' },
    { from: 'love', to: 'loyalty', type: 'RELATED_TO' },
    { from: 'death', to: 'voyage', type: 'INVOLVES' },
    { from: 'death', to: 'life', type: 'OPPOSITE_OF' },
    { from: 'wisdom', to: 'lore', type: 'IS_A' },
    { from: 'battle', to: 'war', type: 'IS_A' },
    { from: 'victory', to: 'battle', type: 'RELATED_TO' },
    { from: 'defeat', to: 'battle', type: 'RELATED_TO' },
    { from: 'honor', to: 'loyalty', type: 'RELATED_TO' },
    { from: 'sovereignty', to: 'command', type: 'IS_A' },
    { from: 'shadow', to: 'light', type: 'OPPOSITE_OF' },
    { from: 'dawn', to: 'dusk', type: 'OPPOSITE_OF' },
    { from: 'summer', to: 'winter', type: 'OPPOSITE_OF' },
    { from: 'spring', to: 'autumn', type: 'OPPOSITE_OF' },
    { from: 'soul', to: 'body', type: 'OPPOSITE_OF' },
    { from: 'fortress', to: 'guard', type: 'INVOLVES' }
  ];

  /* ── Query functions ── */

  function findConcept(query) {
    const q = query.toLowerCase().trim();
    // Direct match
    let match = CONCEPTS.find(c => c.id === q);
    if (match) return [{ ...match, score: 1.0 }];

    // Partial match
    const results = CONCEPTS
      .filter(c => c.id.includes(q) || q.includes(c.id))
      .map(c => ({
        ...c,
        score: c.id === q ? 1.0 : c.id.includes(q) ? 0.8 : 0.5
      }));

    if (results.length) return results.sort((a, b) => b.score - a.score);

    // Category match
    const catMatches = CONCEPTS.filter(c =>
      CATEGORIES[c.cat]?.label.toLowerCase().includes(q)
    ).map(c => ({ ...c, score: 0.4 }));

    return catMatches;
  }

  function getRootsForConcept(conceptId) {
    const concept = CONCEPTS.find(c => c.id === conceptId);
    if (!concept) return [];
    return concept.roots;
  }

  function getMetaphor(conceptId) {
    return METAPHORS[conceptId] || null;
  }

  function getRelated(conceptId) {
    const related = [];
    for (const edge of EDGES) {
      if (edge.from === conceptId) related.push({ concept: edge.to, relation: edge.type });
      if (edge.to === conceptId) related.push({ concept: edge.from, relation: edge.type + '_OF' });
    }
    return related;
  }

  function conceptsForRoot(rootWord) {
    return CONCEPTS.filter(c => c.roots.includes(rootWord));
  }

  function allConcepts() { return CONCEPTS; }
  function allCategories() { return CATEGORIES; }
  function allMetaphors() { return METAPHORS; }

  /* ── Semantic scoring for word generation ── */
  function scoreRootCombination(roots, targetConcept) {
    const concept = CONCEPTS.find(c => c.id === targetConcept);
    if (!concept) return 0;

    let score = 0;
    for (const root of roots) {
      if (concept.roots.includes(root)) score += concept.weight;
    }

    // Bonus for metaphorical alignment
    const meta = METAPHORS[targetConcept];
    if (meta) {
      for (const root of roots) {
        if (meta.roots.includes(root)) score += 0.3;
      }
    }

    // Bonus for related concepts
    const related = getRelated(targetConcept);
    for (const rel of related) {
      const relConcept = CONCEPTS.find(c => c.id === rel.concept);
      if (relConcept) {
        for (const root of roots) {
          if (relConcept.roots.includes(root)) score += 0.15;
        }
      }
    }

    return Math.min(score, 2.0); // Cap at 2.0
  }

  /* ── Shadow neutrality check ── */
  function isCulturallyAppropriate(rootCombo, intendedMeaning) {
    // Arandori view shadow as neutral, not evil
    // Don't combine shadow + evil/bad connotations automatically
    const hasShadow = rootCombo.some(r => ['mor','morë','umbra'].includes(r));
    const hasNegative = ['evil','wicked','corrupt','foul'].some(w =>
      intendedMeaning.toLowerCase().includes(w)
    );
    if (hasShadow && hasNegative) {
      return { ok: false, reason: 'Shadow (mor) is culturally neutral in Arandori thought; avoid pairing with inherently negative concepts' };
    }
    return { ok: true };
  }

  /* ── Public API ── */
  return {
    CATEGORIES,
    CONCEPTS,
    METAPHORS,
    EDGES,
    findConcept,
    getRootsForConcept,
    getMetaphor,
    getRelated,
    conceptsForRoot,
    allConcepts,
    allCategories,
    allMetaphors,
    scoreRootCombination,
    isCulturallyAppropriate
  };

})();

if (typeof window !== 'undefined') window.SemanticNetwork = SemanticNetwork;
