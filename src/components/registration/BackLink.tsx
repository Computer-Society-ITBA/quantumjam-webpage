import { Link } from 'react-router'

export function BackLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="text-brand-text-dim hover:text-brand-green fixed top-6 left-[clamp(20px,6vw,80px)] z-30 flex items-center gap-2 text-[1.05rem] leading-none transition-colors"
    >
      <span aria-hidden="true" className="text-[1.3rem] leading-none">
        ⟨
      </span>
      <span className="leading-none">{label}</span>
    </Link>
  )
}
