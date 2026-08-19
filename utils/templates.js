// Every document type belongs to a stage of the job journey, and has exactly
// 3 visual templates. Each template just changes the look (fonts/colors/layout),
// the wording logic lives in pdfGenerator.js per document type.
// icon + description are used for the card catalog on the homepage.

const STAGES = {
  looking: {
    label: 'Looking for a Job',
    documents: {
      cv: { label: 'CV / Resume', icon: '📄', description: 'Professional resume highlighting your skills and experience.' },
      cover_letter: { label: 'Cover Letter', icon: '✉️', description: 'Tailored cover letter to accompany your job application.' },
      job_application: { label: 'Job Application Letter', icon: '📝', description: 'Formal application letter for advertised positions.' },
    },
  },
  during: {
    label: 'During a Job',
    documents: {
      leave_request: { label: 'Leave Request', icon: '🏖️', description: 'Formal leave application for annual, sick, or personal leave.' },
      salary_increment: { label: 'Salary Increment Request', icon: '💰', description: 'Professional request for a salary review or increment.' },
      offer_acceptance: { label: 'Offer / Promotion Acceptance', icon: '🤝', description: 'Formally accept a job offer or promotion.' },
      self_appraisal: { label: 'Self-Appraisal', icon: '⭐', description: 'Structured self-review covering achievements and goals.' },
    },
  },
  after: {
    label: 'After a Job',
    documents: {
      resignation: { label: 'Resignation Letter', icon: '🚪', description: 'Formal notice of resignation with a professional tone.' },
      reference_request: { label: 'Reference Request Letter', icon: '📇', description: 'Ask a former colleague or manager for a reference.' },
      farewell: { label: 'Farewell / Exit Letter', icon: '👋', description: 'Warm farewell message for your last day at work.' },
      handover_report: { label: 'Handover Report', icon: '🔄', description: 'Structured handover of responsibilities before you leave.' },
      experience_certificate: { label: 'Experience Certificate', icon: '📜', description: 'Certify an employee\u2019s role and time at a company.' },
      recommendation_letter: { label: 'Recommendation Letter', icon: '🌟', description: 'Recommend a colleague or employee for a new role.' },
    },
  },
  education: {
    label: 'School, College & University',
    documents: {
      admission_application: { label: 'Admission / Application Letter', icon: '🏫', description: 'Apply for admission to a school, college, or university.' },
      leave_permission: { label: 'School Leave / Permission Letter', icon: '🎒', description: 'Request permission for leave from school or college.' },
      fee_bursary_request: { label: 'Fee Waiver / Bursary Request', icon: '💳', description: 'Request a fee waiver or bursary consideration.' },
    },
  },
  business: {
    label: 'Freelance & Business Tools',
    documents: {
      freelance_invoice: { label: 'Freelance Invoice', icon: '🧾', description: 'Professional invoice for freelancers with itemized billing.' },
      meeting_minutes: { label: 'Meeting Minutes', icon: '🗒️', description: 'Structured meeting minutes with decisions and action items.' },
      business_card: { label: 'Business Card', icon: '💼', description: 'Printable digital business card in 3 stunning design styles.' },
    },
  },
};

// 4 templates, reused across every document type - just the look changes.
const TEMPLATE_STYLES = {
  classic: {
    label: 'Classic',
    font: 'Times-Roman',
    boldFont: 'Times-Bold',
    accent: '#1d4ed8',
    headingSize: 16,
  },
  modern: {
    label: 'Modern',
    font: 'Helvetica',
    boldFont: 'Helvetica-Bold',
    accent: '#2563eb',
    headingSize: 18,
  },
  minimal: {
    label: 'Minimal',
    font: 'Courier',
    boldFont: 'Courier-Bold',
    accent: '#3b82f6',
    headingSize: 14,
  },
  ats: {
    label: 'ATS-Friendly',
    font: 'Helvetica',
    boldFont: 'Helvetica-Bold',
    accent: '#1f2937',
    headingSize: 14,
    ats: true,
    description: 'Plain, single-column layout built to parse cleanly through resume-scanning software.',
  },
};

module.exports = { STAGES, TEMPLATE_STYLES };
