import { useEffect, useState } from 'react'

export function ProgressRail() {
  const [pct, setPct] = useState(0)

  useEffect(() => {
    const onScroll = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight
      setPct(max > 0 ? (window.scrollY / max) * 100 : 0)
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div
      aria-hidden="true"
      className="text-brand-text-dim fixed top-1/2 left-[22px] z-60 hidden -translate-y-1/2 flex-col items-center gap-[10px] text-[0.62rem] xl:flex"
    >
      <span>|1⟩</span>
      <div className="bg-brand-line relative h-[180px] w-[2px] overflow-hidden rounded-sm">
        <div
          className="absolute bottom-0 left-0 w-full transition-[height] duration-100"
          style={{
            height: `${pct}%`,
            background:
              'linear-gradient(180deg, var(--brand-blue), var(--brand-gold-bright), var(--brand-warm))',
          }}
        />
      </div>
      <span>|0⟩</span>
    </div>
  )
}
