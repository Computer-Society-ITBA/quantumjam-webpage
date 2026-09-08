import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import '@/i18n'
import i18n from '@/i18n'
import { RegistrationGate } from './RegistrationGate'
import type { RegistrationFlags } from '@/lib/featureFlags'

const subscribe = vi.hoisted(() => vi.fn())

vi.mock('@/lib/featureFlags', async () => {
  const actual =
    await vi.importActual<typeof import('@/lib/featureFlags')>(
      '@/lib/featureFlags',
    )
  return { ...actual, subscribeToRegistrationFlags: subscribe }
})

function withFlags(flags: RegistrationFlags) {
  subscribe.mockImplementation((cb: (f: RegistrationFlags) => void) => {
    cb(flags)
    return () => {}
  })
}

function renderGate(event: 'workshops' | 'competition') {
  return render(
    <MemoryRouter>
      <RegistrationGate event={event}>
        <form data-testid="signup-form" />
      </RegistrationGate>
    </MemoryRouter>,
  )
}

describe('RegistrationGate', () => {
  beforeEach(async () => {
    subscribe.mockReset()
    await i18n.changeLanguage('en')
  })

  // vitest runs without globals, so testing-library's auto-cleanup never
  // registers itself and the previous render would leak into the next test.
  afterEach(cleanup)

  it('renders the form when the flag is on', () => {
    withFlags({
      workshopsRegistrationOpen: true,
      competitionRegistrationOpen: true,
    })
    renderGate('workshops')
    expect(screen.getByTestId('signup-form')).toBeInTheDocument()
  })

  it('never mounts the form when the flag is off', () => {
    withFlags({
      workshopsRegistrationOpen: false,
      competitionRegistrationOpen: true,
    })
    renderGate('workshops')
    expect(screen.queryByTestId('signup-form')).not.toBeInTheDocument()
    expect(
      screen.getByText(i18n.t('registration.closed.title')),
    ).toBeInTheDocument()
  })

  it('gates each event on its own flag', () => {
    withFlags({
      workshopsRegistrationOpen: true,
      competitionRegistrationOpen: false,
    })
    renderGate('competition')
    expect(screen.queryByTestId('signup-form')).not.toBeInTheDocument()
  })

  it('holds back the form until Firestore answers', () => {
    subscribe.mockImplementation(() => () => {})
    renderGate('workshops')
    expect(screen.queryByTestId('signup-form')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })
})
