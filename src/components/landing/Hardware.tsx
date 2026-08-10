import { useTranslation } from 'react-i18next'

function Cryostat() {
  const wires = [
    [70, 30, 60, 95],
    [230, 30, 240, 95],
    [100, 30, 82, 95],
    [200, 30, 218, 95],
    [68, 95, 55, 155],
    [232, 95, 245, 155],
    [92, 95, 78, 155],
    [208, 95, 222, 155],
    [92, 155, 75, 208],
    [208, 155, 225, 208],
    [112, 155, 98, 208],
    [188, 155, 202, 208],
    [112, 208, 94, 252],
    [188, 208, 206, 252],
    [128, 208, 120, 252],
    [172, 208, 180, 252],
    [128, 252, 132, 270],
    [172, 252, 168, 270],
    [150, 252, 150, 270],
  ]
  return (
    <svg
      viewBox="0 0 300 380"
      fill="none"
      aria-hidden="true"
      className="mx-auto block w-full max-w-[320px]"
    >
      <defs>
        <linearGradient id="goldGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#f0c988" />
          <stop offset="50%" stopColor="#b8894a" />
          <stop offset="100%" stopColor="#8a6432" />
        </linearGradient>
      </defs>
      <ellipse
        cx="150"
        cy="30"
        rx="110"
        ry="16"
        stroke="url(#goldGrad)"
        strokeWidth="2"
      />
      <ellipse
        cx="150"
        cy="95"
        rx="82"
        ry="13"
        stroke="url(#goldGrad)"
        strokeWidth="2"
      />
      <ellipse
        cx="150"
        cy="155"
        rx="58"
        ry="11"
        stroke="url(#goldGrad)"
        strokeWidth="2"
      />
      <ellipse
        cx="150"
        cy="208"
        rx="38"
        ry="9"
        stroke="url(#goldGrad)"
        strokeWidth="2"
      />
      <ellipse
        cx="150"
        cy="252"
        rx="22"
        ry="7"
        stroke="url(#goldGrad)"
        strokeWidth="2"
      />
      <rect
        x="132"
        y="270"
        width="36"
        height="26"
        rx="3"
        stroke="var(--brand-blue)"
        strokeWidth="1.6"
      />
      <g stroke="url(#goldGrad)" strokeWidth="1" opacity="0.8">
        {wires.map(([x1, y1, x2, y2], i) => (
          <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />
        ))}
      </g>
    </svg>
  )
}

function PairOrbit() {
  return (
    <svg
      viewBox="0 0 60 60"
      aria-hidden="true"
      className="h-[34px] w-[34px] flex-shrink-0"
    >
      <circle
        cx="30"
        cy="30"
        r="18"
        stroke="var(--brand-line)"
        strokeWidth="1"
        fill="none"
      />
      <g className="animate-orbit-forward">
        <circle cx="30" cy="12" r="4" fill="var(--brand-gold-bright)" />
      </g>
      <g className="animate-orbit-reverse">
        <circle cx="30" cy="48" r="4" fill="var(--brand-blue)" />
      </g>
    </svg>
  )
}

type SpecLine = { labelKey: string; valueKey: string }
const specs: SpecLine[] = [
  {
    labelKey: 'hardware.specs.qubit_label',
    valueKey: 'hardware.specs.qubit_value',
  },
  {
    labelKey: 'hardware.specs.temp_label',
    valueKey: 'hardware.specs.temp_value',
  },
  {
    labelKey: 'hardware.specs.control_label',
    valueKey: 'hardware.specs.control_value',
  },
  {
    labelKey: 'hardware.specs.arch_label',
    valueKey: 'hardware.specs.arch_value',
  },
]

export function Hardware() {
  const { t } = useTranslation()
  return (
    <section
      id="hardware"
      className="bg-brand-panel relative z-10 px-[clamp(20px,6vw,80px)] py-[clamp(56px,9vw,120px)]"
    >
      <div className="mb-[0.9rem] flex items-center gap-4">
        <h2 className="font-display text-foreground text-[clamp(1.5rem,3vw,2.15rem)] font-bold tracking-[0.01em]">
          {t('hardware.title')}
        </h2>
        <PairOrbit />
      </div>
      <div className="grid grid-cols-1 items-center gap-14 md:grid-cols-[0.85fr_1.15fr]">
        <Cryostat />
        <div>
          <p className="text-brand-text-dim max-w-[58ch]">
            {t('hardware.description')}
          </p>
          <ul className="mt-[1.3rem] flex list-none flex-col gap-[9px]">
            {specs.map((s) => (
              <li
                key={s.labelKey}
                className="text-brand-text-dim flex items-baseline gap-[10px] text-[0.8rem]"
              >
                <b className="text-brand-gold-bright min-w-[110px] font-semibold">
                  {t(s.labelKey)}
                </b>
                <span>{t(s.valueKey)}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  )
}
