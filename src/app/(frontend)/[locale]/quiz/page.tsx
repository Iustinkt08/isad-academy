import type { Metadata } from 'next'

import CourseQuiz from '@/components/quiz/CourseQuiz'

/**
 * /quiz — wizard-ul „Ce curs mi se potrivește?" (owner Figma 3920-115 / 3920-153),
 * DESKTOP 1:1; varianta mobilă vine separat. Înlocuiește pagina coming-soon.
 * Conținutul quiz-ului e în română (textele finale ale owner-ului) pe ambele locale;
 * layout-ul global randează deja <main>.
 */
export const metadata: Metadata = {
  title: 'Ce curs mi se potrivește?',
  description:
    '12 întrebări scurte — îți recomandăm cursul sau parcursul potrivit, în mai puțin de două minute.',
}

export default function QuizPage() {
  return (
    <div className="bg-[#f8f9fa]">
      <CourseQuiz />
    </div>
  )
}
