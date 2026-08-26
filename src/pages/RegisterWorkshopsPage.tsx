import { useTranslation } from 'react-i18next'

import { BackLink } from '@/components/registration/BackLink'
import { RegistrationForm } from '@/components/registration/RegistrationForm'

export default function RegisterWorkshopsPage() {
  const { t } = useTranslation()
  return (
    <main>
      <BackLink to="/register" label={t('registration.backToSelect')} />
      <RegistrationForm event="workshops" />
    </main>
  )
}
