import { useTranslation } from 'react-i18next'

import { BackLink } from '@/components/registration/BackLink'
import { RegistrationForm } from '@/components/registration/RegistrationForm'
import { RegistrationGate } from '@/components/registration/RegistrationGate'

export default function RegisterWorkshopsPage() {
  const { t } = useTranslation()
  return (
    <main>
      <BackLink to="/register" label={t('registration.backToSelect')} />
      <RegistrationGate event="workshops">
        <RegistrationForm event="workshops" />
      </RegistrationGate>
    </main>
  )
}
