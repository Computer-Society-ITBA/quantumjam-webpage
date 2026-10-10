/**
 * Read-only recap of a finished sign-up, shown to its owner when they come
 * back with an email that is already registered. Blank rows are skipped.
 */
export function SignupSummary({
  rows,
}: {
  rows: readonly (readonly [label: string, value: string | undefined])[]
}) {
  return (
    <dl className="border-brand-line mt-7 flex flex-col gap-3.5 border-t pt-7 text-left">
      {rows
        .filter(([, value]) => value)
        .map(([label, value]) => (
          <div key={label}>
            <dt className="font-display text-brand-text-dim mb-0.5 text-[0.76rem] font-bold tracking-[0.04em] uppercase">
              {label}
            </dt>
            <dd className="text-foreground text-[0.95rem] break-words">
              {value}
            </dd>
          </div>
        ))}
    </dl>
  )
}
