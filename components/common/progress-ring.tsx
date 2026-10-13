import type { ReactNode } from "react";

export function ProgressRing({ value, size = 96, stroke = 8, children }: { value: number; size?: number; stroke?: number; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} role="img" aria-label={`${Math.round(v)} percent complete`}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-muted" />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - v / 100)}
          className="stroke-primary transition-[stroke-dashoffset] duration-700 dark:drop-shadow-[0_0_6px_var(--primary)]"
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">{children}</div>
    </div>
  );
}
