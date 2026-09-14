// Translates the STRUCTURAL parts of a document (greetings, sign-offs, CV
// section headers) into the person's chosen language. The content they
// type themselves is never auto-translated - that would need a paid
// translation API. This covers English plus the 10 most-spoken languages
// worldwide, plus Swahili.

const LANGUAGES = {
  en: 'English',
  zh: '中文 (Chinese)',
  hi: 'हिन्दी (Hindi)',
  es: 'Español (Spanish)',
  fr: 'Français (French)',
  ar: 'العربية (Arabic)',
  bn: 'বাংলা (Bengali)',
  pt: 'Português (Portuguese)',
  ru: 'Русский (Russian)',
  ur: 'اردو (Urdu)',
  sw: 'Kiswahili (Swahili)',
};

// [greeting fallback, sincerely closing, regards closing]
const LETTER_PHRASES = {
  en: { dear: 'Dear', toWhomItMayConcern: 'To Whom It May Concern,', sincerely: 'Yours sincerely,', regards: 'Regards,', faithfully: 'Yours faithfully,' },
  zh: { dear: '尊敬的', toWhomItMayConcern: '敬启者，', sincerely: '此致\n敬礼，', regards: '顺祝商祺，', faithfully: '谨启，' },
  hi: { dear: 'प्रिय', toWhomItMayConcern: 'जिससे यह संबंधित हो,', sincerely: 'सादर,', regards: 'सधन्यवाद,', faithfully: 'भवदीय,' },
  es: { dear: 'Estimado/a', toWhomItMayConcern: 'A quien corresponda,', sincerely: 'Atentamente,', regards: 'Saludos,', faithfully: 'Cordialmente,' },
  fr: { dear: 'Cher/Chère', toWhomItMayConcern: "À qui de droit,", sincerely: 'Cordialement,', regards: 'Bien à vous,', faithfully: 'Veuillez agréer mes salutations distinguées,' },
  ar: { dear: 'عزيزي', toWhomItMayConcern: 'إلى من يهمه الأمر،', sincerely: 'مع خالص التقدير،', regards: 'مع أطيب التحيات،', faithfully: 'وتفضلوا بقبول فائق الاحترام،' },
  bn: { dear: 'প্রিয়', toWhomItMayConcern: 'যার কাছে এটি প্রযোজ্য,', sincerely: 'বিনীত নিবেদক,', regards: 'শুভেচ্ছান্তে,', faithfully: 'বিশ্বস্তভাবে,' },
  pt: { dear: 'Prezado(a)', toWhomItMayConcern: 'A quem possa interessar,', sincerely: 'Atenciosamente,', regards: 'Cumprimentos,', faithfully: 'Com os melhores cumprimentos,' },
  ru: { dear: 'Уважаемый(ая)', toWhomItMayConcern: 'Для предъявления по месту требования,', sincerely: 'С уважением,', regards: 'С наилучшими пожеланиями,', faithfully: 'Искренне Ваш,' },
  ur: { dear: 'محترم', toWhomItMayConcern: 'جس سے بھی یہ متعلق ہو،', sincerely: 'مخلص،', regards: 'نیک تمناؤں کے ساتھ،', faithfully: 'مخلص،' },
  sw: { dear: 'Mpendwa', toWhomItMayConcern: 'Kwa yeyote anayehusika,', sincerely: 'Wako mwaminifu,', regards: 'Kwa heshima,', faithfully: 'Wako mwaminifu,' },
};

const CV_HEADERS = {
  en: { summary: 'Professional Summary', experience: 'Work Experience', education: 'Education', skills: 'Skills', achievements: 'Achievements', referees: 'Referees' },
  zh: { summary: '个人简介', experience: '工作经历', education: '教育背景', skills: '技能', achievements: '成就', referees: '推荐人' },
  hi: { summary: 'व्यावसायिक सारांश', experience: 'कार्य अनुभव', education: 'शिक्षा', skills: 'कौशल', achievements: 'उपलब्धियाँ', referees: 'संदर्भ' },
  es: { summary: 'Resumen Profesional', experience: 'Experiencia Laboral', education: 'Educación', skills: 'Habilidades', achievements: 'Logros', referees: 'Referencias' },
  fr: { summary: 'Résumé Professionnel', experience: 'Expérience Professionnelle', education: 'Formation', skills: 'Compétences', achievements: 'Réalisations', referees: 'Références' },
  ar: { summary: 'الملخص المهني', experience: 'الخبرة العملية', education: 'التعليم', skills: 'المهارات', achievements: 'الإنجازات', referees: 'المراجع' },
  bn: { summary: 'পেশাদার সারাংশ', experience: 'কর্ম অভিজ্ঞতা', education: 'শিক্ষা', skills: 'দক্ষতা', achievements: 'অর্জনসমূহ', referees: 'রেফারি' },
  pt: { summary: 'Resumo Profissional', experience: 'Experiência Profissional', education: 'Formação Acadêmica', skills: 'Habilidades', achievements: 'Conquistas', referees: 'Referências' },
  ru: { summary: 'Профессиональное резюме', experience: 'Опыт работы', education: 'Образование', skills: 'Навыки', achievements: 'Достижения', referees: 'Рекомендации' },
  ur: { summary: 'پیشہ ورانہ خلاصہ', experience: 'کام کا تجربہ', education: 'تعلیم', skills: 'مہارتیں', achievements: 'کامیابیاں', referees: 'حوالہ جات' },
  sw: { summary: 'Muhtasari wa Kitaaluma', experience: 'Uzoefu wa Kazi', education: 'Elimu', skills: 'Ujuzi', achievements: 'Mafanikio', referees: 'Wadhamini' },
};

function letterPhrases(lang) {
  return LETTER_PHRASES[lang] || LETTER_PHRASES.en;
}
function cvHeaders(lang) {
  return CV_HEADERS[lang] || CV_HEADERS.en;
}

module.exports = { LANGUAGES, letterPhrases, cvHeaders };
