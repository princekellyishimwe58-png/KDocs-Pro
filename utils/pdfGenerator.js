const PDFDocument = require('pdfkit');
const { TEMPLATE_STYLES } = require('./templates');

function letterBody(docType, f) {
  const today = f.date || new Date().toLocaleDateString('en-GB');
  const name = f.fullName || 'Your Name';
  const greet = f.recipientName ? `Dear ${f.recipientName},` : 'Dear Hiring Manager,';

  const bodies = {
    cover_letter: [
      `${greet}`,
      `I am writing to apply for the ${f.position || 'position'} role at ${f.companyName || 'your company'}. With experience in ${f.experience || 'my field'}, I believe I would be a strong addition to your team.`,
      `${f.achievements || 'In my previous roles, I have consistently delivered strong results and worked well within a team.'}`,
      `I would welcome the chance to discuss how I can contribute to ${f.companyName || 'your organisation'}. Thank you for considering my application.`,
      `Yours sincerely,`,
      `${name}`,
    ],
    job_application: [
      `${greet}`,
      `I am applying for the position of ${f.position || 'position'} advertised by ${f.companyName || 'your organisation'}. I hold ${f.qualification || 'relevant qualifications'} and ${f.experience || 'relevant experience'} that make me suitable for this role.`,
      `${f.reason || 'I am confident that my skills align well with what you are looking for, and I am eager to bring my abilities to your team.'}`,
      `I have attached my CV for your review and look forward to the opportunity of an interview.`,
      `Yours faithfully,`,
      `${name}`,
    ],
    leave_request: [
      `${greet}`,
      `I am writing to formally request leave from ${f.startDate || '[start date]'} to ${f.endDate || '[end date]'}, due to ${f.reason || 'personal reasons'}.`,
      `I will ensure my responsibilities are handed over appropriately, and I am happy to assist remotely if needed during this period.`,
      `Thank you for considering my request.`,
      `Regards,`,
      `${name}`,
    ],
    salary_increment: [
      `${greet}`,
      `I am writing to formally request a review of my current salary as ${f.position || 'an employee'} at ${f.companyName || 'the company'}. Over the past ${f.duration || 'period'}, I have ${f.achievements || 'taken on additional responsibilities and delivered strong results'}.`,
      `Given these contributions, I would like to request a salary increment in line with my performance and current market rates.`,
      `I am happy to discuss this further at your convenience. Thank you for your consideration.`,
      `Regards,`,
      `${name}`,
    ],
    offer_acceptance: [
      `${greet}`,
      `I am pleased to formally accept the offer for the position of ${f.position || 'position'} at ${f.companyName || 'the company'}, as discussed.`,
      `${f.terms || 'I confirm my understanding and acceptance of the terms and conditions outlined.'}`,
      `I look forward to starting on ${f.startDate || '[start date]'} and contributing to the team.`,
      `Regards,`,
      `${name}`,
    ],
    resignation: [
      `${greet}`,
      `I am writing to formally notify you of my resignation from the position of ${f.position || 'my position'} at ${f.companyName || 'the company'}, effective ${f.lastDay || '[last working day]'}.`,
      `${f.reason ? `This decision comes as ${f.reason}.` : 'This was not an easy decision, but I believe it is the right step for my career at this time.'}`,
      `I am grateful for the opportunities for growth I was given during my time here, and I will do everything I can to ensure a smooth handover.`,
      `Yours sincerely,`,
      `${name}`,
    ],
    reference_request: [
      `${greet}`,
      `I hope you are doing well. I am currently ${f.reason || 'applying for new opportunities'}, and I would be grateful if you would be willing to serve as a reference for me.`,
      `During my time at ${f.companyName || 'the company'} as ${f.position || 'a team member'}, ${f.achievements || 'I had the opportunity to grow professionally and contribute meaningfully to the team'}.`,
      `Please let me know if you are comfortable with this, and if there is any information you would like me to provide.`,
      `Thank you very much for your time.`,
      `Regards,`,
      `${name}`,
    ],
    farewell: [
      `Dear Colleagues,`,
      `As some of you may know, ${today} marks my last day at ${f.companyName || 'the company'}. I wanted to take a moment to thank you all for the support, collaboration, and friendship over ${f.duration || 'my time here'}.`,
      `${f.message || 'It has been a privilege working alongside such a dedicated team, and I will carry the lessons learned here with me.'}`,
      `Please stay in touch: ${f.email || '[personal email]'}.`,
      `Warm regards,`,
      `${name}`,
    ],
    admission_application: [
      `${greet}`,
      `I am writing to apply for admission into the ${f.course || 'programme'} at ${f.institutionName || 'your institution'}. I hold ${f.qualification || 'the necessary qualifications'} and am keen to further my studies in this field.`,
      `${f.reason || 'I am confident that this institution offers the right environment for me to grow academically and pursue my goals.'}`,
      `I have attached my supporting documents for your review and look forward to your favourable response.`,
      `Yours faithfully,`,
      `${name}`,
    ],
    leave_permission: [
      `${greet}`,
      `I am writing to formally request permission for leave from ${f.institutionName || 'the institution'}, ${f.classOrYear ? `(${f.classOrYear})` : ''} from ${f.startDate || '[start date]'} to ${f.endDate || '[end date]'}, due to ${f.reason || 'personal reasons'}.`,
      `${f.parentName ? `This request has the knowledge and support of my parent/guardian, ${f.parentName}.` : 'I will catch up on any missed work upon my return.'}`,
      `Thank you for considering my request.`,
      `Regards,`,
      `${name}`,
    ],
    fee_bursary_request: [
      `${greet}`,
      `I am writing to request consideration for a fee waiver / bursary at ${f.institutionName || 'the institution'} for my ${f.course || 'studies'}.`,
      `${f.reason || 'Due to my current financial circumstances, I am unable to meet the full cost of my fees, and would be grateful for any support that can be extended to me.'}`,
      `I am committed to my studies and would deeply appreciate your assistance. Thank you for your time and consideration.`,
      `Yours sincerely,`,
      `${name}`,
    ],
    self_appraisal: [
      `${greet}`,
      `This self-appraisal covers my performance as ${f.position || 'a team member'} at ${f.companyName || 'the company'} during ${f.period || 'the review period'}.`,
      `Key achievements: ${f.achievements || 'I met my assigned targets and contributed positively to the team.'}`,
      `Challenges faced: ${f.challenges || 'I encountered some challenges along the way, which I worked to address proactively.'}`,
      `Goals for the next period: ${f.goals || 'I aim to continue growing in my role and taking on new responsibilities.'}`,
      `Regards,`,
      `${name}`,
    ],
    handover_report: [
      `${greet}`,
      `As I prepare to leave my role as ${f.position || 'my position'} at ${f.companyName || 'the company'} on ${f.lastDay || '[last working day]'}, I am providing this handover report to ensure a smooth transition.`,
      `Key responsibilities: ${f.keyResponsibilities || 'My day-to-day responsibilities included managing ongoing tasks and communicating with the team.'}`,
      `Pending tasks and priorities: ${f.pendingTasks || 'There are no urgent outstanding tasks at this time.'}`,
      `Key contacts: ${f.contacts || 'Please reach out to the wider team for any clarification needed.'}`,
      `Regards,`,
      `${name}`,
    ],
    recommendation_letter: [
      `${greet}`,
      `I am pleased to recommend ${f.candidateName || 'the candidate'} for ${f.reason || 'any opportunity they are pursuing'}. I came to know ${f.candidateName || 'them'} as ${f.relationship || 'a colleague'} at ${f.refereeCompany || 'our organisation'}.`,
      `${f.achievements || `${f.candidateName || 'They'} consistently demonstrated strong skills, reliability, and a positive attitude throughout our time working together.`}`,
      `I recommend ${f.candidateName || 'them'} without reservation and would be happy to provide further information if needed.`,
      `Yours sincerely,`,
      `${name}`,
    ],
  };

  return bodies[docType] || [`${greet}`, 'Document content.', `${name}`];
}

function drawLetter(doc, style, docType, f) {
  const today = f.date || new Date().toLocaleDateString('en-GB');

  doc.font(style.boldFont).fontSize(style.headingSize).fillColor(style.accent);
  doc.text(f.fullName || 'Your Name', { align: 'left' });
  doc.font(style.font).fontSize(10).fillColor('#333333');
  if (f.address) doc.text(f.address);
  if (f.phone) doc.text(f.phone);
  if (f.email) doc.text(f.email);
  doc.moveDown(1);
  doc.text(today);
  doc.moveDown(1);

  if (f.companyName || f.recipientName) {
    if (f.recipientName) doc.text(f.recipientName);
    if (f.companyName) doc.text(f.companyName);
    doc.moveDown(1);
  }

  doc.font(style.font).fontSize(11).fillColor('#111111');
  const paragraphs = letterBody(docType, f);
  paragraphs.forEach((p) => {
    doc.text(p, { align: 'left', lineGap: 4 });
    doc.moveDown(0.8);
  });
}

function drawCV(doc, style, f) {
  const headColor = style.ats ? '#111111' : style.accent;
  doc.font(style.boldFont).fontSize(22).fillColor(headColor);
  doc.text(f.fullName || 'Your Name');
  doc.font(style.font).fontSize(10).fillColor('#444444');
  doc.text([f.email, f.phone, f.address].filter(Boolean).join('  |  '));
  doc.moveDown(1);

  function section(title, content) {
    doc.font(style.boldFont).fontSize(13).fillColor(headColor);
    doc.text(title.toUpperCase());
    if (!style.ats) {
      doc.moveTo(doc.x, doc.y + 2).lineTo(545, doc.y + 2).strokeColor(style.accent).stroke();
    }
    doc.moveDown(0.5);
    doc.font(style.font).fontSize(10.5).fillColor('#111111');
    doc.text(content || '-', { lineGap: 3 });
    doc.moveDown(1);
  }

  section('Professional Summary', f.summary);
  section('Work Experience', f.experience);
  section('Education', f.education);
  section('Skills', f.skills);
  if (f.achievements) section('Achievements', f.achievements);
  if (f.referees) section('Referees', f.referees);
}

function drawCertificate(doc, style, f) {
  const { width } = doc.page;
  doc.moveDown(2);
  doc.font(style.boldFont).fontSize(22).fillColor(style.accent);
  doc.text('CERTIFICATE OF EXPERIENCE', { align: 'center' });
  doc.moveDown(2);

  doc.font(style.font).fontSize(12).fillColor('#111111');
  doc.text('TO WHOM IT MAY CONCERN,', { align: 'left' });
  doc.moveDown(1);

  const startDate = f.startDate || '[start date]';
  const endDate = f.endDate || '[end date]';
  doc.text(
    `This is to certify that ${f.fullName || 'the employee'} worked at ${f.companyName || 'this organisation'} as ${f.position || 'a team member'} from ${startDate} to ${endDate}.`,
    { align: 'left', lineGap: 5 }
  );
  doc.moveDown(1);
  doc.text(
    f.achievements || `During this period, ${f.fullName || 'they'} performed their duties diligently and professionally, and left in good standing.`,
    { align: 'left', lineGap: 5 }
  );
  doc.moveDown(1);
  doc.text('We wish them well in their future endeavours.', { align: 'left', lineGap: 5 });

  doc.moveDown(4);
  const lineY = doc.y;
  doc.moveTo(60, lineY).lineTo(260, lineY).strokeColor('#999999').stroke();
  doc.fontSize(10).fillColor('#444444');
  doc.text(f.issuedBy || 'Authorized Signatory', 60, lineY + 5);
  doc.text(f.issueDate || new Date().toLocaleDateString('en-GB'), 60, lineY + 20);
}

function drawInvoice(doc, style, f) {
  doc.font(style.boldFont).fontSize(20).fillColor(style.accent);
  doc.text('INVOICE');
  doc.font(style.font).fontSize(10).fillColor('#444444');
  doc.text(`Invoice #: ${f.invoiceNumber || '001'}`);
  doc.text(`Date: ${f.invoiceDate || new Date().toLocaleDateString('en-GB')}`);
  if (f.dueDate) doc.text(`Due: ${f.dueDate}`);
  doc.moveDown(1);

  doc.font(style.boldFont).fontSize(11).fillColor('#111111').text('From:');
  doc.font(style.font).fontSize(10);
  doc.text(f.freelancerName || 'Your Name');
  if (f.freelancerEmail) doc.text(f.freelancerEmail);
  if (f.freelancerPhone) doc.text(f.freelancerPhone);
  if (f.freelancerAddress) doc.text(f.freelancerAddress);
  doc.moveDown(1);

  doc.font(style.boldFont).fontSize(11).fillColor('#111111').text('Bill To:');
  doc.font(style.font).fontSize(10);
  doc.text(f.clientName || 'Client Name');
  if (f.clientEmail) doc.text(f.clientEmail);
  doc.moveDown(1);

  // Parse line items: one per line, formatted as "description - amount"
  const lines = (f.items || '').split('\n').map((l) => l.trim()).filter(Boolean);
  const rows = lines.map((line) => {
    const parts = line.split(' - ');
    const amount = parts.length > 1 ? parseFloat(parts[parts.length - 1].replace(/[^0-9.]/g, '')) || 0 : 0;
    const description = parts.length > 1 ? parts.slice(0, -1).join(' - ') : line;
    return { description, amount };
  });
  if (rows.length === 0) rows.push({ description: 'Service rendered', amount: 0 });

  const tableTop = doc.y;
  doc.font(style.boldFont).fontSize(10).fillColor('#ffffff');
  doc.rect(50, tableTop, 495, 22).fill(style.accent);
  doc.fillColor('#ffffff').text('Description', 58, tableTop + 6);
  doc.text('Amount (KSh)', 450, tableTop + 6);

  let y = tableTop + 22;
  doc.font(style.font).fontSize(10).fillColor('#111111');
  let total = 0;
  rows.forEach((row, i) => {
    if (i % 2 === 1) doc.rect(50, y, 495, 20).fill('#f3f4f6').fillColor('#111111');
    doc.fillColor('#111111').text(row.description, 58, y + 5, { width: 380 });
    doc.text(row.amount.toLocaleString(), 450, y + 5);
    total += row.amount;
    y += 20;
  });

  doc.moveTo(50, y).lineTo(545, y).strokeColor('#999999').stroke();
  y += 8;
  doc.font(style.boldFont).fontSize(11).fillColor(style.accent);
  doc.text('Total:', 380, y);
  doc.text(`KSh ${total.toLocaleString()}`, 450, y);

  if (f.notes) {
    doc.moveDown(3);
    doc.font(style.font).fontSize(9.5).fillColor('#444444');
    doc.text(f.notes, { lineGap: 3 });
  }
}

function drawMeetingMinutes(doc, style, f) {
  doc.font(style.boldFont).fontSize(20).fillColor(style.accent);
  doc.text(f.meetingTitle || 'Meeting Minutes');
  doc.font(style.font).fontSize(10).fillColor('#444444');
  doc.text(f.date || new Date().toLocaleDateString('en-GB'));
  doc.moveDown(1);

  function section(title, content) {
    doc.font(style.boldFont).fontSize(12).fillColor(style.accent);
    doc.text(title.toUpperCase());
    doc.moveDown(0.3);
    doc.font(style.font).fontSize(10.5).fillColor('#111111');
    doc.text(content || '-', { lineGap: 3 });
    doc.moveDown(1);
  }

  section('Attendees', f.attendees);
  section('Agenda', f.agenda);
  section('Discussion', f.discussion);
  section('Action Items', f.actionItems);
  if (f.nextMeetingDate) section('Next Meeting', f.nextMeetingDate);
}

function drawBusinessCard(doc, style, f) {
  const cardWidth = 336; // 3.5in at 96dpi-equivalent points-ish
  const cardHeight = 192; // 2in
  const x = (doc.page.width - cardWidth) / 2;
  const y = (doc.page.height - cardHeight) / 2;

  doc.rect(x, y, cardWidth, cardHeight).fillAndStroke('#ffffff', '#e2e8f0');
  doc.rect(x, y, 10, cardHeight).fill(style.accent);

  doc.font(style.boldFont).fontSize(18).fillColor('#111111');
  doc.text(f.fullName || 'Your Name', x + 30, y + 30, { width: cardWidth - 50 });
  doc.font(style.font).fontSize(11).fillColor(style.accent);
  doc.text(f.jobTitle || 'Job Title', x + 30, y + 55, { width: cardWidth - 50 });
  if (f.companyName) {
    doc.font(style.font).fontSize(10).fillColor('#444444');
    doc.text(f.companyName, x + 30, y + 72, { width: cardWidth - 50 });
  }

  doc.font(style.font).fontSize(9).fillColor('#111111');
  let ly = y + 110;
  [f.phone, f.email, f.website, f.address].filter(Boolean).forEach((line) => {
    doc.text(line, x + 30, ly, { width: cardWidth - 50 });
    ly += 14;
  });
}

function addWatermark(doc) {
  const { width, height } = doc.page;
  doc.save();
  doc.rotate(-35, { origin: [width / 2, height / 2] });
  doc.fontSize(46).fillColor('#94a3b8').opacity(0.28);
  for (let y = -height; y < height * 2; y += 160) {
    doc.text('KDOCS-PRO PREVIEW - PAY TO DOWNLOAD', -100, y, { width: width + 400, align: 'center' });
  }
  doc.opacity(1);
  doc.restore();
}

/**
 * Generates a PDF buffer for the given document type + template + form fields.
 * When watermark=true, this is the free preview (blurred with a repeating
 * watermark and no clean copy). When watermark=false, this is the real,
 * clean file - only ever produced AFTER a confirmed M-Pesa payment.
 */
function generatePdf({ docType, templateKey, fields, watermark }) {
  return new Promise((resolve, reject) => {
    const style = TEMPLATE_STYLES[templateKey] || TEMPLATE_STYLES.modern;
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    const chunks = [];
    doc.on('data', (c) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    if (docType === 'cv') {
      drawCV(doc, style, fields);
    } else if (docType === 'experience_certificate') {
      drawCertificate(doc, style, fields);
    } else if (docType === 'freelance_invoice') {
      drawInvoice(doc, style, fields);
    } else if (docType === 'meeting_minutes') {
      drawMeetingMinutes(doc, style, fields);
    } else if (docType === 'business_card') {
      drawBusinessCard(doc, style, fields);
    } else {
      drawLetter(doc, style, docType, fields);
    }

    if (watermark) addWatermark(doc);

    doc.end();
  });
}

module.exports = { generatePdf };
