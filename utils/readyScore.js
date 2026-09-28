// "Ready Score" - a rule-based best-practices checklist, NOT a real AI/ATS
// scanner. It never claims to predict how any specific company's actual
// applicant-tracking software will behave - it only checks structural,
// well-documented formatting conventions. Always shown with a disclaimer.

const ACTION_VERBS = [
  'managed', 'led', 'increased', 'decreased', 'reduced', 'improved', 'developed',
  'created', 'implemented', 'achieved', 'delivered', 'built', 'designed', 'launched',
  'coordinated', 'organized', 'organised', 'negotiated', 'generated', 'optimized',
  'optimised', 'streamlined', 'trained', 'mentored', 'analyzed', 'analysed',
  'executed', 'spearheaded', 'established', 'initiated', 'resolved', 'exceeded', 'grew',
];

// Which free-text fields count as "content" (substantial writing) vs "contact"
// info vs "required" fields, per document type. Not every doc type has all three.
const FIELD_MAP = {
  cv: { content: ['summary', 'experience', 'education', 'skills', 'achievements'], required: ['experience', 'education', 'skills'], contact: ['email', 'phone'] },
  cover_letter: { content: ['experience', 'achievements'], required: ['position', 'companyName', 'experience'], contact: ['email', 'phone'] },
  job_application: { content: ['qualification', 'experience', 'reason'], required: ['position', 'companyName', 'qualification'], contact: ['email', 'phone'] },
  leave_request: { content: ['reason'], required: ['reason', 'startDate', 'endDate'], contact: [] },
  salary_increment: { content: ['achievements'], required: ['achievements', 'duration'], contact: [] },
  offer_acceptance: { content: ['terms'], required: ['position', 'companyName', 'startDate'], contact: [] },
  self_appraisal: { content: ['achievements', 'challenges', 'goals'], required: ['achievements', 'goals'], contact: [] },
  resignation: { content: ['reason'], required: ['position', 'companyName', 'lastDay'], contact: [] },
  reference_request: { content: ['achievements'], required: ['recipientName', 'achievements'], contact: [] },
  farewell: { content: ['message'], required: ['companyName'], contact: [] },
  handover_report: { content: ['keyResponsibilities', 'pendingTasks'], required: ['keyResponsibilities', 'lastDay'], contact: [] },
  experience_certificate: { content: ['achievements'], required: ['position', 'companyName', 'startDate', 'endDate'], contact: [] },
  recommendation_letter: { content: ['achievements'], required: ['candidateName', 'achievements'], contact: ['email'] },
  admission_application: { content: ['qualification', 'reason'], required: ['institutionName', 'course', 'qualification'], contact: ['email', 'phone'] },
  leave_permission: { content: ['reason'], required: ['reason', 'startDate', 'endDate'], contact: [] },
  fee_bursary_request: { content: ['reason'], required: ['institutionName', 'reason'], contact: [] },
  freelance_invoice: { content: ['items'], required: ['items', 'clientName', 'invoiceNumber'], contact: ['freelancerEmail'] },
  meeting_minutes: { content: ['discussion', 'actionItems'], required: ['agenda', 'discussion', 'actionItems'], contact: [] },
  business_card: { content: [], required: ['fullName', 'jobTitle', 'phone', 'email'], contact: ['phone', 'email'] },
};

function wordCount(str) {
  return (str || '').trim().split(/\s+/).filter(Boolean).length;
}

function joinFields(fields, names) {
  return names.map((n) => fields[n] || '').join('\n');
}

function hasEmail(text) {
  return /[^\s@]+@[^\s@]+\.[^\s@]+/.test(text);
}
function hasPhone(text) {
  return /(\+?\d[\d\s-]{7,}\d)/.test(text);
}
function hasBullets(text) {
  const lines = (text || '').split('\n').map((l) => l.trim()).filter(Boolean);
  if (lines.length >= 2) return true;
  return /^[-•*]\s|^\d+\.\s/m.test(text || '');
}
function hasActionVerb(text) {
  const lower = (text || '').toLowerCase();
  return ACTION_VERBS.some((v) => lower.includes(v));
}
function hasNumber(text) {
  return /\d/.test(text || '');
}
function hasPlaceholderText(text) {
  return /\[[^\]]*\]|\bTBD\b|\bxxx+\b/i.test(text || '');
}

function computeReadyScore(docType, fields) {
  const map = FIELD_MAP[docType] || { content: [], required: [], contact: [] };
  const contentText = joinFields(fields, map.content);
  const requiredText = joinFields(fields, map.required);
  const contactText = joinFields(fields, map.contact);
  const allText = `${contentText}\n${requiredText}`;

  const checklist = [];

  if (map.required.length) {
    const filledCount = map.required.filter((n) => (fields[n] || '').trim().length > 2).length;
    checklist.push({
      key: 'required',
      label: docType === 'cv' ? 'Standard section headers present (Experience, Education, Skills)' : 'Key details filled in',
      passed: filledCount === map.required.length,
      detail: `${filledCount}/${map.required.length} required fields completed`,
    });
  }

  if (map.contact.length) {
    const found = hasEmail(contactText) || hasPhone(contactText) || map.contact.some((n) => (fields[n] || '').trim().length > 3);
    checklist.push({
      key: 'contact',
      label: 'Contact info detectable (email, phone found)',
      passed: found,
      detail: found ? 'Contact details found' : 'Add an email or phone number',
    });
  }

  if (docType === 'cv') {
    checklist.push({
      key: 'no_graphics',
      label: 'No tables, columns, or images',
      passed: true,
      detail: 'Single-column, text-based layout by design',
    });
    checklist.push({
      key: 'bullets',
      label: 'Bullet points used instead of dense paragraphs',
      passed: hasBullets(contentText),
      detail: hasBullets(contentText) ? 'Content is broken into lines/points' : 'Try breaking long paragraphs into separate lines',
    });
    checklist.push({
      key: 'action_verbs',
      label: 'Action verbs and measurable results present',
      passed: hasActionVerb(contentText) && hasNumber(contentText),
      detail: 'Looks for words like "increased", "managed" plus numbers/percentages',
    });
  }

  if (map.content.length) {
    const words = wordCount(contentText);
    const minWords = docType === 'cv' ? 60 : 15;
    const maxWords = docType === 'cv' ? 700 : 400;
    const reasonable = words >= minWords && words <= maxWords;
    checklist.push({
      key: 'length',
      label: 'Reasonable length (not too short, not too long)',
      passed: reasonable,
      detail: `${words} words`,
    });

    if (docType !== 'cv') {
      checklist.push({
        key: 'specifics',
        label: 'Specific details included (dates, names, numbers)',
        passed: hasNumber(contentText),
        detail: hasNumber(contentText) ? 'Includes specific figures/dates' : 'Add a specific date, number, or name',
      });
    }
  }

  checklist.push({
    key: 'placeholders',
    label: 'No leftover placeholder text',
    passed: !hasPlaceholderText(allText),
    detail: hasPlaceholderText(allText) ? 'Remove bracketed placeholders like [date]' : 'Clean, no placeholders left',
  });

  const passedCount = checklist.filter((c) => c.passed).length;
  const score = checklist.length ? Math.round((passedCount / checklist.length) * 100) : 100;

  let readyLabel = 'Needs work';
  if (score >= 85) readyLabel = 'Excellent';
  else if (score >= 65) readyLabel = 'Good';
  else if (score >= 40) readyLabel = 'Needs work';
  else readyLabel = 'Needs significant work';

  return {
    score,
    readyLabel,
    checklist,
    isAts: docType === 'cv',
    disclaimer: docType === 'cv'
      ? 'Based on common ATS formatting standards. Individual company systems vary — this checks structure, not guaranteed placement.'
      : 'An automated best-practices checklist, not a guarantee of approval or acceptance.',
  };
}

module.exports = { computeReadyScore, FIELD_MAP };
