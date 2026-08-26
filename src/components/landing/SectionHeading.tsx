import type { ReactNode } from 'react'

export function SectionHeading({
  index,
  children,
}: {
  index: string
  children: ReactNode
}) {
  return (
    <div className="mb-[1.1rem]">
      <span className="text-brand-magenta-bright mb-2 block text-[1.05rem] font-medium tracking-[0.2em]">
        {index}
      </span>
      <h2
        className="font-display text-foreground text-[clamp(1.5rem,3vw,2.15rem)] leading-none font-extrabold tracking-[-0.02em] uppercase"
        style={{ fontVariationSettings: '"wdth" 104, "wght" 800' }}
      >
        {children}
      </h2>
    </div>
  )
}
