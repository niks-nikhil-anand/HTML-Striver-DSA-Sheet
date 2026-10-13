import type { ReactNode } from "react";

export function SectionTitle({ icon, title, action }: { icon?: ReactNode; title: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-foreground/90">
        {icon}
        {title}
      </h2>
      {action}
    </div>
  );
}
