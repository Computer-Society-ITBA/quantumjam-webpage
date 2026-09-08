import { describe, expect, it } from 'vitest'

import en from './locales/en.json'
import es from './locales/es.json'

const locales = { en, es } as const

type Nested = { [key: string]: string | Nested }

/** Every leaf string in a locale file, keyed by its dotted path. */
function flatten(node: Nested, prefix = ''): [string, string][] {
  return Object.entries(node).flatMap(([key, value]) =>
    typeof value === 'string'
      ? [[prefix + key, value] as [string, string]]
      : flatten(value, `${prefix}${key}.`),
  )
}

describe.each(Object.entries(locales))('%s copy', (_lang, locale) => {
  const entries = flatten(locale as unknown as Nested)

  // House style: no em dashes, no middle dots. Both keep sneaking back in
  // through copy-paste, and they are hard to spot in a diff.
  it.each([
    ['em dash', '—'],
    ['middle dot', '·'],
  ])('uses no %s', (_name, char) => {
    const offenders = entries.filter(([, value]) => value.includes(char))
    expect(offenders.map(([path]) => path)).toEqual([])
  })
})

describe('competition date', () => {
  it('is Saturday 21 November everywhere it appears', () => {
    const dated = [
      ...flatten(en as unknown as Nested),
      ...flatten(es as unknown as Nested),
    ]
      .filter(([, value]) => /November|noviembre/.test(value))
      .map(([, value]) => value)

    expect(dated.length).toBeGreaterThan(0)
    for (const value of dated) {
      expect(value).toMatch(/(November 21|21 de noviembre)/)
    }
  })
})

describe('locale parity', () => {
  it('en and es define the same keys', () => {
    const keys = (locale: unknown) =>
      flatten(locale as Nested)
        .map(([path]) => path)
        .sort()

    expect(keys(en)).toEqual(keys(es))
  })
})
