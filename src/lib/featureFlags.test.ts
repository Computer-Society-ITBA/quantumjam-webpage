import { describe, expect, it } from 'vitest'

import {
  DEFAULT_REGISTRATION_FLAGS,
  isRegistrationOpen,
  parseRegistrationFlags,
} from './featureFlags'

describe('parseRegistrationFlags', () => {
  it('reads explicit booleans', () => {
    expect(
      parseRegistrationFlags({
        workshopsRegistrationOpen: false,
        competitionRegistrationOpen: true,
      }),
    ).toEqual({
      workshopsRegistrationOpen: false,
      competitionRegistrationOpen: true,
    })
  })

  it('falls back to open for a missing document', () => {
    expect(parseRegistrationFlags(undefined)).toEqual(
      DEFAULT_REGISTRATION_FLAGS,
    )
  })

  it('falls back to open for a missing field', () => {
    expect(
      parseRegistrationFlags({ competitionRegistrationOpen: false }),
    ).toEqual({
      workshopsRegistrationOpen: true,
      competitionRegistrationOpen: false,
    })
  })

  it('ignores non-boolean values so a typo cannot close a flow', () => {
    expect(
      parseRegistrationFlags({
        workshopsRegistrationOpen: 'false',
        competitionRegistrationOpen: 0,
      }),
    ).toEqual(DEFAULT_REGISTRATION_FLAGS)
  })
})

describe('isRegistrationOpen', () => {
  const flags = {
    workshopsRegistrationOpen: true,
    competitionRegistrationOpen: false,
  }

  it('maps each event to its own flag', () => {
    expect(isRegistrationOpen(flags, 'workshops')).toBe(true)
    expect(isRegistrationOpen(flags, 'competition')).toBe(false)
  })
})
