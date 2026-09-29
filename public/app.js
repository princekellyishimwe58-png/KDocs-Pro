// ---------- Field definitions per document type ----------
// These match the field names read by utils/pdfGenerator.js on the server.
const FIELD_SETS = {
  cv: [
    ['fullName', 'Full name', 'text'], ['email', 'Email', 'text'], ['phone', 'Phone', 'text'],
    ['address', 'Address / City', 'text'],
    ['summary', 'Professional summary', 'textarea'],
    ['experience', 'Work experience', 'textarea'],
    ['education', 'Education', 'textarea'],
    ['skills', 'Skills', 'textarea'],
    ['achievements', 'Achievements (optional)', 'textarea'],
    ['referees', 'Referees (optional)', 'textarea'],
  ],
  cover_letter: [
    ['fullName', 'Full name', 'text'], ['email', 'Email', 'text'], ['phone', 'Phone', 'text'], ['address', 'Address', 'text'],
    ['recipientName', 'Hiring manager (optional)', 'text'], ['companyName', 'Company name', 'text'],
    ['position', 'Position applying for', 'text'],
    ['experience', 'Relevant experience', 'textarea'],
    ['achievements', 'Key achievements (optional)', 'textarea'],
  ],
  job_application: [
    ['fullName', 'Full name', 'text'], ['email', 'Email', 'text'], ['phone', 'Phone', 'text'], ['address', 'Address', 'text'],
    ['recipientName', 'Recipient (optional)', 'text'], ['companyName', 'Company name', 'text'],
    ['position', 'Position', 'text'], ['qualification', 'Qualifications', 'textarea'],
    ['experience', 'Experience', 'textarea'], ['reason', 'Why you are a fit (optional)', 'textarea'],
  ],
  leave_request: [
    ['fullName', 'Full name', 'text'], ['position', 'Your position', 'text'], ['companyName', 'Company', 'text'],
    ['recipientName', 'Manager name (optional)', 'text'],
    ['startDate', 'Leave start date', 'text'], ['endDate', 'Leave end date', 'text'],
    ['reason', 'Reason for leave', 'textarea'],
  ],
  salary_increment: [
    ['fullName', 'Full name', 'text'], ['position', 'Your position', 'text'], ['companyName', 'Company', 'text'],
    ['recipientName', 'Manager name (optional)', 'text'],
    ['duration', 'Time in role (e.g. 2 years)', 'text'],
    ['achievements', 'Your contributions', 'textarea'],
  ],
  offer_acceptance: [
    ['fullName', 'Full name', 'text'], ['position', 'Position offered', 'text'], ['companyName', 'Company', 'text'],
    ['recipientName', 'Recipient (optional)', 'text'],
    ['startDate', 'Start date', 'text'], ['terms', 'Notes on terms (optional)', 'textarea'],
  ],
  resignation: [
    ['fullName', 'Full name', 'text'], ['position', 'Your position', 'text'], ['companyName', 'Company', 'text'],
    ['recipientName', 'Manager name (optional)', 'text'],
    ['lastDay', 'Last working day', 'text'], ['reason', 'Reason (optional)', 'textarea'],
  ],
  reference_request: [
    ['fullName', 'Full name', 'text'], ['position', 'Your former position', 'text'], ['companyName', 'Former company', 'text'],
    ['recipientName', 'Referee name', 'text'],
    ['reason', 'What you need the reference for', 'text'],
    ['achievements', 'What you accomplished there', 'textarea'],
  ],
  farewell: [
    ['fullName', 'Full name', 'text'], ['companyName', 'Company', 'text'],
    ['duration', 'Time at the company', 'text'], ['email', 'Personal email to share', 'text'],
    ['message', 'Personal message (optional)', 'textarea'],
  ],
  admission_application: [
    ['fullName', 'Full name', 'text'], ['email', 'Email', 'text'], ['phone', 'Phone', 'text'], ['address', 'Address', 'text'],
    ['recipientName', 'Admissions officer (optional)', 'text'], ['institutionName', 'Institution name', 'text'],
    ['course', 'Course / Programme', 'text'], ['qualification', 'Qualifications held', 'textarea'],
    ['reason', 'Why this institution (optional)', 'textarea'],
  ],
  leave_permission: [
    ['fullName', 'Student full name', 'text'], ['institutionName', 'School / institution name', 'text'],
    ['classOrYear', 'Class / Year of study', 'text'], ['recipientName', 'Teacher / Dean (optional)', 'text'],
    ['startDate', 'Leave start date', 'text'], ['endDate', 'Leave end date', 'text'],
    ['reason', 'Reason for leave', 'textarea'], ['parentName', "Parent/guardian name (optional)", 'text'],
  ],
  fee_bursary_request: [
    ['fullName', 'Full name', 'text'], ['institutionName', 'Institution name', 'text'],
    ['course', 'Course / Programme', 'text'], ['recipientName', 'Bursar / Admin (optional)', 'text'],
    ['reason', 'Your situation & request', 'textarea'],
  ],
  self_appraisal: [
    ['fullName', 'Full name', 'text'], ['position', 'Your position', 'text'], ['companyName', 'Company', 'text'],
    ['recipientName', 'Manager name (optional)', 'text'], ['period', 'Review period (e.g. Q2 2026)', 'text'],
    ['achievements', 'Key achievements', 'textarea'], ['challenges', 'Challenges faced (optional)', 'textarea'],
    ['goals', 'Goals for next period', 'textarea'],
  ],
  handover_report: [
    ['fullName', 'Full name', 'text'], ['position', 'Your position', 'text'], ['companyName', 'Company', 'text'],
    ['recipientName', 'Successor / manager (optional)', 'text'], ['lastDay', 'Last working day', 'text'],
    ['keyResponsibilities', 'Key responsibilities', 'textarea'], ['pendingTasks', 'Pending tasks / priorities', 'textarea'],
    ['contacts', 'Key contacts (optional)', 'textarea'],
  ],
  experience_certificate: [
    ['fullName', 'Employee full name', 'text'], ['position', 'Position held', 'text'], ['companyName', 'Company', 'text'],
    ['startDate', 'Start date', 'text'], ['endDate', 'End date', 'text'],
    ['achievements', 'Notes on performance (optional)', 'textarea'],
    ['issuedBy', 'Issued by (name/title, optional)', 'text'], ['issueDate', 'Issue date (optional)', 'text'],
  ],
  recommendation_letter: [
    ['fullName', 'Your full name (referee)', 'text'], ['email', 'Email', 'text'], ['phone', 'Phone', 'text'], ['address', 'Address', 'text'],
    ['recipientName', 'Addressed to (optional)', 'text'], ['candidateName', 'Candidate\'s name', 'text'],
    ['relationship', 'Your relationship to them', 'text'], ['refereeCompany', 'Where you worked together', 'text'],
    ['reason', 'What this is for (e.g. new job, university)', 'text'], ['achievements', 'Their strengths / achievements', 'textarea'],
  ],
  freelance_invoice: [
    ['freelancerName', 'Your name / business name', 'text'], ['freelancerEmail', 'Your email', 'text'],
    ['freelancerPhone', 'Your phone', 'text'], ['freelancerAddress', 'Your address (optional)', 'text'],
    ['clientName', 'Client name', 'text'], ['clientEmail', 'Client email (optional)', 'text'],
    ['invoiceNumber', 'Invoice number', 'text'], ['invoiceDate', 'Invoice date', 'text'], ['dueDate', 'Due date (optional)', 'text'],
    ['items', 'Line items - one per line as "description - amount"', 'textarea'],
    ['notes', 'Payment details / notes (optional)', 'textarea'],
  ],
  meeting_minutes: [
    ['meetingTitle', 'Meeting title', 'text'], ['date', 'Date', 'text'],
    ['attendees', 'Attendees', 'textarea'], ['agenda', 'Agenda', 'textarea'],
    ['discussion', 'Discussion summary', 'textarea'], ['actionItems', 'Action items', 'textarea'],
    ['nextMeetingDate', 'Next meeting date (optional)', 'text'],
  ],
  business_card: [
    ['fullName', 'Full name', 'text'], ['jobTitle', 'Job title', 'text'], ['companyName', 'Company (optional)', 'text'],
    ['phone', 'Phone', 'text'], ['email', 'Email', 'text'], ['website', 'Website (optional)', 'text'],
    ['address', 'Address (optional)', 'text'],
  ],
};

// ---------- Sample data used to render live template previews ----------
// Keyed by field name (reused across doc types) so one lookup table covers all 19 documents.
const SAMPLE_VALUES = {
  fullName: 'Jane Wanjiru', freelancerName: 'Jane Wanjiru', candidateName: 'John Otieno',
  email: 'jane.wanjiru@email.com', freelancerEmail: 'jane.wanjiru@email.com', clientEmail: 'accounts@brighttraders.co.ke',
  phone: '0712 345 678', freelancerPhone: '0712 345 678',
  address: 'Nairobi, Kenya', freelancerAddress: 'Nairobi, Kenya',
  companyName: 'Acme Solutions Ltd', institutionName: 'University of Nairobi', refereeCompany: 'Acme Solutions Ltd', clientName: 'Bright Traders Ltd',
  position: 'Marketing Officer', jobTitle: 'Marketing Officer', course: 'Bachelor of Commerce',
  recipientName: 'Mr. James Mwangi',
  qualification: 'a Bachelor of Commerce degree and 3 years of relevant experience',
  summary: 'Results-driven professional with 5+ years of experience in project coordination and client relations.',
  experience: 'Managed cross-functional teams and delivered key projects on time and within budget.',
  education: 'Bachelor of Commerce, University of Nairobi (2018)',
  skills: 'Project Management, Communication, MS Excel, Team Leadership',
  achievements: 'Increased department efficiency by 20% through process improvements.',
  reason: 'a new opportunity that aligns with my career goals',
  duration: '2 years', period: 'Q2 2026',
  startDate: '3 Jan 2024', endDate: '20 July 2026', lastDay: '30 July 2026', dueDate: '30 Aug 2026',
  classOrYear: 'Form 3', parentName: 'Mrs. Grace Wanjiru',
  keyResponsibilities: 'Managing client accounts and coordinating the sales team.',
  pendingTasks: 'Finalize the Q3 report and hand over client files.',
  contacts: 'Contact the operations team for ongoing projects.',
  relationship: 'a direct supervisor',
  terms: 'I confirm my acceptance of the salary and start date discussed.',
  message: 'It has been a pleasure working with such a dedicated team.',
  challenges: 'Balancing multiple project deadlines during a busy quarter.',
  goals: 'Take on more leadership responsibilities and mentor junior staff.',
  issuedBy: 'Human Resources Manager', issueDate: '20 July 2026',
  invoiceNumber: 'INV-0142', invoiceDate: '20 July 2026',
  items: 'Website design - 15000\nLogo design - 5000',
  notes: 'Payment via M-Pesa Till 123456. Due within 14 days.',
  meetingTitle: 'Weekly Team Sync', date: '20 July 2026',
  attendees: 'Jane Wanjiru, John Otieno, Mary Achieng',
  agenda: 'Review project progress, discuss budget allocation',
  discussion: 'The team reviewed ongoing projects and agreed on priorities for the coming week.',
  actionItems: 'Jane to finalize the report by Friday; John to follow up with the client.',
  nextMeetingDate: '27 July 2026',
  website: 'www.janewanjiru.com',
  referees: 'Available upon request',
};

function sampleFieldsFor(docType) {
  const fields = {};
  (FIELD_SETS[docType] || []).forEach(([name]) => {
    fields[name] = SAMPLE_VALUES[name] || 'Sample text';
  });
  return fields;
}

// ---------- State ----------
const state = { stage: null, docType: null, templateKey: null, fields: {}, paymentRef: null, language: 'en' };
let catalog = null;

// Fill the "Document language" dropdown from the shared catalog and keep
// state.language in sync - it controls greetings/sign-offs/CV headers in
// the generated PDF (content you type is never auto-translated).
function populateDocLanguageSelect() {
  const select = document.getElementById('docLanguageSelect');
  if (!select || !catalog || !catalog.languages) return;
  select.innerHTML = '';
  Object.entries(catalog.languages).forEach(([code, label]) => {
    const opt = document.createElement('option');
    opt.value = code;
    opt.textContent = label;
    select.appendChild(opt);
  });
  select.value = state.language || 'en';
  if (!select.value) select.value = 'en';
}

document.getElementById('docLanguageSelect').addEventListener('change', (e) => {
  state.language = e.target.value || 'en';
  scheduleLiveUpdate(0);
});

// ---------- Scroll reveal + hero CTA ----------
const revealObserver = ('IntersectionObserver' in window)
  ? new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add('visible');
          revealObserver.unobserve(en.target);
        }
      });
    }, { threshold: 0.08 })
  : null;
document.querySelectorAll('.reveal').forEach((el) => {
  if (revealObserver) revealObserver.observe(el);
  else el.classList.add('visible');
});

const heroCta = document.getElementById('heroCta');
if (heroCta) {
  heroCta.addEventListener('click', () => {
    document.getElementById('panel-catalog').scrollIntoView({ behavior: 'smooth', block: 'start' });
    setTimeout(() => document.getElementById('catalogSearch')?.focus({ preventScroll: true }), 550);
  });
}

// ---------- Dark mode ----------
const darkToggle = document.getElementById('darkToggle');
// Respect a previously chosen theme (or the OS default) on first load.
(function initTheme() {
  let saved = null;
  try { saved = localStorage.getItem('kdocs_theme'); } catch (err) { /* private mode */ }
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
  darkToggle.textContent = theme === 'dark' ? '☀️' : '🌙';
})();
darkToggle.addEventListener('click', () => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  const next = isDark ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', next);
  darkToggle.textContent = isDark ? '🌙' : '☀️';
  try { localStorage.setItem('kdocs_theme', next); } catch (err) { /* private mode */ }
});

// ---------- Step navigation ----------
function showPanel(name) {
  ['catalog', 'template', 'write'].forEach((n) => {
    document.getElementById(`panel-${n}`).classList.toggle('hidden', n !== name);
  });
  document.querySelectorAll('.step').forEach((el, i) => {
    const order = ['catalog', 'template', 'write'];
    el.classList.toggle('active', order[i] === name);
  });
}
document.querySelectorAll('[data-back]').forEach((btn) => {
  btn.addEventListener('click', () => showPanel(btn.dataset.back));
});

// ---------- Document display names + per-document pricing ----------
// Labels come from the server catalog (one source of truth), with a local
// fallback so the UI still works if the catalog fetch ever fails.
const LABEL_FALLBACKS = {
  cv: 'CV / Resume', cover_letter: 'Cover Letter', job_application: 'Job Application Letter',
  leave_request: 'Leave Request', salary_increment: 'Salary Increment Request',
  offer_acceptance: 'Offer / Promotion Acceptance', self_appraisal: 'Self-Appraisal',
  resignation: 'Resignation Letter', reference_request: 'Reference Request Letter',
  farewell: 'Farewell / Exit Letter', handover_report: 'Handover Report',
  experience_certificate: 'Experience Certificate', recommendation_letter: 'Recommendation Letter',
  admission_application: 'Admission / Application Letter', leave_permission: 'School Leave / Permission Letter',
  fee_bursary_request: 'Fee Waiver / Bursary Request', freelance_invoice: 'Freelance Invoice',
  meeting_minutes: 'Meeting Minutes', business_card: 'Business Card',
};

function documentLabel(docType) {
  for (const stage of Object.values(catalog?.stages || {})) {
    if (stage.documents[docType]) return stage.documents[docType].label;
  }
  return LABEL_FALLBACKS[docType] || 'Document';
}

function priceForDoc(docType) {
  const prices = catalog?.prices || {};
  return prices[docType] !== undefined ? prices[docType] : (catalog?.priceKes || 20);
}

// ---------- Load catalog & build card list ----------
async function init() {
  const res = await fetch('/api/catalog');
  catalog = await res.json();
  const priceValues = Object.values(catalog.prices || {});
  const fromPrice = priceValues.length ? Math.min(...priceValues) : (catalog.priceKes || 20);
  document.getElementById('priceTag').textContent = `KSh ${fromPrice}`;
  // Surface test mode loudly so nobody waits on a PIN prompt that can't come.
  if (catalog.paymentMode === 'test') {
    document.getElementById('payTestNotice')?.classList.remove('hidden');
  }

  try {
    const configRes = await fetch('/api/config');
    const config = await configRes.json();
    googleClientId = config.googleClientId;
  } catch (err) {
    // Config fetch failing shouldn't block the rest of the app.
  }

  renderCatalog('');
  populateDocLanguageSelect();
  document.getElementById('catalogSearch').addEventListener('input', (e) => {
    renderCatalog(e.target.value.trim().toLowerCase());
  });
}

function renderCatalog(filterText) {
  const list = document.getElementById('catalogList');
  list.innerHTML = '';

  Object.entries(catalog.stages).forEach(([stageKey, stage]) => {
    const entries = Object.entries(stage.documents).filter(([, doc]) => {
      if (!filterText) return true;
      return (doc.label + ' ' + (doc.description || '')).toLowerCase().includes(filterText);
    });
    if (entries.length === 0) return;

    const group = document.createElement('div');
    group.className = 'catalog-group';
    group.innerHTML = `<div class="catalog-group-title">${stage.label}</div>`;

    const grid = document.createElement('div');
    grid.className = 'catalog-grid';
    entries.forEach(([docKey, doc]) => {
      const card = document.createElement('div');
      card.className = 'doc-card';
      card.innerHTML = `
        <div class="doc-card-icon">${doc.icon || '📄'}</div>
        <h3>${doc.label}</h3>
        <p>${doc.description || ''}</p>
        <div class="doc-card-meta">
          <span class="doc-card-price">KSh ${priceForDoc(docKey)}</span>
          <span class="doc-card-templates">${Object.keys(catalog.templates).length} templates</span>
        </div>
      `;
      card.addEventListener('click', () => selectDoc(stageKey, docKey));
      grid.appendChild(card);
    });

    group.appendChild(grid);
    list.appendChild(group);
  });

  if (!list.children.length) {
    list.innerHTML = '<p class="hint">No documents match your search.</p>';
  }
}

function selectDoc(stageKey, docKey) {
  state.stage = stageKey;
  state.docType = docKey;
  // No template is pre-selected: the customer must consciously pick the
  // exact layout they'll pay for (we honor a restored draft's choice).
  state.templateKey = null;
  updateCheckout();
  document.getElementById('jdSection').classList.toggle('hidden', docKey !== 'cv');

  const tGrid = document.getElementById('templateGrid');
  tGrid.innerHTML = '';
  const sample = sampleFieldsFor(docKey);

  Object.entries(catalog.templates).forEach(([tKey, t]) => {
    const c = document.createElement('div');
    c.className = 'option-card template-card';
    c.innerHTML = `
      <div class="template-preview-frame">
        <iframe class="template-preview-iframe" title="${t.label} preview" scrolling="no"></iframe>
        <div class="template-preview-loading">Loading preview…</div>
      </div>
      <h3>${t.label}${t.ats ? ' <span class="ats-badge">ATS-Friendly</span>' : ''}</h3>
      <p>${t.description || `Font: ${t.font}`}</p>
    `;
    c.addEventListener('click', () => selectTemplate(tKey, c));
    tGrid.appendChild(c);

    // Render a real, live preview using realistic sample content - not a mockup -
    // so the person can actually see this document type's real layout before choosing.
    fetch('/api/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docType: docKey, templateKey: tKey, fields: sample }),
    })
      .then((res) => res.blob())
      .then((blob) => {
        const url = URL.createObjectURL(blob);
        const iframe = c.querySelector('.template-preview-iframe');
        iframe.src = `${url}#toolbar=0&view=FitH`;
        const loading = c.querySelector('.template-preview-loading');
        if (loading) loading.remove();
      })
      .catch(() => {
        const loading = c.querySelector('.template-preview-loading');
        if (loading) loading.textContent = 'Preview unavailable';
      });
  });
  showPanel('template');
}

function selectTemplate(tKey, card) {
  state.templateKey = tKey;
  document.querySelectorAll('#templateGrid .option-card').forEach((c) => c.classList.remove('selected'));
  card.classList.add('selected');
  buildForm();
  populateDocLanguageSelect();
  showPanel('write');
  resetPaymentUi();
  updateCheckout();
  scheduleLiveUpdate(0); // render an initial preview + score right away
}

// ---------- Checkout summary (document, exact price, method, what you get) ----------
// Single place that syncs EVERY price label to the selected document, so no
// two spots can ever disagree.
function updateCheckout() {
  const nameEl = document.getElementById('csDocName');
  const priceEl = document.getElementById('csPrice');
  if (!nameEl || !priceEl) return;
  if (!state.docType) { nameEl.textContent = '—'; priceEl.textContent = '—'; return; }
  const price = priceForDoc(state.docType);
  nameEl.textContent = documentLabel(state.docType);
  priceEl.textContent = `KSh ${price}`;
  const payBtn = document.getElementById('payBtn');
  if (payBtn) payBtn.textContent = `Pay KSh ${price} securely`;
}

function paySummaryFor(docType) {
  return `${documentLabel(docType)} · KSh ${priceForDoc(docType)}`;
}

// Reset the pay box to a clean state whenever a fresh editing session starts.
function resetPaymentUi() {
  const status = document.getElementById('payStatus');
  status.textContent = '';
  const payBtn = document.getElementById('payBtn');
  payBtn.disabled = false;
  payBtn.classList.remove('hidden');
  document.getElementById('paySuccess').classList.add('hidden');
}

// ---------- Draft autosave (per document type, survives accidental reloads) ----------
const DRAFT_KEY = 'kdocs_draft_v1';

function saveDraft() {
  try {
    if (!state.docType) return;
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
      docType: state.docType, templateKey: state.templateKey, fields: state.fields, language: state.language,
    }));
  } catch (err) { /* storage unavailable (private mode) */ }
}

function loadDraft() {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const draft = JSON.parse(raw);
    return draft && draft.docType === state.docType ? draft : null;
  } catch (err) { return null; }
}

function clearDraft() {
  try { sessionStorage.removeItem(DRAFT_KEY); } catch (err) { /* ignore */ }
}

function buildForm() {
  const form = document.getElementById('docForm');
  form.innerHTML = '';

  // If the person typed into this document type before, restore their work.
  // NOTE: fields + language only - the template must stay whatever the person
  // just clicked, never an older draft's choice.
  const draft = loadDraft();
  if (draft) {
    state.fields = draft.fields || {};
    if (draft.language) state.language = draft.language;
  }

  (FIELD_SETS[state.docType] || []).forEach(([name, label, type]) => {
    const wrap = document.createElement('div');
    wrap.className = type === 'textarea' ? 'full' : '';
    const el = type === 'textarea' ? document.createElement('textarea') : document.createElement('input');
    if (type !== 'textarea') el.type = 'text';
    el.id = `f_${name}`;
    el.value = state.fields[name] || '';
    el.addEventListener('input', () => {
      state.fields[name] = el.value;
      saveDraft();
      scheduleLiveUpdate();
    });
    wrap.innerHTML = `<label for="f_${name}">${label}</label>`;
    wrap.appendChild(el);
    form.appendChild(wrap);
  });
}

// ---------- Live preview + Ready Score, debounced 1s after typing stops ----------
let liveUpdateTimer = null;
function scheduleLiveUpdate(delay = 1000) {
  clearTimeout(liveUpdateTimer);
  document.getElementById('previewUpdating').classList.remove('hidden');
  liveUpdateTimer = setTimeout(runLiveUpdate, delay);
}

async function runLiveUpdate() {
  const { docType, templateKey, fields, language } = state;
  const jdText = docType === 'cv' ? (document.getElementById('jdInput')?.value.trim() || '') : '';
  try {
    const [previewRes, aiRes] = await Promise.all([
      fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docType, templateKey, fields, language }),
      }),
      fetch('/api/ai/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docType, fields, jdText }),
      }),
    ]);
    const blob = await previewRes.blob();
    const url = URL.createObjectURL(blob);
    document.getElementById('previewFrame').src = url;

    const ai = await aiRes.json();
    if (ai && typeof ai.score === 'number') renderAiPanel(ai);
  } catch (err) {
    // Quietly ignore - next keystroke will retry.
  } finally {
    document.getElementById('previewUpdating').classList.add('hidden');
  }

  // Keep the current doc selection resumable across an IntaSend redirect.
  sessionStorage.setItem('kdocs_pending', JSON.stringify({
    docType: state.docType, templateKey: state.templateKey, fields: state.fields, language: state.language,
    jdText,
  }));
}

// KDocs AI panel: headline, insight cards, structural checklist, suggestions.
function renderAiPanel(ai) {
  const valueEl = document.getElementById('readyScoreValue');
  valueEl.textContent = `${ai.score}%`;
  valueEl.className = 'ready-score-value ' + (ai.score >= 85 ? 'good' : ai.score >= 65 ? 'ok' : 'low');
  document.getElementById('aiHeadline').textContent = ai.headline || '';
  document.getElementById('readyScoreLabel').textContent = `${ai.label || ''} — ${ai.readyLabel || ''}`.replace(/^ — /, '');
  document.getElementById('readyScoreDisclaimer').textContent = ai.disclaimer || '';

  const insights = document.getElementById('aiInsights');
  insights.innerHTML = '';
  (ai.insights || []).forEach((ins) => {
    const div = document.createElement('div');
    div.className = `ai-insight ${ins.kind || 'tip'}`;
    div.innerHTML = `<span class="ai-i-icon" aria-hidden="true">${ins.icon || '💡'}</span><span><strong>${ins.title}</strong><br><span class="rs-detail">${ins.detail}</span></span>`;
    insights.appendChild(div);
  });

  const list = document.getElementById('readyScoreChecklist');
  list.innerHTML = '';
  (ai.checklist || []).forEach((item) => {
    const li = document.createElement('li');
    li.className = item.passed ? 'passed' : 'failed';
    li.innerHTML = `<span class="rs-icon" aria-hidden="true">${item.passed ? '✓' : '✗'}</span><span><strong>${item.label}</strong><br><span class="rs-detail">${item.detail}</span></span>`;
    list.appendChild(li);
  });

  const sugg = document.getElementById('aiSuggestions');
  sugg.innerHTML = '';
  (ai.suggestions || []).forEach((s) => {
    const div = document.createElement('div');
    div.className = 'ai-suggestion';
    div.innerHTML = `<span class="ai-s-icon" aria-hidden="true">→</span><span><strong>${s.title}</strong><br><span class="rs-detail">${s.detail}</span></span>`;
    sugg.appendChild(div);
  });
}

// Re-run the AI analysis only (used by the "Analyze against this advert" button).
document.getElementById('jdAnalyzeBtn')?.addEventListener('click', () => {
  document.getElementById('previewUpdating').classList.remove('hidden');
  scheduleLiveUpdate(0);
});
document.getElementById('jdInput')?.addEventListener('input', () => scheduleLiveUpdate());

// ---------- Best-effort screenshot / save deterrents ----------
// Important: none of this can truly block a screenshot - that's outside any
// website's control. What actually protects the document is that the clean,
// watermark-free PDF is only ever generated server-side AFTER payment is
// confirmed (see /api/download in server.js). These are just extra friction.
const previewShell = document.getElementById('previewShell');
previewShell.addEventListener('contextmenu', (e) => e.preventDefault());
document.addEventListener('keydown', (e) => {
  const blockedCombo = (e.ctrlKey || e.metaKey) && ['p', 's', 'u'].includes(e.key.toLowerCase());
  if (blockedCombo) e.preventDefault();
});
document.addEventListener('visibilitychange', () => {
  previewShell.classList.toggle('blurred', document.hidden);
});
window.addEventListener('blur', () => previewShell.classList.add('blurred'));
window.addEventListener('focus', () => previewShell.classList.remove('blurred'));

// ---------- Payment (IntaSend secure checkout: M-Pesa, card, bank) ----------
// One button, one provider. IntaSend accepts individual accounts in Kenya,
// and its hosted page handles M-Pesa STK push, cards, and bank transfers.
document.getElementById('payBtn').addEventListener('click', async () => {
  const phone = document.getElementById('phoneInput').value.trim();
  const email = document.getElementById('emailInput').value.trim();
  const status = document.getElementById('payStatus');

  if (!state.docType || !state.templateKey) {
    status.textContent = 'Pick a document and a template first.';
    return;
  }
  if (!phone) { status.textContent = 'Enter your M-Pesa phone number first.'; return; }
  if (!email) { status.textContent = 'Enter your email - we send your receipt there.'; return; }

  const payBtn = document.getElementById('payBtn');
  status.textContent = `Opening secure checkout for ${paySummaryFor(state.docType)}…`;
  payBtn.disabled = true;
  try {
    const res = await fetch('/api/intasend/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docType: state.docType, email, phone }),
    });
    const data = await res.json();
    if (!res.ok) {
      status.textContent = data.error || 'Something went wrong.';
      payBtn.disabled = false;
      return;
    }
    // Save so we can resume exactly where we left off once IntaSend sends
    // the customer back to this site.
    sessionStorage.setItem('kdocs_pending', JSON.stringify({
      docType: state.docType, templateKey: state.templateKey, fields: state.fields, language: state.language,
      jdText: document.getElementById('jdInput')?.value.trim() || '',
    }));
    window.location.href = data.link;
  } catch (err) {
    status.textContent = 'Network error. Please try again.';
    payBtn.disabled = false;
  }
});

// ---------- Post-payment success panel ----------
function showSuccessPanel(info = {}) {
  const payBox = document.getElementById('payBox');
  const panel = document.getElementById('paySuccess');
  if (!panel) return;
  if (payBox) payBox.classList.add('hidden');
  document.getElementById('psSummary').textContent = info.summary || 'Your clean, watermark-free PDF is ready.';
  document.getElementById('psReceipt').textContent = info.receiptNote || '';
  document.getElementById('createAccountNudgeBtn').classList.toggle('hidden', Boolean(currentUser));
  panel.classList.remove('hidden');
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// The nudge only makes sense while the person is signed out.
function refreshNudgeVisibility() {
  const nudge = document.getElementById('createAccountNudgeBtn');
  if (nudge && !document.getElementById('paySuccess').classList.contains('hidden')) {
    nudge.classList.toggle('hidden', Boolean(currentUser));
  }
}

document.getElementById('createAccountNudgeBtn').addEventListener('click', () => {
  openAuthModal();
  document.querySelector('.auth-tab[data-tab="signup"]')?.click();
});

// If IntaSend just redirected the customer back here, resume and verify payment.
// We baked our own ?ref=... onto the redirect URL ourselves at initiate time,
// so we don't have to guess what query params the provider adds.
async function checkIntasendReturn() {
  const params = new URLSearchParams(window.location.search);
  const ref = params.get('ref');
  if (!ref) return;

  const saved = sessionStorage.getItem('kdocs_pending');
  if (saved) {
    try {
      const restored = JSON.parse(saved);
      state.docType = restored.docType;
      state.templateKey = restored.templateKey;
      state.fields = restored.fields;
      state.language = restored.language || 'en';
      if (typeof restored.jdText === 'string') {
        const jd = document.getElementById('jdInput');
        if (jd) jd.value = restored.jdText;
      }
    } catch (err) { /* corrupt draft - start fresh */ }
  }
  state.paymentRef = ref;

  // Clean the URL so a refresh doesn't re-trigger this.
  window.history.replaceState({}, '', window.location.pathname);

  document.getElementById('jdSection').classList.toggle('hidden', state.docType !== 'cv');
  buildForm();
  populateDocLanguageSelect();
  updateCheckout();
  showPanel('write');
  scheduleLiveUpdate(0);

  const status = document.getElementById('payStatus');
  status.textContent = 'Confirming your payment…';

  // M-Pesa payments via IntaSend can take a few seconds to confirm after
  // the redirect, so retry verification a few times before giving up.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await fetch(`/api/intasend/verify/${ref}`);
      const data = await res.json();
      if (data.status === 'paid') {
        status.textContent = '';
        showSuccessPanel({
          summary: `${paySummaryFor(state.docType)} — paid. Your clean PDF is ready to download.`,
          receiptNote: data.docLabel ? `Receipt sent to your email. Reference: ${ref.slice(0, 18)}…` : '',
        });
        return;
      }
      if (data.status === 'failed') {
        status.textContent = 'Payment was not completed. You can try again below - nothing was charged unless your phone asked for a PIN.';
        document.getElementById('payBtn').disabled = false;
        return;
      }
    } catch (err) {
      // keep retrying
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  status.textContent = 'Still confirming… if money left your account the download unlocks automatically; otherwise you can pay again.';
}

document.getElementById('downloadBtn').addEventListener('click', async () => {
  const receipt = document.getElementById('psReceipt');
  const original = document.getElementById('downloadBtn').textContent;
  document.getElementById('downloadBtn').disabled = true;
  try {
    const res = await fetch(`/api/download/${state.paymentRef}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ docType: state.docType, templateKey: state.templateKey, fields: state.fields, language: state.language }),
    });
    if (!res.ok) {
      receipt.textContent = 'Download not confirmed yet - give it a few seconds and tap again.';
      return;
    }
    clearDraft(); // paid and delivered - no need to keep the editing draft
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${state.docType}.pdf`;
    a.click();
    receipt.textContent = currentUser
      ? 'Saved to My Documents ✓ — re-download free anytime.'
      : 'Downloaded ✓. Sign in before downloading to keep free re-downloads in My Documents.';
  } catch (err) {
    receipt.textContent = 'Network hiccup - please tap download again.';
  } finally {
    document.getElementById('downloadBtn').disabled = false;
    document.getElementById('downloadBtn').textContent = original;
  }
});

let currentUser = null;
let googleClientId = null;

async function initAuth() {
  try {
    const meRes = await fetch('/api/auth/me', { credentials: 'include' });
    const meData = await meRes.json();
    currentUser = meData.user;
  } catch (err) {
    currentUser = null;
  }
  renderAccountButton();
}

function renderAccountButton() {
  const btn = document.getElementById('accountBtn');
  btn.textContent = currentUser ? `👤 ${currentUser.name.split(' ')[0]}` : 'Sign in';
  refreshNudgeVisibility();
}

const authModalBackdrop = document.getElementById('authModalBackdrop');
document.getElementById('accountBtn').addEventListener('click', () => openAuthModal());
document.getElementById('authModalClose').addEventListener('click', closeAuthModal);
authModalBackdrop.addEventListener('click', (e) => { if (e.target === authModalBackdrop) closeAuthModal(); });

function openAuthModal() {
  authModalBackdrop.classList.remove('hidden');
  const loggedOut = document.getElementById('authLoggedOutView');
  const loggedIn = document.getElementById('authLoggedInView');
  if (currentUser) {
    loggedOut.classList.add('hidden');
    loggedIn.classList.remove('hidden');
    document.getElementById('profileName').textContent = currentUser.name;
    document.getElementById('profileEmail').textContent = currentUser.email;
    document.getElementById('profileProvider').textContent = currentUser.authProvider === 'google' ? 'Google' : 'Email';
    document.getElementById('profileCreatedAt').textContent = new Date(currentUser.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    showAccountTab('profile');
  } else {
    loggedOut.classList.remove('hidden');
    loggedIn.classList.add('hidden');
    setupGoogleButton();
  }
}
function closeAuthModal() {
  authModalBackdrop.classList.add('hidden');
}

// Logged-out tabs: Sign In / Create Account
document.querySelectorAll('.auth-tab[data-tab]').forEach((tab) => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.auth-tab[data-tab]').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');
    const isLogin = tab.dataset.tab === 'login';
    document.getElementById('loginForm').classList.toggle('hidden', !isLogin);
    document.getElementById('signupForm').classList.toggle('hidden', isLogin);
  });
});

// Logged-in tabs: Profile / My Documents
document.querySelectorAll('.auth-tab[data-account-tab]').forEach((tab) => {
  tab.addEventListener('click', () => showAccountTab(tab.dataset.accountTab));
});

function showAccountTab(name) {
  document.querySelectorAll('.auth-tab[data-account-tab]').forEach((t) => t.classList.toggle('active', t.dataset.accountTab === name));
  document.getElementById('accountProfileView').classList.toggle('hidden', name !== 'profile');
  document.getElementById('accountLockerView').classList.toggle('hidden', name !== 'locker');
  if (name === 'locker') loadLocker();
}

async function loadLocker() {
  const list = document.getElementById('lockerList');
  list.innerHTML = '<p class="hint">Loading…</p>';
  try {
    const res = await fetch('/api/locker', { credentials: 'include' });
    const data = await res.json();
    if (!res.ok) { list.innerHTML = `<p class="hint">${data.error || 'Could not load your documents.'}</p>`; return; }
    if (!data.documents.length) { list.innerHTML = '<p class="hint">Nothing downloaded yet — it\'ll show up here once you do.</p>'; return; }

    list.innerHTML = '';
    data.documents.forEach((d) => {
      const row = document.createElement('div');
      row.className = 'locker-row';
      const date = new Date(d.downloadedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      row.innerHTML = `
        <div>
          <strong>${d.label}</strong>
          <span class="rs-detail">${date}</span>
        </div>
        <div class="locker-row-actions">
          <button class="btn ghost" data-redownload="${d._id}">Download</button>
          <button class="btn ghost" data-remove="${d._id}">Remove</button>
        </div>
      `;
      list.appendChild(row);
    });

    list.querySelectorAll('[data-redownload]').forEach((btn) => {
      btn.addEventListener('click', () => { window.location.href = `/api/locker/${btn.dataset.redownload}/download`; });
    });
    list.querySelectorAll('[data-remove]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await fetch(`/api/locker/${btn.dataset.remove}`, { method: 'DELETE', credentials: 'include' });
        loadLocker();
      });
    });
  } catch (err) {
    list.innerHTML = '<p class="hint">Network error loading your documents.</p>';
  }
}

document.getElementById('continueGuestBtn').addEventListener('click', closeAuthModal);

let googleButtonRendered = false;
function setupGoogleButton() {
  const container = document.getElementById('googleBtnContainer');
  const divider = document.getElementById('googleDivider');
  if (!googleClientId || typeof google === 'undefined' || !google.accounts) {
    container.classList.add('hidden');
    divider.classList.add('hidden');
    return;
  }
  container.classList.remove('hidden');
  divider.classList.remove('hidden');
  if (googleButtonRendered) return;
  google.accounts.id.initialize({ client_id: googleClientId, callback: handleGoogleCredential });
  google.accounts.id.renderButton(container, { theme: 'outline', size: 'large', width: 320 });
  googleButtonRendered = true;
}

async function handleGoogleCredential(response) {
  try {
    const res = await fetch('/api/auth/google', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ credential: response.credential }),
    });
    const data = await res.json();
    if (!res.ok) { alert(data.error || 'Google sign-in failed.'); return; }
    currentUser = data.user;
    renderAccountButton();
    closeAuthModal();
  } catch (err) {
    alert('Network error during Google sign-in.');
  }
}

document.getElementById('loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  const errEl = document.getElementById('loginError');
  errEl.textContent = '';
  try {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) { errEl.textContent = data.error || 'Could not sign in.'; return; }
    currentUser = data.user;
    renderAccountButton();
    closeAuthModal();
  } catch (err) {
    errEl.textContent = 'Network error. Please try again.';
  }
});

document.getElementById('signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const name = document.getElementById('signupName').value.trim();
  const email = document.getElementById('signupEmail').value.trim();
  const password = document.getElementById('signupPassword').value;
  const errEl = document.getElementById('signupError');
  errEl.textContent = '';
  try {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ name, email, password }),
    });
    const data = await res.json();
    if (!res.ok) { errEl.textContent = data.error || 'Could not create your account.'; return; }
    currentUser = data.user;
    renderAccountButton();
    closeAuthModal();
  } catch (err) {
    errEl.textContent = 'Network error. Please try again.';
  }
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
  currentUser = null;
  renderAccountButton();
  closeAuthModal();
});

(async () => {
  await init();
  await checkIntasendReturn();
  initAuth();
})();
