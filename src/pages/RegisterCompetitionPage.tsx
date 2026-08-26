import { useTranslation } from 'react-i18next'

import { BackLink } from '@/components/registration/BackLink'
import { CompetitionWizard } from '@/components/registration/CompetitionWizard'

export default function RegisterCompetitionPage() {
  const { t } = useTranslation()
  return (
    <main>
      <BackLink to="/register" label={t('registration.backToSelect')} />
      <CompetitionWizard />
    </main>
  )
}
