import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import i18n from '@/i18n'
import { CompetitionWizard } from './CompetitionWizard'

const api = vi.hoisted(() => ({
  requestCode: vi.fn(),
  confirmCode: vi.fn(),
  saveDraft: vi.fn(),
  submitCompetition: vi.fn(),
  lookupTeam: vi.fn(),
  errorCode: vi.fn(),
}))

vi.mock('@/lib/registrationApi', () => api)

const EMAIL = 'someone@itba.edu.ar'

const type = (field: HTMLElement, value: string) =>
  fireEvent.change(field, { target: { value } })

async function verifyEmail() {
  type(screen.getByLabelText(/Email/), EMAIL)
  fireEvent.click(screen.getByRole('button', { name: /verification code/i }))
  await waitFor(() => expect(api.requestCode).toHaveBeenCalled())
  type(screen.getAllByLabelText(/Verification code \d/)[0], '123456')
  fireEvent.click(screen.getByRole('button', { name: /confirm email/i }))
}

const fillPersonal = async () => {
  type(await screen.findByLabelText(/ID number/), '12345678')
  type(screen.getByLabelText(/Age/), '21')
  type(screen.getByLabelText(/^University/), 'ITBA')
  type(screen.getByLabelText(/Where you live/), 'CABA')
}

describe('CompetitionWizard', () => {
  beforeEach(async () => {
    api.requestCode.mockReset().mockResolvedValue({ ok: true })
    api.confirmCode
      .mockReset()
      .mockResolvedValue({ ok: true, verificationToken: 'token-abc' })
    api.saveDraft.mockReset().mockResolvedValue({ ok: true })
    api.submitCompetition.mockReset().mockResolvedValue({ ok: true })
    api.errorCode.mockReset().mockReturnValue('unknown')
    await i18n.changeLanguage('en')
  })

  afterEach(cleanup)

  it('saves each step as the visitor moves past it', async () => {
    render(<CompetitionWizard />)
    await verifyEmail()
    await fillPersonal()
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    await waitFor(() =>
      expect(api.saveDraft).toHaveBeenCalledWith({
        email: EMAIL,
        purpose: 'competition',
        verificationToken: 'token-abc',
        step: 'personal',
        data: {
          dni: '12345678',
          age: '21',
          university: 'ITBA',
          major: '',
          gradYear: '',
          location: 'CABA',
          diet: '',
        },
      }),
    )
    expect(await screen.findByLabelText(/GitHub/)).toBeInTheDocument()
  })

  it('resumes at the first incomplete step with earlier answers loaded', async () => {
    api.confirmCode.mockResolvedValue({
      ok: true,
      verificationToken: 'token-abc',
      draft: {
        lastCompletedStep: 'personal',
        data: {
          dni: '12345678',
          age: '21',
          university: 'ITBA',
          location: 'CABA',
        },
      },
    })
    render(<CompetitionWizard />)
    await verifyEmail()

    // Personal info is done, so the wizard lands on the socials step.
    expect(await screen.findByLabelText(/GitHub/)).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/saved your progress/i)

    fireEvent.click(screen.getByRole('button', { name: /back/i }))
    expect(await screen.findByLabelText(/ID number/)).toHaveValue('12345678')
  })

  it('asks for a fresh code when the verification lapsed, then returns', async () => {
    render(<CompetitionWizard />)
    await verifyEmail()
    await fillPersonal()

    api.saveDraft.mockRejectedValueOnce(new Error('expired'))
    api.errorCode.mockReturnValueOnce('failed-precondition')
    fireEvent.click(screen.getByRole('button', { name: /continue/i }))

    // Back on the email step, with the address still filled in.
    expect(await screen.findByLabelText(/Email/)).toHaveValue(EMAIL)

    fireEvent.click(screen.getByRole('button', { name: /verification code/i }))
    await waitFor(() => expect(api.requestCode).toHaveBeenCalledTimes(2))
    type(screen.getAllByLabelText(/Verification code \d/)[0], '123456')
    fireEvent.click(screen.getByRole('button', { name: /confirm email/i }))

    // Straight back to the step that was interrupted, nothing lost.
    expect(await screen.findByLabelText(/ID number/)).toHaveValue('12345678')
  })

  it('saves the team choice and restores it on the team step', async () => {
    api.confirmCode.mockResolvedValue({
      ok: true,
      verificationToken: 'token-abc',
      draft: {
        lastCompletedStep: 'socials',
        data: {
          dni: '12345678',
          age: '21',
          university: 'ITBA',
          location: 'CABA',
          teamChoice: 'create',
          teamName: 'Qubits',
          teamCode: '',
        },
      },
    })
    render(<CompetitionWizard />)
    await verifyEmail()

    const teamName = await screen.findByLabelText(/Team name/)
    expect(teamName).toHaveValue('Qubits')

    type(teamName, 'Qubits 2')
    await waitFor(
      () =>
        expect(api.saveDraft).toHaveBeenCalledWith({
          email: EMAIL,
          purpose: 'competition',
          verificationToken: 'token-abc',
          step: 'team',
          data: { teamChoice: 'create', teamName: 'Qubits 2', teamCode: '' },
        }),
      { timeout: 3000 },
    )
  })
})
