// ============================================================
// KDocs AI - the analysis engine behind the "KDocs AI" panel.
//
// Hard rules (by design, not by accident):
//   1. 100% rule-based. No external AI calls, no user text leaves
//      the server, no black-box scores.
//   2. It NEVER invents personal information. Every statement
//      refers to something the person actually typed, and
//      suggestions are phrased as "add this if true".
//   3. It never echoes contact details (emails/phones) back into
//      the UI - keyword extraction strips anything with digits
//      or @ signs by construction.
// ============================================================

const { computeReadyScore, FIELD_MAP } = require('./readyScore');
const { STAGES } = require('./templates');

// Common filler words ignored during keyword extraction.
const STOPWORDS = new Set(('the and for with that this from are you your our their has have was were will '
  + 'can all any not but its our who whom which what when where how why out about into over under more most '
  + 'other some such only own same than too very just also may might must shall should would could done using '
  + 'use used work working works role roles job jobs candidate candidates applicant applicants position '
  + 'company companies organisation organization kenya nairobi years year months month experience experienced '
  + 'degree diploma certificate qualifications qualification skills skill ability able strong good great excellent '
  + 'must plus etc per via within upon among across between during before after while both each either neither '
  + 'need needs needed looking seeking hiring join wants want help make makes get new like well based').split(' '));

// Skill vocabulary: canonical name -> aliases matched in text (word-boundary).
const SKILL_ALIASES = [
  ['Microsoft Excel', ['ms excel', 'excel']],
  ['Microsoft Word', ['ms word', 'word processing', 'microsoft word']],
  ['Microsoft Office', ['microsoft office', 'ms office']],
  ['PowerPoint', ['powerpoint', 'ms powerpoint']],
  ['QuickBooks', ['quickbooks']],
  ['Sage', ['sage accounts', 'sage']],
  ['SAP', ['sap']],
  ['Data analysis', ['data analysis', 'data analytics']],
  ['SQL', ['sql']],
  ['Python', ['python']],
  ['JavaScript', ['javascript', 'js']],
  ['Java', ['java']],
  ['React', ['react']],
  ['HTML/CSS', ['html', 'css']],
  ['Bookkeeping', ['bookkeeping', 'book keeper', 'bookkeeper']],
  ['Accounting', ['accounting', 'accounts']],
  ['Auditing', ['audit', 'auditing']],
  ['Finance', ['finance', 'financial']],
  ['Procurement', ['procurement', 'purchasing']],
  ['Supply chain', ['supply chain', 'logistics', 'stores management']],
  ['Sales', ['sales']],
  ['Marketing', ['marketing']],
  ['Digital marketing', ['digital marketing', 'online marketing']],
  ['Social media', ['social media']],
  ['Customer service', ['customer service', 'customer care', 'client service']],
  ['Front desk', ['front desk', 'reception', 'receptionist']],
  ['Teaching', ['teaching', 'tsc', 'curriculum']],
  ['Nursing', ['nursing', 'clinical']],
  ['Community health', ['community health']],
  ['Project management', ['project management', 'projects']],
  ['Report writing', ['report writing', 'reporting']],
  ['Record keeping', ['record keeping', 'records management', 'filing']],
  ['Graphic design', ['graphic design', 'photoshop', 'illustrator', 'canva']],
  ['Communication', ['communication', 'communicator']],
  ['Teamwork', ['teamwork', 'team player', 'collaboration']],
  ['Leadership', ['leadership', 'supervising', 'supervision']],
  ['Time management', ['time management']],
  ['Problem solving', ['problem solving', 'problem-solving', 'analytical']],
  ['Attention to detail', ['attention to detail', 'detail-oriented', 'detail oriented']],
  ['Driving', ['driving licence', 'driving license', 'valid driving']],
];

// One concrete coaching tip per content field, per document type. Phrased so
// they're only worth following when true.
const SPECIAL_SUGGESTIONS = {
  cv: {
    summary: 'Open your summary with who you are and your single strongest result - two lines is enough.',
    experience: 'Start each experience line with an action verb ("managed", "increased") and a number where you have one.',
    skills: 'List your top 6-8 skills as short, specific items recruiters scan for.',
    education: 'Give each qualification its own line: certificate, institution, year.',
    achievements: 'Add one measurable achievement - an amount, percentage, or volume you personally delivered.',
    referees: 'For each referee include name, title, and phone - or write "Available upon request".',
  },
  cover_letter: {
    experience: 'Match your first paragraph to the exact role title and one requirement from the advert.',
    achievements: 'Add one specific result from a past role that proves you can do this job.',
  },
  job_application: {
    qualification: 'Quote the exact qualification the advert asks for, with your grade or class where strong.',
    experience: 'Name employers, dates, and duties - specifics beat general claims.',
    reason: 'Say why THIS employer specifically - one sentence about their work goes a long way.',
  },
  admission_application: {
    qualification: 'List your final secondary results or certificates with years attained.',
    reason: 'Say why THIS institution - mention the exact programme name as advertised.',
  },
  fee_bursary_request: {
    reason: 'State your situation plainly and the exact amount or help you are requesting.',
  },
  leave_permission: {
    reason: 'State the exact dates and a clear, honest reason - keep it brief and respectful.',
  },
  leave_request: {
    reason: 'State the exact dates and type of leave (annual, sick, compassionate).',
  },
  salary_increment: {
    achievements: 'Quantify your contribution: revenue, savings, or workload you carried. Numbers persuade.',
    duration: 'State your exact time in the role and current salary if you are comfortable sharing it.',
  },
  self_appraisal: {
    achievements: 'Use the STAR shape: situation, task, action, result - one per achievement.',
    goals: 'Set 2-3 specific, measurable goals for the next period.',
  },
  resignation: {
    reason: 'Keep the reason brief and neutral - "personal reasons" or "new opportunity" is enough.',
    lastDay: 'Check your notice period in your contract before setting the last day.',
  },
  handover_report: {
    keyResponsibilities: 'List each responsibility as its own line so your successor can follow it.',
    pendingTasks: 'Flag deadlines and next steps for anything still open.',
  },
  reference_request: {
    achievements: 'Remind your referee of 1-2 things you did well under them - it makes their letter easy.',
  },
  recommendation_letter: {
    achievements: 'Give one concrete example of the candidate doing excellent work.',
    relationship: 'State how long and in what capacity you have known the candidate.',
  },
  experience_certificate: {
    achievements: 'A short line on conduct and performance makes the certificate more useful.',
  },
  freelance_invoice: {
    items: 'One item per line as "description - amount". Check every amount before sending.',
    notes: 'Include your M-Pesa Till/Paybill or bank details so the client can pay you immediately.',
  },
  meeting_minutes: {
    actionItems: 'Every action item needs an owner and a date, or it will not happen.',
    discussion: 'Summarise decisions and disagreements - not a word-for-word transcript.',
  },
  business_card: {
    fullName: 'Use the name you want clients to find you by.',
  },
  offer_acceptance: {
    terms: 'Restate the salary, title, and start date you accepted - it protects both sides.',
  },
  farewell: {
    message: 'Keep it warm and short - thank the team and share personal contact details only.',
  },
};

function docLabel(docType) {
  for (const stage of Object.values(STAGES)) {
    if (stage.documents[docType]) return stage.documents[docType].label;
  }
  return 'document';
}

function wordCount(str) {
  return (String(str || '')).trim().split(/\s+/).filter(Boolean).length;
}

// Keywords from a job description: lowercase words only - no digits (kills
// phones/salaries), no @ (kills emails), no single/oversized tokens.
function extractKeywords(text) {
  const words = String(text).toLowerCase().match(/[a-z][a-z-]{2,}/g) || [];
  const freq = new Map();
  for (const w of words) {
    if (w.length < 3 || w.length > 24 || STOPWORDS.has(w)) continue;
    freq.set(w, (freq.get(w) || 0) + 1);
  }
  return [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([w]) => w);
}

// Word-boundary matching so 'word' never matches inside 'keyword' or 'sage'
// inside 'usage' - false skill matches would undermine trust in the panel.
function escapeRe(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
function textHasSkill(text, aliases) {
  const lower = String(text).toLowerCase();
  return aliases.some((a) => new RegExp(`\\b${escapeRe(a)}\\b`).test(lower));
}

function findSkills(text) {
  const found = [];
  for (const [canonical, aliases] of SKILL_ALIASES) {
    if (textHasSkill(text, aliases)) found.push(canonical);
  }
  return found;
}

function listWords(words, max) {
  return words.slice(0, max).join(', ');
}

// ---------- CV + job-description matching ----------
function analyzeCv(fields, jd, kw) {
  const insights = [];
  const suggestions = [];
  const cvText = ['summary', 'experience', 'education', 'skills', 'achievements', 'referees']
    .map((n) => fields[n] || '').join('\n');

  const jdSkills = findSkills(jd);
  const cvSkills = findSkills(cvText);
  const matchedSkills = jdSkills.filter((s) => cvSkills.includes(s));
  const missingSkills = jdSkills.filter((s) => !cvSkills.includes(s));

  if (jdSkills.length) {
    insights.push({
      kind: matchedSkills.length ? 'match' : 'tip',
      icon: matchedSkills.length ? '✅' : '💡',
      title: matchedSkills.length === jdSkills.length
        ? `You cover all ${jdSkills.length} skills we spotted in this posting`
        : matchedSkills.length
          ? `You cover ${matchedSkills.length} of the ${jdSkills.length} skills we spotted in this posting`
          : 'No overlap yet with the skills in this posting',
      detail: matchedSkills.length
        ? `Matched: ${listWords(matchedSkills, 6)}. Keep them visible near the top of your skills section.`
        : `This posting mentions: ${listWords(jdSkills, 6)}. Only add the ones you genuinely have.`,
    });
  }

  if (kw.length) {
    const lowerCv = cvText.toLowerCase();
    const missing = kw.filter((w) => !lowerCv.includes(w));
    insights.push({
      kind: 'match',
      icon: '🔎',
      title: `Keyword coverage: ${kw.length - missing.length}/${kw.length} of the posting's key terms`,
      detail: missing.length
        ? `Not yet used: ${listWords(missing, 8)}. Recruiters (and ATS software) search for their own wording - echo it where it is true for you.`
        : 'Your CV already echoes the posting\u2019s key terms. Strong positioning.',
    });
    if (missing.length) {
      suggestions.push({
        field: 'skills',
        title: 'Close the keyword gap honestly',
        detail: `Add any of these that genuinely describe you: ${listWords(missing, 8)}. Never list a skill you cannot defend in an interview.`,
      });
    }
  }

  if (!cvSkills.length) {
    suggestions.push({
      field: 'skills',
      title: 'Name your tools and skills explicitly',
      detail: 'List concrete skills (e.g. "Microsoft Excel", "Customer service") - scanners and recruiters search for exact names.',
    });
  }

  if (fields.referees && wordCount(fields.referees) < 2) {
    suggestions.push({
      field: 'referees',
      title: 'Referees need more than one word',
      detail: 'Give each referee a name, title, and phone - or write "Available upon request".',
    });
  }

  return { insights, suggestions };
}

// ---------- Generic (all 19 documents) ----------
function genericSuggestions(docType, fields, score) {
  const suggestions = [];
  const spec = SPECIAL_SUGGESTIONS[docType] || {};
  const content = (FIELD_MAP[docType] || {}).content || [];

  // Weak/empty content fields first - the highest-leverage fix.
  content.forEach((name) => {
    if (wordCount(fields[name]) < 8 && spec[name]) {
      suggestions.push({ field: name, title: `Strengthen: ${name.replace(/([A-Z])/g, ' $1').toLowerCase()}`, detail: spec[name] });
    }
  });

  // Letters that talk about "your company" instead of naming it.
  const blob = Object.values(fields).join(' ');
  if (/\b(your company|the company|your organisation|your organization|your institution|the school)\b/i.test(blob)) {
    suggestions.push({
      field: null,
      title: 'Name the recipient organisation',
      detail: 'Replace phrases like "your company" with the actual organisation name - generic wording reads like a template.',
    });
  }

  // One doc-specific power tip, even when everything else looks fine.
  const fallbackTip = Object.entries(spec).find(([f]) => fields[f]) || Object.entries(spec)[0];
  if (fallbackTip && !suggestions.some((s) => s.field === fallbackTip[0])) {
    suggestions.push({ field: fallbackTip[0], title: 'Pro tip', detail: fallbackTip[1] });
  }

  // Score-driven insight, so the panel always explains the number.
  const top = score.checklist.find((c) => !c.passed);
  const insights = [{
    kind: top ? 'gap' : 'strength',
    icon: top ? '🛠️' : '🏆',
    title: top ? `Biggest win available: ${top.label.toLowerCase()}` : 'Every structural check passes',
    detail: top ? top.detail : 'You are ready to preview, pay, and download a clean copy.',
  }];

  return { insights, suggestions };
}

// ---------- Entry point ----------
// jdText: optional pasted job description/advert. fields: sanitized form values.
function analyzeDocument(docType, fields = {}, jdText = '') {
  const jd = String(jdText || '').slice(0, 20000).trim();
  const score = computeReadyScore(docType, fields);
  const label = docLabel(docType);

  let insights = [];
  let suggestions = [];

  const docSpecific = docType === 'cv'
    ? analyzeCv(fields, jd, jd ? extractKeywords(jd) : [])
    : genericSuggestions(docType, fields, score);
  insights = docSpecific.insights;
  suggestions = docSpecific.suggestions;

  // Everyone also gets the score-driven insight + generic coaching, deduped
  // by target field so no two suggestions point at the same box.
  const generic = docType === 'cv' ? genericSuggestions(docType, fields, score) : { insights: [], suggestions: [] };
  insights = insights.concat(generic.insights);
  suggestions = suggestions.concat(generic.suggestions.filter(
    (s) => !suggestions.some((x) => x.field === s.field)
  ));

  const headline = jd
    ? (score.score >= 85
        ? 'Strong draft - and matched against this posting'
        : score.score >= 65
          ? 'Good start - tighten the gaps below'
          : 'Promising matches - now build out the draft itself')
    : (score.score >= 85 ? 'This draft is in strong shape' : score.score >= 65 ? 'Solid draft - a few things to tighten' : 'Let\u2019s strengthen this draft');

  suggestions = suggestions.slice(0, 5);
  insights = insights.slice(0, 6);

  return {
    docType,
    label,
    hasJobDescription: Boolean(jd),
    headline,
    score: score.score,
    readyLabel: score.readyLabel,
    checklist: score.checklist,
    insights,
    suggestions,
    confidence: 'rule-based',
    disclaimer: 'KDocs AI gives rule-based guidance from what you have typed. It never invents facts about you, and it cannot guarantee any outcome with an employer or institution.',
  };
}

module.exports = { analyzeDocument, extractKeywords, findSkills };
