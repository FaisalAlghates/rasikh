/** Three stacked Najdi shurfa triangles forming a solid base. */
export function BrandMark({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="currentColor"
      aria-hidden="true"
      className={className}
    >
      <path d="M16 2 22 10H10z" />
      <path d="M16 11.5 25 21H7z" />
      <path d="M16 22.5 28 30H4z" />
    </svg>
  );
}

/** Thin shurfa (crenellation) divider. */
export function ShurfaDivider({ className }: { className?: string }) {
  return (
    <svg
      role="presentation"
      aria-hidden="true"
      className={className}
      width="100%"
      height="10"
      preserveAspectRatio="none"
    >
      <defs>
        <pattern id="shurfa" width="16" height="10" patternUnits="userSpaceOnUse">
          <path d="M0 10 8 0 16 10z" fill="currentColor" />
        </pattern>
      </defs>
      <rect width="100%" height="10" fill="url(#shurfa)" />
    </svg>
  );
}
