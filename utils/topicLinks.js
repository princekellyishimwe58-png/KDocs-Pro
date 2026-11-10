// Subject-level cross-links between document landings.
//
// The old "related documents" row was stage-based: every CV landing linked to
// the other two "Looking for a Job" documents and stopped there. That leaves a
// thin crawl graph - and it is not how a person actually moves between these
// documents. Someone writing a resignation letter next needs the handover
// report and an experience certificate, not another cover letter.
//
// Each list below is curated for the reader's next step, ordered by relevance.
// Links are rendered as real anchors on the landing page (server-rendered, so
// crawlers follow them too). server.js fills the row up to six with same-stage
// siblings, so a short list never produces a broken section.
//
// Rules when editing:
//   - keys must exist in utils/templates.js (test/topicLinks.test.js checks it),
//   - no self-links and no duplicates inside a list,
//   - keep at least four entries so every landing has a useful onward path.

const TOPIC_LINKS = {
  // --- Looking for work -----------------------------------------------------
  cv: ['cover_letter', 'recommendation_letter', 'reference_request', 'experience_certificate', 'job_application'],
  cover_letter: ['cv', 'job_application', 'reference_request', 'recommendation_letter', 'experience_certificate'],
  job_application: ['cover_letter', 'cv', 'admission_application', 'reference_request', 'experience_certificate'],

  // --- Requests while employed ---------------------------------------------
  leave_request: ['leave_permission', 'salary_increment', 'handover_report', 'resignation', 'self_appraisal'],
  salary_increment: ['self_appraisal', 'offer_acceptance', 'leave_request', 'resignation', 'reference_request'],
  offer_acceptance: ['salary_increment', 'self_appraisal', 'job_application', 'resignation', 'cover_letter'],
  self_appraisal: ['salary_increment', 'offer_acceptance', 'leave_request', 'resignation', 'handover_report'],

  // --- Leaving, and the paperwork around it --------------------------------
  resignation: ['farewell', 'handover_report', 'experience_certificate', 'reference_request', 'leave_request'],
  farewell: ['resignation', 'handover_report', 'experience_certificate', 'reference_request', 'cv'],
  handover_report: ['resignation', 'farewell', 'experience_certificate', 'self_appraisal', 'leave_request'],
  reference_request: ['recommendation_letter', 'cv', 'cover_letter', 'experience_certificate', 'resignation'],
  experience_certificate: ['recommendation_letter', 'cv', 'resignation', 'reference_request', 'farewell'],
  recommendation_letter: ['reference_request', 'cv', 'cover_letter', 'experience_certificate', 'job_application'],

  // --- Education ------------------------------------------------------------
  admission_application: ['fee_bursary_request', 'leave_permission', 'job_application', 'cover_letter', 'cv'],
  leave_permission: ['admission_application', 'fee_bursary_request', 'leave_request', 'job_application', 'cv'],
  fee_bursary_request: ['admission_application', 'leave_permission', 'job_application', 'cover_letter', 'cv'],

  // --- Freelance & business -------------------------------------------------
  freelance_invoice: ['business_card', 'meeting_minutes', 'offer_acceptance', 'job_application', 'handover_report'],
  meeting_minutes: ['freelance_invoice', 'business_card', 'handover_report', 'self_appraisal', 'offer_acceptance'],
  business_card: ['freelance_invoice', 'meeting_minutes', 'cv', 'cover_letter', 'job_application'],
};

function topicRelatedKeys(docKey) {
  return TOPIC_LINKS[docKey] || [];
}

module.exports = { TOPIC_LINKS, topicRelatedKeys };
