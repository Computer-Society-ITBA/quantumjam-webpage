export function InterferenceDivider() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 1000 52"
      preserveAspectRatio="none"
      className="block h-[52px] w-full opacity-50"
    >
      <path
        d="M0,26 Q25,4 50,26 T100,26 T150,26 T200,26 T250,26 T300,26 T350,26 T400,26 T450,26 T500,26 T550,26 T600,26 T650,26 T700,26 T750,26 T800,26 T850,26 T900,26 T950,26 T1000,26"
        fill="none"
        strokeWidth="1.3"
        stroke="var(--brand-warm)"
      />
      <path
        d="M0,26 Q30,48 60,26 T120,26 T180,26 T240,26 T300,26 T360,26 T420,26 T480,26 T540,26 T600,26 T660,26 T720,26 T780,26 T840,26 T900,26 T960,26 T1020,26"
        fill="none"
        strokeWidth="1.3"
        stroke="var(--brand-blue)"
        style={{ mixBlendMode: 'screen' }}
      />
    </svg>
  )
}
