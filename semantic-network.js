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

  /* ── Concept nodes with root associations ──
     Every dictionary root and major word should be reachable from at least
     one concept. Common English synonyms and related terms are included as
     aliases so the forge catches natural phrasing. */
  const CONCEPTS = [
    // ═══ Nature & Elements ═══
    { id: 'sky',        cat: 'nature',    roots: ['aer','vael'], weight: 1.0 },
    { id: 'water',      cat: 'nature',    roots: ['nén','uin','lin','aelin'], weight: 1.0 },
    { id: 'earth',      cat: 'nature',    roots: ['nor','ondo'], weight: 1.0 },
    { id: 'ground',     cat: 'nature',    roots: ['nor'], weight: 0.8 },
    { id: 'soil',       cat: 'nature',    roots: ['nor'], weight: 0.7 },
    { id: 'fire',       cat: 'nature',    roots: ['naur','urithë'], weight: 1.0 },
    { id: 'flame',      cat: 'nature',    roots: ['naur'], weight: 0.9 },
    { id: 'heat',       cat: 'nature',    roots: ['naur','urithë'], weight: 0.8 },
    { id: 'ember',      cat: 'nature',    roots: ['narvion','naur'], weight: 0.8 },
    { id: 'forest',     cat: 'nature',    roots: ['taur','sylva','galadh'], weight: 1.0 },
    { id: 'wood',       cat: 'nature',    roots: ['taur','galadh','alda'], weight: 0.8 },
    { id: 'woodland',   cat: 'nature',    roots: ['taur','sylva'], weight: 0.9 },
    { id: 'stone',      cat: 'nature',    roots: ['ondo'], weight: 0.9 },
    { id: 'rock',       cat: 'nature',    roots: ['ondo'], weight: 0.8 },
    { id: 'mineral',    cat: 'nature',    roots: ['ondo'], weight: 0.7 },
    { id: 'wind',       cat: 'nature',    roots: ['vael'], weight: 1.0 },
    { id: 'breeze',     cat: 'nature',    roots: ['vael'], weight: 0.8 },
    { id: 'air',        cat: 'nature',    roots: ['aer','vael'], weight: 0.9 },
    { id: 'flower',     cat: 'nature',    roots: ['loth'], weight: 0.9 },
    { id: 'blossom',    cat: 'nature',    roots: ['loth','tuili'], weight: 0.8 },
    { id: 'bloom',      cat: 'nature',    roots: ['loth'], weight: 0.8 },
    { id: 'tree',       cat: 'nature',    roots: ['galadh','alda'], weight: 1.0 },
    { id: 'mist',       cat: 'nature',    roots: ['fanya'], weight: 0.8 },
    { id: 'fog',        cat: 'nature',    roots: ['fanya'], weight: 0.7 },
    { id: 'cloud',      cat: 'nature',    roots: ['fanya'], weight: 0.8 },
    { id: 'veil',       cat: 'nature',    roots: ['fanya'], weight: 0.8 },
    { id: 'ocean',      cat: 'nature',    roots: ['uin','eärë'], weight: 1.0 },
    { id: 'sea',        cat: 'nature',    roots: ['uin','eärë'], weight: 1.0 },
    { id: 'lake',       cat: 'nature',    roots: ['aelin'], weight: 0.9 },
    { id: 'pool',       cat: 'nature',    roots: ['aelin'], weight: 0.7 },
    { id: 'river',      cat: 'nature',    roots: ['nén','lin'], weight: 0.8 },
    { id: 'stream',     cat: 'nature',    roots: ['nén','lin'], weight: 0.8 },
    { id: 'silver',     cat: 'nature',    roots: ['sil','silmë'], weight: 0.9 },
    { id: 'gold',       cat: 'nature',    roots: ['cal','anor'], weight: 0.7 },
    { id: 'jewel',      cat: 'nature',    roots: ['mir'], weight: 0.9 },
    { id: 'gem',        cat: 'nature',    roots: ['mir'], weight: 0.8 },
    { id: 'treasure',   cat: 'nature',    roots: ['mir'], weight: 0.8 },
    { id: 'precious',   cat: 'nature',    roots: ['mir','var'], weight: 0.7 },

    // ═══ Celestial ═══
    { id: 'star',       cat: 'celestial', roots: ['ael','elen'], weight: 1.0 },
    { id: 'stars',      cat: 'celestial', roots: ['ael','elen'], weight: 1.0 },
    { id: 'sun',        cat: 'celestial', roots: ['anor','aurë'], weight: 1.0 },
    { id: 'moon',       cat: 'celestial', roots: ['ithil','sil'], weight: 1.0 },
    { id: 'light',      cat: 'celestial', roots: ['cal','cala','silmë'], weight: 1.0 },
    { id: 'radiance',   cat: 'celestial', roots: ['cal','cala','calima'], weight: 0.9 },
    { id: 'brilliance', cat: 'celestial', roots: ['cal','calima'], weight: 0.8 },
    { id: 'bright',     cat: 'celestial', roots: ['cal','calima','silquen'], weight: 0.9 },
    { id: 'shining',    cat: 'celestial', roots: ['cal','calima','sil'], weight: 0.9 },
    { id: 'luminous',   cat: 'celestial', roots: ['calima','cal'], weight: 0.8 },
    { id: 'glow',       cat: 'celestial', roots: ['cal','sil','morilthë'], weight: 0.7 },
    { id: 'gleam',      cat: 'celestial', roots: ['sil','cal'], weight: 0.8 },
    { id: 'shadow',     cat: 'celestial', roots: ['mor','morë'], weight: 1.0 },
    { id: 'darkness',   cat: 'celestial', roots: ['mor','morë','umbra','lómë'], weight: 1.0 },
    { id: 'dark',       cat: 'celestial', roots: ['mor','morë','morëa'], weight: 0.9 },
    { id: 'gloom',      cat: 'celestial', roots: ['morë','lómë'], weight: 0.8 },
    { id: 'starlight',  cat: 'celestial', roots: ['silmë','ael','cal'], weight: 0.9 },
    { id: 'moonlight',  cat: 'celestial', roots: ['silmë','ithil'], weight: 0.8 },
    { id: 'dawn',       cat: 'celestial', roots: ['anarë','aurë'], weight: 0.9 },
    { id: 'sunrise',    cat: 'celestial', roots: ['anarë','anor'], weight: 0.8 },
    { id: 'dusk',       cat: 'celestial', roots: ['andúnë','lómë'], weight: 0.9 },
    { id: 'sunset',     cat: 'celestial', roots: ['andúnë','anor'], weight: 0.8 },
    { id: 'twilight',   cat: 'celestial', roots: ['lómë','morilthë','andúnë'], weight: 0.8 },
    { id: 'void',       cat: 'celestial', roots: ['mor','umbra'], weight: 0.7 },
    { id: 'heaven',     cat: 'celestial', roots: ['aer','ael'], weight: 0.7 },
    { id: 'celestial',  cat: 'celestial', roots: ['ael','elen','aer'], weight: 0.8 },

    // ═══ Emotion & State ═══
    { id: 'love',       cat: 'emotion',   roots: ['mel','melda'], weight: 1.0 },
    { id: 'beloved',    cat: 'emotion',   roots: ['melda','mel'], weight: 0.9 },
    { id: 'dear',       cat: 'emotion',   roots: ['melda'], weight: 0.7 },
    { id: 'cherish',    cat: 'emotion',   roots: ['mel'], weight: 0.8 },
    { id: 'affection',  cat: 'emotion',   roots: ['mel','nilmë'], weight: 0.8 },
    { id: 'grief',      cat: 'emotion',   roots: ['lin','lanta','mor'], weight: 0.8, metaphor: 'fading song' },
    { id: 'sorrow',     cat: 'emotion',   roots: ['lin','lanta','mor'], weight: 0.8 },
    { id: 'sadness',    cat: 'emotion',   roots: ['lanta','mor','lin'], weight: 0.7 },
    { id: 'mourning',   cat: 'emotion',   roots: ['lin','lanta'], weight: 0.7 },
    { id: 'hope',       cat: 'emotion',   roots: ['estel','ael','cal'], weight: 1.0, metaphor: 'starlight' },
    { id: 'faith',      cat: 'emotion',   roots: ['estel','var'], weight: 0.8 },
    { id: 'trust',      cat: 'emotion',   roots: ['estel','nilmë'], weight: 0.8 },
    { id: 'peace',      cat: 'emotion',   roots: ['sérë','aelin'], weight: 1.0, metaphor: 'still water' },
    { id: 'calm',       cat: 'emotion',   roots: ['sérë','aelin'], weight: 0.8 },
    { id: 'rest',       cat: 'emotion',   roots: ['sérë'], weight: 0.8 },
    { id: 'tranquility', cat: 'emotion',  roots: ['sérë','aelin'], weight: 0.9 },
    { id: 'serenity',   cat: 'emotion',   roots: ['sérë','aelin'], weight: 0.8 },
    { id: 'quiet',      cat: 'emotion',   roots: ['sérë'], weight: 0.7 },
    { id: 'stillness',  cat: 'emotion',   roots: ['sérë','aelin'], weight: 0.7 },
    { id: 'courage',    cat: 'emotion',   roots: ['tulca','cal','naur'], weight: 0.9, metaphor: 'steady flame' },
    { id: 'brave',      cat: 'emotion',   roots: ['tulca','cal'], weight: 0.8 },
    { id: 'bravery',    cat: 'emotion',   roots: ['tulca','cal'], weight: 0.8 },
    { id: 'valor',      cat: 'emotion',   roots: ['tulca','val','cal'], weight: 0.9 },
    { id: 'fear',       cat: 'emotion',   roots: ['mor','umbra'], weight: 0.7 },
    { id: 'dread',      cat: 'emotion',   roots: ['umbra','mor'], weight: 0.7 },
    { id: 'terror',     cat: 'emotion',   roots: ['umbra','mor'], weight: 0.6 },
    { id: 'wonder',     cat: 'emotion',   roots: ['elen','vanye','mir'], weight: 0.8 },
    { id: 'awe',        cat: 'emotion',   roots: ['elen','vanye','val'], weight: 0.8 },
    { id: 'beauty',     cat: 'emotion',   roots: ['vanye','vanya','loth'], weight: 1.0 },
    { id: 'beautiful',  cat: 'emotion',   roots: ['vanya','vanye','loth'], weight: 0.9 },
    { id: 'fair',       cat: 'emotion',   roots: ['vanya','vanye'], weight: 0.9 },
    { id: 'grace',      cat: 'emotion',   roots: ['vanye','vanya'], weight: 0.8 },
    { id: 'elegant',    cat: 'emotion',   roots: ['vanye','vanya'], weight: 0.7 },
    { id: 'rage',       cat: 'emotion',   roots: ['naur','val','mahta'], weight: 0.7 },
    { id: 'anger',      cat: 'emotion',   roots: ['naur','val'], weight: 0.7 },
    { id: 'wrath',      cat: 'emotion',   roots: ['naur','val'], weight: 0.7 },
    { id: 'fury',       cat: 'emotion',   roots: ['naur','val'], weight: 0.7 },
    { id: 'joy',        cat: 'emotion',   roots: ['cal','lin','vanye'], weight: 0.8 },
    { id: 'happiness',  cat: 'emotion',   roots: ['cal','lin'], weight: 0.7 },
    { id: 'delight',    cat: 'emotion',   roots: ['cal','vanye'], weight: 0.7 },
    { id: 'longing',    cat: 'emotion',   roots: ['mel','ranya','hasta'], weight: 0.7 },
    { id: 'desire',     cat: 'emotion',   roots: ['mel','naur'], weight: 0.7 },

    // ═══ Qualities & Attributes ═══
    { id: 'strong',     cat: 'emotion',   roots: ['tulca','val'], weight: 1.0 },
    { id: 'strength',   cat: 'emotion',   roots: ['tulca','val'], weight: 1.0 },
    { id: 'mighty',     cat: 'emotion',   roots: ['val','tulca'], weight: 0.9 },
    { id: 'powerful',   cat: 'emotion',   roots: ['val','tulca'], weight: 0.9 },
    { id: 'power',      cat: 'emotion',   roots: ['val','hérë'], weight: 0.9 },
    { id: 'steadfast',  cat: 'emotion',   roots: ['tulca','var'], weight: 0.9 },
    { id: 'firm',       cat: 'emotion',   roots: ['tulca','ondo'], weight: 0.8 },
    { id: 'resolute',   cat: 'emotion',   roots: ['tulca','thal'], weight: 0.8 },
    { id: 'noble',      cat: 'social',    roots: ['ara','aran','tara'], weight: 1.0 },
    { id: 'high',       cat: 'social',    roots: ['ara','tara','mina'], weight: 0.9 },
    { id: 'exalted',    cat: 'social',    roots: ['ara','tara'], weight: 0.8 },
    { id: 'swift',      cat: 'emotion',   roots: ['eryn','vael'], weight: 0.9 },
    { id: 'fast',       cat: 'emotion',   roots: ['eryn','vael'], weight: 0.8 },
    { id: 'quick',      cat: 'emotion',   roots: ['eryn'], weight: 0.7 },
    { id: 'keen',       cat: 'emotion',   roots: ['eryn','tir'], weight: 0.8 },
    { id: 'sharp',      cat: 'emotion',   roots: ['eryn','macil'], weight: 0.7 },
    { id: 'wise',       cat: 'knowledge', roots: ['saila','nolmë','tir'], weight: 0.9 },
    { id: 'learned',    cat: 'knowledge', roots: ['saila','nolmë','ista'], weight: 0.8 },
    { id: 'eternal',    cat: 'time',      roots: ['var','oialë'], weight: 1.0 },
    { id: 'sacred',     cat: 'spirit',    roots: ['var','vardalum'], weight: 1.0 },
    { id: 'holy',       cat: 'spirit',    roots: ['var','vardalum'], weight: 0.9 },
    { id: 'divine',     cat: 'spirit',    roots: ['var','cal'], weight: 0.8 },
    { id: 'enduring',   cat: 'time',      roots: ['var','tulca'], weight: 0.8 },
    { id: 'sweet',      cat: 'nature',    roots: ['lissë'], weight: 0.8 },
    { id: 'fragrant',   cat: 'nature',    roots: ['lissë','loth'], weight: 0.7 },
    { id: 'blue',       cat: 'nature',    roots: ['luina'], weight: 0.8 },
    { id: 'red',        cat: 'nature',    roots: ['rilya','naur'], weight: 0.7 },
    { id: 'crimson',    cat: 'nature',    roots: ['rilya'], weight: 0.7 },
    { id: 'shadowy',    cat: 'celestial', roots: ['morëa','mor'], weight: 0.8 },

    // ═══ Social & Political ═══
    { id: 'loyalty',    cat: 'social',    roots: ['vesta','nilmë','nildë'], weight: 0.9 },
    { id: 'loyal',      cat: 'social',    roots: ['vesta','nilmë'], weight: 0.8 },
    { id: 'betrayal',   cat: 'social',    roots: ['vesta','mor'], weight: 0.8, metaphor: 'broken oath' },
    { id: 'treachery',  cat: 'social',    roots: ['vesta','mor'], weight: 0.7 },
    { id: 'sovereignty', cat: 'social',   roots: ['aran','tara','heru'], weight: 1.0 },
    { id: 'king',       cat: 'social',    roots: ['aran','tara'], weight: 1.0 },
    { id: 'queen',      cat: 'social',    roots: ['aran','tara','heri'], weight: 0.9 },
    { id: 'lord',       cat: 'social',    roots: ['heru','aran'], weight: 1.0 },
    { id: 'lady',       cat: 'social',    roots: ['heri'], weight: 0.9 },
    { id: 'ruler',      cat: 'social',    roots: ['aran','heru','tara'], weight: 0.9 },
    { id: 'crown',      cat: 'social',    roots: ['tara'], weight: 0.8 },
    { id: 'authority',  cat: 'social',    roots: ['hérë','heru','aran'], weight: 0.9 },
    { id: 'governance', cat: 'social',    roots: ['hérë','heru'], weight: 0.8 },
    { id: 'exile',      cat: 'social',    roots: ['othar','rima'], weight: 0.7 },
    { id: 'outcast',    cat: 'social',    roots: ['othar','rima'], weight: 0.7 },
    { id: 'stranger',   cat: 'social',    roots: ['othar'], weight: 0.8 },
    { id: 'outsider',   cat: 'social',    roots: ['othar'], weight: 0.7 },
    { id: 'justice',    cat: 'social',    roots: ['hérë','cal'], weight: 0.8 },
    { id: 'alliance',   cat: 'social',    roots: ['nilmë','vesta'], weight: 0.8 },
    { id: 'friendship', cat: 'social',    roots: ['nilmë','nildë'], weight: 1.0 },
    { id: 'friend',     cat: 'social',    roots: ['nildë','nilmë'], weight: 0.9 },
    { id: 'companion',  cat: 'social',    roots: ['nildë'], weight: 0.8 },
    { id: 'bond',       cat: 'social',    roots: ['nilmë','vesta'], weight: 0.8 },
    { id: 'oath',       cat: 'social',    roots: ['vesta'], weight: 1.0 },
    { id: 'vow',        cat: 'social',    roots: ['vesta'], weight: 0.9 },
    { id: 'promise',    cat: 'social',    roots: ['vesta'], weight: 0.8 },
    { id: 'honor',      cat: 'social',    roots: ['cal','aran','alcar'], weight: 0.9, metaphor: 'bright name' },
    { id: 'glory',      cat: 'social',    roots: ['alcar','cal','val'], weight: 1.0 },
    { id: 'splendor',   cat: 'social',    roots: ['alcar','cal'], weight: 0.8 },
    { id: 'home',       cat: 'social',    roots: ['thal','cal','dorë'], weight: 0.9, metaphor: 'sheltered light' },
    { id: 'people',     cat: 'social',    roots: ['rindë','elda'], weight: 0.9 },
    { id: 'folk',       cat: 'social',    roots: ['rindë'], weight: 0.8 },
    { id: 'kindred',    cat: 'social',    roots: ['rindë'], weight: 0.9 },
    { id: 'child',      cat: 'social',    roots: ['hên'], weight: 0.9 },
    { id: 'offspring',  cat: 'social',    roots: ['hên'], weight: 0.7 },
    { id: 'young',      cat: 'social',    roots: ['hên','tuili'], weight: 0.7 },
    { id: 'family',     cat: 'social',    roots: ['hên','nilmë','rindë'], weight: 0.8 },

    // ═══ Military & Naval ═══
    { id: 'battle',     cat: 'military',  roots: ['mahta','ohtar'], weight: 1.0 },
    { id: 'fight',      cat: 'military',  roots: ['mahta','ohtar'], weight: 0.9 },
    { id: 'combat',     cat: 'military',  roots: ['mahta','ohtar'], weight: 0.9 },
    { id: 'fleet',      cat: 'military',  roots: ['rimba','cirya'], weight: 1.0 },
    { id: 'navy',       cat: 'military',  roots: ['rimba','cirya','hasta'], weight: 0.9 },
    { id: 'command',    cat: 'military',  roots: ['heru','cáno'], weight: 0.9 },
    { id: 'commander',  cat: 'military',  roots: ['cáno','heru'], weight: 0.9 },
    { id: 'captain',    cat: 'military',  roots: ['cáno','thalion'], weight: 0.8 },
    { id: 'leader',     cat: 'military',  roots: ['tulya','heru','cáno'], weight: 0.9 },
    { id: 'guard',      cat: 'military',  roots: ['tir','thal'], weight: 1.0 },
    { id: 'watch',      cat: 'military',  roots: ['tir'], weight: 0.9 },
    { id: 'vigil',      cat: 'military',  roots: ['tir'], weight: 0.8 },
    { id: 'protect',    cat: 'military',  roots: ['thal','tir'], weight: 0.9 },
    { id: 'protection', cat: 'military',  roots: ['thal','tir','thalon'], weight: 1.0 },
    { id: 'defend',     cat: 'military',  roots: ['thal','tir'], weight: 0.9 },
    { id: 'defense',    cat: 'military',  roots: ['thal','thalon','tir'], weight: 0.9 },
    { id: 'victory',    cat: 'military',  roots: ['alcar','cal','val'], weight: 0.9 },
    { id: 'triumph',    cat: 'military',  roots: ['alcar','val'], weight: 0.8 },
    { id: 'defeat',     cat: 'military',  roots: ['lanta','mor'], weight: 0.7 },
    { id: 'fall',       cat: 'military',  roots: ['lanta'], weight: 0.8 },
    { id: 'shield',     cat: 'military',  roots: ['thal','thalon'], weight: 1.0 },
    { id: 'barrier',    cat: 'military',  roots: ['thalon','thal'], weight: 0.8 },
    { id: 'ward',       cat: 'military',  roots: ['thal'], weight: 0.8 },
    { id: 'sword',      cat: 'military',  roots: ['macil'], weight: 0.9 },
    { id: 'blade',      cat: 'military',  roots: ['macil','vael'], weight: 0.8 },
    { id: 'weapon',     cat: 'military',  roots: ['macil','ehtar','cú'], weight: 0.9 },
    { id: 'spear',      cat: 'military',  roots: ['ehtar'], weight: 0.9 },
    { id: 'lance',      cat: 'military',  roots: ['ehtar'], weight: 0.8 },
    { id: 'bow',        cat: 'military',  roots: ['cú'], weight: 0.9 },
    { id: 'archer',     cat: 'military',  roots: ['cú','tir'], weight: 0.7 },
    { id: 'ship',       cat: 'military',  roots: ['cirya'], weight: 1.0 },
    { id: 'vessel',     cat: 'military',  roots: ['cirya'], weight: 0.9 },
    { id: 'warrior',    cat: 'military',  roots: ['ohtar','mahta'], weight: 1.0 },
    { id: 'soldier',    cat: 'military',  roots: ['ohtar'], weight: 0.9 },
    { id: 'fighter',    cat: 'military',  roots: ['ohtar','mahta'], weight: 0.8 },
    { id: 'war',        cat: 'military',  roots: ['mor','uin','ohtar','mahta'], weight: 0.8, metaphor: 'shadow-tide' },
    { id: 'conflict',   cat: 'military',  roots: ['mahta','mor'], weight: 0.7 },
    { id: 'voyage',     cat: 'military',  roots: ['hasta','cirya','ael'], weight: 0.9 },
    { id: 'sail',       cat: 'military',  roots: ['hasta','cirya'], weight: 0.9 },
    { id: 'journey',    cat: 'military',  roots: ['ranya','hasta'], weight: 0.9 },
    { id: 'travel',     cat: 'military',  roots: ['ranya','hasta'], weight: 0.8 },
    { id: 'wander',     cat: 'military',  roots: ['ranya'], weight: 0.8 },
    { id: 'gather',     cat: 'military',  roots: ['hosta','ath'], weight: 0.8 },
    { id: 'assemble',   cat: 'military',  roots: ['hosta'], weight: 0.7 },
    { id: 'muster',     cat: 'military',  roots: ['hosta','ohtar'], weight: 0.7 },
    { id: 'border',     cat: 'military',  roots: ['rima'], weight: 0.8 },
    { id: 'frontier',   cat: 'military',  roots: ['rima'], weight: 0.7 },
    { id: 'boundary',   cat: 'military',  roots: ['rima'], weight: 0.7 },
    { id: 'edge',       cat: 'military',  roots: ['rima','macil'], weight: 0.7 },

    // ═══ Knowledge & Craft ═══
    { id: 'wisdom',     cat: 'knowledge', roots: ['nolmë','saila','tir'], weight: 1.0, metaphor: 'deep seeing' },
    { id: 'knowledge',  cat: 'knowledge', roots: ['nolmë','ista'], weight: 1.0 },
    { id: 'know',       cat: 'knowledge', roots: ['ista','nolmë'], weight: 0.9 },
    { id: 'understand', cat: 'knowledge', roots: ['ista','saila'], weight: 0.8 },
    { id: 'lore',       cat: 'knowledge', roots: ['nolmë','ista'], weight: 0.9 },
    { id: 'craft',      cat: 'knowledge', roots: ['dalë'], weight: 1.0 },
    { id: 'skill',      cat: 'knowledge', roots: ['dalë','eryn'], weight: 0.9 },
    { id: 'art',        cat: 'knowledge', roots: ['dalë','vanye'], weight: 0.8 },
    { id: 'creation',   cat: 'knowledge', roots: ['dalë','orta'], weight: 0.7 },
    { id: 'make',       cat: 'knowledge', roots: ['dalë'], weight: 0.7 },
    { id: 'song',       cat: 'knowledge', roots: ['lin','lindalë','linda'], weight: 1.0 },
    { id: 'sing',       cat: 'knowledge', roots: ['linda','lin'], weight: 0.9 },
    { id: 'music',      cat: 'knowledge', roots: ['lindalë','lin','linda'], weight: 1.0 },
    { id: 'melody',     cat: 'knowledge', roots: ['lin','lindalë'], weight: 0.8 },
    { id: 'chant',      cat: 'knowledge', roots: ['linda','lin'], weight: 0.7 },
    { id: 'speak',      cat: 'knowledge', roots: ['centa'], weight: 0.9 },
    { id: 'speech',     cat: 'knowledge', roots: ['centa'], weight: 0.9 },
    { id: 'voice',      cat: 'knowledge', roots: ['centa','lin'], weight: 0.8 },
    { id: 'word',       cat: 'knowledge', roots: ['centa'], weight: 0.7 },
    { id: 'language',   cat: 'knowledge', roots: ['centa','lin'], weight: 0.8 },
    { id: 'prophecy',   cat: 'knowledge', roots: ['tir','ael','cal'], weight: 0.7 },
    { id: 'vision',     cat: 'knowledge', roots: ['tir','cal'], weight: 0.7 },
    { id: 'see',        cat: 'knowledge', roots: ['tir'], weight: 0.7 },
    { id: 'find',       cat: 'knowledge', roots: ['hir'], weight: 0.9 },
    { id: 'discover',   cat: 'knowledge', roots: ['hir','tir'], weight: 0.8 },
    { id: 'seek',       cat: 'knowledge', roots: ['hir','ranya'], weight: 0.7 },
    { id: 'search',     cat: 'knowledge', roots: ['hir','tir'], weight: 0.7 },
    { id: 'memory',     cat: 'knowledge', roots: ['myndar'], weight: 0.8 },
    { id: 'echo',       cat: 'knowledge', roots: ['myndar'], weight: 0.7 },
    { id: 'remember',   cat: 'knowledge', roots: ['myndar','ista'], weight: 0.7 },

    // ═══ Time & Season ═══
    { id: 'summer',     cat: 'time',      roots: ['lairë'], weight: 0.9 },
    { id: 'winter',     cat: 'time',      roots: ['hrívë'], weight: 0.9 },
    { id: 'cold',       cat: 'time',      roots: ['hrívë'], weight: 0.7 },
    { id: 'autumn',     cat: 'time',      roots: ['yavië'], weight: 0.9 },
    { id: 'harvest',    cat: 'time',      roots: ['yavië'], weight: 0.8 },
    { id: 'spring',     cat: 'time',      roots: ['tuili'], weight: 0.9 },
    { id: 'awakening',  cat: 'time',      roots: ['tuili','cuivë'], weight: 0.8 },
    { id: 'night',      cat: 'time',      roots: ['lómë','mor'], weight: 0.9 },
    { id: 'day',        cat: 'time',      roots: ['aurë','anor'], weight: 0.9 },
    { id: 'eternity',   cat: 'time',      roots: ['var','oialë'], weight: 1.0 },
    { id: 'forever',    cat: 'time',      roots: ['oialë','var'], weight: 0.9 },
    { id: 'age',        cat: 'time',      roots: ['yén','oialë'], weight: 0.8 },
    { id: 'time',       cat: 'time',      roots: ['yén','aurë','lómë'], weight: 0.8 },
    { id: 'year',       cat: 'time',      roots: ['yén'], weight: 0.8 },
    { id: 'cycle',      cat: 'time',      roots: ['yén'], weight: 0.7 },

    // ═══ Body & Spirit ═══
    { id: 'soul',       cat: 'spirit',    roots: ['fëa'], weight: 1.0 },
    { id: 'spirit',     cat: 'spirit',    roots: ['fëa','fairë'], weight: 1.0 },
    { id: 'ghost',      cat: 'spirit',    roots: ['fairë'], weight: 0.8 },
    { id: 'phantom',    cat: 'spirit',    roots: ['fairë','mor'], weight: 0.8 },
    { id: 'apparition', cat: 'spirit',    roots: ['fairë'], weight: 0.7 },
    { id: 'body',       cat: 'spirit',    roots: ['hroa'], weight: 1.0 },
    { id: 'flesh',      cat: 'spirit',    roots: ['hroa'], weight: 0.7 },
    { id: 'death',      cat: 'spirit',    roots: ['hasta','oialë','lanta'], weight: 0.8, metaphor: 'the long sailing' },
    { id: 'dying',      cat: 'spirit',    roots: ['lanta','hasta'], weight: 0.7 },
    { id: 'life',       cat: 'spirit',    roots: ['cuivë','fëa','tuili'], weight: 0.9 },
    { id: 'alive',      cat: 'spirit',    roots: ['cuivë','fëa'], weight: 0.7 },
    { id: 'living',     cat: 'spirit',    roots: ['cuivë','fëa'], weight: 0.7 },
    { id: 'healing',    cat: 'spirit',    roots: ['sérë','cal'], weight: 0.8 },
    { id: 'heal',       cat: 'spirit',    roots: ['sérë','cal'], weight: 0.7 },
    { id: 'wound',      cat: 'spirit',    roots: ['mahta','lanta'], weight: 0.6 },

    // ═══ Architecture ═══
    { id: 'tower',      cat: 'architecture', roots: ['mina'], weight: 1.0 },
    { id: 'fortress',   cat: 'architecture', roots: ['osto'], weight: 1.0 },
    { id: 'stronghold', cat: 'architecture', roots: ['osto','thal'], weight: 0.9 },
    { id: 'citadel',    cat: 'architecture', roots: ['osto','mina'], weight: 0.8 },
    { id: 'castle',     cat: 'architecture', roots: ['osto'], weight: 0.8 },
    { id: 'wall',       cat: 'architecture', roots: ['osto','thal'], weight: 0.7 },
    { id: 'gate',       cat: 'architecture', roots: ['ando'], weight: 0.8 },
    { id: 'door',       cat: 'architecture', roots: ['ando'], weight: 0.7 },
    { id: 'realm',      cat: 'architecture', roots: ['dorë','arandorë'], weight: 1.0 },
    { id: 'domain',     cat: 'architecture', roots: ['dorë'], weight: 0.8 },
    { id: 'territory',  cat: 'architecture', roots: ['dorë','nor'], weight: 0.8 },
    { id: 'land',       cat: 'architecture', roots: ['dorë','nor'], weight: 0.9 },
    { id: 'harbor',     cat: 'architecture', roots: ['cirya','aelin'], weight: 0.7 },
    { id: 'port',       cat: 'architecture', roots: ['cirya'], weight: 0.6 },
    { id: 'hall',       cat: 'architecture', roots: ['osto','mina'], weight: 0.7 },
    { id: 'bridge',     cat: 'architecture', roots: ['vin','nor'], weight: 0.6 },

    // ═══ Actions (verb concepts) ═══
    { id: 'rise',       cat: 'nature',    roots: ['orta','anor'], weight: 0.8 },
    { id: 'ascend',     cat: 'nature',    roots: ['orta'], weight: 0.7 },
    { id: 'lift',       cat: 'nature',    roots: ['orta'], weight: 0.7 },
    { id: 'descend',    cat: 'nature',    roots: ['lanta'], weight: 0.7 },
    { id: 'lead',       cat: 'social',    roots: ['tulya','heru'], weight: 0.8 },
    { id: 'guide',      cat: 'social',    roots: ['tulya','cal'], weight: 0.8 },

    // ═══ Materials ═══
    { id: 'vardalum',   cat: 'spirit',    roots: ['vardalum','var','sil'], weight: 1.0 },
    { id: 'crystal',    cat: 'nature',    roots: ['sil','mir','ondo'], weight: 0.7 },
    { id: 'metal',      cat: 'nature',    roots: ['ondo','sil'], weight: 0.6 },
    { id: 'iron',       cat: 'nature',    roots: ['ondo'], weight: 0.6 },

    // ═══ Common Nouns (new vocabulary) ═══
    { id: 'man',        cat: 'social',    roots: ['ner'], weight: 1.0 },
    { id: 'woman',      cat: 'social',    roots: ['nis'], weight: 1.0 },
    { id: 'person',     cat: 'social',    roots: ['atan'], weight: 1.0 },
    { id: 'house',      cat: 'architecture', roots: ['mar'], weight: 0.9 },
    { id: 'dwelling',   cat: 'architecture', roots: ['mar'], weight: 0.8 },
    { id: 'road',       cat: 'nature',    roots: ['tië'], weight: 0.9 },
    { id: 'path',       cat: 'nature',    roots: ['tië'], weight: 0.9 },
    { id: 'way',        cat: 'nature',    roots: ['tië'], weight: 0.8 },
    { id: 'mountain',   cat: 'nature',    roots: ['oron'], weight: 1.0 },
    { id: 'peak',       cat: 'nature',    roots: ['oron'], weight: 0.8 },
    { id: 'horse',      cat: 'nature',    roots: ['roch'], weight: 0.9 },
    { id: 'mount',      cat: 'nature',    roots: ['roch'], weight: 0.7 },
    { id: 'blood',      cat: 'spirit',    roots: ['sercë'], weight: 0.9 },
    { id: 'hand',       cat: 'spirit',    roots: ['mâ'], weight: 0.9 },
    { id: 'eye',        cat: 'spirit',    roots: ['hen'], weight: 0.9 },
    { id: 'heart',      cat: 'spirit',    roots: ['hón'], weight: 1.0 },
    { id: 'head',       cat: 'spirit',    roots: ['cas'], weight: 0.8 },
    { id: 'name',       cat: 'knowledge', roots: ['essë','esta'], weight: 1.0 },
    { id: 'armor',      cat: 'military',  roots: ['hamma'], weight: 0.9 },
    { id: 'helm',       cat: 'military',  roots: ['cassa'], weight: 0.8 },
    { id: 'helmet',     cat: 'military',  roots: ['cassa'], weight: 0.8 },
    { id: 'arrow',      cat: 'military',  roots: ['runya'], weight: 0.9 },
    { id: 'banner',     cat: 'military',  roots: ['ranel'], weight: 0.8 },
    { id: 'flag',       cat: 'military',  roots: ['ranel'], weight: 0.7 },
    { id: 'standard',   cat: 'military',  roots: ['ranel'], weight: 0.7 },
    { id: 'thought',    cat: 'knowledge', roots: ['sanmë'], weight: 0.8 },
    { id: 'idea',       cat: 'knowledge', roots: ['sanmë'], weight: 0.7 },
    { id: 'mind',       cat: 'knowledge', roots: ['sanmë','nolmë'], weight: 0.8 },
    { id: 'book',       cat: 'knowledge', roots: ['parma'], weight: 0.8 },
    { id: 'smith',      cat: 'knowledge', roots: ['tano','dalë'], weight: 0.8 },
    { id: 'craftsman',  cat: 'knowledge', roots: ['tano','dalë'], weight: 0.7 },
    { id: 'shade',      cat: 'nature',    roots: ['lómin','mor'], weight: 0.7 },
    { id: 'food',       cat: 'nature',    roots: ['massa'], weight: 0.7 },
    { id: 'bread',      cat: 'nature',    roots: ['massa'], weight: 0.7 },
    { id: 'drink',      cat: 'nature',    roots: ['miruvor','nén'], weight: 0.7 },
    { id: 'wine',       cat: 'nature',    roots: ['miruvor'], weight: 0.7 },
    { id: 'field',      cat: 'nature',    roots: ['peler','nor'], weight: 0.8 },
    { id: 'plain',      cat: 'nature',    roots: ['peler'], weight: 0.7 },

    // ═══ Common Adjectives (new vocabulary) ═══
    { id: 'old',        cat: 'time',      roots: ['yára'], weight: 0.9 },
    { id: 'ancient',    cat: 'time',      roots: ['ainëa','yára'], weight: 0.9 },
    { id: 'new',        cat: 'time',      roots: ['vinya'], weight: 0.9 },
    { id: 'great',      cat: 'emotion',   roots: ['alta','val'], weight: 0.9 },
    { id: 'large',      cat: 'emotion',   roots: ['alta'], weight: 0.8 },
    { id: 'vast',       cat: 'emotion',   roots: ['alta','uin'], weight: 0.7 },
    { id: 'small',      cat: 'emotion',   roots: ['titta'], weight: 0.8 },
    { id: 'little',     cat: 'emotion',   roots: ['titta'], weight: 0.8 },
    { id: 'tiny',       cat: 'emotion',   roots: ['titta'], weight: 0.7 },
    { id: 'long',       cat: 'emotion',   roots: ['anda'], weight: 0.8 },
    { id: 'tall',       cat: 'emotion',   roots: ['halla','ara'], weight: 0.8 },
    { id: 'deep',       cat: 'emotion',   roots: ['tumna'], weight: 0.9 },
    { id: 'wide',       cat: 'emotion',   roots: ['landa'], weight: 0.8 },
    { id: 'broad',      cat: 'emotion',   roots: ['landa'], weight: 0.7 },
    { id: 'hot',        cat: 'nature',    roots: ['lauca','naur'], weight: 0.7 },
    { id: 'warm',       cat: 'nature',    roots: ['lauca'], weight: 0.7 },
    { id: 'first',      cat: 'time',      roots: ['minya'], weight: 0.8 },
    { id: 'last',       cat: 'time',      roots: ['tella'], weight: 0.8 },
    { id: 'true',       cat: 'emotion',   roots: ['sanda'], weight: 0.9 },
    { id: 'many',       cat: 'emotion',   roots: ['lië','rimba'], weight: 0.8 },
    { id: 'few',        cat: 'emotion',   roots: ['sinomë'], weight: 0.7 },
    { id: 'silent',     cat: 'emotion',   roots: ['dína'], weight: 0.8 },
    { id: 'alone',      cat: 'emotion',   roots: ['eressë'], weight: 0.8 },
    { id: 'lonely',     cat: 'emotion',   roots: ['eressë'], weight: 0.8 },
    { id: 'golden',     cat: 'nature',    roots: ['laurëa','malda'], weight: 0.8 },

    // ═══ Common Verbs (new vocabulary) ═══
    { id: 'give',       cat: 'social',    roots: ['anta'], weight: 0.9 },
    { id: 'take',       cat: 'social',    roots: ['mapa'], weight: 0.9 },
    { id: 'go',         cat: 'nature',    roots: ['lesta','sinna'], weight: 0.9 },
    { id: 'come',       cat: 'nature',    roots: ['tula'], weight: 0.9 },
    { id: 'walk',       cat: 'nature',    roots: ['sinna'], weight: 0.8 },
    { id: 'run',        cat: 'nature',    roots: ['larca','norta'], weight: 0.7 },
    { id: 'hear',       cat: 'knowledge', roots: ['lasta'], weight: 0.8 },
    { id: 'listen',     cat: 'knowledge', roots: ['lasta'], weight: 0.8 },
    { id: 'sit',        cat: 'nature',    roots: ['hara'], weight: 0.7 },
    { id: 'dwell',      cat: 'social',    roots: ['hara','mar'], weight: 0.7 },
    { id: 'sleep',      cat: 'spirit',    roots: ['lorna'], weight: 0.8 },
    { id: 'wake',       cat: 'spirit',    roots: ['cuiva'], weight: 0.8 },
    { id: 'call',       cat: 'knowledge', roots: ['yalla'], weight: 0.8 },
    { id: 'summon',     cat: 'knowledge', roots: ['yalla'], weight: 0.7 },
    { id: 'begin',      cat: 'time',      roots: ['yesta'], weight: 0.8 },
    { id: 'start',      cat: 'time',      roots: ['yesta'], weight: 0.7 },
    { id: 'end',        cat: 'time',      roots: ['tyel'], weight: 0.8 },
    { id: 'finish',     cat: 'time',      roots: ['tyel'], weight: 0.7 },
    { id: 'build',      cat: 'knowledge', roots: ['tana','dalë'], weight: 0.8 },
    { id: 'break',      cat: 'nature',    roots: ['rauca'], weight: 0.8 },
    { id: 'shatter',    cat: 'nature',    roots: ['rauca'], weight: 0.7 },
    { id: 'open',       cat: 'nature',    roots: ['panta'], weight: 0.7 },
    { id: 'close',      cat: 'nature',    roots: ['holma'], weight: 0.7 },
    { id: 'hold',       cat: 'nature',    roots: ['taca'], weight: 0.8 },
    { id: 'carry',      cat: 'nature',    roots: ['cola'], weight: 0.7 },
    { id: 'burn',       cat: 'nature',    roots: ['nura','naur'], weight: 0.8 },
    { id: 'fly',        cat: 'nature',    roots: ['vilya','aer'], weight: 0.8 },
    { id: 'soar',       cat: 'nature',    roots: ['vilya'], weight: 0.7 },
    { id: 'die',        cat: 'spirit',    roots: ['firia','lanta'], weight: 0.8 },
    { id: 'fade',       cat: 'spirit',    roots: ['firia'], weight: 0.7 },
    { id: 'hide',       cat: 'nature',    roots: ['nurta'], weight: 0.7 },
    { id: 'conceal',    cat: 'nature',    roots: ['nurta'], weight: 0.7 },
    { id: 'return',     cat: 'nature',    roots: ['envanya'], weight: 0.7 },
    { id: 'ride',       cat: 'nature',    roots: ['norta','roch'], weight: 0.7 },
    { id: 'shine',      cat: 'celestial', roots: ['calta','cal'], weight: 0.8 },

    // ═══ Governance & Diplomacy ═══
    { id: 'bridge',     cat: 'architecture', roots: ['yanda','vin'], weight: 0.9 },
    { id: 'crossing',   cat: 'architecture', roots: ['yanda'], weight: 0.7 },
    { id: 'treaty',     cat: 'social',    roots: ['vesta','sérë'], weight: 0.9 },
    { id: 'truce',      cat: 'social',    roots: ['sérëvesta','sérë','vesta'], weight: 0.8 },
    { id: 'ambassador', cat: 'social',    roots: ['centar','centa'], weight: 1.0 },
    { id: 'envoy',      cat: 'social',    roots: ['centar','ranyano'], weight: 0.9 },
    { id: 'diplomat',   cat: 'social',    roots: ['centariel','centar','centa'], weight: 1.0 },
    { id: 'negotiation',cat: 'social',    roots: ['centariel','vesta','centa'], weight: 0.8 },
    { id: 'council',    cat: 'social',    roots: ['hérëath','valarindë','hérë'], weight: 1.0 },
    { id: 'senate',     cat: 'social',    roots: ['hérëath','hérë'], weight: 0.9 },
    { id: 'assembly',   cat: 'social',    roots: ['hérëath','hosta'], weight: 0.8 },
    { id: 'court',      cat: 'social',    roots: ['hérëmar','tara'], weight: 0.8 },
    { id: 'throne',     cat: 'social',    roots: ['tarahalla','tara','hérë'], weight: 0.9 },
    { id: 'decree',     cat: 'social',    roots: ['canva','cáno','hérë'], weight: 0.8 },
    { id: 'law',        cat: 'social',    roots: ['sanyar','san'], weight: 0.9 },
    { id: 'judge',      cat: 'social',    roots: ['sanno','namma'], weight: 0.8 },
    { id: 'mercy',      cat: 'emotion',   roots: ['hanyalë','han'], weight: 0.9 },
    { id: 'clemency',   cat: 'emotion',   roots: ['hanyalë'], weight: 0.7 },
    { id: 'merchant',   cat: 'social',    roots: ['ranyar','ranya'], weight: 0.8 },
    { id: 'trader',     cat: 'social',    roots: ['ranyar'], weight: 0.7 },
    { id: 'trade',      cat: 'social',    roots: ['ranyar','ranyamar'], weight: 0.8 },
    { id: 'tribute',    cat: 'social',    roots: ['mirlë','mir'], weight: 0.7 },

    // ═══ Titles & Roles ═══
    { id: 'priest',     cat: 'spirit',    roots: ['valro','var'], weight: 0.9 },
    { id: 'priestess',  cat: 'spirit',    roots: ['valriel','var'], weight: 0.8 },
    { id: 'healer',     cat: 'spirit',    roots: ['sérëno','sérë'], weight: 0.9 },
    { id: 'sage',       cat: 'knowledge', roots: ['nolmëtar','nolmë','saila'], weight: 0.9 },
    { id: 'loremaster', cat: 'knowledge', roots: ['nolmëtar','nolmë'], weight: 0.8 },
    { id: 'prophet',    cat: 'spirit',    roots: ['tirsano','tir'], weight: 0.8 },
    { id: 'seer',       cat: 'spirit',    roots: ['tirsano','tir','cal'], weight: 0.8 },
    { id: 'scribe',     cat: 'knowledge', roots: ['parno','parma','teca'], weight: 0.8 },
    { id: 'steward',    cat: 'social',    roots: ['hérëtir','hérë','tir'], weight: 0.9 },
    { id: 'regent',     cat: 'social',    roots: ['hérëtir','hérë'], weight: 0.8 },
    { id: 'herald',     cat: 'social',    roots: ['ranyano','centa'], weight: 0.8 },
    { id: 'messenger',  cat: 'social',    roots: ['ranyano','ranya'], weight: 0.8 },
    { id: 'spy',        cat: 'military',  roots: ['nurtano','nurta','tir'], weight: 0.8 },
    { id: 'hunter',     cat: 'nature',    roots: ['romano','rom'], weight: 0.8 },
    { id: 'tracker',    cat: 'nature',    roots: ['romano','hir'], weight: 0.7 },
    { id: 'ranger',     cat: 'military',  roots: ['rimatar','rima','tir'], weight: 0.8 },
    { id: 'scout',      cat: 'military',  roots: ['rimatar','tir'], weight: 0.7 },
    { id: 'sailor',     cat: 'military',  roots: ['hastano','hasta','cirya'], weight: 0.8 },
    { id: 'mariner',    cat: 'military',  roots: ['hastano','hasta'], weight: 0.7 },
    { id: 'pilot',      cat: 'military',  roots: ['ciryatur','cirya'], weight: 0.8 },
    { id: 'engineer',   cat: 'knowledge', roots: ['dalëno','dalë','tana'], weight: 0.8 },
    { id: 'artificer',  cat: 'knowledge', roots: ['dalëno','dalë'], weight: 0.7 },

    // ═══ Architecture & Places (extended) ═══
    { id: 'temple',     cat: 'architecture', roots: ['yulmë','var'], weight: 0.9 },
    { id: 'shrine',     cat: 'architecture', roots: ['varondo','var','ondo'], weight: 0.8 },
    { id: 'palace',     cat: 'architecture', roots: ['taramar','tara','mar'], weight: 0.9 },
    { id: 'library',    cat: 'architecture', roots: ['parmamar','parma','mar'], weight: 0.9 },
    { id: 'garden',     cat: 'architecture', roots: ['lothmar','loth','mar'], weight: 0.8 },
    { id: 'market',     cat: 'architecture', roots: ['ranyamar','ranya'], weight: 0.7 },
    { id: 'prison',     cat: 'architecture', roots: ['mandos','man'], weight: 0.8 },
    { id: 'dungeon',    cat: 'architecture', roots: ['mandos'], weight: 0.7 },
    { id: 'tomb',       cat: 'architecture', roots: ['noirë','noi'], weight: 0.8 },
    { id: 'monument',   cat: 'architecture', roots: ['tirnosto','tir','ondo'], weight: 0.7 },
    { id: 'shipyard',   cat: 'architecture', roots: ['hastacova','hasta','cova'], weight: 0.8 },
    { id: 'academy',    cat: 'architecture', roots: ['istamë','ista'], weight: 0.8 },
    { id: 'school',     cat: 'architecture', roots: ['istamë','ista'], weight: 0.7 },
    { id: 'forge',      cat: 'architecture', roots: ['tanamar','tana','dalë'], weight: 0.8 },
    { id: 'smithy',     cat: 'architecture', roots: ['tanamar','tano'], weight: 0.7 },
    { id: 'island',     cat: 'nature',    roots: ['tollë'], weight: 0.9 },
    { id: 'isle',       cat: 'nature',    roots: ['tollë'], weight: 0.8 },
    { id: 'valley',     cat: 'nature',    roots: ['imba'], weight: 0.9 },
    { id: 'dell',       cat: 'nature',    roots: ['imba'], weight: 0.7 },
    { id: 'cliff',      cat: 'nature',    roots: ['falassë'], weight: 0.8 },
    { id: 'cave',       cat: 'nature',    roots: ['hróta'], weight: 0.8 },
    { id: 'cavern',     cat: 'nature',    roots: ['hróta'], weight: 0.7 },

    // ═══ Objects ═══
    { id: 'ring',       cat: 'nature',    roots: ['corma'], weight: 0.9 },
    { id: 'circle',     cat: 'nature',    roots: ['corma'], weight: 0.7 },
    { id: 'chain',      cat: 'nature',    roots: ['racina'], weight: 0.7 },
    { id: 'rope',       cat: 'nature',    roots: ['línë'], weight: 0.7 },
    { id: 'thread',     cat: 'nature',    roots: ['línë'], weight: 0.7 },
    { id: 'cloth',      cat: 'nature',    roots: ['fassë'], weight: 0.7 },
    { id: 'glass',      cat: 'nature',    roots: ['calassë','cal'], weight: 0.7 },
    { id: 'mirror',     cat: 'knowledge', roots: ['cenilmë','cena'], weight: 0.7 },
    { id: 'torch',      cat: 'nature',    roots: ['naurion','naur'], weight: 0.7 },
    { id: 'lamp',       cat: 'nature',    roots: ['callampa','cal'], weight: 0.7 },
    { id: 'scroll',     cat: 'knowledge', roots: ['parmassë','parma'], weight: 0.7 },
    { id: 'map',        cat: 'knowledge', roots: ['tiëparma','tië','parma'], weight: 0.8 },
    { id: 'chart',      cat: 'knowledge', roots: ['tiëparma'], weight: 0.7 },
    { id: 'seal',       cat: 'social',    roots: ['thalcorma','thal','corma'], weight: 0.7 },
    { id: 'signet',     cat: 'social',    roots: ['thalcorma'], weight: 0.6 },
    { id: 'crown',      cat: 'social',    roots: ['taracorma','tara','corma'], weight: 0.9 },
    { id: 'diadem',     cat: 'social',    roots: ['taracorma'], weight: 0.7 },
    { id: 'coin',       cat: 'social',    roots: ['mirien','mir'], weight: 0.7 },
    { id: 'key',        cat: 'nature',    roots: ['pantacor','panta'], weight: 0.7 },

    // ═══ Weather & Elements (extended) ═══
    { id: 'rain',       cat: 'nature',    roots: ['rossë'], weight: 0.9 },
    { id: 'storm',      cat: 'nature',    roots: ['raumo'], weight: 0.9 },
    { id: 'tempest',    cat: 'nature',    roots: ['raumo'], weight: 0.8 },
    { id: 'thunder',    cat: 'nature',    roots: ['vaelraumo','raumo','vael'], weight: 0.8 },
    { id: 'lightning',  cat: 'nature',    roots: ['calraumo','cal','raumo'], weight: 0.8 },
    { id: 'snow',       cat: 'nature',    roots: ['lossë','hrívë'], weight: 0.9 },
    { id: 'ice',        cat: 'nature',    roots: ['helcë','hrívë'], weight: 0.8 },
    { id: 'ash',        cat: 'nature',    roots: ['lithi','naur'], weight: 0.7 },
    { id: 'smoke',      cat: 'nature',    roots: ['usquë','naur'], weight: 0.7 },

    // ═══ Body & Spirit (extended) ═══
    { id: 'bone',       cat: 'spirit',    roots: ['asca'], weight: 0.7 },
    { id: 'skin',       cat: 'spirit',    roots: ['helvë'], weight: 0.7 },
    { id: 'breath',     cat: 'spirit',    roots: ['thúlë','fëa'], weight: 0.9 },
    { id: 'tear',       cat: 'emotion',   roots: ['nírë'], weight: 0.8 },
    { id: 'tears',      cat: 'emotion',   roots: ['nírë'], weight: 0.7 },
    { id: 'dream',      cat: 'spirit',    roots: ['olorë','lor'], weight: 0.9 },
    { id: 'pain',       cat: 'spirit',    roots: ['naicë'], weight: 0.8 },
    { id: 'suffering',  cat: 'spirit',    roots: ['naicë','mor'], weight: 0.7 },
    { id: 'poison',     cat: 'nature',    roots: ['sangwa'], weight: 0.7 },
    { id: 'cure',       cat: 'spirit',    roots: ['sérëlossë','sérë'], weight: 0.7 },
    { id: 'remedy',     cat: 'spirit',    roots: ['sérëlossë'], weight: 0.7 },

    // ═══ Abstract Concepts (extended) ═══
    { id: 'truth',      cat: 'emotion',   roots: ['anwa','sanda'], weight: 0.9 },
    { id: 'lie',        cat: 'emotion',   roots: ['fuilë'], weight: 0.8 },
    { id: 'falsehood',  cat: 'emotion',   roots: ['fuilë'], weight: 0.7 },
    { id: 'secret',     cat: 'knowledge', roots: ['nólë','nurta'], weight: 0.8 },
    { id: 'fate',       cat: 'spirit',    roots: ['umbar'], weight: 0.9 },
    { id: 'destiny',    cat: 'spirit',    roots: ['umbar'], weight: 0.8 },
    { id: 'doom',       cat: 'spirit',    roots: ['umbar','mor'], weight: 0.8 },
    { id: 'freedom',    cat: 'emotion',   roots: ['lerya'], weight: 0.9 },
    { id: 'liberty',    cat: 'emotion',   roots: ['lerya'], weight: 0.8 },
    { id: 'slavery',    cat: 'emotion',   roots: ['moia','racina'], weight: 0.7 },
    { id: 'bondage',    cat: 'emotion',   roots: ['moia'], weight: 0.7 },
    { id: 'duty',       cat: 'emotion',   roots: ['nermë'], weight: 0.8 },
    { id: 'obligation', cat: 'emotion',   roots: ['nermë'], weight: 0.7 },
    { id: 'sacrifice',  cat: 'spirit',    roots: ['antavë','anta'], weight: 0.9 },
    { id: 'redemption', cat: 'spirit',    roots: ['envanyalë','envanya'], weight: 0.8 },
    { id: 'vengeance',  cat: 'emotion',   roots: ['aicalë'], weight: 0.8 },
    { id: 'retribution',cat: 'emotion',   roots: ['aicalë'], weight: 0.7 },
    { id: 'forgiveness',cat: 'emotion',   roots: ['hanyassë','avatyara'], weight: 0.8 },
    { id: 'pardon',     cat: 'emotion',   roots: ['hanyassë','avatyara'], weight: 0.7 },
    { id: 'patience',   cat: 'emotion',   roots: ['harmë','hara'], weight: 0.7 },
    { id: 'chaos',      cat: 'emotion',   roots: ['ohtacárë','mor'], weight: 0.7 },
    { id: 'order',      cat: 'emotion',   roots: ['sanyalë','san'], weight: 0.8 },
    { id: 'harmony',    cat: 'emotion',   roots: ['sanyalë','lin','sérë'], weight: 0.8 },
    { id: 'mystery',    cat: 'knowledge', roots: ['rainë'], weight: 0.8 },
    { id: 'pride',      cat: 'emotion',   roots: ['almaréa','alcar'], weight: 0.7 },
    { id: 'humility',   cat: 'emotion',   roots: ['nútëa'], weight: 0.7 },

    // ═══ Actions (extended) ═══
    { id: 'teach',      cat: 'knowledge', roots: ['tulta','ista'], weight: 0.8 },
    { id: 'instruct',   cat: 'knowledge', roots: ['tulta'], weight: 0.7 },
    { id: 'learn',      cat: 'knowledge', roots: ['nolya','ista'], weight: 0.8 },
    { id: 'write',      cat: 'knowledge', roots: ['teca','parma'], weight: 0.8 },
    { id: 'inscribe',   cat: 'knowledge', roots: ['teca'], weight: 0.7 },
    { id: 'read',       cat: 'knowledge', roots: ['parya','parma'], weight: 0.8 },
    { id: 'weave',      cat: 'knowledge', roots: ['fasta'], weight: 0.7 },
    { id: 'bless',      cat: 'spirit',    roots: ['aista','var'], weight: 0.8 },
    { id: 'curse',      cat: 'spirit',    roots: ['ruhta','mor'], weight: 0.7 },
    { id: 'forgive',    cat: 'social',    roots: ['avatyara','hanyassë'], weight: 0.8 },
    { id: 'remember',   cat: 'knowledge', roots: ['rinta','myndar'], weight: 0.8 },
    { id: 'choose',     cat: 'social',    roots: ['hesta'], weight: 0.7 },
    { id: 'select',     cat: 'social',    roots: ['hesta'], weight: 0.6 },
    { id: 'conquer',    cat: 'military',  roots: ['tarya','tara'], weight: 0.7 },
    { id: 'surrender',  cat: 'military',  roots: ['lantalda','lanta'], weight: 0.7 },
    { id: 'kneel',      cat: 'social',    roots: ['caita'], weight: 0.7 },
    { id: 'bow',        cat: 'social',    roots: ['caita'], weight: 0.7 },
    { id: 'follow',     cat: 'social',    roots: ['hilya'], weight: 0.7 },
    { id: 'free',       cat: 'social',    roots: ['lerya'], weight: 0.8 },
    { id: 'liberate',   cat: 'social',    roots: ['lerya'], weight: 0.7 },
    { id: 'weep',       cat: 'emotion',   roots: ['nírya','nírë'], weight: 0.7 },
    { id: 'cry',        cat: 'emotion',   roots: ['nírya','yalla'], weight: 0.7 },
    { id: 'sing',       cat: 'knowledge', roots: ['linda','lin'], weight: 0.9 },
    { id: 'speak',      cat: 'knowledge', roots: ['centa'], weight: 0.9 },
    { id: 'swear',      cat: 'social',    roots: ['vesta'], weight: 0.8 },
    { id: 'promise',    cat: 'social',    roots: ['vesta'], weight: 0.8 },

    // ═══ Nobility & Houses ═══
    { id: 'noble house',cat: 'social',    roots: ['nostë','ara','hérë'], weight: 0.9 },
    { id: 'great house', cat: 'social',   roots: ['arnostë','nostë','ara'], weight: 0.9 },
    { id: 'heir',       cat: 'social',    roots: ['hênion','hên'], weight: 0.9 },
    { id: 'successor',  cat: 'social',    roots: ['hênion'], weight: 0.8 },
    { id: 'lineage',    cat: 'social',    roots: ['nossírë','sercë'], weight: 0.9 },
    { id: 'bloodline',  cat: 'social',    roots: ['nossírë','sercë'], weight: 0.8 },
    { id: 'dynasty',    cat: 'social',    roots: ['nossercion','nostë','sercë'], weight: 0.8 },
    { id: 'estate',     cat: 'architecture', roots: ['normar','nor','mar'], weight: 0.7 },
    { id: 'domain',     cat: 'architecture', roots: ['normar','dorë'], weight: 0.8 },
    { id: 'vassal',     cat: 'social',    roots: ['nurthal','thal'], weight: 0.8 },
    { id: 'liege',      cat: 'social',    roots: ['thaltir','thal','tir'], weight: 0.8 },
    { id: 'overlord',   cat: 'social',    roots: ['thaltir','heru'], weight: 0.7 },
    { id: 'courtier',   cat: 'social',    roots: ['tarano','tara'], weight: 0.7 },
    { id: 'chamberlain',cat: 'social',    roots: ['martir','mar','tir'], weight: 0.7 },
    { id: 'chancellor', cat: 'social',    roots: ['hérëcáno','hérë','cáno'], weight: 0.8 },
    { id: 'warden',     cat: 'military',  roots: ['nortir','nor','tir'], weight: 0.8 },
    { id: 'inheritance',cat: 'social',    roots: ['antamë','anta'], weight: 0.8 },
    { id: 'legacy',     cat: 'social',    roots: ['antamë'], weight: 0.7 },
    { id: 'succession', cat: 'social',    roots: ['nossírëcár','nossírë'], weight: 0.7 },
    { id: 'birthright', cat: 'social',    roots: ['yestanermë','yesta','nermë'], weight: 0.7 },
    { id: 'sigil',      cat: 'social',    roots: ['nostëcalma','nostë','cal'], weight: 0.8 },
    { id: 'crest',      cat: 'social',    roots: ['nostëcalma','ranel'], weight: 0.7 },
    { id: 'heraldry',   cat: 'knowledge', roots: ['ranelië','ranel'], weight: 0.7 },

    // ═══ Natural Philosophy & Science ═══
    { id: 'weight',     cat: 'nature',    roots: ['lungë'], weight: 0.8 },
    { id: 'heaviness',  cat: 'nature',    roots: ['lungë'], weight: 0.7 },
    { id: 'gravity',    cat: 'nature',    roots: ['lungësanyar','lungë','sanyar'], weight: 1.0 },
    { id: 'force',      cat: 'nature',    roots: ['tulcalë','tulca'], weight: 0.9 },
    { id: 'energy',     cat: 'nature',    roots: ['cuivëlë','cuivë','naur'], weight: 0.9 },
    { id: 'mass',       cat: 'nature',    roots: ['ondalë','ondo'], weight: 0.8 },
    { id: 'density',    cat: 'nature',    roots: ['ondahasta','ondo','hosta'], weight: 0.7 },
    { id: 'orbit',      cat: 'celestial', roots: ['tíriel','tir','ael'], weight: 0.9 },
    { id: 'rotation',   cat: 'nature',    roots: ['querië'], weight: 0.8 },
    { id: 'spin',       cat: 'nature',    roots: ['querië'], weight: 0.7 },
    { id: 'tide',       cat: 'nature',    roots: ['uilië','uin'], weight: 0.8 },
    { id: 'current',    cat: 'nature',    roots: ['sírë','nén'], weight: 0.8 },
    { id: 'flow',       cat: 'nature',    roots: ['sírë'], weight: 0.7 },
    { id: 'wave',       cat: 'nature',    roots: ['falma','uin'], weight: 0.9 },
    { id: 'frequency',  cat: 'nature',    roots: ['falmaquërië','falma','querië'], weight: 0.7 },
    { id: 'spectrum',   cat: 'celestial', roots: ['calacárië','cala'], weight: 0.8 },
    { id: 'void',       cat: 'celestial', roots: ['morvailë','mor','vael'], weight: 0.9 },
    { id: 'space',      cat: 'celestial', roots: ['morvailë','aer'], weight: 0.8 },
    { id: 'nebula',     cat: 'celestial', roots: ['fanyacalë','fanya','cal'], weight: 0.8 },
    { id: 'singularity',cat: 'celestial', roots: ['lungëtum','lungë','tumna'], weight: 0.8 },
    { id: 'black hole', cat: 'celestial', roots: ['lungëtum','mor'], weight: 0.7 },
    { id: 'element',    cat: 'nature',    roots: ['erthë'], weight: 0.8 },
    { id: 'atom',       cat: 'nature',    roots: ['erthin','erthë'], weight: 0.7 },
    { id: 'matter',     cat: 'nature',    roots: ['ondassë','ondo'], weight: 0.8 },
    { id: 'substance',  cat: 'nature',    roots: ['ondassë','ondo'], weight: 0.7 },
    { id: 'theory',     cat: 'knowledge', roots: ['sanmëtírië','sanmë','tir'], weight: 0.9 },
    { id: 'hypothesis', cat: 'knowledge', roots: ['sanmëtírië','sanmë'], weight: 0.7 },
    { id: 'natural law',cat: 'knowledge', roots: ['erthësanyar','sanyar','erthë'], weight: 0.8 },
    { id: 'scientific law', cat: 'knowledge', roots: ['erthësanyar','sanyar'], weight: 0.8 },
    { id: 'experiment', cat: 'knowledge', roots: ['centatírië','centa','tir'], weight: 0.8 },
    { id: 'observation',cat: 'knowledge', roots: ['tírië','tir'], weight: 0.8 },
    { id: 'measurement',cat: 'knowledge', roots: ['notiër','not'], weight: 0.7 },
    { id: 'calculation',cat: 'knowledge', roots: ['notië','not'], weight: 0.8 },
    { id: 'mathematics',cat: 'knowledge', roots: ['notië'], weight: 0.7 },
    { id: 'lens',       cat: 'knowledge', roots: ['hencalassë','hen','calassë'], weight: 0.7 },
    { id: 'telescope',  cat: 'knowledge', roots: ['aeltírion','ael','tir'], weight: 0.8 },
    { id: 'compass',    cat: 'knowledge', roots: ['tiëhírë','tië','hir'], weight: 0.7 },
    { id: 'instrument', cat: 'knowledge', roots: ['istacalma','ista'], weight: 0.7 },
    { id: 'radiation',  cat: 'celestial', roots: ['calasírë','cala','sírë'], weight: 0.7 },
    { id: 'gravity wave', cat: 'celestial', roots: ['lungëfalma','lungë','falma'], weight: 0.7 },
    { id: 'spacetime',  cat: 'celestial', roots: ['morvailëfassë','morvailë','fassë'], weight: 0.8 },

    // ═══ Space & Stellar ═══
    { id: 'galaxy',      cat: 'celestial', roots: ['aelrindë','ael','rindë'], weight: 1.0 },
    { id: 'galactic',    cat: 'celestial', roots: ['aelrindëa','aelrindë'], weight: 0.9 },
    { id: 'star system', cat: 'celestial', roots: ['aelondë','ael'], weight: 0.9 },
    { id: 'solar system',cat: 'celestial', roots: ['aelondë','anor'], weight: 0.8 },
    { id: 'planet',      cat: 'celestial', roots: ['cemen'], weight: 1.0 },
    { id: 'world',       cat: 'celestial', roots: ['cemen','dorë'], weight: 0.9 },
    { id: 'homeworld',   cat: 'celestial', roots: ['cemenyárë','cemen'], weight: 0.8 },
    { id: 'comet',       cat: 'celestial', roots: ['aelfalma','ael','falma'], weight: 0.7 },
    { id: 'asteroid',    cat: 'celestial', roots: ['ondoranya','ondo','ranya'], weight: 0.7 },
    { id: 'meteor',      cat: 'celestial', roots: ['naurrunya','naur','runya'], weight: 0.7 },
    { id: 'constellation', cat: 'celestial', roots: ['aeltirion','ael','tir'], weight: 0.8 },

    // ═══ FTL & Propulsion ═══
    { id: 'warp',        cat: 'celestial', roots: ['vinyahasta','vinya','hasta'], weight: 0.9 },
    { id: 'hyperspace',  cat: 'celestial', roots: ['vinyahastalë','vinyahasta'], weight: 0.9 },
    { id: 'jump',        cat: 'celestial', roots: ['vinyahasta'], weight: 0.7 },
    { id: 'ftl',         cat: 'celestial', roots: ['vinyahasta','vinyahastalë'], weight: 0.8 },
    { id: 'void travel', cat: 'celestial', roots: ['hastië','hasta','morvailë'], weight: 0.8 },

    // ═══ Ship Systems & Technology ═══
    { id: 'reactor',     cat: 'knowledge', roots: ['naurondo','naur','ondo'], weight: 0.8 },
    { id: 'engine',      cat: 'knowledge', roots: ['tulcamë','tulca'], weight: 0.9 },
    { id: 'power core',  cat: 'knowledge', roots: ['cuivëhón','cuivëlë','hón'], weight: 0.8 },
    { id: 'shield generator', cat: 'military', roots: ['thaldalë','thal','dalë'], weight: 0.8 },
    { id: 'sensor',      cat: 'knowledge', roots: ['tirilmë','tir'], weight: 0.8 },
    { id: 'scanner',     cat: 'knowledge', roots: ['tirilmë','tir','hir'], weight: 0.7 },
    { id: 'communicator', cat: 'knowledge', roots: ['centilmë','centa'], weight: 0.8 },
    { id: 'signal',      cat: 'knowledge', roots: ['centasírë','centa','sírë'], weight: 0.8 },
    { id: 'transmission', cat: 'knowledge', roots: ['centasírë'], weight: 0.7 },

    // ═══ Ship Structure ═══
    { id: 'hull',        cat: 'military',  roots: ['ciryahelvë','cirya','helvë'], weight: 0.9 },
    { id: 'bulkhead',    cat: 'military',  roots: ['ciryathallë','cirya','thal'], weight: 0.7 },
    { id: 'hangar',      cat: 'military',  roots: ['ciryacova','cirya','cova'], weight: 0.8 },
    { id: 'airlock',     cat: 'military',  roots: ['morvailëando','morvailë','ando'], weight: 0.7 },
    { id: 'corridor',    cat: 'architecture', roots: ['tiëhallë','tië'], weight: 0.7 },

    // ═══ Settlements & Structures ═══
    { id: 'colony',      cat: 'social',    roots: ['cemennorë','cemen','nor'], weight: 0.8 },
    { id: 'outpost',     cat: 'military',  roots: ['tirnorë','tir','nor'], weight: 0.8 },
    { id: 'station',     cat: 'architecture', roots: ['aerhalla','aer','halla'], weight: 0.8 },
    { id: 'orbital',     cat: 'architecture', roots: ['tírielmar','tíriel','mar'], weight: 0.7 },
    { id: 'satellite',   cat: 'celestial', roots: ['tírielmar','tíriel'], weight: 0.7 },

    // ═══ Peoples & Contact ═══
    { id: 'alien',       cat: 'social',    roots: ['othranossë','othar'], weight: 0.9 },
    { id: 'species',     cat: 'knowledge', roots: ['nossëa','nostë'], weight: 0.8 },
    { id: 'civilization', cat: 'social',   roots: ['hérëondë','hérë','dalë'], weight: 0.9 },

    // ═══ Navigation & Spatial ═══
    { id: 'sector',      cat: 'celestial', roots: ['aeldorë','ael','dorë'], weight: 0.8 },
    { id: 'quadrant',    cat: 'celestial', roots: ['aeldorë'], weight: 0.7 },
    { id: 'navigation',  cat: 'knowledge', roots: ['tiëista','tië','ista'], weight: 0.9 },
    { id: 'coordinates', cat: 'knowledge', roots: ['tíriënot','tírië','notië'], weight: 0.7 },
    { id: 'trajectory',  cat: 'knowledge', roots: ['tiësírë','tië','sírë'], weight: 0.7 },
    { id: 'course',      cat: 'knowledge', roots: ['tiësírë','tië'], weight: 0.8 },

    // ═══ Resources & Power ═══
    { id: 'fuel',        cat: 'nature',    roots: ['naurossa','naur'], weight: 0.7 },
    { id: 'power',       cat: 'nature',    roots: ['cuivëtulcë','cuivëlë','tulca'], weight: 0.8 },
    { id: 'energy field', cat: 'nature',   roots: ['tulcathal','tulca','thal'], weight: 0.7 },

    // ═══ Environment ═══
    { id: 'atmosphere',  cat: 'nature',    roots: ['vaelaerë','vael','aer'], weight: 0.8 },
    { id: 'oxygen',      cat: 'nature',    roots: ['thúlëvael','thúlë','vael'], weight: 0.7 },
    { id: 'vacuum',      cat: 'celestial', roots: ['vailëmorë','morvailë'], weight: 0.8 },
    { id: 'pressure',    cat: 'nature',    roots: ['lungë','ondahasta'], weight: 0.6 },

    // ═══ Naval (extended) ═══
    { id: 'crew',        cat: 'military',  roots: ['ciryahosta','cirya','hosta'], weight: 0.8 },
    { id: 'wreckage',    cat: 'military',  roots: ['raucahasta','rauca','hasta'], weight: 0.7 },
    { id: 'debris',      cat: 'military',  roots: ['raucahasta','rauca'], weight: 0.6 },
    { id: 'salvage',     cat: 'military',  roots: ['hirhasta','hir','hasta'], weight: 0.7 },

    // ═══ Family & Relationships ═══
    { id: 'father',      cat: 'social',    roots: ['atar'], weight: 1.0 },
    { id: 'mother',      cat: 'social',    roots: ['amil'], weight: 1.0 },
    { id: 'son',         cat: 'social',    roots: ['yondo','hên'], weight: 0.9 },
    { id: 'daughter',    cat: 'social',    roots: ['yeldë','hên'], weight: 0.9 },
    { id: 'brother',     cat: 'social',    roots: ['toron'], weight: 0.9 },
    { id: 'sister',      cat: 'social',    roots: ['nettë'], weight: 0.9 },
    { id: 'husband',     cat: 'social',    roots: ['verno','vesta'], weight: 0.8 },
    { id: 'wife',        cat: 'social',    roots: ['vessë','vesta'], weight: 0.8 },
    { id: 'spouse',      cat: 'social',    roots: ['vestar','vesta'], weight: 0.8 },
    { id: 'marriage',    cat: 'social',    roots: ['vestië','vesta'], weight: 0.9 },
    { id: 'wedding',     cat: 'social',    roots: ['vestië','vesta'], weight: 0.8 },
    { id: 'ancestor',    cat: 'social',    roots: ['nossëatar','atar','nossírë'], weight: 0.8 },
    { id: 'descendant',  cat: 'social',    roots: ['apsen','hên'], weight: 0.7 },
    { id: 'elder',       cat: 'social',    roots: ['yárano','yára'], weight: 0.8 },
    { id: 'infant',      cat: 'social',    roots: ['vinyahên','vinya','hên'], weight: 0.7 },
    { id: 'baby',        cat: 'social',    roots: ['vinyahên'], weight: 0.7 },

    // ═══ Emotions (extended) ═══
    { id: 'shame',       cat: 'emotion',   roots: ['nairelë'], weight: 0.8 },
    { id: 'dishonor',    cat: 'emotion',   roots: ['nairelë'], weight: 0.7 },
    { id: 'regret',      cat: 'emotion',   roots: ['enyalië'], weight: 0.8 },
    { id: 'envy',        cat: 'emotion',   roots: ['milvë'], weight: 0.7 },
    { id: 'jealousy',    cat: 'emotion',   roots: ['milvë'], weight: 0.7 },
    { id: 'gratitude',   cat: 'emotion',   roots: ['hantalë'], weight: 0.8 },
    { id: 'thanks',      cat: 'emotion',   roots: ['hantalë'], weight: 0.7 },
    { id: 'despair',     cat: 'emotion',   roots: ['oiencalë','mor'], weight: 0.8 },
    { id: 'nostalgia',   cat: 'emotion',   roots: ['yáramellë','yára','mel'], weight: 0.7 },

    // ═══ Communication ═══
    { id: 'letter',      cat: 'knowledge', roots: ['tecië','teca'], weight: 0.8 },
    { id: 'message',     cat: 'knowledge', roots: ['centassë','centa'], weight: 0.8 },
    { id: 'rumor',       cat: 'social',    roots: ['lassírë','lasta'], weight: 0.7 },
    { id: 'report',      cat: 'military',  roots: ['tíriecenta','tírië','centa'], weight: 0.8 },
    { id: 'command',     cat: 'military',  roots: ['canvacenta','canva','cáno'], weight: 0.9 },
    { id: 'question',    cat: 'knowledge', roots: ['maquetië'], weight: 0.8 },
    { id: 'answer',      cat: 'knowledge', roots: ['hanquetië'], weight: 0.8 },
    { id: 'reply',       cat: 'knowledge', roots: ['hanquetië'], weight: 0.7 },

    // ═══ Colors ═══
    { id: 'black',       cat: 'nature',    roots: ['morna','mor'], weight: 0.8 },
    { id: 'white',       cat: 'nature',    roots: ['lossëa','lossë','sil'], weight: 0.8 },
    { id: 'green',       cat: 'nature',    roots: ['cálëa','galadh'], weight: 0.8 },
    { id: 'grey',        cat: 'nature',    roots: ['sinda'], weight: 0.7 },
    { id: 'gray',        cat: 'nature',    roots: ['sinda'], weight: 0.7 },
    { id: 'brown',       cat: 'nature',    roots: ['varnë'], weight: 0.7 },
    { id: 'purple',      cat: 'nature',    roots: ['tuinë'], weight: 0.7 },

    // ═══ Time (extended) ═══
    { id: 'hour',        cat: 'time',      roots: ['lúmë'], weight: 0.8 },
    { id: 'moment',      cat: 'time',      roots: ['lúmitë','lúmë'], weight: 0.8 },
    { id: 'instant',     cat: 'time',      roots: ['lúmitë'], weight: 0.7 },
    { id: 'century',     cat: 'time',      roots: ['yénrindë','yén'], weight: 0.7 },
    { id: 'epoch',       cat: 'time',      roots: ['yénambë','yén'], weight: 0.8 },
    { id: 'tomorrow',    cat: 'time',      roots: ['anarya','anarë'], weight: 0.7 },
    { id: 'yesterday',   cat: 'time',      roots: ['yáranarë','yára'], weight: 0.7 },
    { id: 'now',         cat: 'time',      roots: ['sí'], weight: 0.8 },
    { id: 'soon',        cat: 'time',      roots: ['enyárë'], weight: 0.7 },
    { id: 'always',      cat: 'time',      roots: ['oialë','var'], weight: 0.8 },
    { id: 'never',       cat: 'time',      roots: ['ú-oialë'], weight: 0.8 },

    // ═══ Warfare (extended) ═══
    { id: 'siege',       cat: 'military',  roots: ['hostië','hosta'], weight: 0.8 },
    { id: 'ambush',      cat: 'military',  roots: ['nurtamahta','nurta','mahta'], weight: 0.8 },
    { id: 'retreat',     cat: 'military',  roots: ['enthasta','hasta'], weight: 0.8 },
    { id: 'withdraw',    cat: 'military',  roots: ['enthasta'], weight: 0.7 },
    { id: 'advance',     cat: 'military',  roots: ['aryahasta','hasta'], weight: 0.8 },
    { id: 'bombardment', cat: 'military',  roots: ['raucanaurë','rauca','naur'], weight: 0.7 },
    { id: 'boarding',    cat: 'military',  roots: ['ciryamahta','cirya','mahta'], weight: 0.8 },
    { id: 'blockade',    cat: 'military',  roots: ['ciryathal','cirya','thal'], weight: 0.8 },
    { id: 'patrol',      cat: 'military',  roots: ['tíriëhasta','tírië','hasta'], weight: 0.8 },
    { id: 'escort',      cat: 'military',  roots: ['tirciryë','tir','cirya'], weight: 0.7 },
    { id: 'reconnaissance', cat: 'military', roots: ['hirtírië','hir','tir'], weight: 0.7 },
    { id: 'scouting',    cat: 'military',  roots: ['hirtírië'], weight: 0.7 },
    { id: 'treason',     cat: 'social',    roots: ['vestaucë','vesta','rauca'], weight: 0.8 },
    { id: 'prisoner',    cat: 'military',  roots: ['mandohon','mandos'], weight: 0.7 },
    { id: 'captive',     cat: 'military',  roots: ['mandohon'], weight: 0.7 },

    // ═══ Advanced Technology ═══
    { id: 'computer',    cat: 'knowledge', roots: ['sanmëdalë','sanmë','dalë'], weight: 0.9 },
    { id: 'AI',          cat: 'knowledge', roots: ['fëadalë','fëa','dalë'], weight: 0.9 },
    { id: 'artificial intelligence', cat: 'knowledge', roots: ['fëadalë','fëa','dalë'], weight: 0.9 },
    { id: 'hologram',    cat: 'knowledge', roots: ['calahroa','cala','hroa'], weight: 0.8 },
    { id: 'drone',       cat: 'military',  roots: ['tirnossë','tir'], weight: 0.7 },
    { id: 'cybernetic',  cat: 'knowledge', roots: ['ondafëa','ondo','fëa'], weight: 0.7 },
    { id: 'encryption',  cat: 'knowledge', roots: ['nólëcalma','nólë','calma'], weight: 0.7 },
    { id: 'data',        cat: 'knowledge', roots: ['istassë','ista'], weight: 0.8 },
    { id: 'information', cat: 'knowledge', roots: ['istassë','ista'], weight: 0.7 },
    { id: 'network',     cat: 'knowledge', roots: ['istasírë','ista','sírë'], weight: 0.8 },
    { id: 'medicine',    cat: 'knowledge', roots: ['sérëdalë','sérë','dalë'], weight: 0.8 },
    { id: 'medical',     cat: 'knowledge', roots: ['sérëdalë','sérë'], weight: 0.7 },
    { id: 'diagnostic',  cat: 'knowledge', roots: ['hroatírië','hroa','tírië'], weight: 0.7 },

    // ═══ Materials ═══
    { id: 'steel',       cat: 'nature',    roots: ['angë','ondo'], weight: 0.8 },
    { id: 'alloy',       cat: 'nature',    roots: ['angëminya','angë'], weight: 0.7 },
    { id: 'plasma',      cat: 'nature',    roots: ['naurossa','naur'], weight: 0.8 },
    { id: 'antimatter',  cat: 'nature',    roots: ['úondassë','ondassë'], weight: 0.8 },

    // ═══ Weapons ═══
    { id: 'cannon',      cat: 'military',  roots: ['raucanaurion','rauca','naur'], weight: 0.8 },
    { id: 'turret',      cat: 'military',  roots: ['tíriënaurion','tírië','naur'], weight: 0.7 },
    { id: 'torpedo',     cat: 'military',  roots: ['hastarunya','hasta','runya'], weight: 0.8 },
    { id: 'beam',        cat: 'military',  roots: ['calasírion','cala','sírë'], weight: 0.8 },
    { id: 'laser',       cat: 'military',  roots: ['calasírion','cal'], weight: 0.7 },
    { id: 'explosive',   cat: 'military',  roots: ['raucaerthin','rauca','erthin'], weight: 0.7 },

    // ═══ Philosophy ═══
    { id: 'logic',       cat: 'knowledge', roots: ['sanyanolmë','san','nolmë'], weight: 0.8 },
    { id: 'ethics',      cat: 'knowledge', roots: ['mánolmë','mâ','nolmë'], weight: 0.8 },
    { id: 'morality',    cat: 'knowledge', roots: ['mánolmë'], weight: 0.7 },
    { id: 'virtue',      cat: 'spirit',    roots: ['aicalma','cal'], weight: 0.8 },
    { id: 'conscience',  cat: 'spirit',    roots: ['hónsanmë','hón','sanmë'], weight: 0.8 },
    { id: 'belief',      cat: 'spirit',    roots: ['estëlië','estel'], weight: 0.8 },
    { id: 'doubt',       cat: 'knowledge', roots: ['úistië','ista'], weight: 0.7 },
    { id: 'certainty',   cat: 'knowledge', roots: ['sancalë','sanda','cal'], weight: 0.7 },

    // ═══ Economics ═══
    { id: 'price',       cat: 'social',    roots: ['mirnotië','mir','notië'], weight: 0.7 },
    { id: 'wealth',      cat: 'social',    roots: ['mirath','mir'], weight: 0.8 },
    { id: 'poverty',     cat: 'social',    roots: ['úmirath'], weight: 0.7 },
    { id: 'guild',       cat: 'social',    roots: ['dalëath','dalë'], weight: 0.8 },

    // ═══ Nature (extended) ═══
    { id: 'seed',        cat: 'nature',    roots: ['erdë','yesta'], weight: 0.7 },
    { id: 'root',        cat: 'nature',    roots: ['talca','nor'], weight: 0.7 },
    { id: 'leaf',        cat: 'nature',    roots: ['lassë','galadh'], weight: 0.8 },
    { id: 'branch',      cat: 'nature',    roots: ['olva','galadh'], weight: 0.7 },
    { id: 'fruit',       cat: 'nature',    roots: ['yávë','yavië'], weight: 0.8 },
    { id: 'eagle',       cat: 'nature',    roots: ['soron','aer'], weight: 0.8 },
    { id: 'serpent',     cat: 'nature',    roots: ['lócë'], weight: 0.8 },
    { id: 'snake',       cat: 'nature',    roots: ['lócë'], weight: 0.7 },
    { id: 'dragon',      cat: 'nature',    roots: ['rámacalócë','naur','lócë'], weight: 0.9 },
    { id: 'horizon',     cat: 'nature',    roots: ['aerrima','aer','rima'], weight: 0.8 },

    // ═══ Body (extended) ═══
    { id: 'arm',         cat: 'spirit',    roots: ['rancë'], weight: 0.7 },
    { id: 'leg',         cat: 'spirit',    roots: ['telcë'], weight: 0.7 },
    { id: 'finger',      cat: 'spirit',    roots: ['lepsë','mâ'], weight: 0.6 },
    { id: 'wing',        cat: 'nature',    roots: ['ráma','vilya'], weight: 0.8 },
    { id: 'tooth',       cat: 'spirit',    roots: ['nelet'], weight: 0.6 },
    { id: 'horn',        cat: 'nature',    roots: ['tildë'], weight: 0.6 },

    // ═══ Propulsion & Power (dossier) ═══
    { id: 'propulsion',  cat: 'knowledge', roots: ['nortalë','norta'], weight: 0.8 },
    { id: 'drive',       cat: 'knowledge', roots: ['nortalë','tulcamë'], weight: 0.7 },
    { id: 'torch drive', cat: 'knowledge', roots: ['naurtulcë','naur','tulcë'], weight: 0.8 },
    { id: 'thruster',    cat: 'knowledge', roots: ['naurtulcë'], weight: 0.7 },
    { id: 'solar sail',  cat: 'knowledge', roots: ['anorcalafassë','anor','cala','fassë'], weight: 0.7 },
    { id: 'fusion',      cat: 'knowledge', roots: ['erthinyestië','erthin'], weight: 0.9 },
    { id: 'fusion core', cat: 'knowledge', roots: ['erthinhón','erthin','hón'], weight: 0.8 },
    { id: 'fusion reactor', cat: 'knowledge', roots: ['erthinhón'], weight: 0.8 },
    { id: 'capacitor',   cat: 'knowledge', roots: ['cuivëcova','cuivëlë','cova'], weight: 0.7 },
    { id: 'flux vault',  cat: 'knowledge', roots: ['cuivëcova'], weight: 0.7 },
    { id: 'flywheel',    cat: 'knowledge', roots: ['quëriecova','querië','cova'], weight: 0.6 },

    // ═══ Sensors (dossier) ═══
    { id: 'radar',       cat: 'knowledge', roots: ['falmatírilmë','falma','tir'], weight: 0.8 },
    { id: 'lidar',       cat: 'knowledge', roots: ['calatírilmë','cala','tir'], weight: 0.7 },
    { id: 'imager',      cat: 'knowledge', roots: ['cenilmë','cena'], weight: 0.7 },
    { id: 'spectrometer', cat: 'knowledge', roots: ['calaquërilmë','cala','quer'], weight: 0.6 },
    { id: 'magnetometer', cat: 'knowledge', roots: ['tulcatírilmë','tulcathal','tir'], weight: 0.6 },
    { id: 'detector',    cat: 'knowledge', roots: ['hirtilmë','hir'], weight: 0.7 },

    // ═══ Electronic Warfare (dossier) ═══
    { id: 'electronic warfare', cat: 'military', roots: ['centamahta','centa','mahta'], weight: 0.8 },
    { id: 'jammer',      cat: 'military',  roots: ['centanurta','centa','nurta'], weight: 0.7 },
    { id: 'countermeasure', cat: 'military', roots: ['enthalië','thal'], weight: 0.7 },
    { id: 'decoy',       cat: 'military',  roots: ['wanwahroa','wanwa','hroa'], weight: 0.7 },

    // ═══ Armament (dossier) ═══
    { id: 'lance',       cat: 'military',  roots: ['calahasta','cala','hasta'], weight: 0.9 },
    { id: 'missile',     cat: 'military',  roots: ['tiëhastarunya','tië','hasta','runya'], weight: 0.8 },
    { id: 'point defense', cat: 'military', roots: ['thaltirilmë','thal','tir'], weight: 0.8 },
    { id: 'projectile',  cat: 'military',  roots: ['tulcarunya','tulca','runya'], weight: 0.7 },
    { id: 'penetrator',  cat: 'military',  roots: ['tercano','ter'], weight: 0.7 },
    { id: 'sabot',       cat: 'military',  roots: ['raucarunya','rauca','runya'], weight: 0.6 },
    { id: 'ammunition',  cat: 'military',  roots: ['runyacova','runya','cova'], weight: 0.7 },
    { id: 'ammo',        cat: 'military',  roots: ['runyacova'], weight: 0.6 },
    { id: 'autoloader',  cat: 'military',  roots: ['naurionpantë','naurion','panta'], weight: 0.6 },
    { id: 'barrel',      cat: 'military',  roots: ['naurionossë','naurion'], weight: 0.6 },
    { id: 'suppression', cat: 'military',  roots: ['nurtanaurë','nurta','naur'], weight: 0.7 },

    // ═══ Armor (dossier) ═══
    { id: 'armor',       cat: 'military',  roots: ['turma','tur'], weight: 0.9 },
    { id: 'ablative',    cat: 'military',  roots: ['lanta turma','lanta','turma'], weight: 0.7 },
    { id: 'ceramic',     cat: 'nature',    roots: ['ondacalë','ondo','cal'], weight: 0.7 },
    { id: 'laminate',    cat: 'military',  roots: ['parmaturma','parma','turma'], weight: 0.6 },
    { id: 'lattice',     cat: 'knowledge', roots: ['raicossë','raic'], weight: 0.7 },
    { id: 'monocrystal', cat: 'knowledge', roots: ['ercalassë','er','calassë'], weight: 0.6 },
    { id: 'plating',     cat: 'military',  roots: ['turmahelvë','turma','helvë'], weight: 0.7 },
    { id: 'foam',        cat: 'knowledge', roots: ['lungëmassë','lungë'], weight: 0.6 },
    { id: 'coating',     cat: 'military',  roots: ['turmafassë','turma','fassë'], weight: 0.6 },

    // ═══ Shields (dossier) ═══
    { id: 'shield grid', cat: 'military',  roots: ['thalraicë','thal','raicë'], weight: 0.8 },
    { id: 'halo shield', cat: 'military',  roots: ['thalrindë','thal','rindë'], weight: 0.7 },
    { id: 'photonic',    cat: 'knowledge', roots: ['calacárëa','cala','cárië'], weight: 0.7 },

    // ═══ Craft Types (dossier) ═══
    { id: 'interceptor', cat: 'military',  roots: ['rámaciryë','ráma','cirya'], weight: 0.8 },
    { id: 'transport',   cat: 'military',  roots: ['colciryë','cola','cirya'], weight: 0.8 },
    { id: 'fighter',     cat: 'military',  roots: ['mahtaciryë','mahta','cirya'], weight: 0.8 },
    { id: 'frigate',     cat: 'military',  roots: ['tirciryë','tir','cirya'], weight: 0.8 },

    // ═══ Thermal & Systems (dossier) ═══
    { id: 'heat',        cat: 'nature',    roots: ['urucalë','ur','cal'], weight: 0.8 },
    { id: 'thermal',     cat: 'nature',    roots: ['urucalë'], weight: 0.7 },
    { id: 'radiator',    cat: 'knowledge', roots: ['urulantilmë','uru','lanta'], weight: 0.7 },
    { id: 'coolant',     cat: 'knowledge', roots: ['ringassë','ringa'], weight: 0.7 },
    { id: 'cooling',     cat: 'knowledge', roots: ['ringalë','ringa'], weight: 0.7 },
    { id: 'ram intake',  cat: 'knowledge', roots: ['thúlëmapë','thúlë','mapë'], weight: 0.6 },
    { id: 'cloning',     cat: 'knowledge', roots: ['ontalë','onta'], weight: 0.7 },
    { id: 'repair',      cat: 'knowledge', roots: ['envanyalë','envanya'], weight: 0.7 },
    { id: 'mending',     cat: 'knowledge', roots: ['envanyalë'], weight: 0.6 },
    { id: 'docking',     cat: 'knowledge', roots: ['ciryavestë','cirya','vesta'], weight: 0.7 },

    // ═══ Ground Vehicles (dossier) ═══
    { id: 'tank',        cat: 'military',  roots: ['turmaroch','turma','roch'], weight: 0.9 },
    { id: 'vehicle',     cat: 'knowledge', roots: ['nortaroch','norta','roch'], weight: 0.8 },
    { id: 'driver',      cat: 'social',    roots: ['nortano','norta'], weight: 0.7 },
    { id: 'gunner',      cat: 'military',  roots: ['nauritar','naur'], weight: 0.7 },
    { id: 'fire control', cat: 'military', roots: ['naurësanmë','naur','sanmë'], weight: 0.8 },
    { id: 'targeting',   cat: 'military',  roots: ['centatírilmë','centa','tírië'], weight: 0.7 },
    { id: 'hatch',       cat: 'knowledge', roots: ['latando','lat','ando'], weight: 0.6 },
    { id: 'self-destruct', cat: 'military', roots: ['ciryafiralë','cirya','fira'], weight: 0.7 },

    // ═══ Operational Terms (dossier) ═══
    { id: 'sortie',      cat: 'military',  roots: ['ciryalanta','cirya','lanta'], weight: 0.8 },
    { id: 'strike',      cat: 'military',  roots: ['raucahasta','rauca','hasta'], weight: 0.8 },
    { id: 'interdiction', cat: 'military', roots: ['tiëthallë','tië','thal'], weight: 0.7 },
    { id: 'combined arms', cat: 'military', roots: ['ilyamahtië','ilya','mahta'], weight: 0.7 },
    { id: 'hardpoint',   cat: 'military',  roots: ['naurionvestë','naurion','vestë'], weight: 0.6 },
    { id: 'modular',     cat: 'knowledge', roots: ['pantalë','panta'], weight: 0.7 },
    { id: 'maintenance', cat: 'knowledge', roots: ['camnolë','cam','nolë'], weight: 0.7 },
    { id: 'logistics',   cat: 'military',  roots: ['nortëcolë','norta','cola'], weight: 0.8 },
    { id: 'resupply',    cat: 'military',  roots: ['enyantië','anta'], weight: 0.7 },
    { id: 'replenishment', cat: 'military', roots: ['enyantië'], weight: 0.7 },
    { id: 'deployment',  cat: 'military',  roots: ['hastanortië','hasta','norta'], weight: 0.8 },
    { id: 'operational range', cat: 'military', roots: ['andahastië','anda','hastië'], weight: 0.6 },
    { id: 'survivability', cat: 'military', roots: ['cuivëtulcië','cuivëlë','tulcë'], weight: 0.7 },
    { id: 'kinetic',     cat: 'knowledge', roots: ['tulcië','tulcalë'], weight: 0.7 },
    { id: 'caliber',     cat: 'military',  roots: ['naurionandë','naurion'], weight: 0.6 },
    { id: 'contested',   cat: 'military',  roots: ['mahtadorë','mahta','dorë'], weight: 0.6 },
    { id: 'tracked vehicle', cat: 'military', roots: ['nortacemë','norta','cemë'], weight: 0.7 },

    // ═══ Aircraft & Rotorcraft ═══
    { id: 'rotor',       cat: 'knowledge', roots: ['quërirámë','querië','ráma'], weight: 0.7 },
    { id: 'helicopter',  cat: 'military',  roots: ['quërirámaciryë','quërirámë','cirya'], weight: 0.8 },
    { id: 'rotorcraft',  cat: 'military',  roots: ['quërirámaciryë'], weight: 0.8 },
    { id: 'VTOL',        cat: 'knowledge', roots: ['ortahastië','orta','hastië'], weight: 0.7 },
    { id: 'fuselage',    cat: 'knowledge', roots: ['ciryahón','cirya','hón'], weight: 0.7 },
    { id: 'nose',        cat: 'knowledge', roots: ['ciryatië','cirya','tië'], weight: 0.6 },
    { id: 'prow',        cat: 'knowledge', roots: ['ciryatië'], weight: 0.6 },
    { id: 'tail',        cat: 'knowledge', roots: ['ciryatellë','cirya'], weight: 0.6 },
    { id: 'cockpit',     cat: 'knowledge', roots: ['tirilmar','tir','mar'], weight: 0.8 },
    { id: 'gimbal',      cat: 'knowledge', roots: ['quëricenta','querië','centa'], weight: 0.6 },
    { id: 'altitude',    cat: 'knowledge', roots: ['hallëtírië','halla','tírië'], weight: 0.7 },
    { id: 'hover',       cat: 'knowledge', roots: ['haratírië','hara','tírië'], weight: 0.7 },
    { id: 'endurance',   cat: 'military',  roots: ['cuivëandë','cuivëlë','anda'], weight: 0.7 },
    { id: 'loiter',      cat: 'military',  roots: ['harahastië','hara','hastië'], weight: 0.6 },
    { id: 'rendezvous',  cat: 'military',  roots: ['omentië'], weight: 0.7 },

    // ═══ Weapon Systems (aircraft) ═══
    { id: 'particle beam', cat: 'military', roots: ['erthintulcë','erthin','tulcë'], weight: 0.8 },
    { id: 'warhead',     cat: 'military',  roots: ['raucahón','rauca','hón'], weight: 0.8 },
    { id: 'fragmentation', cat: 'military', roots: ['raucalantë','rauca','lanta'], weight: 0.7 },
    { id: 'thermobaric', cat: 'military',  roots: ['thúlëraucë','thúlë','rauca'], weight: 0.7 },
    { id: 'guidance',    cat: 'military',  roots: ['tiëhirilmë','tië','hir'], weight: 0.8 },
    { id: 'seeker',      cat: 'military',  roots: ['hiritar','hir'], weight: 0.7 },
    { id: 'datalink',    cat: 'knowledge', roots: ['istahallë','ista','hallë'], weight: 0.7 },

    // ═══ Countermeasures ═══
    { id: 'flare',       cat: 'military',  roots: ['uruwanwa','uru','wanwa'], weight: 0.7 },
    { id: 'chaff',       cat: 'military',  roots: ['falmawanwa','falma','wanwa'], weight: 0.7 },
    { id: 'obscurant',   cat: 'military',  roots: ['nurtaúsquë','nurta','usquë'], weight: 0.7 },
    { id: 'smoke screen', cat: 'military', roots: ['nurtaúsquë','usquë'], weight: 0.7 },
    { id: 'active protection', cat: 'military', roots: ['thaltíriënurta','thal','tírië'], weight: 0.7 },
    { id: 'IFF',         cat: 'military',  roots: ['nossëtirilmë','nossë','tir'], weight: 0.7 },

    // ═══ Stealth & Maneuver ═══
    { id: 'stealth',     cat: 'military',  roots: ['nurtahastië','nurta','hastië'], weight: 0.8 },
    { id: 'evasion',     cat: 'military',  roots: ['leryahastië','lerya','hastië'], weight: 0.7 },
    { id: 'maneuver',    cat: 'military',  roots: ['tiëpantië','tië','panta'], weight: 0.7 },
    { id: 'speed',       cat: 'knowledge', roots: ['lancië','lanc'], weight: 0.8 },
    { id: 'velocity',    cat: 'knowledge', roots: ['lancië'], weight: 0.7 },

    // ═══ Light & Physics (dossier) ═══
    { id: 'hardlight',   cat: 'knowledge', roots: ['tulcacala','tulca','cala'], weight: 0.8 },
    { id: 'photon',      cat: 'knowledge', roots: ['calerthin','cala','erthin'], weight: 0.8 },
    { id: 'boson',       cat: 'knowledge', roots: ['tulcërthin','tulca','erthin'], weight: 0.7 },
    { id: 'wavelength',  cat: 'knowledge', roots: ['falmanotië','falma','notië'], weight: 0.7 },
    { id: 'infrared',    cat: 'knowledge', roots: ['urucala','uru','cala'], weight: 0.7 },
    { id: 'ultraviolet', cat: 'knowledge', roots: ['aicacala','aica','cala'], weight: 0.7 },
    { id: 'processor',   cat: 'knowledge', roots: ['sanmëhón','sanmë','hón'], weight: 0.8 },
    { id: 'beacon',      cat: 'knowledge', roots: ['centacalma','centa','calma'], weight: 0.7 },
    { id: 'uplink',      cat: 'knowledge', roots: ['aelcentië','ael','centië'], weight: 0.6 },
    { id: 'mesh',        cat: 'knowledge', roots: ['raicëistë','raicë','istë'], weight: 0.7 },
    { id: 'tactical mesh', cat: 'military', roots: ['raicëistë','raicë'], weight: 0.7 },

    // ═══ Common Verbs (gap fill) ═══
    { id: 'chosen',      cat: 'social',    roots: ['hestaina','hesta'], weight: 0.8 },
    { id: 'selected',    cat: 'social',    roots: ['hestaina','hesta'], weight: 0.7 },
    { id: 'obey',        cat: 'social',    roots: ['cápa'], weight: 0.7 },
    { id: 'create',      cat: 'nature',    roots: ['onta','yesta'], weight: 0.9 },
    { id: 'make',        cat: 'nature',    roots: ['onta','tana'], weight: 0.8 },
    { id: 'defend',      cat: 'military',  roots: ['varya','thal'], weight: 0.8 },
    { id: 'ward',        cat: 'military',  roots: ['varya'], weight: 0.7 },
    { id: 'search',      cat: 'knowledge', roots: ['hirya','hir'], weight: 0.8 },
    { id: 'seek',        cat: 'knowledge', roots: ['hirya','hir'], weight: 0.8 },
    { id: 'dream',       cat: 'spirit',    roots: ['olorya','olorë'], weight: 0.8 },
    { id: 'breathe',     cat: 'nature',    roots: ['thúla','thúlë'], weight: 0.7 },
    { id: 'send',        cat: 'social',    roots: ['menta'], weight: 0.8 },
    { id: 'dispatch',    cat: 'military',  roots: ['menta'], weight: 0.7 },
    { id: 'climb',       cat: 'nature',    roots: ['amba'], weight: 0.7 },
    { id: 'ascend',      cat: 'nature',    roots: ['amba','orta'], weight: 0.7 },
    { id: 'swim',        cat: 'nature',    roots: ['nuilya'], weight: 0.6 },
    { id: 'jump',        cat: 'nature',    roots: ['capta'], weight: 0.6 },
    { id: 'leap',        cat: 'nature',    roots: ['capta'], weight: 0.6 },
    { id: 'hate',        cat: 'emotion',   roots: ['moimë'], weight: 0.8 },
    { id: 'hatred',      cat: 'emotion',   roots: ['moimë'], weight: 0.8 },
    { id: 'fear',        cat: 'emotion',   roots: ['osta'], weight: 0.8 },
    { id: 'dread',       cat: 'emotion',   roots: ['osta'], weight: 0.7 },
    { id: 'pray',        cat: 'spirit',    roots: ['saila','valro'], weight: 0.8 },
    { id: 'prayer',      cat: 'spirit',    roots: ['saila'], weight: 0.7 },
    { id: 'mourn',       cat: 'emotion',   roots: ['nainië','nainë'], weight: 0.8 },
    { id: 'mourning',    cat: 'emotion',   roots: ['nainië'], weight: 0.7 },
    { id: 'lament',      cat: 'emotion',   roots: ['nainië','nainë'], weight: 0.8 },
    { id: 'submit',      cat: 'social',    roots: ['nuquerna'], weight: 0.7 },
    { id: 'yield',       cat: 'social',    roots: ['nuquerna','lantalda'], weight: 0.7 },
    { id: 'endure',      cat: 'spirit',    roots: ['tulya','tulca'], weight: 0.8 },
    { id: 'withstand',   cat: 'spirit',    roots: ['tulya'], weight: 0.7 },
    { id: 'need',        cat: 'social',    roots: ['maurë'], weight: 0.8 },
    { id: 'necessity',   cat: 'social',    roots: ['maurë'], weight: 0.7 },
    { id: 'believe',     cat: 'spirit',    roots: ['estëlië','estel'], weight: 0.8 },

    // ═══ Common Adjectives/States (gap fill) ═══
    { id: 'weak',        cat: 'nature',    roots: ['laica'], weight: 0.7 },
    { id: 'feeble',      cat: 'nature',    roots: ['laica'], weight: 0.6 },
    { id: 'brave',       cat: 'spirit',    roots: ['verya'], weight: 0.8 },
    { id: 'bold',        cat: 'spirit',    roots: ['verya'], weight: 0.7 },
    { id: 'courageous',  cat: 'spirit',    roots: ['verya'], weight: 0.7 },
    { id: 'foolish',     cat: 'social',    roots: ['úsaila'], weight: 0.7 },
    { id: 'unwise',      cat: 'social',    roots: ['úsaila'], weight: 0.6 },
    { id: 'cursed',      cat: 'spirit',    roots: ['ruhtaina','ruhta'], weight: 0.8 },
    { id: 'accursed',    cat: 'spirit',    roots: ['ruhtaina'], weight: 0.7 },
    { id: 'worthy',      cat: 'spirit',    roots: ['valda'], weight: 0.8 },
    { id: 'deserving',   cat: 'spirit',    roots: ['valda'], weight: 0.7 },
    { id: 'unworthy',    cat: 'spirit',    roots: ['úvalda','valda'], weight: 0.7 },
    { id: 'alive',       cat: 'nature',    roots: ['cuina','cuiva'], weight: 0.8 },
    { id: 'living',      cat: 'nature',    roots: ['cuina'], weight: 0.7 },
    { id: 'whole',       cat: 'nature',    roots: ['ilqua','ilya'], weight: 0.7 },
    { id: 'complete',    cat: 'nature',    roots: ['ilqua'], weight: 0.7 },
    { id: 'revealed',    cat: 'knowledge', roots: ['pantaina','panta'], weight: 0.7 },
    { id: 'uncovered',   cat: 'knowledge', roots: ['pantaina'], weight: 0.6 },
    { id: 'forsaken',    cat: 'emotion',   roots: ['avátyarna'], weight: 0.8 },
    { id: 'abandoned',   cat: 'emotion',   roots: ['avátyarna'], weight: 0.7 },
    { id: 'mortal',      cat: 'spirit',    roots: ['fírima','fira'], weight: 0.9 },
    { id: 'immortal',    cat: 'spirit',    roots: ['úfírima','fírima'], weight: 0.9 },
    { id: 'deathless',   cat: 'spirit',    roots: ['úfírima'], weight: 0.8 },

    // ═══ Common Nouns (gap fill) ═══
    { id: 'queen',       cat: 'social',    roots: ['tári','tar'], weight: 0.9 },
    { id: 'tale',        cat: 'knowledge', roots: ['quenta','quent'], weight: 0.8 },
    { id: 'story',       cat: 'knowledge', roots: ['quenta'], weight: 0.8 },
    { id: 'narrative',   cat: 'knowledge', roots: ['quenta'], weight: 0.7 }
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
    // Metaphorical / conceptual
    { from: 'hope', to: 'star', type: 'INVOLVES' },
    { from: 'hope', to: 'light', type: 'INVOLVES' },
    { from: 'peace', to: 'water', type: 'INVOLVES' },
    { from: 'peace', to: 'lake', type: 'INVOLVES' },
    { from: 'courage', to: 'fire', type: 'INVOLVES' },
    { from: 'courage', to: 'strong', type: 'RELATED_TO' },
    { from: 'grief', to: 'song', type: 'INVOLVES' },
    { from: 'grief', to: 'defeat', type: 'RELATED_TO' },
    { from: 'grief', to: 'death', type: 'RELATED_TO' },
    { from: 'joy', to: 'light', type: 'INVOLVES' },
    { from: 'joy', to: 'song', type: 'INVOLVES' },

    // Opposites
    { from: 'betrayal', to: 'loyalty', type: 'OPPOSITE_OF' },
    { from: 'death', to: 'life', type: 'OPPOSITE_OF' },
    { from: 'shadow', to: 'light', type: 'OPPOSITE_OF' },
    { from: 'darkness', to: 'light', type: 'OPPOSITE_OF' },
    { from: 'dawn', to: 'dusk', type: 'OPPOSITE_OF' },
    { from: 'sunrise', to: 'sunset', type: 'OPPOSITE_OF' },
    { from: 'summer', to: 'winter', type: 'OPPOSITE_OF' },
    { from: 'spring', to: 'autumn', type: 'OPPOSITE_OF' },
    { from: 'soul', to: 'body', type: 'OPPOSITE_OF' },
    { from: 'day', to: 'night', type: 'OPPOSITE_OF' },
    { from: 'rise', to: 'fall', type: 'OPPOSITE_OF' },
    { from: 'victory', to: 'defeat', type: 'OPPOSITE_OF' },
    { from: 'war', to: 'peace', type: 'OPPOSITE_OF' },
    { from: 'fear', to: 'courage', type: 'OPPOSITE_OF' },
    { from: 'friend', to: 'stranger', type: 'OPPOSITE_OF' },

    // IS_A / taxonomy
    { from: 'wisdom', to: 'lore', type: 'IS_A' },
    { from: 'battle', to: 'war', type: 'IS_A' },
    { from: 'combat', to: 'battle', type: 'IS_A' },
    { from: 'fight', to: 'battle', type: 'IS_A' },
    { from: 'sovereignty', to: 'command', type: 'IS_A' },
    { from: 'bravery', to: 'courage', type: 'IS_A' },
    { from: 'valor', to: 'courage', type: 'IS_A' },
    { from: 'sorrow', to: 'grief', type: 'IS_A' },
    { from: 'serenity', to: 'peace', type: 'IS_A' },
    { from: 'tranquility', to: 'peace', type: 'IS_A' },
    { from: 'wrath', to: 'rage', type: 'IS_A' },
    { from: 'fury', to: 'rage', type: 'IS_A' },
    { from: 'starlight', to: 'light', type: 'IS_A' },
    { from: 'moonlight', to: 'light', type: 'IS_A' },
    { from: 'twilight', to: 'dusk', type: 'IS_A' },
    { from: 'spear', to: 'weapon', type: 'IS_A' },
    { from: 'sword', to: 'weapon', type: 'IS_A' },
    { from: 'bow', to: 'weapon', type: 'IS_A' },
    { from: 'ocean', to: 'water', type: 'IS_A' },
    { from: 'sea', to: 'water', type: 'IS_A' },
    { from: 'lake', to: 'water', type: 'IS_A' },
    { from: 'river', to: 'water', type: 'IS_A' },
    { from: 'stream', to: 'water', type: 'IS_A' },

    // RELATED_TO
    { from: 'love', to: 'loyalty', type: 'RELATED_TO' },
    { from: 'love', to: 'beauty', type: 'RELATED_TO' },
    { from: 'victory', to: 'battle', type: 'RELATED_TO' },
    { from: 'defeat', to: 'battle', type: 'RELATED_TO' },
    { from: 'honor', to: 'loyalty', type: 'RELATED_TO' },
    { from: 'honor', to: 'glory', type: 'RELATED_TO' },
    { from: 'glory', to: 'victory', type: 'RELATED_TO' },
    { from: 'fortress', to: 'guard', type: 'INVOLVES' },
    { from: 'fortress', to: 'shield', type: 'RELATED_TO' },
    { from: 'shield', to: 'guard', type: 'RELATED_TO' },
    { from: 'shield', to: 'protect', type: 'RELATED_TO' },
    { from: 'warrior', to: 'battle', type: 'INVOLVES' },
    { from: 'warrior', to: 'strong', type: 'RELATED_TO' },
    { from: 'leader', to: 'command', type: 'RELATED_TO' },
    { from: 'king', to: 'crown', type: 'INVOLVES' },
    { from: 'king', to: 'lord', type: 'RELATED_TO' },
    { from: 'oath', to: 'loyalty', type: 'RELATED_TO' },
    { from: 'oath', to: 'honor', type: 'RELATED_TO' },
    { from: 'friend', to: 'loyalty', type: 'RELATED_TO' },
    { from: 'friendship', to: 'bond', type: 'RELATED_TO' },
    { from: 'child', to: 'family', type: 'RELATED_TO' },
    { from: 'soul', to: 'spirit', type: 'RELATED_TO' },
    { from: 'ghost', to: 'spirit', type: 'RELATED_TO' },
    { from: 'craft', to: 'art', type: 'RELATED_TO' },
    { from: 'music', to: 'song', type: 'RELATED_TO' },
    { from: 'wisdom', to: 'knowledge', type: 'RELATED_TO' },
    { from: 'strong', to: 'mighty', type: 'RELATED_TO' },
    { from: 'strong', to: 'steadfast', type: 'RELATED_TO' },
    { from: 'noble', to: 'high', type: 'RELATED_TO' },
    { from: 'sacred', to: 'eternal', type: 'RELATED_TO' },
    { from: 'sacred', to: 'vardalum', type: 'INVOLVES' },
    { from: 'fire', to: 'light', type: 'RELATED_TO' },
    { from: 'star', to: 'light', type: 'RELATED_TO' },
    { from: 'moon', to: 'silver', type: 'RELATED_TO' },
    { from: 'sun', to: 'dawn', type: 'RELATED_TO' },
    { from: 'tree', to: 'forest', type: 'RELATED_TO' },
    { from: 'flower', to: 'spring', type: 'RELATED_TO' },
    { from: 'voyage', to: 'ship', type: 'INVOLVES' },
    { from: 'journey', to: 'wander', type: 'RELATED_TO' },
    { from: 'death', to: 'voyage', type: 'INVOLVES' },
    { from: 'heal', to: 'peace', type: 'RELATED_TO' }
  ];

  /* ── Query functions ── */

  function findConcept(query) {
    const q = query.toLowerCase().trim();
    // Direct match
    let match = CONCEPTS.find(c => c.id === q);
    if (match) return [{ ...match, score: 1.0 }];

    // Partial match on concept IDs
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

    if (catMatches.length) return catMatches;

    // Fallback: search dictionary definitions for the query, then find
    // which concepts use those roots. This bridges the gap between
    // words like "strong" and concepts like "courage" that share roots.
    if (_dictRef) {
      const dictHits = _dictRef.filter(e =>
        e.definitions?.some(d => d.toLowerCase().includes(q)) ||
        e.tags?.some(t => t.toLowerCase() === q)
      );
      if (dictHits.length) {
        // Build a synthetic concept from the matched dictionary roots
        const rootWords = dictHits.map(e => e.word);
        // Also find any real concepts that reference these roots
        const linkedConcepts = CONCEPTS.filter(c =>
          c.roots.some(r => rootWords.includes(r))
        ).map(c => ({ ...c, score: 0.6 }));

        if (linkedConcepts.length) return linkedConcepts;

        // No linked concepts, but we have dictionary hits: create a synthetic result
        return [{
          id: q,
          cat: dictHits[0]?.tags?.find(t => Object.keys(CATEGORIES).includes(t)) || 'emotion',
          roots: rootWords.slice(0, 4),
          weight: 0.8,
          score: 0.5,
          synthetic: true
        }];
      }
    }

    return [];
  }

  /* Allow composition engine to pass dictionary reference for fallback search */
  let _dictRef = null;
  function setDictRef(dict) { _dictRef = dict; }

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
    isCulturallyAppropriate,
    setDictRef
  };

})();

if (typeof window !== 'undefined') window.SemanticNetwork = SemanticNetwork;
