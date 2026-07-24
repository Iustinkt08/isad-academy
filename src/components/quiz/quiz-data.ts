/**
 * Quiz „Ce curs mi se potrivește?" — DATELE (întrebările owner-ului, 1:1) +
 * tipurile de rezultat + logica de recomandare.
 *
 * Întrebările sunt textele FINALE de la owner — nu le reformula.
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

/** Cele 5 tipuri de rezultat din documentul owner-ului */
export type QuizResultType = 'intro' | 'implementation' | 'advanced' | 'path' | 'corporate';

export type QuizAlternative = { title: string; sub: string; href: string };

export type QuizRecommendation = {
  courseTitle: string;
  courseSub: string;
  reason: string;
  href: string;
  alternatives: QuizAlternative[];
};

export const QUIZ_RESULTS: Record<QuizResultType, QuizRecommendation> = {
  intro: {
    courseTitle: 'Artificial Intelligence Management System',
    courseSub: 'PECB ISO/IEC 42001 · Foundation',
    reason:
      'Un curs introductiv, potrivit pentru început de drum: îți oferă imaginea de ansamblu asupra standardului și baza pentru certificările următoare.',
    href: '/cursuri/iso-iec-42001-foundation',
    alternatives: [
      {
        title: 'AI Governance & Responsible AI',
        sub: 'Pentru competențe practice, aplicabile imediat',
        href: '/cursuri/ai-governance-responsible-ai',
      },
      {
        title: 'Parcurs de învățare: Foundation → Lead Implementer',
        sub: 'Pentru un plan de implementare complet',
        href: '/cursuri',
      },
    ],
  },
  implementation: {
    courseTitle: 'Lead Implementer',
    courseSub: 'PECB ISO/IEC 42001',
    reason:
      'Un curs practic de implementare: înveți să planifici, să implementezi și să gestionezi un sistem de management AI conform ISO/IEC 42001, cap-coadă.',
    href: '/cursuri/iso-iec-42001-lead-implementer',
    alternatives: [
      {
        title: 'Parcurs de învățare: Foundation → Lead Implementer',
        sub: 'Dacă vrei să consolidezi mai întâi baza',
        href: '/cursuri',
      },
      {
        title: 'AI Governance & Responsible AI',
        sub: 'Pentru competențe practice, aplicabile imediat',
        href: '/cursuri/ai-governance-responsible-ai',
      },
    ],
  },
  advanced: {
    courseTitle: 'Lead Auditor',
    courseSub: 'PECB ISO/IEC 42001',
    reason:
      'Un program avansat, de specializare: înveți să auditezi un sistem de management AI conform ISO/IEC 42001 — planificare, desfășurare și raportare.',
    href: '/cursuri/iso-iec-42001-lead-auditor',
    alternatives: [
      {
        title: 'Lead Implementer',
        sub: 'Dacă rolul tău e mai aproape de implementare',
        href: '/cursuri/iso-iec-42001-lead-implementer',
      },
      {
        title: 'AI Governance & Responsible AI',
        sub: 'Pentru perspectiva de guvernanță și etică',
        href: '/cursuri/ai-governance-responsible-ai',
      },
    ],
  },
  path: {
    courseTitle: 'Parcurs de învățare: Foundation → Lead Implementer',
    courseSub: 'PECB ISO/IEC 42001 · două cursuri, în ordine',
    reason:
      'Un parcurs de învățare format din mai multe cursuri: începi cu imaginea de ansamblu (Foundation), apoi treci la implementarea practică (Lead Implementer).',
    href: '/cursuri',
    alternatives: [
      {
        title: 'Artificial Intelligence Management System · Foundation',
        sub: 'Dacă preferi să începi doar cu primul pas',
        href: '/cursuri/iso-iec-42001-foundation',
      },
      {
        title: 'AI Governance & Responsible AI',
        sub: 'Complementar, pentru guvernanță și etică AI',
        href: '/cursuri/ai-governance-responsible-ai',
      },
    ],
  },
  corporate: {
    courseTitle: 'Soluție personalizată pentru echipe și organizații',
    courseSub: 'Corporate training · ISAD Academy',
    reason:
      'Cauți formare pentru mai mulți oameni: construim un program adaptat obiectivelor, nivelului și calendarului organizației tale — de la sesiuni executive la programe tehnice.',
    href: '/corporate',
    alternatives: [
      {
        title: 'Artificial Intelligence Management System · Foundation',
        sub: 'Ca prim pas comun pentru toată echipa',
        href: '/cursuri/iso-iec-42001-foundation',
      },
      {
        title: 'Lead Implementer',
        sub: 'Pentru echipa care va conduce implementarea',
        href: '/cursuri/iso-iec-42001-lead-implementer',
      },
    ],
  },
};

/**
 * Prima propunere de logică (ordinea regulilor = precedența lor):
 *  1. Q11 ≠ „Pentru mine"                        → corporate
 *  2. Q6 „Pregătire pentru audit" / Q4 „audit" /
 *     Q5 „Auditor sau consultant"                → advanced (Lead Auditor)
 *  3. Q12 „avansat" / „specializare"             → advanced
 *  4. Q6 „plan de implementare" / Q4 „implementarea unui standard"
 *     / Q10 „implementare sau un audit"          → implementation
 *  5. începător (Q3 primele două / „nu sunt sigur") + Q6 „bază solidă
 *     pentru cursuri mai avansate" sau Q1 „pregătesc organizația"      → path
 *  6. începător (Q3)                             → intro
 *  7. altfel                                     → implementation
 * `answers[i]` = indexul opțiunii alese la întrebarea i+1 (0-based).
 */
export function recommend(answers: (number | null)[]): QuizResultType {
  const a = (q: number) => answers[q - 1]; // 1-based helper

  if (a(11) !== null && a(11) !== 0) return 'corporate';
  if (a(6) === 3 || a(4) === 3 || a(5) === 4) return 'advanced';
  if (a(12) === 2 || a(12) === 3) return 'advanced';
  if (a(6) === 2 || a(4) === 2 || a(10) === 4) return 'implementation';

  const beginner = a(3) === 0 || a(3) === 1 || a(3) === 5;
  if (beginner && (a(6) === 6 || a(1) === 4)) return 'path';
  if (beginner) return 'intro';
  return 'implementation';
}
