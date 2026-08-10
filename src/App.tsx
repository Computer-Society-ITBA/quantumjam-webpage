import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { supportedLngs, type SupportedLng } from '@/i18n'

function App() {
  const { t, i18n } = useTranslation()
  const [count, setCount] = useState(0)

  const currentLng = (i18n.resolvedLanguage ?? 'en') as SupportedLng

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 p-8">
      <header className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          {t('app.title')}
        </h1>
        <p className="text-muted-foreground max-w-md">{t('app.subtitle')}</p>
      </header>

      <section className="flex flex-col items-center gap-3">
        <p className="text-lg">{t('app.count', { count })}</p>
        <div className="flex gap-2">
          <Button onClick={() => setCount((c) => c + 1)}>
            {t('app.increment')}
          </Button>
          <Button variant="outline" onClick={() => setCount(0)}>
            {t('app.reset')}
          </Button>
        </div>
      </section>

      <section className="flex items-center gap-2">
        <span className="text-muted-foreground text-sm">
          {t('language.label')}:
        </span>
        {supportedLngs.map((lng) => (
          <Button
            key={lng}
            size="sm"
            variant={currentLng === lng ? 'default' : 'ghost'}
            onClick={() => void i18n.changeLanguage(lng)}
          >
            {t(`language.${lng}`)}
          </Button>
        ))}
      </section>
    </main>
  )
}

export default App
