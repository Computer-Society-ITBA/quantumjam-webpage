import { useEffect, useRef, useState } from 'react'
import QrScanner from 'qr-scanner'
import { useTranslation } from 'react-i18next'

import type { CheckInResult } from '@/lib/adminApi'
import { cn } from '@/lib/utils'

type Feedback = CheckInResult | { result: 'error' } | null

export function CheckInScanner({
  onScan,
}: {
  onScan: (token: string) => Promise<CheckInResult>
}) {
  const { t } = useTranslation()
  const videoRef = useRef<HTMLVideoElement>(null)
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan
  const busyRef = useRef(false)
  // The last QR read and when, so the same code left in front of the
  // camera is not reported again as "already checked in".
  const lastRef = useRef<{ data: string; at: number } | null>(null)
  const [feedback, setFeedback] = useState<Feedback>(null)
  const [cameraError, setCameraError] = useState(false)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const scanner = new QrScanner(
      video,
      async (scan) => {
        if (busyRef.current) return
        const last = lastRef.current
        if (last && last.data === scan.data && Date.now() - last.at < 10000) {
          return
        }
        busyRef.current = true
        try {
          setFeedback(await onScanRef.current(scan.data))
        } catch {
          setFeedback({ result: 'error' })
        }
        lastRef.current = { data: scan.data, at: Date.now() }
        // Pause so the same QR is not processed repeatedly while in frame.
        setTimeout(() => {
          busyRef.current = false
          setFeedback(null)
        }, 2500)
      },
      {
        preferredCamera: 'environment',
        highlightScanRegion: true,
        maxScansPerSecond: 5,
        returnDetailedScanResult: true,
      },
    )
    scanner.start().catch(() => setCameraError(true))

    return () => {
      scanner.stop()
      scanner.destroy()
    }
  }, [])

  if (cameraError) {
    return (
      <p role="alert" className="text-brand-magenta-bright">
        {t('admin.scanner.cameraError')}
      </p>
    )
  }

  const tone =
    feedback?.result === 'ok'
      ? 'bg-brand-green text-black'
      : feedback?.result === 'already'
        ? 'bg-yellow-400 text-black'
        : 'bg-brand-magenta-bright text-white'

  return (
    <div className="relative mx-auto w-full max-w-[420px]">
      <video
        ref={videoRef}
        className="aspect-square w-full object-cover"
        playsInline
        muted
      />
      <div aria-live="assertive" className="mt-3 min-h-14">
        {feedback && (
          <p className={cn('px-4 py-3 text-center font-medium', tone)}>
            {feedback.result === 'ok' &&
              t('admin.scanner.okCompetition', { name: feedback.label })}
            {feedback.result === 'already' &&
              t('admin.scanner.alreadyCompetition', { name: feedback.label })}
            {feedback.result === 'notAccepted' &&
              t('admin.scanner.notAccepted', { name: feedback.label })}
            {feedback.result === 'invalid' && t('admin.scanner.invalid')}
            {feedback.result === 'error' && t('admin.scanner.error')}
          </p>
        )}
      </div>
    </div>
  )
}
