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

// ---------- Dark mode ----------
const darkToggle = document.getElementById('darkToggle');
darkToggle.addEventListener('click', () => {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
  darkToggle.textContent = isDark ? '🌙' : '☀️';
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

// ---------- Load catalog & build card list ----------
async function init() {
  const res = await fetch('/api/catalog');
  catalog = await res.json();
  document.getElementById('priceTag').textContent = `KSh ${catalog.priceKes}`;
  document.getElementById('priceTag2').textContent = catalog.priceKes;
  document.getElementById('priceTagUsd1').textContent = catalog.priceUsd;
  document.getElementById('priceTagUsd2').textContent = catalog.priceUsd;

  try {
    const configRes = await fetch('/api/config');
    const config = await configRes.json();
    googleClientId = config.googleClientId;
    paypalClientId = config.paypalClientId;
    if (paypalClientId) loadPaypalSdk(paypalClientId);
  } catch (err) {
    // Config fetch failing shouldn't block the rest of the app.
  }

  renderCatalog('');
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
          <span class="doc-card-price">KSh ${catalog.priceKes}</span>
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
  document.getElementById('downloadBtn').classList.add('hidden');
  document.getElementById('payStatus').textContent = '';
  document.getElementById('intasendPayStatus').textContent = '';
  document.getElementById('paypalStatus').textContent = '';
  scheduleLiveUpdate(0); // render an initial preview + score right away
}

function populateDocLanguageSelect() {
  const select = document.getElementById('docLanguageSelect');
  if (!select.options.length) {
    Object.entries(catalog.languages).forEach(([code, label]) => {
      const opt = document.createElement('option');
      opt.value = code;
      opt.textContent = label;
      select.appendChild(opt);
    });
    select.addEventListener('change', () => {
      state.language = select.value;
      scheduleLiveUpdate(0);
    });
  }
  select.value = state.language;
}

function buildForm() {
  const form = document.getElementById('docForm');
  form.innerHTML = '';
  (FIELD_SETS[state.docType] || []).forEach(([name, label, type]) => {
    const wrap = document.createElement('div');
    wrap.className = type === 'textarea' ? 'full' : '';
    const el = type === 'textarea' ? document.createElement('textarea') : document.createElement('input');
    if (type !== 'textarea') el.type = 'text';
    el.id = `f_${name}`;
    el.value = state.fields[name] || '';
    el.addEventListener('input', () => {
      state.fields[name] = el.value;
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
  try {
    const [previewRes, scoreRes] = await Promise.all([
      fetch('/api/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docType, templateKey, fields, language }),
      }),
      fetch('/api/score', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docType, fields }),
      }),
    ]);
    const blob = await previewRes.blob();
    const url = URL.createObjectURL(blob);
    document.getElementById('previewFrame').src = url;

    const score = await scoreRes.json();
    renderReadyScore(score);
  } catch (err) {
    // Quietly ignore - next keystroke will retry.
  } finally {
    document.getElementById('previewUpdating').classList.add('hidden');
  }

  // Keep the current doc selection resumable across an IntaSend/PayPal redirect.
  sessionStorage.setItem('kdocs_pending', JSON.stringify({
    docType: state.docType, templateKey: state.templateKey, fields: state.fields, language: state.language,
  }));
}

function renderReadyScore(score) {
  document.getElementById('readyScoreTitle').textContent = score.isAts ? 'Ready Score (ATS-based)' : 'Ready Score';
  const valueEl = document.getElementById('readyScoreValue');
  valueEl.textContent = `${score.score}%`;
  valueEl.className = 'ready-score-value ' + (score.score >= 85 ? 'good' : score.score >= 65 ? 'ok' : 'low');
  document.getElementById('readyScoreLabel').textContent = score.readyLabel;
  document.getElementById('readyScoreDisclaimer').textContent = score.disclaimer;

  const list = document.getElementById('readyScoreChecklist');
  list.innerHTML = '';
  score.checklist.forEach((item) => {
    const li = document.createElement('li');
    li.className = item.passed ? 'passed' : 'failed';
    li.innerHTML = `<span class="rs-icon">${item.passed ? '✓' : '✗'}</span><span><strong>${item.label}</strong><br><span class="rs-detail">${item.detail}</span></span>`;
    list.appendChild(li);
  });
}

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

// ---------- Payment: M-Pesa (Daraja) ----------
document.getElementById('payBtn').addEventListener('click', async () => {
  const phone = document.getElementById('phoneInput').value.trim();
  const status = document.getElementById('payStatus');
  if (!phone) { status.textContent = 'Enter your M-Pesa phone number first.'; return; }

  status.textContent = 'Sending payment prompt to your phone…';
  try {
    const res = await fetch('/api/daraja/stkpush', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone, documentId: `${state.docType}-${state.templateKey}` }),
    });
    const data = await res.json();
    if (!res.ok) { status.textContent = data.error || 'Something went wrong.'; return; }
    state.paymentRef = data.checkoutRequestId;
    status.textContent = 'Check your phone and enter your M-Pesa PIN…';
    pollPayment('/api/daraja/status/', status);
  } catch (err) {
    status.textContent = 'Network error. Please try again.';
  }
});

function pollPayment(statusUrlPrefix, statusEl) {
  const interval = setInterval(async () => {
    const res = await fetch(`${statusUrlPrefix}${state.paymentRef}`);
    const data = await res.json();
    if (data.status === 'paid') {
      clearInterval(interval);
      statusEl.textContent = 'Payment received! Your document is ready.';
      document.getElementById('downloadBtn').classList.remove('hidden');
    } else if (data.status === 'failed') {
      clearInterval(interval);
      statusEl.textContent = 'Payment was not completed. Please try again.';
    }
  }, 3000);
  setTimeout(() => clearInterval(interval), 120000); // stop polling after 2 minutes
}

// ---------- Payment: IntaSend (card / bank / other mobile money) ----------
document.getElementById('intasendPayBtn').addEventListener('click', async () => {
  const email = document.getElementById('emailInput').value.trim();
  const phone = document.getElementById('phoneInput').value.trim();
  const status = document.getElementById('intasendPayStatus');
  if (!email) { status.textContent = 'Enter your email first.'; return; }

  status.textContent = 'Opening secure checkout…';
  try {
    const res = await fetch('/api/intasend/initiate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ docType: state.docType, email, phone }),
    });
    const data = await res.json();
    if (!res.ok) { status.textContent = data.error || 'Something went wrong.'; return; }
    // Save so we can resume exactly where we left off once IntaSend sends the customer back.
    sessionStorage.setItem('kdocs_pending', JSON.stringify({
      docType: state.docType, templateKey: state.templateKey, fields: state.fields, language: state.language,
    }));
    window.location.href = data.link;
  } catch (err) {
    status.textContent = 'Network error. Please try again.';
  }
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
    const restored = JSON.parse(saved);
    state.docType = restored.docType;
    state.templateKey = restored.templateKey;
    state.fields = restored.fields;
    state.language = restored.language || 'en';
  }
  state.paymentRef = ref;

  // Clean the URL so a refresh doesn't re-trigger this.
  window.history.replaceState({}, '', window.location.pathname);

  buildForm();
  populateDocLanguageSelect();
  showPanel('write');
  scheduleLiveUpdate(0);

  // M-Pesa payments via IntaSend can take a few seconds to confirm after
  // the redirect, so retry verification a few times before giving up.
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await fetch(`/api/intasend/verify/${ref}`);
      const data = await res.json();
      if (data.status === 'paid') {
        document.getElementById('downloadBtn').classList.remove('hidden');
        return;
      }
      if (data.status === 'failed') {
        alert('Payment was not completed. Please try again.');
        return;
      }
    } catch (err) {
      // keep retrying
    }
    await new Promise((r) => setTimeout(r, 3000));
  }
  alert('Could not confirm your payment yet. If money left your account, please contact support - otherwise try again.');
}

document.getElementById('downloadBtn').addEventListener('click', async () => {
  const res = await fetch(`/api/download/${state.paymentRef}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ docType: state.docType, templateKey: state.templateKey, fields: state.fields, language: state.language }),
  });
  if (!res.ok) { alert('Payment not confirmed yet - please wait a moment and try again.'); return; }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${state.docType}.pdf`;
  a.click();
});

// ---------- Payment: PayPal ----------
let paypalSdkLoaded = false;
let paypalButtonRendered = false;

function loadPaypalSdk(clientId) {
  if (paypalSdkLoaded) return;
  const script = document.createElement('script');
  script.src = `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD`;
  script.onload = () => {
    paypalSdkLoaded = true;
    renderPaypalButton();
  };
  document.head.appendChild(script);
}

function renderPaypalButton() {
  const container = document.getElementById('paypalButtonContainer');
  if (!paypalSdkLoaded || typeof paypal === 'undefined' || paypalButtonRendered) return;
  paypalButtonRendered = true;
  paypal.Buttons({
    createOrder: async () => {
      const res = await fetch('/api/paypal/create-order', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ docType: state.docType }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Could not start PayPal order.');
      return data.orderId;
    },
    onApprove: async (data) => {
      const status = document.getElementById('paypalStatus');
      status.textContent = 'Confirming payment…';
      try {
        const res = await fetch(`/api/paypal/capture-order/${data.orderID}`, { method: 'POST' });
        const result = await res.json();
        if (result.status === 'paid') {
          state.paymentRef = data.orderID;
          status.textContent = 'Payment received! Your document is ready.';
          document.getElementById('downloadBtn').classList.remove('hidden');
        } else {
          status.textContent = 'Payment was not completed. Please try again.';
        }
      } catch (err) {
        status.textContent = 'Could not confirm your PayPal payment.';
      }
    },
    onError: () => {
      document.getElementById('paypalStatus').textContent = 'PayPal encountered an error. Please try again.';
    },
  }).render('#paypalButtonContainer');
}


let currentUser = null;
let googleClientId = null;
let paypalClientId = null;

async function initAuth() {
  try {
    const meRes = await fetch('/api/auth/me', { credentials: 'include' });
    const meData = await meRes.json();
    currentUser = meData.user;
    if (currentUser) applyUiLanguage(currentUser.uiLanguage);
  } catch (err) {
    currentUser = null;
  }
  renderAccountButton();
}

function renderAccountButton() {
  const btn = document.getElementById('accountBtn');
  btn.textContent = currentUser ? `👤 ${currentUser.name.split(' ')[0]}` : 'Sign in';
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
    populateUiLanguageSelect();
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

// Logged-in tabs: Profile / My Documents / Settings
document.querySelectorAll('.auth-tab[data-account-tab]').forEach((tab) => {
  tab.addEventListener('click', () => showAccountTab(tab.dataset.accountTab));
});

function showAccountTab(name) {
  document.querySelectorAll('.auth-tab[data-account-tab]').forEach((t) => t.classList.toggle('active', t.dataset.accountTab === name));
  document.getElementById('accountProfileView').classList.toggle('hidden', name !== 'profile');
  document.getElementById('accountLockerView').classList.toggle('hidden', name !== 'locker');
  document.getElementById('accountSettingsView').classList.toggle('hidden', name !== 'settings');
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

function populateUiLanguageSelect() {
  const select = document.getElementById('uiLanguageSelect');
  if (select.options.length) { select.value = currentUser.uiLanguage || 'en'; return; }
  Object.entries(catalog.languages).forEach(([code, label]) => {
    const opt = document.createElement('option');
    opt.value = code;
    opt.textContent = label;
    select.appendChild(opt);
  });
  select.value = currentUser.uiLanguage || 'en';
}

document.getElementById('uiLanguageSelect').addEventListener('change', async (e) => {
  const status = document.getElementById('uiLanguageStatus');
  try {
    const res = await fetch('/api/auth/language', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ uiLanguage: e.target.value }),
    });
    const data = await res.json();
    if (!res.ok) { status.textContent = data.error || 'Could not save.'; return; }
    currentUser = data.user;
    applyUiLanguage(currentUser.uiLanguage);
    status.textContent = 'Saved.';
  } catch (err) {
    status.textContent = 'Network error.';
  }
});

// Translates a small set of recurring interface labels (not every string in
// the app - free-text content and document wording are unaffected by this).
const UI_STRINGS = {
  en: { signIn: 'Sign in', stepDoc: '1. Document', stepTemplate: '2. Template', stepWrite: '3. Write, Score & Pay', back: '← Back', signOut: 'Sign Out' },
  es: { signIn: 'Iniciar sesión', stepDoc: '1. Documento', stepTemplate: '2. Plantilla', stepWrite: '3. Escribir, Puntuar y Pagar', back: '← Atrás', signOut: 'Cerrar sesión' },
  fr: { signIn: 'Se connecter', stepDoc: '1. Document', stepTemplate: '2. Modèle', stepWrite: '3. Rédiger, Noter et Payer', back: '← Retour', signOut: 'Déconnexion' },
  pt: { signIn: 'Entrar', stepDoc: '1. Documento', stepTemplate: '2. Modelo', stepWrite: '3. Escrever, Pontuar e Pagar', back: '← Voltar', signOut: 'Sair' },
  sw: { signIn: 'Ingia', stepDoc: '1. Hati', stepTemplate: '2. Kiolezo', stepWrite: '3. Andika, Alama na Ulipe', back: '← Rudi', signOut: 'Toka' },
  zh: { signIn: '登录', stepDoc: '1. 文件', stepTemplate: '2. 模板', stepWrite: '3. 撰写、评分与付款', back: '← 返回', signOut: '退出登录' },
  hi: { signIn: 'साइन इन करें', stepDoc: '1. दस्तावेज़', stepTemplate: '2. टेम्पलेट', stepWrite: '3. लिखें, स्कोर करें और भुगतान करें', back: '← वापस', signOut: 'साइन आउट करें' },
  ar: { signIn: 'تسجيل الدخول', stepDoc: '١. المستند', stepTemplate: '٢. القالب', stepWrite: '٣. الكتابة والتقييم والدفع', back: '→ رجوع', signOut: 'تسجيل الخروج' },
  bn: { signIn: 'সাইন ইন', stepDoc: '১. নথি', stepTemplate: '২. টেমপ্লেট', stepWrite: '৩. লিখুন, স্কোর ও পেমেন্ট', back: '← পেছনে', signOut: 'সাইন আউট' },
  ru: { signIn: 'Войти', stepDoc: '1. Документ', stepTemplate: '2. Шаблон', stepWrite: '3. Написать, оценить и оплатить', back: '← Назад', signOut: 'Выйти' },
  ur: { signIn: 'سائن ان', stepDoc: '١۔ دستاویز', stepTemplate: '٢۔ ٹیمپلیٹ', stepWrite: '٣۔ لکھیں، اسکور اور ادائیگی', back: '→ واپس', signOut: 'سائن آؤٹ' },
};

function applyUiLanguage(lang) {
  const s = UI_STRINGS[lang] || UI_STRINGS.en;
  if (!currentUser) document.getElementById('accountBtn').textContent = s.signIn;
  document.querySelector('.step[data-step="1"]').textContent = s.stepDoc;
  document.querySelector('.step[data-step="2"]').textContent = s.stepTemplate;
  document.querySelector('.step[data-step="3"]').textContent = s.stepWrite;
  document.querySelectorAll('.back-btn').forEach((b) => (b.textContent = s.back));
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) logoutBtn.textContent = s.signOut;
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
