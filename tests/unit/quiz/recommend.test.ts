import { describe, expect, it } from 'vitest'

import {
  extractVotes,
  MIN_SCORE,
  recommend,
  scoreCourse,
  WEIGHT_DOMAIN,
  WEIGHT_LEVEL_EXACT,
  WEIGHT_OUTCOME,
  type QuizCourseProfile,
} from '../../../src/components/quiz/quiz-data'

/**
 * Motorul de quiz v2 (owner 2026-07-26): gate-uri dure → scoring ponderat →
 * parcurs derivat → tie-break pe ediția cea mai apropiată. Testat pe profiluri
 * SINTETICE (independent de conținutul CMS) — exact ce garantează că logica
 * rămâne corectă când Silviu își adaugă cursurile reale.
 *
 * Convenție răspunsuri: `answers[i]` = indexul opțiunii la întrebarea i+1;
 * `answers({q: idx})` = restul întrebărilor rămân null (neutre).
 */

const course = (over: Partial<QuizCourseProfile>): QuizCourseProfile => ({
  id: 1,
  title: 'Curs test',
  slug: 'curs-test',
  level: 'introductory',
  outcomes: [],
  domains: ['ai'],
  pitch: null,
  nextStartDate: null,
  ...over,
})

const answers = (over: Record<number, number>): (number | null)[] => {
  const a: (number | null)[] = Array(12).fill(null)
  for (const [q, i] of Object.entries(over)) a[Number(q) - 1] = i
  return a
}

describe('quiz recommend — gate-uri dure', () => {
  it('Q11 ≠ „Pentru mine" → corporate, indiferent de restul răspunsurilor', () => {
    const rec = recommend(answers({ 11: 2, 2: 5, 12: 0 }), [course({})])
    expect(rec).toEqual({ kind: 'corporate' })
  })

  it('zero cursuri eligibile → fallback', () => {
    expect(recommend(answers({ 11: 0, 2: 5 }), [])).toEqual({ kind: 'fallback' })
  })

  it('scor sub prag (domeniu cerut inexistent în catalog) → fallback', () => {
    // Q2 = sustenabilitate; catalogul are doar cursuri de AI, fără alte potriviri.
    const rec = recommend(answers({ 11: 0, 2: 2 }), [
      course({ id: 1, domains: ['ai'], outcomes: [] }),
    ])
    expect(rec).toEqual({ kind: 'fallback' })
  })
})

describe('quiz recommend — scoring ponderat', () => {
  it('domeniul (×3) bate outcomes (×1): cursul din domeniul cerut câștigă', () => {
    // Q2 = AI; cursul B e din alt domeniu dar bifează 2 outcomes.
    const a = course({ id: 1, title: 'A', slug: 'a', domains: ['ai'], level: 'intermediate' })
    const b = course({
      id: 2,
      title: 'B',
      slug: 'b',
      domains: ['quality'],
      level: 'intermediate',
      outcomes: ['overview', 'practicalSkills'],
    })
    const rec = recommend(answers({ 11: 0, 2: 5, 1: 0, 12: 1 }), [a, b])
    expect(rec).toEqual({ kind: 'course', course: a })
  })

  it('nivelul exact primește +2, nivelul vecin +1', () => {
    const votes = extractVotes(answers({ 12: 2 })) // vrea „avansat"
    const exact = course({ level: 'advanced', domains: [] })
    const adjacent = course({ level: 'intermediate', domains: [] })
    const far = course({ level: 'introductory', domains: [] })
    expect(scoreCourse(votes, exact)).toBe(WEIGHT_LEVEL_EXACT)
    expect(scoreCourse(votes, adjacent)).toBe(1)
    expect(scoreCourse(votes, far)).toBe(0)
  })

  it('scorul compune domeniu + nivel + outcomes conform ponderilor', () => {
    const votes = extractVotes(answers({ 2: 5, 12: 0, 6: 0 })) // AI, introductiv, overview
    const c = course({ level: 'introductory', domains: ['ai'], outcomes: ['overview'] })
    expect(scoreCourse(votes, c)).toBe(WEIGHT_DOMAIN + WEIGHT_LEVEL_EXACT + WEIGHT_OUTCOME)
    expect(scoreCourse(votes, c)).toBeGreaterThanOrEqual(MIN_SCORE)
  })
})

describe('quiz recommend — parcurs derivat', () => {
  it('începător care vrea implementare → path: intro → cursul avansat câștigător', () => {
    const intro = course({ id: 1, title: 'Foundation', slug: 'f', level: 'introductory' })
    const impl = course({
      id: 2,
      title: 'Implementer',
      slug: 'i',
      level: 'advanced',
      outcomes: ['implementationPlan'],
    })
    // Q3=0 (începător), Q2=AI, Q6=2 (plan de implementare)
    const rec = recommend(answers({ 11: 0, 3: 0, 2: 5, 6: 2 }), [intro, impl])
    expect(rec).toEqual({ kind: 'path', first: intro, second: impl })
  })

  it('câștigător introductiv + „bază pentru avansat" → path: intro → nivelul următor', () => {
    const intro = course({
      id: 1,
      title: 'Foundation',
      slug: 'f',
      level: 'introductory',
      outcomes: ['foundationForMore', 'overview'],
    })
    const next = course({ id: 2, title: 'Implementer', slug: 'i', level: 'advanced' })
    // Q3=0, Q2=AI, Q6=6 (bază pentru cursuri avansate), Q12=0 (introducere)
    const rec = recommend(answers({ 11: 0, 3: 0, 2: 5, 6: 6, 12: 0 }), [intro, next])
    expect(rec).toEqual({ kind: 'path', first: intro, second: next })
  })

  it('fără curs introductiv în domeniu → rămâne recomandarea simplă (nu forțează path)', () => {
    const impl = course({
      id: 2,
      title: 'Implementer',
      slug: 'i',
      level: 'advanced',
      outcomes: ['implementationPlan'],
    })
    const rec = recommend(answers({ 11: 0, 3: 0, 2: 5, 6: 2 }), [impl])
    expect(rec).toEqual({ kind: 'course', course: impl })
  })
})

describe('quiz recommend — tie-break + urgență', () => {
  it('la scor egal câștigă cursul cu ediția cea mai apropiată', () => {
    const later = course({
      id: 1,
      title: 'Later',
      slug: 'later',
      level: 'intermediate',
      nextStartDate: '2026-10-01T00:00:00.000Z',
    })
    const sooner = course({
      id: 2,
      title: 'Sooner',
      slug: 'sooner',
      level: 'intermediate',
      nextStartDate: '2026-08-01T00:00:00.000Z',
    })
    const none = course({ id: 3, title: 'NoEdition', slug: 'none', level: 'intermediate' })
    const rec = recommend(answers({ 11: 0, 2: 5, 12: 1 }), [none, later, sooner])
    expect(rec).toEqual({ kind: 'course', course: sooner })
  })

  it('Q9 = „Imediat" dă bonus cursului cu ediție programată', () => {
    const votes = extractVotes(answers({ 9: 0 }))
    const withEdition = course({ domains: [], nextStartDate: '2026-08-01T00:00:00.000Z' })
    const without = course({ domains: [] })
    expect(scoreCourse(votes, withEdition)).toBe(1)
    expect(scoreCourse(votes, without)).toBe(0)
  })
})
