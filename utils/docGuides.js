// Long-form content for the /doc/<key> landing pages.
//
// Why this file exists: Search Console kept those pages at "Discovered -
// currently not indexed" because each landing was a title, one short
// description and a price - near-duplicate thin pages with nothing unique for
// Google to rank. Every guide below is written for one document type only:
// its own intro, its own practical sections, its own sample line and its own
// FAQs, in the Kenyan context the audience actually works in.
//
// Rules when editing:
//   - one entry per catalog document (test/docGuides.test.js enforces this),
//   - never paste the same sentence into two guides - uniqueness is the point,
//   - keep claims accurate and checkable; no invented statistics.

const DOC_GUIDES = {
  cv: {
    intro: 'A CV is the one-page summary of your skills, education and work history that a Kenyan employer reads before deciding whether to call you. It is often scanned by applicant-tracking software and then skimmed by a busy HR officer, so the top third of the page has to carry the whole case for hiring you. If the advert asks for both documents, build the {{cover letter|cover_letter}} from the same evidence so the two never contradict each other.',
    sections: [
      {
        h: 'What belongs at the top of the page',
        items: [
          'A target line naming the role you want, not a generic "curriculum vitae" heading - use the same title you will use in the {{application letter|job_application}}.',
          'Phone, professional email and town or city - a full postal address wastes a line recruiters never use.',
          'A two-to-three sentence profile with your years of experience, your field and one measurable win.',
        ],
      },
      {
        h: 'Writing the experience section',
        items: [
          'Reverse chronological order, each entry as job title, employer, town and month/year dates.',
          'Start every bullet with a verb and end it with a number: "cut", "grew", "reconciled", plus KSh figures or percentages.',
          'Three to five bullets for your current role, one or two for anything older than five years.',
        ],
      },
      {
        h: 'Details Kenyan recruiters skip past',
        items: [
          'Religion, marital status, ID number and national-of-origin lines - none of these help you get shortlisted.',
          'Referees printed on the page; "referees available on request" keeps the document safe to forward. Prepare the people you do name in advance with a {{reference request letter|reference_request}}.',
          'A photo, unless the advert explicitly asks for one.',
        ],
      },
    ],
    sample: 'Managed a six-person sales team across three Nairobi branches, growing monthly revenue from KSh 480,000 to KSh 610,000 in eight months.',
    faqs: [
      {
        q: 'Should a Kenyan CV include a photo?',
        a: 'Most banks, NGOs and multinationals now screen with software that ignores images, and a photo invites bias rather than adding evidence. Leave it out unless the advert asks for one.',
      },
      {
        q: 'Do I put my KRA PIN or ID number on the CV?',
        a: 'No. Those belong on the offer-stage forms. A CV gets forwarded, printed and stored in inboxes, and identity details there are a fraud risk.',
      },
      {
        q: 'How long should a CV be in Kenya?',
        a: 'One page up to about eight years of experience, two pages at most beyond that. Recruiters scanning forty applications will not read a third page.',
      },
    ],
  },

  cover_letter: {
    intro: 'A cover letter is a one-page argument that connects your CV to one specific job advert. Where the CV lists everything you have done, the letter picks the two or three things that matter for this employer and explains why they matter here. When an advert demands the formal version, send it as an {{application letter|job_application}} instead.',
    sections: [
      {
        h: 'Open with the job, not with yourself',
        items: [
          'Name the exact position and where you saw it - the advert reference if there is one.',
          'Follow with one sentence on the strongest overlap between their requirement and your record.',
          'Say who you are in that first paragraph: current role, employer and years in the field.',
        ],
      },
      {
        h: 'The middle paragraph does the persuading',
        items: [
          'Mirror two or three requirements from the advert, then give one proof for each: a number, a system, a result.',
          'Write about what you delivered, not what your previous employer does.',
          'Keep it to a single paragraph - a second one is where letters start repeating the CV.',
        ],
      },
      {
        h: 'Close with a clear ask',
        items: [
          'State your availability, then ask for the interview.',
          'Give one reliable phone number and an email you check daily.',
          'Sign off with "Yours faithfully" when the letter opens "Dear Sir/Madam", and "Yours sincerely" when you use a name.',
        ],
      },
    ],
    sample: 'I am applying for the Credit Officer position advertised on BrighterMonday on 4 November 2026; my three years assessing SME loan applications at a Nakuru SACCO match the portfolio described in the advert.',
    faqs: [
      {
        q: 'Who should the letter be addressed to?',
        a: 'Use the named contact if the advert gives one, otherwise "The Hiring Manager" with the organisation name. "Dear Sir/Madam" is acceptable but reads weaker when a name was available.',
      },
      {
        q: 'How long should a cover letter be?',
        a: 'Three or four short paragraphs inside one page. If it does not fit on a phone screen without scrolling twice, it is too long.',
      },
      {
        q: 'Should the cover letter repeat the CV?',
        a: 'No. Take two achievements from the {{CV|cv}}, give the context behind them, and leave the rest out. The letter persuades; the CV is the evidence file.',
      },
    ],
  },

  job_application: {
    intro: 'A job application letter is the formal letter that accompanies your CV when an advert asks for one. Public-service, teaching and NGO adverts in Kenya usually list exactly what must be attached and in what order, and the letter is how you prove you followed that list. It sits on top of the {{CV|cv}}, never instead of it.',
    sections: [
      {
        h: 'Follow the advert checklist line by line',
        items: [
          'Quote the advert number and the exact job title - misspelt titles are filtered out in county and ministry shortlisting.',
          'List the enclosures in the order the advert asks for them.',
          'Send copies, never originals, of certificates and clearance documents. If the advert names referees, ask them early with a {{reference request|reference_request}}.',
        ],
      },
      {
        h: 'The reference and address block',
        items: [
          'Your address, the date, then the recipient: title, organisation, and P.O. Box if the advert shows one.',
          'A bold "RE:" line carrying the position and advert number.',
          'Keep the body to three paragraphs: why you fit, what you bring, and a request for consideration.',
        ],
      },
      {
        h: 'Tone and closing',
        items: [
          'Formal and plain - no exclamation marks, no emoji, no slang.',
          'State that you are available for an interview at their convenience.',
          '"Yours faithfully" is the safe close when addressing the organisation.',
        ],
      },
    ],
    sample: 'RE: APPLICATION FOR THE POSITION OF ASSISTANT COUNTY DIRECTOR - ADVERT NO. 12/2026. I wish to apply for the above position as advertised in the Standard on 8 November 2026.',
    faqs: [
      {
        q: 'Is an application letter the same as a cover letter?',
        a: 'They overlap, but public-service adverts want the formal letter: reference number, enclosures list, and a clear statement of the post applied for. A generic cover letter rarely satisfies that checklist.',
      },
      {
        q: 'Do I list my referees inside the letter?',
        a: 'Only when the advert asks for three referees. In that case include name, title, organisation, email and phone for each.',
      },
      {
        q: 'Can I send the application by email attachment?',
        a: 'Follow the advert exactly. If it asks for one PDF, merge letter, CV and certificates into a single file named with your full name and the post.',
      },
    ],
  },

  leave_request: {
    intro: 'A leave request is the written application an employee submits so annual, sick, maternity or compassionate leave is approved and recorded. Kenya\'s Employment Act gives you the days; the written request is what stops an approved absence from later being treated as desertion. A parent writing for a learner needs the school version instead: a {{school leave letter|leave_permission}}.',
    sections: [
      {
        h: 'Dates, days and balance',
        items: [
          'Give the first and last day in full, plus the number of working days requested.',
          'State your remaining leave balance as shown on the HR system.',
          'Say whether you are resuming on a specific date or counting from approval.',
        ],
      },
      {
        h: 'Handover and cover',
        items: [
          'Name the colleague covering your desk and what they are taking on.',
          'Attach or point to the {{handover report|handover_report}} for live tasks and deadlines.',
          'Give a phone number if you are reachable for genuine emergencies - and say clearly if you are not.',
        ],
      },
      {
        h: 'What the approver needs to sign off',
        items: [
          'A reason only when policy requires it: annual leave generally needs none, sick and compassionate leave do.',
          'A medical certificate attached for sick leave of more than two consecutive days.',
          'Your supervisor copied in, so approval does not stall in one inbox.',
        ],
      },
    ],
    sample: 'I request ten working days of annual leave from Monday 2 December to Friday 13 December 2026, resuming on Monday 16 December. My leave balance is 14 days and Ms Achieng will cover supplier reconciliation.',
    faqs: [
      {
        q: 'How much notice does an annual leave request need?',
        a: 'Check your employer\'s policy - fourteen to twenty-one days is typical for planned annual leave, while sick leave is reported the same day and documented afterwards.',
      },
      {
        q: 'Do I have to give a reason for annual leave?',
        a: 'Usually not. Annual leave is an entitlement, and a short factual request is harder to delay than an explanation that invites a discussion.',
      },
      {
        q: 'Is an email enough, or does it have to be a letter?',
        a: 'Either works if it is written and recorded. Match what your HR team already files, and keep the approved reply.',
      },
    ],
  },

  salary_increment: {
    intro: 'A salary increment request is a written, evidence-based case for a pay review. It works when it reads as a business case about the value of your role rather than as a complaint about your expenses. Bring the results you already wrote down in your {{self-appraisal|self_appraisal}}.',
    sections: [
      {
        h: 'Build the evidence before you write',
        items: [
          'Collect the mandates you have taken on since your last review, with dates.',
          'Find two or three measurable results you own personally.',
          'Check what the role pays elsewhere so your figure is anchored outside your own household budget. A written {{offer|offer_acceptance}} at a higher figure is the cleanest anchor there is.',
        ],
      },
      {
        h: 'State a range, not a demand',
        items: [
          'Name a range and explain how you arrived at it - market data, scope change, or internal equity.',
          'Ask for a review date if the answer today is no, and put that date in writing.',
          'Mention the last review date and your current gross salary for context.',
        ],
      },
      {
        h: 'Time it to the cycle',
        items: [
          'Send it during budget or appraisal season, not the week a big cost lands.',
          'Keep it to one page and attach the supporting file rather than pasting it all in.',
          'Send it to your line manager and copy HR only if policy says so.',
        ],
      },
    ],
    sample: 'Since my appointment in March 2024 my portfolio has grown from 40 to 95 accounts and I now supervise two assistants. Based on the current market band for this scope I would like my gross salary reviewed from KSh 62,000 to a range of KSh 75,000-80,000.',
    faqs: [
      {
        q: 'How much of an increase should I ask for?',
        a: 'Anchor to the market band and to the change in your scope. Ten to twenty per cent is a normal ask; larger jumps need documented role expansion or a competing written offer.',
      },
      {
        q: 'What if my manager says there is no budget?',
        a: 'Ask what the criteria and cycle are, and request a written review date. An approval in principle with a date is worth more than a verbal maybe.',
      },
      {
        q: 'Should I mention another job offer?',
        a: 'Only if it is real and you would act on it. Used as a bluff it ends the conversation badly, and managers talk to each other.',
      },
    ],
  },

  offer_acceptance: {
    intro: 'An acceptance letter formally agrees to a job offer and records the terms you and the employer settled on. It matters because the offer letter, the acceptance and the contract are read together if anything is later disputed. Your {{resignation|resignation}} at the old employer has to line up with the new start date.',
    sections: [
      {
        h: 'Restate the agreed terms',
        items: [
          'Job title, department and reporting line.',
          'Gross salary, allowances and any agreed review date.',
          'Start date and the station or branch.',
        ],
      },
      {
        h: 'Conditions you may reasonably set',
        items: [
          'A later start date if you must serve notice, agreed in writing.',
          'Pending clearance or reference checks, named so nobody is surprised.',
          'Anything promised verbally - parking, relocation, study support - confirmed here.',
        ],
      },
      {
        h: 'Deadlines and copies',
        items: [
          'Accept before the deadline in the offer letter, or ask for a short extension in writing.',
          'Sign and return the copy the employer asked for, and keep a scanned copy.',
          'Confirm what to bring on day one: ID, KRA PIN, NSSF and SHIF numbers, bank details.',
        ],
      },
    ],
    sample: 'I accept the position of Accounts Assistant at a gross salary of KSh 45,000 per month, starting 6 January 2027, as set out in your letter of 20 November 2026, subject to the reference checks we discussed.',
    faqs: [
      {
        q: 'Should I accept before I have seen the contract?',
        a: 'Accepting the offer commits you to the role, not to clauses you have not read. Accept, then review the contract carefully - if a term differs from the offer, raise it in writing before signing.',
      },
      {
        q: 'Can I still negotiate after accepting?',
        a: 'Before signing, yes; afterwards you are reopening an agreement. If something was promised and is missing, say so immediately rather than at the end of the first month. Once inside the role, the next conversation is a {{salary increment request|salary_increment}}.',
      },
      {
        q: 'What if I change my mind after accepting?',
        a: 'Decline in writing as early as you can, thank them, and be brief. Early notice keeps the relationship usable; silence does not.',
      },
    ],
  },

  self_appraisal: {
    intro: 'A self-appraisal is the written self-review an employer asks for before the performance cycle closes. It is not a humility exercise: it is your only chance to put your results on the record in your own words before ratings are set. If the outcome you want is money, make that case separately in a {{salary increment request|salary_increment}}.',
    sections: [
      {
        h: 'Lead with results, target by target',
        items: [
          'Take each objective from your last review and state the target, what you achieved, and the gap or overrun.',
          'Use numbers the organisation already tracks, so nobody can dispute them.',
          'Name the obstacles you worked around - context makes a miss look different from a failure.',
        ],
      },
      {
        h: 'Own the gaps in one honest paragraph',
        items: [
          'Pick one or two genuine shortfalls and pair each with the fix already in motion.',
          'Avoid blaming colleagues or budget by name.',
          'Do not claim a perfect year; reviewers discount self-scores that ignore reality. If a gap came from absence, point to the approved {{leave request|leave_request}} rather than explaining it twice.',
        ],
      },
      {
        h: 'Set next cycle\'s targets',
        items: [
          'Propose three objectives with measures you can actually influence.',
          'Say what support or training you need while it is still a planning conversation.',
          'Keep the whole document to one or two pages, structured like the appraisal form.',
        ],
      },
    ],
    sample: 'Objective 3 - reduce customer turnaround to 48 hours. Achieved a 31-hour average by reworking the intake checklist; the remaining delay sits with the weekend approval queue, where I have proposed a rota change.',
    faqs: [
      {
        q: 'Should I admit weaknesses in a self-appraisal?',
        a: 'Yes - one or two, each with what you changed. Claiming no weaknesses reads as low self-awareness and invites the reviewer to find them for you.',
      },
      {
        q: 'Do I score myself on the rating scale?',
        a: 'Only if the form asks. If it does, be fair and give evidence next to each score; over-rating yourself is the fastest way to have the whole document discounted.',
      },
      {
        q: 'How long should a self-appraisal be?',
        a: 'One to two pages following the form\'s structure. Long narrative gets skimmed, and skimming is how achievements disappear from the record.',
      },
    ],
  },

  resignation: {
    intro: 'A resignation letter gives your employer formal notice that you are leaving and fixes your last working day. It is usually the shortest letter you will ever write, and the one most likely to be read years later during a reference check. Plan the exit with a {{handover report|handover_report}} and a short {{farewell note|farewell}}.',
    sections: [
      {
        h: 'Notice period and last day',
        items: [
          'Calculate notice from your contract - commonly one month, sometimes three for senior roles.',
          'State the date you are handing the letter in and the last day it produces.',
          'If you are giving more notice than required, say so plainly; it protects you if plans change.',
        ],
      },
      {
        h: 'Keep the tone neutral',
        items: [
          'Thank the employer briefly and describe the decision as yours.',
          'Leave out grievances - the exit interview exists for those, and a written complaint in a resignation file follows you.',
          'Do not announce your next employer if you would rather not; there is no obligation.',
        ],
      },
      {
        h: 'What to offer in the same letter',
        items: [
          'A handover plan and the name of who will take over your tasks.',
          'Cooperation with clearance and the final dues process.',
          'Availability for a handover period if your contract allows it.',
        ],
      },
    ],
    sample: 'I am writing to resign from my position as Logistics Coordinator with effect from 31 January 2027, in line with the one month\'s notice in my contract. I will complete a full handover of the Kisumu and Eldoret routes before that date.',
    faqs: [
      {
        q: 'Can my employer refuse to accept my resignation?',
        a: 'They can dispute whether you served the contractual notice; they cannot stop you leaving. Serve the period in your contract and keep written proof of when you handed the letter over.',
      },
      {
        q: 'Do I have to give a reason for leaving?',
        a: 'No. Reasons belong in the exit interview, where you can be candid without writing it into a permanent file.',
      },
      {
        q: 'Will resigning affect my terminal benefits?',
        a: 'Accrued leave, pro-rated salary and pension contributions normally remain payable. Service pay and notice pay depend on your contract and on how the notice period is served, so read both before you sign the clearance form. Ask for the {{experience certificate|experience_certificate}} before your last day, while HR still has your file open.',
      },
    ],
  },

  reference_request: {
    intro: 'A reference request asks a former manager, lecturer or colleague to speak on your behalf for a specific opportunity. Done well it takes the referee ten minutes; done badly it asks them to reconstruct your career from memory a day before a deadline. Send the same fact pack you used for your {{CV|cv}} so the dates and titles match.',
    sections: [
      {
        h: 'Ask the right person',
        items: [
          'A direct supervisor who saw your work in the last five years beats a senior name who never worked with you.',
          'Choose someone still reachable on the contact details they will actually use.',
          'Ask one person per role type; three referees answering different questions is stronger than three saying the same thing.',
        ],
      },
      {
        h: 'Make it effortless for them',
        items: [
          'Send the advert, your CV, the role title and the deadline in one message. If a {{recommendation letter|recommendation_letter}} already exists, attach it so the referee does not contradict it.',
          'Offer a short fact sheet of projects, dates and numbers they can draw on.',
          'Say whether the reference is a phone call, an online form or a sealed letter - and to whom.',
        ],
      },
      {
        h: 'Protect the relationship',
        items: [
          'Ask at least two weeks before the deadline, not two days.',
          'Confirm afterwards whether they were contacted, and thank them either way.',
          'Tell them promptly if you withdraw from the process so they are not caught cold.',
        ],
      },
    ],
    sample: 'Would you be willing to act as a referee for my application to the Credit Analyst role at Equity Bank? The advert closes on 12 December, and I have attached the job description and my CV so you can see what they are asking about.',
    faqs: [
      {
        q: 'Does a reference letter need to be sealed and signed?',
        a: 'Older public-service adverts still ask for sealed references. Most private employers now prefer contactable referees, so follow whichever the advert specifies.',
      },
      {
        q: 'Can I give a colleague instead of my manager?',
        a: 'Yes, when your manager does not know you are leaving. Say plainly that the reference is confidential and why the colleague is the right witness.',
      },
      {
        q: 'What if my referee never responds?',
        a: 'Send one polite reminder with the deadline in it, then line up an alternative referee. Never list someone as a referee without their agreement.',
      },
    ],
  },

  farewell: {
    intro: 'A farewell or exit letter marks your last day and leaves the door open. It is not a resignation letter - the notice has already been served - it is the goodbye note your colleagues actually read and remember. The formal part, the {{resignation letter|resignation}}, has already done its job.',
    sections: [
      {
        h: 'Keep it short and warm',
        items: [
          'One paragraph on the fact of leaving and the date, one on thanks, one on staying in touch.',
          'Name the specific thing you valued: the team, a project, a mentor.',
          'Avoid a formal "RE:" structure; this is a message, not a filing.',
        ],
      },
      {
        h: 'Thank specific people and specific work',
        items: [
          'Mention two or three colleagues by name and what they taught you.',
          'Reference a shared achievement rather than a generic "great experience". If you are handing over a role, point people to the {{handover report|handover_report}} so nothing is lost when your account closes.',
          'Thank the support staff too - they notice, and they talk.',
        ],
      },
      {
        h: 'Leave contact details, not grievances',
        items: [
          'Give a personal email or phone number you will keep after the work account closes.',
          'Offer to be a reference for colleagues who need one.',
          'Save any criticism for the exit interview; the farewell email is forwarded far beyond the team.',
        ],
      },
    ],
    sample: 'Friday 30 January will be my last day with the Mombasa team. Thank you for two years of patient teaching - Mr Kariuki for the reconciliation shortcuts, and Amina for covering every deadline I nearly missed. I can be reached on the number below.',
    faqs: [
      {
        q: 'Is a farewell letter the same as a resignation letter?',
        a: 'No. The resignation gives contractual notice and fixes your last day; the farewell is the goodbye note sent near the end. Sending only a farewell leaves you without a notice record.',
      },
      {
        q: 'Should I send it by email or read it out?',
        a: 'Email to the team, copied to HR, is the norm and keeps a record. If there is a send-off, keep spoken remarks shorter than the written note.',
      },
      {
        q: 'Can I mention the reasons I am leaving?',
        a: 'Not in this letter. Reasons belong in the exit interview, where they can be handled as feedback instead of becoming a forwarded complaint.',
      },
    ],
  },

  handover_report: {
    intro: 'A handover report transfers your responsibilities, files and contacts to whoever takes over your desk. Written properly it is the difference between a two-week transition and a month of phone calls to someone who has already left. It is the document your {{resignation letter|resignation}} promised.',
    sections: [
      {
        h: 'Inventory what you actually own',
        items: [
          'List every recurring task with its frequency and the date it falls due.',
          'List live projects with status, next milestone and who is waiting on them.',
          'Include the small things: renewals, licences, standing orders, recurring supplier calls.',
        ],
      },
      {
        h: 'Live tasks, deadlines and risks',
        items: [
          'Flag anything overdue with the reason and the proposed fix.',
          'Name external contacts with their role and preferred channel. Where a decision was taken in a meeting, link the {{minutes|meeting_minutes}} instead of retelling it.',
          'Call out known risks: an unpaid invoice, a contract clause expiring, a supplier dispute.',
        ],
      },
      {
        h: 'Access, files and sign-off',
        items: [
          'Point to where files live by folder path, not "in my email".',
          'Hand over system access through IT or HR, never inside the report itself.',
          'Have the receiving officer and your manager sign and date it, and keep a copy.',
        ],
      },
    ],
    sample: 'Open items: three supplier invoices awaiting approval (attached), the Kisumu stock count due 5 February, and the lease renewal for the Nakuru depot which needs a decision before 28 February.',
    faqs: [
      {
        q: 'How detailed should a handover report be?',
        a: 'Detailed enough that a competent colleague can run your desk for two weeks without calling you. Practical instructions, not a diary of everything you did.',
      },
      {
        q: 'Should I put passwords in the handover report?',
        a: 'Never in the document. Passwords and admin access go through IT or HR on the official offboarding route, so the record shows who received them.',
      },
      {
        q: 'Who signs the handover report?',
        a: 'You, the person taking over, and usually your manager or HR. The signature is what protects you if a task later turns out to have been dropped.',
      },
    ],
  },

  experience_certificate: {
    intro: 'An experience certificate is an employer\'s written confirmation of your role, dates and conduct. Kenyan employers, colleges and visa officers ask for it after you leave, and without it a year of work becomes hard to prove. Employers are often asked for a {{recommendation letter|recommendation_letter}} at the same time, and it is a different document.',
    sections: [
      {
        h: 'Facts the certificate must carry',
        items: [
          'Full name and, where used, the staff or payroll number.',
          'Job title, department and exact start and end dates - they must agree with the dates on your {{CV|cv}} down to the month.',
          'A one-line description of the duties actually performed.',
        ],
      },
      {
        h: 'Conduct and performance wording',
        items: [
          'State conduct factually: "served with diligence and integrity" is standard and safe.',
          'Avoid rankings and promises - a certificate confirms, it does not recommend.',
          'Leave out disciplinary detail; that belongs in confidential HR correspondence.',
        ],
      },
      {
        h: 'Signatures and letterhead',
        items: [
          'Company letterhead, an authorised HR officer or director, a signature, a date.',
          'A company stamp where the organisation uses one.',
          'Keep the reference number if your HR team assigns one, so it can be verified.',
        ],
      },
    ],
    sample: 'This is to certify that Grace Wambui was employed by our company as a Stores Clerk in the Procurement department from 3 January 2022 to 28 February 2026. Her duties included stock reconciliation and supplier liaison, and she served with diligence and integrity.',
    faqs: [
      {
        q: 'Who should sign an experience certificate?',
        a: 'An authorised HR officer or a director, on letterhead, with a stamp and date. A certificate signed by a colleague who cannot be verified is often rejected.',
      },
      {
        q: 'Can I draft it myself for my employer to sign?',
        a: 'It is common practice. Keep it factual, one page, and invite the employer to amend the wording - they remain responsible for what they sign.',
      },
      {
        q: 'Is an experience certificate the same as a reference letter?',
        a: 'No. A certificate confirms that you worked there and in what capacity; a recommendation letter argues that you did the job well. Applications often need both.',
      },
    ],
  },

  recommendation_letter: {
    intro: 'A recommendation letter is written by someone who has worked with you and vouches for your performance and character. Admissions panels and recruiters read it as evidence about how you behave, which is exactly what a CV cannot show. If the ask is only to confirm you worked there, an {{experience certificate|experience_certificate}} is the lighter request.',
    sections: [
      {
        h: 'Establish how you know each other',
        items: [
          'State the relationship, the organisation and the period you worked together.',
          'Say in what capacity the writer observed you - direct supervision, a shared project, a class.',
          'Name the role or programme you are being recommended for - for a course, that is the programme named in the {{admission application|admission_application}}.',
        ],
      },
      {
        h: 'Give two concrete examples',
        items: [
          'One example of skill: a project, a problem, a result with a number if there is one.',
          'One example of character: reliability under pressure, honesty with a mistake, how you handled a difficult client.',
          'Compare only where it is credible - "among the two strongest interns I supervised" beats "the best I have ever seen".',
        ],
      },
      {
        h: 'End with a clear recommendation',
        items: [
          'Say plainly that you are recommended for the role or programme.',
          'Offer to be contacted for further detail, with a working phone or email.',
          'Keep it to one page - three or four paragraphs is enough.',
        ],
      },
    ],
    sample: 'I supervised Peter for two years at our Eldoret branch, where he consistently opened the highest number of new accounts and once traced a KSh 210,000 reconciliation error that had gone unnoticed for three months.',
    faqs: [
      {
        q: 'Who is the best person to write a recommendation?',
        a: 'Someone with firsthand knowledge of your work: a supervisor, a lecturer who taught you, or a client you delivered for. A famous name who cannot describe your work carries little weight.',
      },
      {
        q: 'Can I draft the letter for the writer?',
        a: 'Yes, provide a fact sheet with dates, projects and figures, and ask them to write it in their own words. A visibly ghost-written letter with no specifics reads as filler.',
      },
      {
        q: 'Does it need to be on letterhead?',
        a: 'For employment it should be, signed and dated. For academic references a signed letter on institutional letterhead, or a sealed copy, is the norm.',
      },
    ],
  },

  admission_application: {
    intro: 'An admission application letter is the formal request to join a course, intake or programme at a school, college or university. It travels with your certificates and application form, and it is where an admissions officer looks for evidence that you understand what you are applying for. Most institutions read it beside your {{fee or bursary request|fee_bursary_request}}, so both should name the same programme.',
    sections: [
      {
        h: 'Identify the programme precisely',
        items: [
          'Course or programme name, level, and intake (for example January 2027).',
          'Campus or mode of study if the institution runs several.',
          'The application or reference number when one has been issued.',
        ],
      },
      {
        h: 'Show that you meet the entry requirements',
        items: [
          'State your KCSE grade, or your diploma and institution, with the year.',
          'Name the specific subjects or credits that satisfy the course requirements.',
          'If results are pending, say when they are expected rather than omitting them.',
        ],
      },
      {
        h: 'Say what you bring and what you need',
        items: [
          'One or two lines on why this field, grounded in something you have done.',
          'State whether you are applying for a scholarship, bursary, HELB or self-sponsorship.',
          'Ask a direct question about next steps so the letter invites a reply.',
        ],
      },
    ],
    sample: 'I wish to apply for the Diploma in Supply Chain Management, January 2027 intake, at your Nairobi campus. I scored a C+ in the 2025 KCSE with a B in Mathematics and a B- in Business Studies, which meet the published entry requirements.',
    faqs: [
      {
        q: 'What should I attach to an admission letter?',
        a: 'Copies of your KCSE result slip or transcripts, your ID or birth certificate, and the application fee receipt where one is charged. Send copies and keep the originals for verification day.',
      },
      {
        q: 'Which office should receive an admission letter?',
        a: 'The Registrar or Admissions Officer, with the institution name and address. Using the correct title is a small signal that you read the prospectus.',
      },
      {
        q: 'Can I apply before my results are released?',
        a: 'Yes. State that results are pending and give the expected release date, then send the result slip the moment it is out so your place is not given away. If you are still at school, ask for {{permission to be away|leave_permission}} for the registration day.',
      },
    ],
  },

  leave_permission: {
    intro: 'A school leave or permission letter asks a head teacher or principal to excuse a learner for a set number of days. Schools file it with the class register, so the dates and the reason have to be exact. For an absence from work rather than school, use a {{leave request|leave_request}}.',
    sections: [
      {
        h: 'Identify the learner and the dates',
        items: [
          'Full name, class or form, stream, and admission number.',
          'First and last day of absence, written as dates rather than "next week".',
          'The day the learner is expected back in class.',
        ],
      },
      {
        h: 'Who is asking and why',
        items: [
          'The parent or guardian\'s name, relationship and phone number.',
          'A brief factual reason: medical review, family bereavement, religious obligation, travel.',
          'Medical detail only where the school requires it; otherwise "medical appointment" is enough.',
        ],
      },
      {
        h: 'Cover the missed work',
        items: [
          'Say how missed assignments and tests will be handled. Families asking for a {{fee waiver|fee_bursary_request}} in the same term usually need both letters from the same office.',
          'Ask for any notes or past papers that should come home with the learner.',
          'If the absence overlaps exams, request the school\'s guidance in advance.',
        ],
      },
    ],
    sample: 'I request permission for my daughter Amina Hassan (Form 2 East, admission number 4417) to be away from school from 2 to 6 December 2026 for a family bereavement. She will resume on 7 December and I will arrange for her to sit the missed end-of-term tests.',
    faqs: [
      {
        q: 'Who writes the letter - the learner or the parent?',
        a: 'The parent or guardian, addressed to the head teacher. A boarding school may also want the house master or matron informed, so share a copy.',
      },
      {
        q: 'Do I have to state the medical reason?',
        a: 'Keep it brief unless the school asks for detail. Attach a clinic note only when the absence is longer than a few days or the school policy requires it.',
      },
      {
        q: 'What if the absence is during exams?',
        a: 'Raise it with the class teacher before the absence and state in the letter how the papers will be handled, so the school is not deciding after the fact.',
      },
    ],
  },

  fee_bursary_request: {
    intro: 'A fee waiver or bursary request asks a school, county fund, CDF or NGO to reduce or cover school fees. Committees read dozens of these, and the ones that succeed state the need in figures and back it with documents. The {{admission application|admission_application}} that won the place is the document this request defends.',
    sections: [
      {
        h: 'State the need in numbers',
        items: [
          'The fee balance, the term, and the amount you are asking the fund to cover.',
          'Your household income, stated honestly and briefly.',
          'The number of dependants already in school.',
        ],
      },
      {
        h: 'Evidence to attach',
        items: [
          'The school fee structure or a current fee statement.',
          'Proof of income, or a letter from the chief where income is irregular.',
          'Supporting documents for the reason: a death certificate, medical report or retrenchment letter.',
        ],
      },
      {
        h: 'Give the committee a reason to say yes',
        items: [
          'Report the learner\'s performance or conduct in one line. If the learner was recently away, attach the {{permission letter|leave_permission}} that covered it.',
          'Say what the family has already contributed this year.',
          'Offer something back: a commitment to the balance, a payment plan, or service to the school.',
        ],
      },
    ],
    sample: 'I am requesting a partial bursary of KSh 18,000 towards the KSh 42,000 term two fees for my son, a Form 3 student at Nakuru Boys. I have paid KSh 12,000 this year and commit to clearing a further KSh 8,000 by the end of term.',
    faqs: [
      {
        q: 'How do county bursaries actually work?',
        a: 'Most go through the ward bursary committee during a published window. You submit a letter, fee structure, and evidence of need, and the committee ranks applications before funds are released.',
      },
      {
        q: 'Is NG-CDF still funding school fees?',
        a: 'Some constituencies still run bursary schemes through the NG-CDF office. Confirm the current window and requirements with your constituency office before writing, because the rules differ by area.',
      },
      {
        q: 'Should I include personal financial details?',
        a: 'Include income and dependants, which the committee needs to rank need. You do not need bank statements unless the fund explicitly asks for them.',
      },
    ],
  },

  freelance_invoice: {
    intro: 'A freelance invoice is the document that gets you paid. It tells a client exactly what they bought, when payment is due and where to send the money - so a forgotten detail becomes a delay of weeks. Keep the details identical to the {{business card|business_card}} you hand clients.',
    sections: [
      {
        h: 'Identify both sides and the work',
        items: [
          'Your name or business name, KRA PIN and contact details, plus the client\'s registered name.',
          'A sequential invoice number and the invoice date.',
          'Each line item with quantity, rate and total - not one lump sum called "services". Where a client approved the scope in a meeting, cite the {{minutes|meeting_minutes}} for it.',
        ],
      },
      {
        h: 'Tax and payment details',
        items: [
          'Your KRA PIN on every invoice; clients need it to claim the expense.',
          'VAT separately and only if you are registered; otherwise mark the invoice "not VAT charged".',
          'Payment channel: M-Pesa till or paybill, bank name and account, or a payment link.',
        ],
      },
      {
        h: 'Terms that save you chasing',
        items: [
          'A due date, not "on receipt" - fourteen or thirty days is standard.',
          'A late-payment clause and the accepted currency.',
          'A short note on withholding tax if the client will deduct it, so your total is not a surprise.',
        ],
      },
    ],
    sample: 'INV-2026-014 | Website maintenance, November 2026 | 3 hours at KSh 2,500 = KSh 7,500 | Due 15 December 2026 | Pay to M-Pesa paybill 400200, account 7741.',
    faqs: [
      {
        q: 'Do I need to be VAT registered to invoice?',
        a: 'Only once your taxable turnover passes the KES 5 million threshold. Below that, show your KRA PIN and state clearly that the invoice is not VAT charged.',
      },
      {
        q: 'What is withholding tax and who pays it?',
        a: 'On professional fees, some clients must deduct 5% and remit it to KRA, then give you a withholding certificate. Agree this before the work starts so the shortfall is expected.',
      },
      {
        q: 'How should I number my invoices?',
        a: 'Sequentially and never reuse a number, for example INV-2026-014. Gaps and duplicates are the first things an auditor or a late-paying client queries.',
      },
    ],
  },

  meeting_minutes: {
    intro: 'Meeting minutes are the official record of what a meeting decided and who must act on it. They are not a transcript: the value of minutes is that someone can read them three months later and know exactly what was agreed and what is still outstanding. Decisions that authorise spending often go straight into an {{invoice|freelance_invoice}} or a purchase file.',
    sections: [
      {
        h: 'Start with attendance and apologies',
        items: [
          'Date, time, venue, meeting name and chairperson.',
          'Present, absent with apologies, and any guests or invitees.',
          'Confirmation of the previous minutes as an agenda item in its own right.',
        ],
      },
      {
        h: 'Record decisions and actions, not discussion',
        items: [
          'Number each resolution with the date, for example 4/11/2026, and note who proposed and seconded.',
          'Give every action an owner and a due date - an action without an owner is a wish.',
          'Summarise debate in one or two lines only where it explains why a decision was taken.',
        ],
      },
      {
        h: 'Circulation and approval',
        items: [
          'Send a DRAFT within two or three working days while memories are fresh.',
          'Take corrections at the next meeting and mark the minutes confirmed.',
          'Chairperson and secretary sign the final copy; store it where the team can find it. A {{handover report|handover_report}} is far easier to write when it can point at that folder.',
        ],
      },
    ],
    sample: 'Resolution 4/11/2026: the committee approved the KSh 120,000 budget for the December outreach (proposed by J. Otieno, seconded by M. Wanjiku). Action: Finance to release funds by 20 November; P. Kamau to confirm the venue by 15 November.',
    faqs: [
      {
        q: 'Should minutes record everything that was said?',
        a: 'No. Record decisions, reasons and actions. A verbatim record discourages candour and buries the resolution that people actually need to find.',
      },
      {
        q: 'How soon should minutes be circulated?',
        a: 'Within two or three working days, marked DRAFT. Late minutes get argued over from memory instead of from the record.',
      },
      {
        q: 'Who signs the minutes?',
        a: 'The secretary signs as author; the chairperson signs to confirm adoption at the following meeting. Both signatures are what make the document authoritative.',
      },
    ],
  },

  business_card: {
    intro: 'A printable business card presents your name, role and contact details in a format small enough to hand over and durable enough to be kept. It is still the fastest way to leave something behind after a meeting in Kenya, where a follow-up call often starts with "the card you gave me". The same contact details belong on the {{invoice|freelance_invoice}} you send afterwards.',
    sections: [
      {
        h: 'The six things every card needs',
        items: [
          'Name, role, organisation and a short line saying what you do.',
          'A phone number in full international format: +254 712 345 678.',
          'An email you actually monitor, plus a website or social handle if you have one.',
        ],
      },
      {
        h: 'What to leave off',
        items: [
          'Your full physical address - the town or building is enough.',
          'Personal social accounts that are not work-appropriate.',
          'More than two fonts, or any font smaller than 8pt.',
        ],
      },
      {
        h: 'Print and digital versions',
        items: [
          'Standard Kenyan print size is 85 × 55 mm with a 3 mm bleed.',
          'Keep a PDF at 300 dpi so a printer can reproduce it without artefacts.',
          'Export a square image or PDF for WhatsApp and email, since many first contacts now happen there.',
        ],
      },
    ],
    sample: 'Jane Wanjiru | Credit Analyst | Equity Bank, Nakuru Branch | +254 712 345 678 | jane.wanjiru@example.co.ke',
    faqs: [
      {
        q: 'What size should I print a business card?',
        a: '85 × 55 mm is the common Kenyan print standard. Set 3 mm bleed and keep text 4 mm from the trim edge, or the guillotine will clip your phone number.',
      },
      {
        q: 'Is a QR code worth adding?',
        a: 'Yes if it points somewhere useful - a WhatsApp chat link, your portfolio or a booking page. Test it on three phones before printing, and make sure it works without a special app. A code pointing at your {{CV|cv}} PDF works well for recruiters.',
      },
      {
        q: 'Can I print cards at home?',
        a: 'For a handful, yes, on 250-300 gsm card and cut with a trimmer. For anything you hand to clients, a print shop\'s colour and cutting are noticeably better.',
      },
    ],
  },
};

module.exports = { DOC_GUIDES };
