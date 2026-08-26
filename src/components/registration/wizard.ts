export const CODE_LENGTH = 6

/** The code is held as a fixed-length string; blank slots are spaces. */
export const emptyCode = ' '.repeat(CODE_LENGTH)

export const isCodeComplete = (code: string) =>
  code.length === CODE_LENGTH && !/\D/.test(code)

export const MAX_TEAM_SIZE = 4

export type TeamChoice = 'join' | 'create' | 'alone'

export type TeamState = {
  choice: TeamChoice | null
  name: string
  code: string
}

export const emptyTeam: TeamState = { choice: null, name: '', code: '' }

/** Team names become their invite code: no accents, no spaces, no symbols. */
export function teamIdFrom(name: string) {
  return name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 24)
}

export type TeamLookup = {
  exists: boolean
  memberCount: number
  isFull: boolean
}

export function canLeaveTeamStep(team: TeamState, lookup: TeamLookup | null) {
  if (team.choice === 'alone') return true
  if (team.choice === 'create') return teamIdFrom(team.name).length >= 3
  if (team.choice === 'join') {
    const code = teamIdFrom(team.code)
    if (code.length < 4) return false
    return lookup !== null && lookup.exists && !lookup.isFull
  }
  return false
}
