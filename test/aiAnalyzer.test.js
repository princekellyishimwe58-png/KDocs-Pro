const { test, describe } = require('node:test');
const assert = require('node:assert');
const { analyzeDocument, extractKeywords, findSkills } = require('../utils/aiAnalyzer');

const JD = `We are looking for a Marketing Officer with strong digital marketing and
Microsoft Excel skills. The role covers social media campaigns, customer service
and report writing. 3 years experience required.`;

const CV_STRONG = {
  fullName: 'Jane Wanjiru',
  email: 'jane@example.com',
  phone: '0712 345 678',
  summary: 'Results-driven marketing professional with 5 years of experience.',
  experience: 'managed a team of 6\nincreased sales by 20%\ndelivered digital marketing campaigns',
  education: 'BCom, University of Nairobi (2018)',
  skills: 'Microsoft Excel, Digital marketing, Social media, Communication',
};

describe('extractKeywords', () => {
  test('drops stopwords, digits, emails and short tokens', () => {
    const kw = extractKeywords('Email jane@x.com or call 0712345678 about the the Marketing role, 3 yrs');
    assert.ok(!kw.includes('email'));
    assert.ok(!kw.some((w) => /\d/.test(w)));
    assert.ok(!kw.includes('the'));
  });

  test('keeps meaningful frequent words', () => {
    const kw = extractKeywords(JD);
    assert.ok(kw.includes('marketing'));
    assert.ok(kw.includes('social') || kw.includes('media') || kw.includes('customer'));
  });
});

describe('findSkills', () => {
  test('matches known skills with aliases', () => {
    const skills = findSkills('Strong MS Excel and customer care background');
    assert.ok(skills.includes('Microsoft Excel'));
    assert.ok(skills.includes('Customer service'));
  });

  test('word boundaries prevent false matches', () => {
    // 'word' must not match inside 'keyword'; 'sage' not inside 'usage'
    const skills = findSkills('keyword research and general usage of tools');
    assert.strictEqual(skills.length, 0);
  });
});

describe('analyzeDocument', () => {
  test('CV analysis returns structured, honest output', () => {
    const r = analyzeDocument('cv', CV_STRONG, '');
    assert.strictEqual(typeof r.score, 'number');
    assert.strictEqual(r.docType, 'cv');
    assert.strictEqual(Array.isArray(r.insights), true);
    assert.strictEqual(Array.isArray(r.suggestions), true);
    assert.ok(r.headline.length > 0);
    assert.strictEqual(r.confidence, 'rule-based');
  });

  test('job-description matching reports matched skills and keyword coverage', () => {
    const r = analyzeDocument('cv', CV_STRONG, JD);
    assert.strictEqual(r.hasJobDescription, true);
    const matchInsight = r.insights.find((i) => i.title.includes('skills we spotted'));
    assert.ok(matchInsight, 'expected a skill-match insight');
    assert.ok(matchInsight.title.includes('Microsoft Excel'));
    const kwInsight = r.insights.find((i) => i.title.includes('Keyword coverage'));
    assert.ok(kwInsight, 'expected a keyword coverage insight');
  });

  test('suggests missing keyword only as conditional advice, capped at 5', () => {
    const r = analyzeDocument('cv', CV_STRONG, JD);
    assert.ok(r.suggestions.length <= 5);
  });

  test('never echoes contact details into suggestions', () => {
    const r = analyzeDocument('cv', { ...CV_STRONG, email: 'secret.personal@gmail.com', phone: '0722999888' }, '');
    const out = JSON.stringify(r);
    assert.ok(!out.includes('secret.personal@gmail.com'));
    assert.ok(!out.includes('0722999888'));
  });

  test('non-CV document gets concrete per-doc suggestions', () => {
    const weak = { fullName: 'Jane', companyName: 'Acme', reason: 'short' };
    const r = analyzeDocument('resignation', weak, '');
    assert.ok(r.suggestions.length > 0);
    assert.ok(r.insights.length > 0);
  });

  test('empty fields never crash and still return a usable panel', () => {
    const r = analyzeDocument('cover_letter', {}, '');
    assert.strictEqual(typeof r.score, 'number');
    assert.ok(r.disclaimer.length > 0);
  });

  test('all 19 document types produce output', () => {
    const docs = ['cv', 'cover_letter', 'job_application', 'leave_request', 'salary_increment',
      'offer_acceptance', 'self_appraisal', 'resignation', 'reference_request', 'farewell',
      'handover_report', 'experience_certificate', 'recommendation_letter', 'admission_application',
      'leave_permission', 'fee_bursary_request', 'freelance_invoice', 'meeting_minutes', 'business_card'];
    docs.forEach((d) => {
      const r = analyzeDocument(d, {}, '');
      assert.strictEqual(r.docType, d);
      assert.ok(r.headline.length > 0, `${d} missing headline`);
    });
  });
});
