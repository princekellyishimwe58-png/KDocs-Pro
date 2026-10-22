'use strict';

// ============================================================
// Ready Score writing check - spelling + basic grammar.
//
// Same hard rules as the rest of Ready Score: 100% rule-based,
// no external services, nothing about the user's text leaves the
// server. It is a targeted checker, not a full proofreader:
//   * spelling: exact matches against a curated dictionary of
//     ~160 very common English misspellings (word-boundary,
//     case-insensitive). If a word isn't in the dictionary it is
//     never flagged - zero false positives from names, Sheng
//     words, or technical terms a fuzzy matcher would mangle.
//   * grammar: seven deterministic rules (see below).
// Every finding is phrased as a fix suggestion - it never edits
// the user's text, and details never echo contact information.
// ============================================================

// misspelling -> correction. Keys are lowercase.
const MISSPELLINGS = {
  'abandonned': 'abandoned', 'accross': 'across', 'accidentaly': 'accidentally',
  'accomodate': 'accommodate', 'accomodation': 'accommodation', 'achivement': 'achievement',
  'acknowlege': 'acknowledge', 'aquire': 'acquire', 'adress': 'address', 'advices': 'advice',
  'agressive': 'aggressive', 'alot': 'a lot', 'allready': 'already', 'altough': 'although',
  'amoung': 'among', 'aniversary': 'anniversary', 'apparant': 'apparent', 'appearence': 'appearance',
  'apointment': 'appointment', 'arguement': 'argument', 'asistance': 'assistance',
  'atendance': 'attendance', 'basicly': 'basically', 'begining': 'beginning',
  'beleive': 'believe', 'beleived': 'believed', 'beetween': 'between', 'bizzare': 'bizarre',
  'briefily': 'briefly', 'briliant': 'brilliant', 'budjet': 'budget', 'buisness': 'business',
  'calender': 'calendar', 'carefull': 'careful', 'ceremonialy': 'ceremonially',
  'certicate': 'certificate', 'certficate': 'certificate', 'certifiacte': 'certificate',
  'collegue': 'colleague', 'collegues': 'colleagues', 'comming': 'coming',
  'commited': 'committed', 'commitee': 'committee', 'compaint': 'complaint',
  'competance': 'competence', 'competetive': 'competitive', 'completly': 'completely',
  'concider': 'consider', 'concious': 'conscious', 'confidencial': 'confidential',
  'congradulations': 'congratulations', 'consciencious': 'conscientious',
  'contempoary': 'contemporary', 'convienient': 'convenient', 'correspondant': 'correspondent',
  'critism': 'criticism', 'curriculm': 'curriculum', 'decison': 'decision',
  'declareing': 'declaring', 'definately': 'definitely', 'definate': 'definite',
  'desicion': 'decision', 'diferent': 'different', 'dilemna': 'dilemma',
  'dissapear': 'disappear', 'disapoint': 'disappoint', 'disipline': 'discipline',
  'distroy': 'destroy', 'documantation': 'documentation', 'durring': 'during',
  'effcient': 'efficient', 'efficiancy': 'efficiency', 'embarass': 'embarrass',
  'employement': 'employment', 'encourange': 'encourage', 'enrollmnt': 'enrollment',
  'enviroment': 'environment', 'essentail': 'essential', 'exagerate': 'exaggerate',
  'excellant': 'excellent', 'exellent': 'excellent', 'existance': 'existence',
  'experance': 'experience', 'experiance': 'experience', 'experence': 'experience',
  'exprience': 'experience', 'familar': 'familiar', 'fianlly': 'finally',
  'fivety': 'fifty', 'fluantly': 'fluently', 'foriegn': 'foreign', 'fourty': 'forty',
  'fufill': 'fulfill', 'funtion': 'function', 'garantee': 'guarantee', 'gaurd': 'guard',
  'goverment': 'government', 'govermental': 'governmental', 'graduiate': 'graduate',
  'grammer': 'grammar', 'gratefull': 'grateful', 'gurantee': 'guarantee',
  'happend': 'happened', 'harrass': 'harass', 'hesistant': 'hesitant',
  'idealogy': 'ideology', 'identicial': 'identical', 'immediatly': 'immediately',
  'independant': 'independent', 'indispensible': 'indispensable', 'inerest': 'interest',
  'influencial': 'influential', 'informtion': 'information', 'insureance': 'insurance',
  'intergrate': 'integrate', 'interupt': 'interrupt', 'intrest': 'interest',
  'inventer': 'inventor', 'knowlege': 'knowledge', 'lanaguage': 'language',
  'languange': 'language', 'liason': 'liaison', 'libary': 'library', 'lisence': 'license',
  'maintainance': 'maintenance', 'mangement': 'management', 'managment': 'management',
  'marryed': 'married', 'medicince': 'medicine', 'millitary': 'military', 'millon': 'million',
  'mispell': 'misspell', 'morgage': 'mortgage', 'neccessary': 'necessary',
  'necesary': 'necessary', 'negociate': 'negotiate', 'noticeable': 'noticeable',
  'noticable': 'noticeable', 'occassion': 'occasion', 'occured': 'occurred',
  'occurence': 'occurrence', 'occuring': 'occurring', 'officallly': 'officially',
  'oppurtunity': 'opportunity', 'oppertunity': 'opportunity', 'organision': 'organisation',
  'organizeing': 'organising', 'paralell': 'parallel', 'particulary': 'particularly',
  'payement': 'payment', 'perfomance': 'performance', 'personel': 'personnel',
  'personnell': 'personnel', 'posess': 'possess', 'posession': 'possession',
  'posible': 'possible', 'potatoe': 'potato', 'prefered': 'preferred',
  'prefrence': 'preference', 'priviledge': 'privilege', 'privte': 'private',
  'probaly': 'probably', 'proffesional': 'professional', 'profesional': 'professional',
  'promissing': 'promising', 'pronounciation': 'pronunciation', 'propably': 'probably',
  'publically': 'publicly', 'questionaire': 'questionnaire', 'realy': 'really',
  'reciept': 'receipt', 'recieve': 'receive', 'recieved': 'received',
  'reciever': 'receiver', 'recieving': 'receiving', 'recomend': 'recommend',
  'recomendation': 'recommendation', 'reccomend': 'recommend', 'reccommend': 'recommend',
  'refered': 'referred', 'referal': 'referral', 'refrence': 'reference',
  'regarless': 'regardless', 'relevent': 'relevant', 'remeber': 'remember',
  'responsable': 'responsible', 'responsibilty': 'responsibility', 'resposibility': 'responsibility',
  'rythm': 'rhythm', 'salery': 'salary', 'sallery': 'salary', 'sceene': 'scene',
  'schedual': 'schedule', 'scholarhip': 'scholarship', 'scholarshp': 'scholarship',
  'secratary': 'secretary', 'seperate': 'separate', 'seperated': 'separated',
  'seriousley': 'seriously', 'similer': 'similar', 'sincerly': 'sincerely',
  'speach': 'speech', 'stategy': 'strategy', 'strenght': 'strength',
  'strenghen': 'strengthen', 'succesful': 'successful', 'sucessful': 'successful',
  'successfull': 'successful', 'superceed': 'supersede', 'supress': 'suppress',
  'supprise': 'surprise', 'suprised': 'surprised', 'suprise': 'surprise',
  'teh': 'the', 'thier': 'their', 'tommorow': 'tomorrow', 'tommorrow': 'tomorrow',
  'truely': 'truly', 'unfortunatly': 'unfortunately', 'univeristy': 'university',
  'universsity': 'university', 'untill': 'until', 'usualy': 'usually',
  'valuble': 'valuable', 'vehicule': 'vehicle', 'visted': 'visited',
  'wether': 'whether', 'wich': 'which', 'wierd': 'weird', 'wonderfull': 'wonderful',
  'writen': 'written', 'writting': 'writing', 'yeild': 'yield',
  'qualifcation': 'qualification', 'qualifiction': 'qualification',
  'aqcuaintance': 'acquaintance', 'intitution': 'institution', 'instution': 'institution',
  'apprecitated': 'appreciated', 'apreciate': 'appreciate',
};

// Common lowercase openers that legitimately follow a sentence end
// or start a line (capped with a period, sometimes followed by a comma).
const LOWERCASE_OPENERS = new Set(['e.g', 'i.e', 'etc', 'vs', 'p.s']);

// Words that start with a vowel letter but a consonant SOUND, so "a" is
// correct before them.
const A_EXCEPTION_RE = /^(uni|use|user|ume|ute|uro|utens|euro|one|onc|ubiq|ubu|uk)/;

// Words that legitimately follow "an" despite consonant spelling (silent h,
// letter names below in lowercase).
const AN_EXCEPTIONS = new Set(['hour', 'honest', 'honour', 'honor', 'honorary',
  'heir', 'honesty', 'mba', 'msc', 'phd', 'spa', 'sms', 'llb', 'llm']);

// Text-message-style shorthand that jars in formal documents. RSVP is
// deliberately excluded (it is standard, formal usage). KShs is the
// standard Kenyan money style and is never flagged.
const INFORMAL_RE = /\b(pls|plz|pliss|thx|thanx|asap|ttyl|becoz|coz)\b|[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;

const WORD_RE = /[A-Za-z][A-Za-z'-]*/g;

function trimToken(word) {
  return word.toLowerCase().replace(/^['-]+|['-]+$/g, '');
}

/**
 * Run the writing check over a blob of free text.
 * opts.doubleSpaceIsError - false for document types where column
 *   alignment with multiple spaces is standard (invoices).
 * Returns: { checked, spelling: [{word, lower, suggestion, count}],
 *            grammar: [{rule, message}], total }
 */
function checkWriting(text, opts = {}) {
  const source = String(text || '');
  if (!source.trim()) {
    return { checked: true, spelling: [], grammar: [], total: 0 };
  }
  const doubleSpaceIsError = opts.doubleSpaceIsError !== false;

  // ---- Spelling: exact dictionary hits only, case-insensitive ----
  const counts = new Map(); // lower token -> { word, count }
  let m;
  WORD_RE.lastIndex = 0;
  while ((m = WORD_RE.exec(source)) !== null) {
    const lower = trimToken(m[0]);
    if (!lower || !Object.prototype.hasOwnProperty.call(MISSPELLINGS, lower)) continue;
    const entry = counts.get(lower) || { word: m[0], count: 0 };
    entry.count += 1;
    counts.set(lower, entry);
  }
  const spelling = [...counts.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .slice(0, 12)
    .map(([, e]) => ({
      word: e.word,
      lower: trimToken(e.word),
      suggestion: MISSPELLINGS[trimToken(e.word)],
      count: e.count,
    }));

  // ---- Grammar rules ----
  const findings = [];

  // 1. Standalone lowercase "i" (never inside words, tolerates i.e.).
  const lowerI = source.match(/(^|[^A-Za-z'])i(?!\.e)(?![A-Za-z'])/g) || [];
  if (lowerI.length) {
    findings.push({
      rule: 'capital_i',
      message: `Lowercase "i" - capitalise it ("I") ${lowerI.length} time${lowerI.length === 1 ? '' : 's'}`,
    });
  }

  // 2. Repeated word: "the the", "is is".
  const repeat = source.match(/\b([A-Za-z]{1,15})[ \t]+\1\b/i);
  if (repeat) {
    findings.push({ rule: 'repeated_word', message: `Repeated word "${repeat[1]}" - delete the duplicate` });
  }

  // 3. Double space between words (not line-alignment spacing, which is
  //    standard in invoices - pass { doubleSpaceIsError: false } for docs
  //    where column alignment is normal).
  if (doubleSpaceIsError && /[^ \t\n][ \t]{2,}[^ \t\n]/.test(source)) {
    findings.push({ rule: 'double_space', message: 'Double spaces inside a line - single space between words' });
  }

  // 4. Extra space before punctuation: "word ." / "word ,"
  if (/[A-Za-z0-9] +[,.;:!?]/.test(source)) {
    findings.push({ rule: 'space_before_punct', message: 'Extra space before punctuation - "word !" should be "word!"' });
  }

  // 5. Comma jammed against the next word.
  if (/[A-Za-z0-9],[A-Za-z]/.test(source)) {
    findings.push({ rule: 'space_after_comma', message: 'Missing space after a comma' });
  }

  //        (b) a lowercase letter right after sentence-ending punctuation
  //        mid-line. Bullets, numbered lines, and known lowercase openers
  //        (e.g., i.e., p.s., vs.) are skipped.
  const BULLET_LINE_RE = /^([-•*#\u2022]|\d[.)])/;
  const lines = source.split('\n').map((l) => l.trim()).filter(Boolean);
  let badStarts = 0;
  for (const line of lines) {
    if (BULLET_LINE_RE.test(line)) continue;
    if (/^[a-z]/.test(line) && /[.!?]\s*$/.test(line)) badStarts += 1;
  }
  // Require ≥2 letters before the punctuation so single-letter abbreviation
  // periods (the ones in e.g. / i.e. / p.s.) never trigger this rule.
  const AfterStopRe = /[A-Za-z]{2,}[.!?][ \t]+([a-z])/g;
  let stopMatch;
  while ((stopMatch = AfterStopRe.exec(source)) !== null) {
    const head = source.slice(stopMatch.index, stopMatch.index + stopMatch[0].length).toLowerCase();
    if (head.endsWith('vs.') || head.endsWith('etc.')) continue;
    badStarts += 1;
  }
    if (/^\.?[eg]\.|^\.?\.s|\betc\b|^vs\.?/i.test(rest.slice(0, 5))) continue; // e.g. / i.e. / p.s. style
    badStarts += 1;
  }
  if (badStarts) {
    findings.push({
      rule: 'sentence_case',
      message: `Capitalise the first letter of a sentence (${badStarts} spot${badStarts === 1 ? '' : 's'})`,
    });
  }

  // 7. a vs an (approximate; listed exceptions respected).
  const aVowel = (source.match(/\ba\s+(?![A-Z])([a-z]+)/gi) || []).filter((s) => {
    const w = s.slice(2).toLowerCase();
    return /^[aeiou]/.test(w) && !A_EXCEPTION_RE.test(w);
  });
  const anConsonant = (source.match(/\ban\s+([a-z]+)/gi) || []).filter((s) => {
    const w = s.slice(3).toLowerCase();
    return /^[bcdfghjklmnpqrstvwxyz]/.test(w) && !AN_EXCEPTIONS.has(w);
  });
  const aAnCount = aVowel.length + anConsonant.length;
  if (aAnCount) {
    findings.push({
      rule: 'a_an',
      message: `Check "a" vs "an" (${aAnCount} spot${aAnCount === 1 ? '' : 's'}) - "an apple" but "a university"`,
    });
  }

  // Bonus: informal shorthand / emoji in formal documents.
  const informal = source.match(INFORMAL_RE) || [];
  if (informal.length) {
    findings.push({
      rule: 'informal',
      message: 'Informal shorthand (pls, thx, coz, emoji) looks out of place in a formal document',
    });
  }

  return {
    checked: true,
    spelling,
    grammar: findings.slice(0, 10),
    total: spelling.reduce((n, s) => n + s.count, 0) + findings.length,
  };
}

module.exports = { checkWriting };
