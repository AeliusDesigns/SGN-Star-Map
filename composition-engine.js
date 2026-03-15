/* ══════════════════════════════════════════
   SGN — LANGUAGE FORGE · LAYER 4
   Composition Engine
   Word gen, name gen, phrase construction
   ══════════════════════════════════════════ */

const CompositionEngine = (() => {

  const PC = () => window.PhonologicalCore;
  const ME = () => window.MorphologicalEngine;
  const SN = () => window.SemanticNetwork;
  let _dict = [];

  function setDictionary(entries) { _dict = entries || []; }
  function getDictionary() { return _dict; }

  /* ── Dictionary lookup ── */
  function lookupElvish(elvishWord) {
    return _dict.filter(e => e.word.toLowerCase() === elvishWord.toLowerCase());
  }

  function lookupEnglish(englishWord) {
    const q = englishWord.toLowerCase();
    return _dict.filter(e =>
      e.definitions.some(d => d.toLowerCase().includes(q)) ||
      e.tags?.some(t => t.toLowerCase() === q)
    );
  }

  function lookupRoot(rootWord) {
    return _dict.filter(e =>
      e.word === rootWord ||
      (e.etymology && e.etymology.toLowerCase().includes(rootWord.toLowerCase()))
    );
  }

  function getRoots() {
    return _dict.filter(e => e.pos?.includes('root') || e.tags?.includes('root'));
  }

  /* ══════════════════════════════════
     MODE 1: WORD GENERATION
     ══════════════════════════════════ */

  function generateWord(englishConcept, opts = {}) {
    const concepts = SN().findConcept(englishConcept);
    if (!concepts.length) {
      return { success: false, error: `No semantic match found for "${englishConcept}"`, candidates: [] };
    }

    const candidates = [];
    const roots = getRoots();

    for (const concept of concepts.slice(0, 3)) {
      const conceptRoots = concept.roots || [];
      const metaphor = SN().getMetaphor(concept.id);

      // Strategy 1: Single root + derivation suffix
      for (const rName of conceptRoots) {
        const rootEntry = _dict.find(e => e.word === rName);
        if (!rootEntry) continue;

        // Noun form with -ë
        const nounForm = rName + (PC().isVowel(rName[rName.length - 1]) ? '' : 'ë');
        const v = PC().validate(nounForm);
        if (v.valid) {
          candidates.push({
            word: nounForm,
            roots: [rName],
            etymology: `From ${rName} (${rootEntry.definitions[0]})`,
            literal: rootEntry.definitions[0],
            register: 'standard',
            score: concept.score * concept.weight
          });
        }

        // Adjective form with -ea
        const adjForm = ME().derive(rName, 'noun_to_adj_ea');
        const av = PC().validate(adjForm);
        if (av.valid) {
          candidates.push({
            word: adjForm,
            roots: [rName],
            etymology: `From ${rName} (${rootEntry.definitions[0]}) + -ëa (adjectival)`,
            literal: `having the quality of ${rootEntry.definitions[0]}`,
            register: 'standard',
            score: concept.score * concept.weight * 0.8
          });
        }
      }

      // Strategy 2: Two-root compounds
      if (conceptRoots.length >= 2) {
        for (let i = 0; i < conceptRoots.length; i++) {
          for (let j = 0; j < conceptRoots.length; j++) {
            if (i === j) continue;
            const r1 = conceptRoots[i];
            const r2 = conceptRoots[j];
            const compoundWord = PC().resolveCompoundJunction(r1, r2);
            const v = PC().validate(compoundWord);
            if (v.valid) {
              const e1 = _dict.find(e => e.word === r1);
              const e2 = _dict.find(e => e.word === r2);
              const lit1 = e1 ? e1.definitions[0] : r1;
              const lit2 = e2 ? e2.definitions[0] : r2;
              candidates.push({
                word: compoundWord,
                roots: [r1, r2],
                etymology: `${r1} (${lit1}) + ${r2} (${lit2})`,
                literal: `${lit1}-${lit2}`,
                register: 'compound',
                score: SN().scoreRootCombination([r1, r2], concept.id)
              });
            }
          }
        }
      }

      // Strategy 3: Metaphor-guided compounds
      if (metaphor) {
        for (let i = 0; i < metaphor.roots.length; i++) {
          for (let j = i + 1; j < metaphor.roots.length; j++) {
            const r1 = metaphor.roots[i];
            const r2 = metaphor.roots[j];
            const compoundWord = PC().resolveCompoundJunction(r1, r2);
            const v = PC().validate(compoundWord);
            if (v.valid) {
              const e1 = _dict.find(e => e.word === r1);
              const e2 = _dict.find(e => e.word === r2);
              candidates.push({
                word: compoundWord,
                roots: [r1, r2],
                etymology: `${r1} (${e1?.definitions[0] || r1}) + ${r2} (${e2?.definitions[0] || r2})`,
                literal: metaphor.literal,
                register: 'poetic',
                score: SN().scoreRootCombination([r1, r2], concept.id) + 0.5
              });
            }
          }
        }
      }
    }

    // Deduplicate, apply euphony scoring, and sort
    const seen = new Set();
    const unique = candidates.filter(c => {
      if (seen.has(c.word)) return false;
      seen.add(c.word);
      return true;
    });

    // Score euphony and blend into final score
    for (const c of unique) {
      const euph = PC().scoreEuphony(c.word);
      c.euphony = euph;
      // Blend: 60% semantic score + 40% euphony
      c.finalScore = c.score * 0.6 + euph.score * 0.4 * 2; // scale euphony up since it's 0-1
    }

    unique.sort((a, b) => b.finalScore - a.finalScore);

    return {
      success: true,
      concept: englishConcept,
      candidates: unique.slice(0, 8)
    };
  }

  /* ══════════════════════════════════
     MODE 2: NAME GENERATION
     ══════════════════════════════════ */

  const NAME_CONVENTIONS = {
    character: {
      masculine: ['-on','-ar','-en','-or'],
      feminine:  ['-ë','-a','-iel'],
      neuter:    ['-in','-il']
    },
    ship:       { style: 'martial-celestial', syllables: [3, 4] },
    system:     { style: 'astronomical', syllables: [2, 4] },
    place:      { style: 'geographical-quality', syllables: [3, 5] },
    formation:  { style: 'military-function', syllables: [2, 4] }
  };

  function generateName(category, opts = {}) {
    const {
      gender = null,     // 'masculine', 'feminine', 'neuter'
      meaningBias = '',  // English concept to bias toward
      maxSyllables = 4,
      minSyllables = 2
    } = opts;

    const candidates = [];
    const roots = getRoots();

    // Get biased roots
    let biasedRoots = [];
    if (meaningBias) {
      const concepts = SN().findConcept(meaningBias);
      for (const c of concepts) {
        biasedRoots.push(...c.roots);
      }
    }

    // Pool selection based on category
    let pool = roots;
    if (category === 'ship') {
      pool = roots.filter(r => r.tags?.some(t => ['military','celestial','light','naval','core'].includes(t)));
    } else if (category === 'system') {
      pool = roots.filter(r => r.tags?.some(t => ['celestial','nature','geography','core'].includes(t)));
    } else if (category === 'place') {
      pool = roots.filter(r => r.tags?.some(t => ['geography','nature','architecture','core'].includes(t)));
    } else if (category === 'formation') {
      pool = roots.filter(r => r.tags?.some(t => ['military','core'].includes(t)));
    }

    if (pool.length < 2) pool = roots;

    // Prioritize biased roots
    if (biasedRoots.length) {
      const biasEntries = pool.filter(r => biasedRoots.includes(r.word));
      const others = pool.filter(r => !biasedRoots.includes(r.word));
      pool = [...biasEntries, ...others];
    }

    // Generate combinations
    const usedWords = new Set();

    for (let attempt = 0; attempt < 40 && candidates.length < 9; attempt++) {
      const r1 = pool[Math.floor(Math.random() * Math.min(pool.length, 12))];
      const r2 = pool[Math.floor(Math.random() * pool.length)];
      if (!r1 || !r2 || r1.word === r2.word) continue;

      let name;
      const roll = Math.random();

      if (roll < 0.35) {
        // Two-root compound
        name = PC().resolveCompoundJunction(r1.word, r2.word);
      } else if (roll < 0.55) {
        // Root + productive suffix
        const suffixes = category === 'ship' ? ['ion','on','ar'] :
                         category === 'place' ? ['dorë','ndor','essë'] :
                         category === 'formation' ? ['ath','rindë'] :
                         ['ion','ar','iel','on','ë'];
        const suf = suffixes[Math.floor(Math.random() * suffixes.length)];
        name = ME().addSuffix(r1.word, suf.replace(/ë$/, 'rindë').length > 3 ? suf : suf);
        // Simpler: just append
        name = r1.word + suf;
      } else if (roll < 0.75) {
        // Root compound with suffix
        const compound = PC().resolveCompoundJunction(r1.word, r2.word);
        if (category === 'character' && gender) {
          const endings = NAME_CONVENTIONS.character[gender] || ['-on'];
          const ending = endings[Math.floor(Math.random() * endings.length)].replace('-','');
          name = compound.replace(/[aeioëu]$/, '') + ending;
        } else {
          name = compound;
        }
      } else {
        // Three-element
        const r3 = pool[Math.floor(Math.random() * pool.length)];
        if (r3 && r3.word !== r1.word && r3.word !== r2.word) {
          const part1 = PC().resolveCompoundJunction(r1.word, r2.word);
          name = PC().resolveCompoundJunction(part1, r3.word);
        } else {
          name = PC().resolveCompoundJunction(r1.word, r2.word);
        }
      }

      if (!name || usedWords.has(name)) continue;

      // Apply gender-coded endings for characters
      if (category === 'character' && gender) {
        const endings = NAME_CONVENTIONS.character[gender];
        if (endings && endings.length) {
          const hasEnding = endings.some(e => name.endsWith(e.replace('-','')));
          if (!hasEnding) {
            const ending = endings[Math.floor(Math.random() * endings.length)].replace('-','');
            name = name.replace(/[aeioëu]$/, '') + ending;
          }
        }
      }

      // Validate
      const v = PC().validate(name);
      if (!v.valid) continue;

      const syls = PC().syllabify(name);
      if (syls.length < minSyllables || syls.length > maxSyllables) continue;

      // Capitalize
      name = name.charAt(0).toUpperCase() + name.slice(1);
      if (usedWords.has(name)) continue;
      usedWords.add(name);

      candidates.push({
        name,
        ipa: PC().toIPA(name.toLowerCase()),
        roots: [r1.word, r2.word],
        etymology: `${r1.word} (${r1.definitions[0]}) + ${r2.word} (${r2.definitions[0]})`,
        category,
        gender: gender || 'n/a',
        syllables: syls.length
      });
    }

    return {
      success: candidates.length > 0,
      category,
      candidates: candidates.slice(0, 9)
    };
  }

  /* ══════════════════════════════════
     MODE 3: PHRASE CONSTRUCTION
     Real sentence parser with grammar,
     possessives, plurals, copula
     ══════════════════════════════════ */

  /* ── English POS tagger (simple heuristic) ── */
  const EN_DETERMINERS = new Set(['the','a','an','this','that','these','those']);
  const EN_POSSESSIVES = { 'my':'1s', 'your':'2s', 'his':'3s', 'her':'3s', 'its':'3s', 'our':'1p', 'their':'3p' };
  const EN_PREPOSITIONS = new Set(['in','on','at','to','from','with','by','for','through','under','above','beyond','near','without','upon','into','across','beside','between','among','against','toward','towards','before','after','behind','beneath','below','over']);
  const EN_CONJUNCTIONS = new Set(['and','or','but','if','then','because','so']);
  const EN_NEGATION = new Set(['not','no','never','don\'t','doesn\'t','didn\'t','cannot','can\'t','won\'t']);
  const EN_PRONOUNS = { 'i':'ni','me':'ni','you':'le','he':'se','she':'se','it':'se','we':'elmë','they':'entë','us':'elmë','them':'entë' };
  const EN_QUESTION = new Set(['who','what','where','when','why','how']);
  const EN_COPULA = new Set(['is','are','am','was','were','be','been','being']);
  const EN_HELPERS = new Set(['do','does','did','will','shall','can','could','would','should','may','might','must','have','has','had']);

  /* Simple English morphology: strip -s, -ed, -ing to find root */
  function stemEnglish(word) {
    const w = word.toLowerCase();
    if (w.endsWith('ing') && w.length > 5) return w.slice(0, -3);
    if (w.endsWith('ying') && w.length > 5) return w.slice(0, -4) + 'y';
    if (w.endsWith('ies') && w.length > 4) return w.slice(0, -3) + 'y';
    if (w.endsWith('es') && w.length > 4) return w.slice(0, -2);
    if (w.endsWith('ed') && w.length > 4) return w.slice(0, -2);
    if (w.endsWith('s') && w.length > 3 && !w.endsWith('ss') && !w.endsWith('us')) return w.slice(0, -1);
    return w;
  }

  /* Detect if an English word is plural */
  function isEnglishPlural(word) {
    const w = word.toLowerCase();
    const stem = stemEnglish(w);
    return stem !== w && (w.endsWith('s') || w.endsWith('es') || w.endsWith('ies'));
  }

  /* Detect tense from English verb */
  function detectTense(word, context) {
    const w = word.toLowerCase();
    if (w.endsWith('ed') || context.includes('did') || context.includes('was') || context.includes('were')) return 'past';
    if (w.endsWith('ing')) return 'continuative';
    if (context.includes('will') || context.includes('shall')) return 'future';
    return 'present';
  }

  /* Detect person from subject */
  function detectPerson(subject) {
    const s = subject?.toLowerCase();
    if (!s) return '3s';
    if (s === 'i' || s === 'ni') return '1s';
    if (s === 'you' || s === 'le') return '2s';
    if (s === 'we' || s === 'elmë') return '1p';
    if (s === 'they' || s === 'entë') return '3p';
    // Plural nouns get 3p
    if (isEnglishPlural(s)) return '3p';
    return '3s';
  }

  /* Look up a single English word, returning best Elvish match with POS info */
  function resolveWord(enWord) {
    const w = enWord.toLowerCase();

    // Pronoun?
    if (EN_PRONOUNS[w]) {
      return { elvish: EN_PRONOUNS[w], pos: 'pronoun', english: w, gloss: 'PRO', found: true };
    }

    // Direct dictionary lookup
    let matches = lookupEnglish(w);
    if (matches.length) {
      const best = matches[0];
      return { elvish: best.word, pos: best.pos || 'noun', english: w, gloss: best.pos || 'n', found: true, entry: best };
    }

    // Try stemmed form (handles plurals and verb forms)
    const stemmed = stemEnglish(w);
    if (stemmed !== w) {
      matches = lookupEnglish(stemmed);
      if (matches.length) {
        const best = matches[0];
        return { elvish: best.word, pos: best.pos || 'noun', english: w, gloss: best.pos || 'n', found: true, entry: best, stemmedFrom: w, wasPlural: isEnglishPlural(w) };
      }
    }

    // Try semantic network
    const concepts = SN().findConcept(w);
    if (concepts.length && concepts[0].roots.length) {
      const root = concepts[0].roots[0];
      const rootEntry = _dict.find(e => e.word === root);
      if (rootEntry) {
        return { elvish: rootEntry.word, pos: rootEntry.pos || 'root', english: w, gloss: 'sem', found: true, entry: rootEntry };
      }
    }

    // Try semantic with stemmed form
    if (stemmed !== w) {
      const concepts2 = SN().findConcept(stemmed);
      if (concepts2.length && concepts2[0].roots.length) {
        const root = concepts2[0].roots[0];
        const rootEntry = _dict.find(e => e.word === root);
        if (rootEntry) {
          return { elvish: rootEntry.word, pos: rootEntry.pos || 'root', english: w, gloss: 'sem', found: true, entry: rootEntry, wasPlural: isEnglishPlural(w) };
        }
      }
    }

    return { elvish: `[${w}]`, pos: 'unknown', english: w, gloss: 'UNK', found: false };
  }

  /* ── Detect possessive 's ── */
  function parsePossessive(words) {
    // "the king's sword" -> possessor: "king", owned: "sword"
    // Also "king's sword" without article
    const result = { hasPossessive: false, possessor: null, possessorDet: null, owned: null, ownedDet: null, ownedAdjs: [], restWords: [] };

    for (let i = 0; i < words.length; i++) {
      if (words[i].endsWith("'s") || words[i].endsWith("'s")) {
        result.hasPossessive = true;
        // Look back for determiner
        const possWord = words[i].replace(/'s$/i, '');
        if (i > 0 && EN_DETERMINERS.has(words[i - 1])) {
          result.possessorDet = words[i - 1];
          result.possessor = possWord;
        } else {
          result.possessor = possWord;
        }
        // Everything after is the owned NP
        const after = words.slice(i + 1);
        let j = 0;
        if (j < after.length && EN_DETERMINERS.has(after[j])) { result.ownedDet = after[j]; j++; }
        // Adjectives
        while (j < after.length) {
          const r = resolveWord(after[j]);
          if (r.found && r.pos?.includes('adj')) { result.ownedAdjs.push(after[j]); j++; }
          else break;
        }
        if (j < after.length) { result.owned = after[j]; j++; }
        result.restWords = after.slice(j);
        return result;
      }
    }
    return result;
  }

  /* ── Sentence pattern matching ── */
  function parseEnglish(phrase) {
    const raw = phrase.trim().replace(/[.!]+$/, '');
    const isQuestion = raw.endsWith('?') || EN_QUESTION.has(raw.split(/\s+/)[0]?.toLowerCase());
    const words = raw.replace('?', '').split(/\s+/).map(w => w.toLowerCase());

    const parsed = {
      type: 'statement',
      negated: false,
      tense: 'present',
      subject: null,
      subjectPlural: false,
      verb: null,
      isCopula: false,         // "X is Y" pattern
      copulaComplement: null,  // the Y in "X is Y"
      object: null,
      objectPlural: false,
      adjectives: [],
      determinerS: null,
      determinerO: null,
      possessor: null,         // possessive constructions
      possessorDet: null,
      possessivePerson: null,  // 'my', 'your', etc.
      preposition: null,
      prepObject: null,
      raw: words,
      person: '3s'
    };

    if (isQuestion) parsed.type = 'question';

    // Detect negation
    for (const w of words) {
      if (EN_NEGATION.has(w)) { parsed.negated = true; break; }
    }

    // Detect tense from helpers
    if (words.includes('will') || words.includes('shall')) parsed.tense = 'future';
    if (words.includes('did') || words.includes('was') || words.includes('were')) parsed.tense = 'past';

    // ── Check for possessive 's constructions ──
    const poss = parsePossessive(words);

    // ── Check for possessive determiner (my, your, his, etc.) ──
    const possDetIdx = words.findIndex(w => EN_POSSESSIVES[w] !== undefined);

    // ── Check for copula pattern: "X is/are Y" ──
    const copulaIdx = words.findIndex(w => EN_COPULA.has(w));
    const hasCopula = copulaIdx !== -1;

    // Build content word sequence, filtering out helpers/negation/copula
    const SKIP = new Set([...EN_HELPERS, ...EN_COPULA, ...EN_NEGATION]);
    const content = [];
    for (const w of words) {
      if (SKIP.has(w)) continue;
      if (EN_QUESTION.has(w)) { parsed.type = 'question'; continue; }
      if (EN_CONJUNCTIONS.has(w)) continue;
      content.push(w);
    }

    let ci = 0;
    const clen = content.length;

    // Helper: consume a noun phrase
    function consumeNP() {
      let det = null, possAdj = null, adjs = [], noun = null, isPlural = false;
      // Determiner or possessive adjective
      if (ci < clen && EN_DETERMINERS.has(content[ci])) { det = content[ci]; ci++; }
      else if (ci < clen && EN_POSSESSIVES[content[ci]] !== undefined) { possAdj = content[ci]; ci++; }

      // Check for possessive 's inside this NP
      if (ci < clen && content[ci].endsWith("'s")) {
        const possWord = content[ci].replace(/'s$/i, '');
        ci++;
        // The rest of this NP is the owned thing
        while (ci < clen) {
          const r = resolveWord(content[ci]);
          if (r.found && r.pos?.includes('adj')) { adjs.push(content[ci]); ci++; }
          else break;
        }
        if (ci < clen) { noun = content[ci]; ci++; }
        isPlural = noun ? isEnglishPlural(noun) : false;
        return { det, possAdj, adjs, noun, isPlural, possessorOf: possWord };
      }

      // Adjectives
      while (ci < clen) {
        const r = resolveWord(content[ci]);
        if (r.found && r.pos?.includes('adj')) { adjs.push(content[ci]); ci++; }
        else break;
      }
      // Noun
      if (ci < clen && !EN_PREPOSITIONS.has(content[ci])) {
        noun = content[ci];
        isPlural = isEnglishPlural(noun);
        ci++;
      }
      return { det, possAdj, adjs, noun, isPlural, possessorOf: null };
    }

    // Detect imperative: starts with a verb
    const firstResolved = content.length > 0 ? resolveWord(content[0]) : null;
    if (firstResolved && firstResolved.found && firstResolved.pos?.includes('verb') && !EN_PRONOUNS[content[0]] && !hasCopula) {
      parsed.type = 'imperative';
      parsed.verb = content[0];
      parsed.tense = 'imperative';
      ci = 1;
      if (ci < clen) {
        const np = consumeNP();
        parsed.determinerO = np.det;
        parsed.possessivePerson = np.possAdj ? EN_POSSESSIVES[np.possAdj] : null;
        parsed.adjectives.push(...np.adjs.map(a => ({ word: a, modifies: 'object' })));
        parsed.object = np.noun;
        parsed.objectPlural = np.isPlural;
        if (np.possessorOf) { parsed.possessor = np.possessorOf; }
      }
    } else {
      // Standard sentence: Subject NP, then verb/copula, then object/complement
      ci = 0;
      const subjNP = consumeNP();
      parsed.determinerS = subjNP.det;
      parsed.possessivePerson = subjNP.possAdj ? EN_POSSESSIVES[subjNP.possAdj] : null;
      parsed.adjectives.push(...subjNP.adjs.map(a => ({ word: a, modifies: 'subject' })));
      parsed.subject = subjNP.noun;
      parsed.subjectPlural = subjNP.isPlural;
      parsed.person = detectPerson(parsed.subject || '');
      if (subjNP.possessorOf) { parsed.possessor = subjNP.possessorOf; }

      // Verb or copula
      if (ci < clen) {
        if (hasCopula && !firstResolved?.pos?.includes('verb')) {
          // Copula: "X is Y"
          parsed.isCopula = true;
          parsed.verb = null;
          // The rest is the complement
          if (ci < clen) {
            const compNP = consumeNP();
            // Complement might be an adjective or a noun
            if (compNP.noun) {
              const compResolved = resolveWord(compNP.noun);
              if (compResolved.found && compResolved.pos?.includes('adj')) {
                parsed.adjectives.push({ word: compNP.noun, modifies: 'complement' });
                parsed.copulaComplement = compNP.noun;
              } else {
                parsed.copulaComplement = compNP.noun;
                parsed.determinerO = compNP.det;
              }
            }
            parsed.adjectives.push(...compNP.adjs.map(a => ({ word: a, modifies: 'complement' })));
          }
        } else {
          // Regular verb
          const verbTense = detectTense(content[ci] || '', words);
          if (parsed.tense === 'present') parsed.tense = verbTense;
          parsed.verb = stemEnglish(content[ci]);
          ci++;

          // Object NP
          if (ci < clen) {
            if (EN_PREPOSITIONS.has(content[ci])) {
              parsed.preposition = content[ci]; ci++;
              const ppNP = consumeNP();
              parsed.prepObject = ppNP.noun;
            } else {
              const objNP = consumeNP();
              parsed.determinerO = objNP.det;
              parsed.adjectives.push(...objNP.adjs.map(a => ({ word: a, modifies: 'object' })));
              parsed.object = objNP.noun;
              parsed.objectPlural = objNP.isPlural;
              if (objNP.possessorOf) { parsed.possessor = objNP.possessorOf; }
              if (objNP.possAdj) { parsed.possessivePerson = EN_POSSESSIVES[objNP.possAdj]; }
            }
          }
        }
      }

      // Trailing prepositional phrase
      if (ci < clen && EN_PREPOSITIONS.has(content[ci])) {
        parsed.preposition = content[ci]; ci++;
        const ppNP = consumeNP();
        parsed.prepObject = ppNP.noun;
      }
    }

    return parsed;
  }

  /* ── Elvish sentence assembly ── */

  const PREP_MAP = {
    'in': 'mi', 'within': 'mi', 'into': 'mi', 'on': 'or', 'upon': 'or', 'above': 'or', 'over': 'or',
    'to': 'an', 'toward': 'an', 'towards': 'an',
    'from': 'ho', 'after': 'ho', 'under': 'nu', 'beneath': 'nu', 'below': 'nu',
    'near': 'ara', 'beside': 'ara', 'between': 'ara', 'among': 'ara',
    'beyond': 'ava', 'past': 'ava', 'before': 'ava',
    'through': 'vin', 'across': 'vin', 'with': 'sai', 'without': 'ú',
    'by': 'sai', 'for': 'an', 'at': 'mi', 'against': 'an', 'behind': 'nu'
  };

  /* Map possessive person to Elvish suffix */
  const POSS_SUFFIX = { '1s': 'nya', '2s': 'lya', '3s': 'rya', '1p': 'lva', '3p': 'ntya' };

  function constructPhrase(englishPhrase, register = 'formal') {
    const parsed = parseEnglish(englishPhrase);
    const notes = [];

    // Resolve all content words to Elvish
    const resolved = {
      subject: parsed.subject ? resolveWord(parsed.subject) : null,
      verb: parsed.verb ? resolveWord(parsed.verb) : null,
      object: parsed.object ? resolveWord(parsed.object) : null,
      prepObj: parsed.prepObject ? resolveWord(parsed.prepObject) : null,
      possessor: parsed.possessor ? resolveWord(parsed.possessor) : null,
      complement: parsed.copulaComplement ? resolveWord(parsed.copulaComplement) : null,
      adjectives: parsed.adjectives.map(a => ({ ...a, resolved: resolveWord(a.word) }))
    };

    // Track unresolved words
    [resolved.subject, resolved.verb, resolved.object, resolved.prepObj, resolved.possessor, resolved.complement].forEach(r => {
      if (r && !r.found) notes.push(`"${r.english}" has no dictionary entry yet`);
    });
    resolved.adjectives.forEach(a => {
      if (!a.resolved.found) notes.push(`"${a.resolved.english}" has no dictionary entry yet`);
    });

    // ── Apply Elvish plural to a noun ──
    function applyPlural(elvishWord, isPlural) {
      if (!isPlural) return elvishWord;
      const pluralized = ME().pluralize(elvishWord, 'standard');
      notes.push(`"${elvishWord}" pluralized to "${pluralized}"`);
      return pluralized;
    }

    // ── Apply possessive suffix ──
    function applyPossessive(elvishNoun, person) {
      if (!person) return elvishNoun;
      const suffix = POSS_SUFFIX[person];
      if (!suffix) return elvishNoun;
      const form = ME().possessive(elvishNoun, person);
      notes.push(`"${elvishNoun}" with possessive suffix -${suffix} (${person})`);
      return form;
    }

    // ── Build subject noun phrase ──
    function buildSubjectNP() {
      const parts = [];

      // Possessive construction: "the king's X" = "X aranya" (genitive or possessive)
      if (parsed.possessor && resolved.possessor && !parsed.object) {
        // This is "possessor's subject" pattern
        // In Elvish: subject + possessor-genitive
        // Handle below in assembly
      }

      // Determiner
      if (parsed.possessivePerson && !parsed.possessor) {
        // "my/your/his X" -> no article, possessive suffix on noun
      } else if (parsed.determinerS === 'the') {
        parts.push({ elvish: 'i', english: 'the', gloss: 'DEF' });
      } else if (parsed.determinerS === 'a' || parsed.determinerS === 'an') {
        parts.push({ elvish: 'na', english: parsed.determinerS, gloss: 'INDEF' });
      }

      // Subject noun (nominative, unmarked, but handle plural and possessive)
      if (resolved.subject) {
        let nounForm = resolved.subject.elvish;
        nounForm = applyPlural(nounForm, parsed.subjectPlural);
        if (parsed.possessivePerson && !parsed.possessor) {
          nounForm = applyPossessive(nounForm, parsed.possessivePerson);
        }
        parts.push({ elvish: nounForm, english: parsed.subject, gloss: parsed.subjectPlural ? 'NOM.PL' : 'NOM' });
      }

      // Possessor in genitive
      if (parsed.possessor && resolved.possessor && !parsed.object) {
        const genForm = ME().declineNoun(resolved.possessor.elvish, 'genitive');
        parts.push({ elvish: genForm, english: parsed.possessor + "'s", gloss: 'GEN' });
        notes.push(`"${resolved.possessor.elvish}" in genitive form "${genForm}" (possession)`);
      }

      // Subject adjectives (after noun in Elvish)
      for (const adj of resolved.adjectives.filter(a => a.modifies === 'subject')) {
        parts.push({ elvish: adj.resolved.elvish, english: adj.word, gloss: 'ADJ' });
      }
      return parts;
    }

    // ── Build object noun phrase (accusative case) ──
    function buildObjectNP() {
      const parts = [];
      if (!resolved.object) return parts;

      if (parsed.determinerO === 'the') {
        parts.push({ elvish: 'i', english: 'the', gloss: 'DEF' });
      } else if (parsed.determinerO === 'a' || parsed.determinerO === 'an') {
        parts.push({ elvish: 'na', english: parsed.determinerO, gloss: 'INDEF' });
      }

      let nounForm = resolved.object.elvish;
      nounForm = applyPlural(nounForm, parsed.objectPlural);

      // Apply possessive if "verb my/his X"
      if (parsed.possessivePerson && parsed.object) {
        nounForm = applyPossessive(nounForm, parsed.possessivePerson);
      }

      // Accusative case
      const accusative = ME().declineNoun(nounForm, 'accusative');
      parts.push({ elvish: accusative, english: parsed.object, gloss: parsed.objectPlural ? 'ACC.PL' : 'ACC' });
      if (accusative !== nounForm) {
        notes.push(`"${nounForm}" takes accusative form "${accusative}" as direct object`);
      }

      // Possessor in genitive (if "verb the king's sword")
      if (parsed.possessor && resolved.possessor && parsed.object) {
        const genForm = ME().declineNoun(resolved.possessor.elvish, 'genitive');
        parts.push({ elvish: genForm, english: parsed.possessor + "'s", gloss: 'GEN' });
        notes.push(`"${resolved.possessor.elvish}" in genitive form "${genForm}" (possession)`);
      }

      // Object adjectives
      for (const adj of resolved.adjectives.filter(a => a.modifies === 'object')) {
        parts.push({ elvish: adj.resolved.elvish, english: adj.word, gloss: 'ADJ' });
      }
      return parts;
    }

    // ── Build verb ──
    function buildVerb() {
      if (!resolved.verb) return [];
      const verbElvish = resolved.verb.elvish;

      let stem = verbElvish;
      if (resolved.verb.entry?.pos?.includes('verb')) {
        stem = verbElvish.replace(/[aeiouë]$/, '') || verbElvish;
      }

      let tense = parsed.tense;
      if (parsed.type === 'imperative') tense = 'imperative';

      const conjugated = ME().conjugate(stem, tense, parsed.person);
      const form = parsed.negated ? ME().negate(conjugated) : conjugated;

      const parts = [{ elvish: form, english: parsed.verb, gloss: `V.${tense.toUpperCase().slice(0,4)}.${parsed.person}` }];

      if (conjugated !== verbElvish) {
        notes.push(`"${verbElvish}" conjugated to "${conjugated}" (${tense}, ${parsed.person})${parsed.negated ? ', negated with ú-' : ''}`);
      }

      return parts;
    }

    // ── Build copula construction ──
    function buildCopula() {
      const parts = [];
      // In Elvish: "X ná Y" or "X Y ná" (SOV)
      const copulaForm = parsed.negated ? 'úná' : 'ná';
      const copulaGloss = parsed.negated ? 'COP.NEG' : 'COP';

      // Complement (predicate noun or adjective)
      if (resolved.complement) {
        parts.push({ elvish: resolved.complement.elvish, english: parsed.copulaComplement, gloss: 'PRED' });
      }
      for (const adj of resolved.adjectives.filter(a => a.modifies === 'complement')) {
        parts.push({ elvish: adj.resolved.elvish, english: adj.word, gloss: 'PRED.ADJ' });
      }

      parts.push({ elvish: copulaForm, english: parsed.negated ? 'is not' : 'is', gloss: copulaGloss });
      notes.push(`Copula "ná" (to be/exist)${parsed.negated ? ' negated to "úná"' : ''} used for "X is Y" construction`);

      return parts;
    }

    // ── Build prepositional phrase ──
    function buildPP() {
      if (!parsed.preposition) return [];
      const parts = [];
      const elvPrep = PREP_MAP[parsed.preposition] || parsed.preposition;
      parts.push({ elvish: elvPrep, english: parsed.preposition, gloss: 'PREP' });
      if (resolved.prepObj) {
        let ppNoun = resolved.prepObj.elvish;
        parts.push({ elvish: ppNoun, english: parsed.prepObject, gloss: 'N' });
      }
      return parts;
    }

    // ── Assemble in correct word order ──
    const subj = buildSubjectNP();
    const obj = buildObjectNP();
    const pp = buildPP();
    let verb, ordered;

    if (parsed.isCopula) {
      // Copula sentence: "X is Y"
      const cop = buildCopula();
      if (register === 'casual') {
        // VSO-ish: ná X Y
        ordered = [...cop, ...subj, ...pp];
      } else {
        // SOV: X Y ná
        ordered = [...subj, ...cop, ...pp];
      }
      notes.push(`${register.charAt(0).toUpperCase() + register.slice(1)} register: copula construction`);
    } else {
      verb = buildVerb();

      if (parsed.type === 'imperative') {
        ordered = [...verb, ...obj, ...pp];
        notes.push('Imperative: verb-first command form');
      } else if (register === 'casual') {
        ordered = [...verb, ...subj, ...obj, ...pp];
        notes.push('Casual register: VSO word order');
      } else if (register === 'formal' || register === 'military' || register === 'sacred') {
        ordered = [...subj, ...obj, ...verb, ...pp];
        notes.push(`${register.charAt(0).toUpperCase() + register.slice(1)} register: SOV word order`);
      } else if (register === 'poetic') {
        ordered = [...subj, ...verb, ...obj, ...pp];
        notes.push('Poetic register: free word order (shown as SVO)');
      } else {
        ordered = [...verb, ...subj, ...obj, ...pp];
      }
    }

    const elvishSentence = ordered.map(p => p.elvish).join(' ');

    return {
      english: englishPhrase,
      elvish: elvishSentence,
      register,
      parsedType: parsed.type,
      tense: parsed.isCopula ? 'copula' : parsed.tense,
      person: parsed.person,
      negated: parsed.negated,
      gloss: ordered,
      notes,
      interlinear: ordered.map(g => `${g.elvish} [${g.gloss}]`).join(' ')
    };
  }

  /* ══════════════════════════════════
     MODE 4: REVERSE DECOMPOSITION
     "What does this Elvish word mean?"
     ══════════════════════════════════ */

  function decomposeUnknown(elvishWord) {
    const w = elvishWord.toLowerCase();

    // 1. Check if it's already in the dictionary
    const exact = lookupElvish(w);
    if (exact.length) {
      return {
        word: elvishWord,
        found: true,
        exactMatch: exact[0],
        decompositions: [],
        validation: PC().validate(w),
        euphony: PC().scoreEuphony(w),
        ipa: PC().toIPA(w)
      };
    }

    // 2. Run the phonological decomposer against all dictionary entries
    const decompositions = PC().decomposeWord(w, _dict);

    // 3. Also validate and score
    const validation = PC().validate(w);
    const euphony = PC().scoreEuphony(w);

    return {
      word: elvishWord,
      found: false,
      exactMatch: null,
      decompositions,
      validation,
      euphony,
      ipa: PC().toIPA(w),
      syllables: PC().syllabify(w)
    };
  }

  /* ── Public API ── */
  return {
    setDictionary,
    getDictionary,
    lookupElvish,
    lookupEnglish,
    lookupRoot,
    getRoots,
    generateWord,
    generateName,
    constructPhrase,
    decomposeUnknown,
    NAME_CONVENTIONS
  };

})();

if (typeof window !== 'undefined') window.CompositionEngine = CompositionEngine;
