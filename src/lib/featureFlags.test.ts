import { describe, expect, it } from 'vitest'

import {
  DEFAULT_REGISTRATION_FLAGS,
  isRegistrationOpen,
  parseRegistrationFlags,
} from './featureFlags'

describe('DEFAULT_REGISTRATION_FLAGS', () => {
  it('fails closed', () => {
    expect(DEFAULT_REGISTRATION_FLAGS).toEqual({
      workshopsRegistrationOpen: false,
      competitionRegistrationOpen: false,
    })
  })
})

describe('parseRegistrationFlags', () => {
  it('reads explicit booleans', () => {
    expect(
      parseRegistrationFlags({
        workshopsRegistrationOpen: true,
        competitionRegistrationOpen: false,
      }),
    ).toEqual({
      workshopsRegistrationOpen: true,
      competitionRegistrationOpen: false,
    })
  })

  it('falls back to closed for a missing document', () => {
    expect(parseRegistrationFlags(undefined)).toEqual(
      DEFAULT_REGISTRATION_FLAGS,
    )
  })

  it('falls back to closed for a missing field', () => {
    expect(
      parseRegistrationFlags({ competitionRegistrationOpen: true }),
    ).toEqual({
      workshopsRegistrationOpen: false,
      competitionRegistrationOpen: true,
    })
  })

  it('ignores non-boolean values so a typo cannot open a flow', () => {
    expect(
      parseRegistrationFlags({
        workshopsRegistrationOpen: 'true',
        competitionRegistrationOpen: 1,
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
