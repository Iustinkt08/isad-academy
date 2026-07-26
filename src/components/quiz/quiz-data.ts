/**
 * Quiz „Ce curs mi se potrivește?" — DATELE (întrebările owner-ului, 1:1) +
 * tipurile de rezultat + logica de recomandare. v3.
 *
 * Întrebările sunt textele FINALE de la owner — nu le reformula.
 * v3: alternativele au fost SCOASE (nu mai există în design — nici pe desktop,
 * nici pe mobil); rezultatul = recomandarea principală + banda de echipe.
 * Logica din `recommend()` e o PRIMĂ PROPUNERE, transparentă și ușor de
 * ajustat — ownerul decide regulile finale (vezi comentariile).
 */

export type QuizQuestion = {
  id: number;
  question: string;
  options: string[];
};

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 1,
    question: 'Care este principalul tău obiectiv?',
    options: [
      'Să înțeleg mai bine un standard sau un domeniu nou',
      'Să dezvolt competențe aplicabile în activitatea mea',
      'Să mă pregătesc pentru un rol nou sau pentru mai multă responsabilitate',
      'Să îmi actualizez cunoștințele în raport cu noile tehnologii și politici',
      'Să pregătesc organizația pentru implementare, audit sau certificare',
      'Să explorez, fără să am încă un obiectiv foarte clar',
    ],
  },
  {
    id: 2,
    question: 'Ce domeniu te interesează cel mai mult?',
    options: [
      'Standarde ISO și sisteme de management',
      'Calitate și îmbunătățire continuă',
      'Sustenabilitate și responsabilitate organizațională',
      'Managementul riscurilor și conformitate',
      'Securitatea informației și protecția datelor',
      'Inteligență artificială și transformare digitală',
      'Leadership, strategie și guvernanță',
      'Audit și evaluarea conformității',
    ],
  },
  {
    id: 3,
    question: 'Care este nivelul tău actual de experiență?',
    options: [
      'Sunt la început și am nevoie de o introducere clară',
      'Cunosc conceptele de bază',
      'Am experiență practică și vreau să îmi aprofundez competențele',
      'Lucrez deja într-un rol specializat',
      'Coordonez echipe, procese sau sisteme de management',
      'Nu sunt sigur ce nivel mi se potrivește',
    ],
  },
  {
    id: 4,
    question: 'În ce context vei utiliza cunoștințele dobândite?',
    options: [
      'În activitatea mea profesională de zi cu zi',
      'Pentru dezvoltare personală și profesională',
      'Pentru implementarea unui standard în organizație',
      'Pentru pregătirea unui audit',
      'Pentru consultanță sau instruirea altor persoane',
      'Pentru o schimbare de carieră',
      'Pentru luarea unor decizii strategice',
    ],
  },
  {
    id: 5,
    question: 'Care este rolul tău actual?',
    options: [
      'Student sau aflat la început de carieră',
      'Specialist sau expert tehnic',
      'Manager de echipă sau de departament',
      'Responsabil de calitate, conformitate, risc sau sustenabilitate',
      'Auditor sau consultant',
      'Antreprenor sau lider de organizație',
      'Alt rol profesional',
    ],
  },
  {
    id: 6,
    question: 'Ce tip de rezultat urmărești?',
    options: [
      'O imagine de ansamblu asupra subiectului',
      'Cunoștințe practice pe care să le pot aplica imediat',
      'Un plan clar de implementare',
      'Pregătire pentru audit sau evaluare',
      'Dezvoltarea unei competențe specializate',
      'O certificare sau un certificat de finalizare',
      'O bază solidă pentru cursuri mai avansate',
    ],
  },
  {
    id: 7,
    question: 'Cât timp dorești să aloci învățării?',
    options: [
      'Mai puțin de două ore',
      'Câteva ore, într-o singură zi',
      'Câteva zile',
      'Câteva săptămâni, în propriul ritm',
      'Un program aprofundat, fără o limită strictă de timp',
    ],
  },
  {
    id: 8,
    question: 'Ce format de învățare preferi?',
    options: [
      'Lecții scurte și concentrate',
      'Un curs structurat, pas cu pas',
      'Exemple practice și studii de caz',
      'Exerciții și evaluări',
      'Sesiuni live și interacțiune cu un trainer',
      'O combinație între studiu individual și sesiuni ghidate',
    ],
  },
  {
    id: 9,
    question: 'Cât de repede ai nevoie să aplici ceea ce înveți?',
    options: [
      'Imediat',
      'În următoarele săptămâni',
      'În următoarele luni',
      'Mă pregătesc pentru un proiect viitor',
      'Explorez deocamdată opțiunile disponibile',
    ],
  },
  {
    id: 10,
    question: 'Care este cea mai mare provocare pentru tine în acest moment?',
    options: [
      'Nu știu de unde să încep',
      'Informația este prea complexă sau fragmentată',
      'Am nevoie de o înțelegere mai practică',
      'Trebuie să mă aliniez la cerințe sau standarde noi',
      'Pregătesc o implementare sau un audit',
      'Am nevoie să dezvolt competențele unei echipe',
      'Vreau să anticipez schimbările din domeniul meu',
    ],
  },
  {
    id: 11,
    question: 'Cauți un curs pentru tine sau pentru o organizație?',
    options: [
      'Pentru mine',
      'Pentru o echipă',
      'Pentru un departament',
      'Pentru întreaga organizație',
      'Pentru clienții sau partenerii mei',
    ],
  },
  {
    id: 12,
    question: 'Ce nivel de profunzime preferi?',
    options: [
      'Introducere esențială',
      'Nivel intermediar',
      'Nivel avansat',
      'Specializare profesională',
      'Nu știu încă — doresc o recomandare',
    ],
  },
];

/* Traducerea EN a întrebărilor (owner 2026-07-26: quiz bilingv; RO = textele finale
 * ale owner-ului, EN = traducere fidelă). ORDINEA opțiunilor e IDENTICĂ cu RO —
 * `recommend()` mapează pe indexuri, deci logica nu depinde de limbă. */
export const QUIZ_QUESTIONS_EN: QuizQuestion[] = [
  {
    id: 1,
    question: 'What is your main goal?',
    options: [
      'To better understand a standard or a new field',
      'To develop skills I can apply in my work',
      'To prepare for a new role or for more responsibility',
      'To update my knowledge in line with new technologies and policies',
      'To prepare my organization for implementation, audit or certification',
      'To explore, without a very clear goal yet',
    ],
  },
  {
    id: 2,
    question: 'Which area interests you the most?',
    options: [
      'ISO standards and management systems',
      'Quality and continuous improvement',
      'Sustainability and organizational responsibility',
      'Risk management and compliance',
      'Information security and data protection',
      'Artificial intelligence and digital transformation',
      'Leadership, strategy and governance',
      'Audit and conformity assessment',
    ],
  },
  {
    id: 3,
    question: 'What is your current level of experience?',
    options: [
      'I am just starting out and need a clear introduction',
      'I know the basic concepts',
      'I have hands-on experience and want to deepen my skills',
      'I already work in a specialized role',
      'I coordinate teams, processes or management systems',
      'I am not sure which level fits me',
    ],
  },
  {
    id: 4,
    question: 'In what context will you use what you learn?',
    options: [
      'In my day-to-day professional work',
      'For personal and professional development',
      'To implement a standard in my organization',
      'To prepare for an audit',
      'For consulting or training other people',
      'For a career change',
      'To make strategic decisions',
    ],
  },
  {
    id: 5,
    question: 'What is your current role?',
    options: [
      'Student or early in my career',
      'Specialist or technical expert',
      'Team or department manager',
      'Responsible for quality, compliance, risk or sustainability',
      'Auditor or consultant',
      'Entrepreneur or organization leader',
      'Another professional role',
    ],
  },
  {
    id: 6,
    question: 'What kind of outcome are you after?',
    options: [
      'A big-picture overview of the subject',
      'Practical knowledge I can apply right away',
      'A clear implementation plan',
      'Preparation for an audit or assessment',
      'Developing a specialized skill',
      'A certification or a certificate of completion',
      'A solid foundation for more advanced courses',
    ],
  },
  {
    id: 7,
    question: 'How much time do you want to dedicate to learning?',
    options: [
      'Less than two hours',
      'A few hours, in a single day',
      'A few days',
      'A few weeks, at my own pace',
      'An in-depth programme, with no strict time limit',
    ],
  },
  {
    id: 8,
    question: 'What learning format do you prefer?',
    options: [
      'Short, focused lessons',
      'A structured, step-by-step course',
      'Practical examples and case studies',
      'Exercises and assessments',
      'Live sessions and interaction with a trainer',
      'A mix of self-study and guided sessions',
    ],
  },
  {
    id: 9,
    question: 'How soon do you need to apply what you learn?',
    options: [
      'Immediately',
      'In the coming weeks',
      'In the coming months',
      'I am preparing for a future project',
      'I am just exploring the options for now',
    ],
  },
  {
    id: 10,
    question: 'What is your biggest challenge right now?',
    options: [
      'I don’t know where to start',
      'The information is too complex or fragmented',
      'I need a more practical understanding',
      'I need to align with new requirements or standards',
      'I am preparing an implementation or an audit',
      'I need to develop a team’s skills',
      'I want to anticipate the changes in my field',
    ],
  },
  {
    id: 11,
    question: 'Are you looking for a course for yourself or for an organization?',
    options: [
      'For myself',
      'For a team',
      'For a department',
      'For the whole organization',
      'For my clients or partners',
    ],
  },
  {
    id: 12,
    question: 'What depth level do you prefer?',
    options: [
      'Essential introduction',
      'Intermediate level',
      'Advanced level',
      'Professional specialization',
      'I don’t know yet — I’d like a recommendation',
    ],
  },
];

export type QuizLocale = 'en' | 'ro';

export const getQuizQuestions = (locale: QuizLocale): QuizQuestion[] =>
  locale === 'ro' ? QUIZ_QUESTIONS : QUIZ_QUESTIONS_EN;

/** Toate stringurile UI ale quiz-ului, per limbă (owner 2026-07-26: quiz bilingv). */
export const QUIZ_UI = {
  en: {
    pill: 'Course quiz',
    titlePlain: 'Which course is right ',
    titleGradient: 'for me',
    titlePunctuation: '?',
    sub: '12 short questions — we recommend the right course or learning path in under two minutes.',
    progress: (n: number, total: number) => `Question ${n} of ${total}`,
    back: '← Back',
    next: 'Continue →',
    seeResult: 'See your result →',
    loaderTitle: 'Analyzing your answers…',
    loaderSub: 'Preparing the right recommendation for you.',
    resultPill: 'Your result',
    resultTitlePlain: 'The right course ',
    resultTitleGradient: 'for you',
    resultTitlePunctuation: '.',
    resultSub: 'Based on your answers, we recommend:',
    mainBadge: 'Main recommendation',
    retake: 'Retake the quiz',
    corporateBand:
      'Looking for a course for a team or for your whole organization? We’ll build a custom solution.',
    corporateBandCta: 'Corporate training →',
  },
  ro: {
    pill: 'Quiz de curs',
    titlePlain: 'Ce curs mi se ',
    titleGradient: 'potrivește',
    titlePunctuation: '?',
    sub: '12 întrebări scurte — îți recomandăm cursul sau parcursul potrivit, în mai puțin de două minute.',
    progress: (n: number, total: number) => `Întrebarea ${n} din ${total}`,
    back: '← Înapoi',
    next: 'Continuă →',
    seeResult: 'Vezi rezultatul →',
    loaderTitle: 'Îți analizăm răspunsurile…',
    loaderSub: 'Pregătim recomandarea potrivită pentru tine.',
    resultPill: 'Rezultatul tău',
    resultTitlePlain: 'Cursul potrivit ',
    resultTitleGradient: 'pentru tine',
    resultTitlePunctuation: '.',
    resultSub: 'Pe baza răspunsurilor tale, îți recomandăm:',
    mainBadge: 'Recomandarea principală',
    retake: 'Reia quiz-ul',
    corporateBand:
      'Cauți un curs pentru o echipă sau pentru întreaga organizație? Îți construim o soluție personalizată.',
    corporateBandCta: 'Corporate training →',
  },
} as const;

/* ————————————————————————————————————————————————————————————————————————————
 * MOTORUL DE RECOMANDARE v2 (owner 2026-07-26) — CMS-driven:
 * taguri pe curs (`courses.quizProfile`, alese de Silviu în dashboard) +
 * gate-uri dure + scoring ponderat + tie-break pe ediția cea mai apropiată.
 * Adăugarea unui curs NOU nu cere nicio modificare de cod — doar tagurile lui.
 * ——————————————————————————————————————————————————————————————————————————— */

/** Oglindesc opțiunile din `courses.quizProfile` (Payload). */
export type QuizLevel = 'introductory' | 'intermediate' | 'advanced' | 'specialization';
export type QuizOutcome =
  | 'overview'
  | 'practicalSkills'
  | 'implementationPlan'
  | 'auditPrep'
  | 'certification'
  | 'foundationForMore';
export type QuizDomain =
  | 'isoManagement'
  | 'quality'
  | 'sustainability'
  | 'riskCompliance'
  | 'infosec'
  | 'ai'
  | 'leadership'
  | 'audit';

/** Un curs publicat + tagurile lui, construit server-side în /quiz/page.tsx. */
export type QuizCourseProfile = {
  id: number;
  title: string;
  slug: string;
  level: QuizLevel;
  outcomes: QuizOutcome[];
  domains: QuizDomain[];
  /** `quizPitch` din CMS (RO) — motivarea afișată; null → text generic per nivel. */
  pitch: string | null;
  /** Prima ediție viitoare cu locuri libere (ISO) sau null — tie-break + urgență. */
  nextStartDate: string | null;
};

export type QuizRecommendation =
  | { kind: 'corporate' }
  | { kind: 'course'; course: QuizCourseProfile }
  | { kind: 'path'; first: QuizCourseProfile; second: QuizCourseProfile }
  | { kind: 'fallback' };

/* ————— Ponderi + prag — decizii de business, se ajustează AICI (testate unit) ————— */
export const WEIGHT_DOMAIN = 3; // potrivirea de domeniu (Q2) cântărește cel mai mult
export const WEIGHT_LEVEL_EXACT = 2;
export const WEIGHT_LEVEL_ADJACENT = 1; // nivel vecin (ex. cere avansat, cursul e intermediar)
export const WEIGHT_OUTCOME = 1; // per outcome care se potrivește
export const WEIGHT_URGENCY = 1; // bonus pt. cursul cu ediție viitoare când Q9 = „Imediat"
/** Sub acest scor nu recomandăm forțat — fallback la catalog (evită potriviri absurde). */
export const MIN_SCORE = 3;

const LEVEL_ORDER: QuizLevel[] = ['introductory', 'intermediate', 'advanced', 'specialization'];

/* ————— Maparea răspuns → voturi (indexul opțiunii, 0-based, per întrebare) —————
 * Q2 e oglinda 1:1 a tagurilor de domeniu; Q3/Q12 dau nivelul dorit (Q12 explicit
 * bate Q3 dedus); Q1/Q4/Q5/Q6/Q10 votează outcomes. Q7/Q8 rămân de profilare
 * (formatul e oricum live), Q9 dă doar bonusul de urgență. */
const DOMAIN_BY_Q2: QuizDomain[] = [
  'isoManagement',
  'quality',
  'sustainability',
  'riskCompliance',
  'infosec',
  'ai',
  'leadership',
  'audit',
];
const LEVEL_BY_Q3: (QuizLevel | null)[] = [
  'introductory', // Sunt la început…
  'introductory', // Cunosc conceptele de bază
  'intermediate', // Am experiență practică…
  'advanced', // Lucrez deja într-un rol specializat
  'advanced', // Coordonez echipe/procese/sisteme
  null, // Nu sunt sigur
];
const LEVEL_BY_Q12: (QuizLevel | null)[] = [
  'introductory',
  'intermediate',
  'advanced',
  'specialization',
  null, // Nu știu încă
];
const OUTCOMES_BY_Q1: QuizOutcome[][] = [
  ['overview'],
  ['practicalSkills'],
  ['certification', 'practicalSkills'], // rol nou / responsabilitate
  ['overview'],
  ['implementationPlan'], // pregătesc organizația pt. implementare/audit/certificare
  ['overview'],
];
const OUTCOMES_BY_Q4: QuizOutcome[][] = [
  ['practicalSkills'],
  ['overview'],
  ['implementationPlan'],
  ['auditPrep'],
  ['practicalSkills'], // consultanță / instruirea altora
  ['certification'], // schimbare de carieră
  ['overview'], // decizii strategice
];
const OUTCOMES_BY_Q5: QuizOutcome[][] = [
  [],
  [],
  [],
  [],
  ['auditPrep'], // Auditor sau consultant
  [],
  [],
];
const OUTCOMES_BY_Q6: QuizOutcome[][] = [
  ['overview'],
  ['practicalSkills'],
  ['implementationPlan'],
  ['auditPrep'],
  ['practicalSkills'], // competență specializată
  ['certification'],
  ['foundationForMore'],
];
const OUTCOMES_BY_Q10: QuizOutcome[][] = [
  ['overview'],
  ['overview'],
  ['practicalSkills'],
  ['implementationPlan'], // aliniere la cerințe/standarde noi
  ['implementationPlan', 'auditPrep'], // pregătesc o implementare sau un audit
  [], // competențele unei echipe — acoperit de gate-ul corporate (Q11)
  ['overview'],
];

/** Profilul agregat al utilizatorului, extras din răspunsuri (pur, testabil). */
export type QuizVotes = {
  domains: Set<QuizDomain>;
  desiredLevel: QuizLevel | null;
  outcomes: Set<QuizOutcome>;
  beginner: boolean;
  urgent: boolean;
};

export function extractVotes(answers: (number | null)[]): QuizVotes {
  const a = (q: number) => answers[q - 1] ?? null; // 1-based helper

  const domains = new Set<QuizDomain>();
  const q2 = a(2);
  if (q2 !== null && DOMAIN_BY_Q2[q2]) domains.add(DOMAIN_BY_Q2[q2]!);

  const q12Level = a(12) !== null ? (LEVEL_BY_Q12[a(12)!] ?? null) : null;
  const q3Level = a(3) !== null ? (LEVEL_BY_Q3[a(3)!] ?? null) : null;

  const outcomes = new Set<QuizOutcome>();
  const vote = (table: QuizOutcome[][], q: number) => {
    const i = a(q);
    if (i !== null) for (const o of table[i] ?? []) outcomes.add(o);
  };
  vote(OUTCOMES_BY_Q1, 1);
  vote(OUTCOMES_BY_Q4, 4);
  vote(OUTCOMES_BY_Q5, 5);
  vote(OUTCOMES_BY_Q6, 6);
  vote(OUTCOMES_BY_Q10, 10);

  return {
    domains,
    desiredLevel: q12Level ?? q3Level,
    outcomes,
    beginner: a(3) === 0 || a(3) === 1 || a(3) === 5,
    urgent: a(9) === 0,
  };
}

/** Scorul unui curs față de profilul utilizatorului — pur, testabil. */
export function scoreCourse(votes: QuizVotes, course: QuizCourseProfile): number {
  let score = 0;

  if ([...votes.domains].some((d) => course.domains.includes(d))) score += WEIGHT_DOMAIN;

  if (votes.desiredLevel) {
    const want = LEVEL_ORDER.indexOf(votes.desiredLevel);
    const have = LEVEL_ORDER.indexOf(course.level);
    if (want === have) score += WEIGHT_LEVEL_EXACT;
    else if (Math.abs(want - have) === 1) score += WEIGHT_LEVEL_ADJACENT;
  }

  for (const o of course.outcomes) if (votes.outcomes.has(o)) score += WEIGHT_OUTCOME;

  if (votes.urgent && course.nextStartDate) score += WEIGHT_URGENCY;

  return score;
}

/** Tie-break: scor desc → are ediție viitoare → ediția cea mai apropiată → titlu. */
const compareCourses = (
  a: { course: QuizCourseProfile; score: number },
  b: { course: QuizCourseProfile; score: number },
): number => {
  if (b.score !== a.score) return b.score - a.score;
  const aHas = a.course.nextStartDate != null;
  const bHas = b.course.nextStartDate != null;
  if (aHas !== bHas) return aHas ? -1 : 1;
  if (aHas && bHas && a.course.nextStartDate !== b.course.nextStartDate)
    return a.course.nextStartDate! < b.course.nextStartDate! ? -1 : 1;
  return a.course.title.localeCompare(b.course.title);
};

const sharesDomain = (a: QuizCourseProfile, b: QuizCourseProfile): boolean =>
  a.domains.some((d) => b.domains.includes(d));

/**
 * Recomandarea finală. Ordinea gate-urilor = precedența:
 *  1. Q11 ≠ „Pentru mine" → corporate (nicio recomandare individuală nu are sens).
 *  2. Niciun curs eligibil (publicat + tagat) → fallback (catalog).
 *  3. Scoring ponderat pe fiecare curs; sub MIN_SCORE → fallback.
 *  4. PARCURS derivat automat: începător care vrea mai mult decât o introducere
 *     (implementare/audit/nivel avansat/„bază pentru avansat") și există un curs
 *     introductiv din același domeniu → intro → câștigător. Simetric, câștigător
 *     introductiv + „bază pentru avansat" → intro → următorul nivel.
 *  5. Altfel → cursul cu scorul maxim (tie-break pe ediția cea mai apropiată).
 */
export function recommend(
  answers: (number | null)[],
  courses: QuizCourseProfile[],
): QuizRecommendation {
  const a = (q: number) => answers[q - 1] ?? null;

  if (a(11) !== null && a(11) !== 0) return { kind: 'corporate' };
  if (courses.length === 0) return { kind: 'fallback' };

  const votes = extractVotes(answers);
  const ranked = courses
    .map((course) => ({ course, score: scoreCourse(votes, course) }))
    .sort(compareCourses);

  const winner = ranked[0]!;
  if (winner.score < MIN_SCORE) return { kind: 'fallback' };

  const wantsBeyondIntro =
    votes.outcomes.has('implementationPlan') ||
    votes.outcomes.has('auditPrep') ||
    votes.outcomes.has('foundationForMore') ||
    votes.desiredLevel === 'advanced' ||
    votes.desiredLevel === 'specialization';

  if (votes.beginner && wantsBeyondIntro && winner.course.level !== 'introductory') {
    const intro = ranked.find(
      (r) => r.course.level === 'introductory' && sharesDomain(r.course, winner.course),
    );
    if (intro) return { kind: 'path', first: intro.course, second: winner.course };
  }
  // Simetric: câștigătorul e introductiv (nivelul dorit era „început de drum"), dar
  // răspunsurile cer mai mult (implementare/audit/„bază pentru avansat") → parcurs
  // intro → următorul curs (cel mai bine clasat, non-introductiv, același domeniu).
  if (winner.course.level === 'introductory' && wantsBeyondIntro) {
    const next = ranked.find(
      (r) => r.course.level !== 'introductory' && sharesDomain(r.course, winner.course),
    );
    if (next) return { kind: 'path', first: winner.course, second: next.course };
  }

  return { kind: 'course', course: winner.course };
}

/* ————— Vederea de afișare a rezultatului (QuizResult rămâne „mut" vizual) ————— */

export type QuizResultView = {
  courseTitle: string;
  courseSub: string;
  reason: string;
  href: string;
  ctaLabel: string;
};

const LEVEL_LABEL: Record<QuizLocale, Record<QuizLevel, string>> = {
  en: {
    introductory: 'Introductory level',
    intermediate: 'Intermediate level',
    advanced: 'Advanced level',
    specialization: 'Professional specialization',
  },
  ro: {
    introductory: 'Nivel introductiv',
    intermediate: 'Nivel intermediar',
    advanced: 'Nivel avansat',
    specialization: 'Specializare profesională',
  },
};

const GENERIC_REASON: Record<QuizLocale, Record<QuizLevel, string>> = {
  en: {
    introductory:
      'An introductory course, right for the start of the journey: it gives you the big picture and the foundation for the next steps.',
    intermediate:
      'A practical, intermediate-level course: you consolidate what you know and gain directly applicable skills.',
    advanced:
      'An advanced programme: you go deep into implementation and management on real scenarios, end to end.',
    specialization:
      'A professional specialization programme: expert-level skills, recognized and directly applicable in your role.',
  },
  ro: {
    introductory:
      'Un curs introductiv, potrivit pentru început de drum: îți oferă imaginea de ansamblu și baza pentru pașii următori.',
    intermediate:
      'Un curs practic, de nivel intermediar: consolidezi ce știi și capeți competențe direct aplicabile.',
    advanced:
      'Un program avansat: aprofundezi implementarea și gestionarea în scenarii reale, cap-coadă.',
    specialization:
      'Un program de specializare profesională: competențe de expert, recunoscute și direct aplicabile în rol.',
  },
};

const RESULT_STATIC: Record<
  QuizLocale,
  {
    corporate: QuizResultView;
    fallback: QuizResultView;
    pathSub: string;
    pathTitle: (a: string, b: string) => string;
    pathReason: (a: string, b: string) => string;
    pathCta: string;
    courseCta: string;
  }
> = {
  en: {
    corporate: {
      courseTitle: 'A custom solution for teams and organizations',
      courseSub: 'Corporate training · ISAD Academy',
      reason:
        'You’re looking for training for several people: we build a programme tailored to your organization’s goals, level and calendar — from executive sessions to technical programmes.',
      href: '/corporate',
      ctaLabel: 'Corporate training →',
    },
    fallback: {
      courseTitle: 'Explore the course catalog',
      courseSub: 'ISAD Academy',
      reason:
        'Your answers don’t map clearly enough onto a single course in the current catalog. Have a look at all the courses — or write to us and we’ll guide you.',
      href: '/cursuri',
      ctaLabel: 'See the courses →',
    },
    pathSub: 'Two courses, in order',
    pathTitle: (a, b) => `Learning path: ${a} → ${b}`,
    pathReason: (a, b) =>
      `You start with the big picture (${a}), then move to the next level (${b}) — same domain, in the order that fits you.`,
    pathCta: 'Start with the first course →',
    courseCta: 'See the course →',
  },
  ro: {
    corporate: {
      courseTitle: 'Soluție personalizată pentru echipe și organizații',
      courseSub: 'Corporate training · ISAD Academy',
      reason:
        'Cauți formare pentru mai mulți oameni: construim un program adaptat obiectivelor, nivelului și calendarului organizației tale — de la sesiuni executive la programe tehnice.',
      href: '/corporate',
      ctaLabel: 'Corporate training →',
    },
    fallback: {
      courseTitle: 'Explorează catalogul de cursuri',
      courseSub: 'ISAD Academy',
      reason:
        'Răspunsurile tale nu se potrivesc suficient de clar cu un singur curs din catalogul actual. Aruncă o privire peste toate cursurile — sau scrie-ne și te ghidăm noi.',
      href: '/cursuri',
      ctaLabel: 'Vezi cursurile →',
    },
    pathSub: 'Două cursuri, în ordine',
    pathTitle: (a, b) => `Parcurs de învățare: ${a} → ${b}`,
    pathReason: (a, b) =>
      `Începi cu imaginea de ansamblu (${a}), apoi treci la nivelul următor (${b}) — același domeniu, în ordinea potrivită pentru tine.`,
    pathCta: 'Începe cu primul curs →',
    courseCta: 'Vezi cursul →',
  },
};

export function resultView(rec: QuizRecommendation, locale: QuizLocale = 'ro'): QuizResultView {
  const s = RESULT_STATIC[locale];
  switch (rec.kind) {
    case 'corporate':
      return s.corporate;
    case 'fallback':
      return s.fallback;
    case 'path':
      return {
        courseTitle: s.pathTitle(rec.first.title, rec.second.title),
        courseSub: s.pathSub,
        reason: s.pathReason(rec.first.title, rec.second.title),
        href: `/cursuri/${rec.first.slug}`,
        ctaLabel: s.pathCta,
      };
    case 'course':
      return {
        courseTitle: rec.course.title,
        courseSub: LEVEL_LABEL[locale][rec.course.level],
        reason: rec.course.pitch ?? GENERIC_REASON[locale][rec.course.level],
        href: `/cursuri/${rec.course.slug}`,
        ctaLabel: s.courseCta,
      };
  }
}
