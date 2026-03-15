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
    { id: 'shine',      cat: 'celestial', roots: ['calta','cal'], weight: 0.8 }
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
