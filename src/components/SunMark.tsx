/** Eight-rayed sun, after the one on the Philippine flag. */
export function SunMark({ size = 20, className = "" }: { size?: number; className?: string }) {
  const rays = Array.from({ length: 8 }, (_, i) => i * 45);
  return (
    <svg width={size} height={size} viewBox="-50 -50 100 100" aria-hidden className={className}>
      {rays.map((deg) => (
        <g key={deg} transform={`rotate(${deg})`}>
          <path d="M0 -46 L5 -26 L-5 -26 Z" fill="currentColor" />
          <path d="M-9 -40 L-4 -27 L-10 -26 Z" fill="currentColor" opacity="0.7" />
          <path d="M9 -40 L10 -26 L4 -27 Z" fill="currentColor" opacity="0.7" />
        </g>
      ))}
      <circle r="20" fill="currentColor" />
    </svg>
  );
}
