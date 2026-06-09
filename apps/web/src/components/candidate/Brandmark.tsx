const BRAND_NAME = process.env.NEXT_PUBLIC_BRAND_NAME ?? 'Dev Assessment';
const BRAND_LOGO = process.env.NEXT_PUBLIC_BRAND_LOGO_URL ?? null;

/**
 * Brand lockup for the candidate experience. Uses the supplied logo when set,
 * otherwise a small geometric monogram + the brand name in a refined,
 * mono-tracked wordmark. Shared across the test, results, and expired screens.
 */
export function Brandmark() {
  if (BRAND_LOGO) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={BRAND_LOGO} alt={BRAND_NAME} className="h-7 object-contain" />;
  }

  return (
    <div className="flex items-center gap-2.5">
      <span
        aria-hidden
        className="grid h-7 w-7 place-items-center rounded-[7px] bg-[var(--brand)] text-white shadow-sm"
      >
        <span className="font-serif text-[15px] font-semibold leading-none">
          {BRAND_NAME.charAt(0)}
        </span>
      </span>
      <span className="font-mono text-[11px] font-medium uppercase tracking-[0.18em] text-foreground/80">
        {BRAND_NAME}
      </span>
    </div>
  );
}
