import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import i18n from '@/i18n'
import { RegistrationForm } from './RegistrationForm'

const api = vi.hoisted(() => ({
  requestCode: vi.fn(),
  confirmCode: vi.fn(),
  submitWorkshop: vi.fn(),
}))

vi.mock('@/lib/registrationApi', () => ({
  requestCode: api.requestCode,
  confirmCode: api.confirmCode,
  submitWorkshop: api.submitWorkshop,
  errorCode: () => 'unknown',
}))

const CODE = '123456'
const EMAIL = 'someone@itba.edu.ar'

const type = (field: HTMLElement, value: string) =>
  fireEvent.change(field, { target: { value } })

/** The code input splices a whole pasted run of digits from one box. */
const fillCode = () =>
  type(screen.getAllByLabelText(/Verification code \d/)[0], CODE)

async function verifyEmail() {
  type(screen.getByLabelText(/Email/), EMAIL)
  fireEvent.click(screen.getByRole('button', { name: /verification code/i }))
  await waitFor(() => expect(api.requestCode).toHaveBeenCalled())
  fillCode()
  fireEvent.click(screen.getByRole('button', { name: /confirm email/i }))
  await waitFor(() => expect(api.confirmCode).toHaveBeenCalled())
}

describe('RegistrationForm (workshops)', () => {
  beforeEach(async () => {
    api.requestCode.mockReset().mockResolvedValue({ ok: true })
    api.confirmCode
      .mockReset()
      .mockResolvedValue({ ok: true, verificationToken: 'token-abc' })
    api.submitWorkshop.mockReset().mockResolvedValue({ ok: true })
    await i18n.changeLanguage('en')
  })

  // vitest runs without globals, so testing-library's auto-cleanup never
  // registers itself and the previous render would leak into the next test.
  afterEach(cleanup)

  it('asks for the email on its own, before any other detail', () => {
    render(<RegistrationForm event="workshops" />)

    expect(screen.getByLabelText(/Email/)).toBeInTheDocument()
    expect(screen.queryByLabelText(/Full name/)).not.toBeInTheDocument()
    expect(
      screen.queryByLabelText(/University and degree/),
    ).not.toBeInTheDocument()
  })

  it('verifies the address before collecting the details', async () => {
    render(<RegistrationForm event="workshops" />)

    type(screen.getByLabelText(/Email/), EMAIL)
    fireEvent.click(screen.getByRole('button', { name: /verification code/i }))

    await waitFor(() =>
      expect(api.requestCode).toHaveBeenCalledWith(EMAIL, 'workshops'),
    )

    // Still no details form: the code comes first.
    expect(screen.queryByLabelText(/Full name/)).not.toBeInTheDocument()
    expect(screen.getAllByLabelText(/Verification code \d/)).toHaveLength(6)

    fillCode()
    fireEvent.click(screen.getByRole('button', { name: /confirm email/i }))

    await waitFor(() =>
      expect(api.confirmCode).toHaveBeenCalledWith(EMAIL, 'workshops', CODE),
    )

    // Only now are the details asked for.
    expect(await screen.findByLabelText(/Full name/)).toBeInTheDocument()
    expect(api.submitWorkshop).not.toHaveBeenCalled()
  })

  it('submits the details with the token minted at the verify step', async () => {
    render(<RegistrationForm event="workshops" />)
    await verifyEmail()

    type(await screen.findByLabelText(/Full name/), 'Ada Lovelace')
    type(screen.getByLabelText(/University and degree/), 'ITBA, Physics')
    fireEvent.click(
      screen.getByRole('button', { name: /Prior quantum experience/i }),
    )
    fireEvent.click(screen.getByRole('button', { name: /^None/ }))
    fireEvent.click(
      screen.getByRole('button', { name: /collapse the wavefunction/i }),
    )

    await waitFor(() =>
      expect(api.submitWorkshop).toHaveBeenCalledWith(
        expect.objectContaining({
          email: EMAIL,
          verificationToken: 'token-abc',
          name: 'Ada Lovelace',
          career: 'ITBA, Physics',
          level: 'none',
        }),
      ),
    )
  })

  it('does not submit until the required details are filled in', async () => {
    render(<RegistrationForm event="workshops" />)
    await verifyEmail()

    fireEvent.click(
      await screen.findByRole('button', {
        name: /collapse the wavefunction/i,
      }),
    )

    await waitFor(() =>
      expect(screen.getAllByText(/required/i).length).toBeGreaterThan(0),
    )
    expect(api.submitWorkshop).not.toHaveBeenCalled()
  })
})
