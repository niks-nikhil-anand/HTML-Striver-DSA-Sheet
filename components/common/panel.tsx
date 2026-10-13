import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn("glass rise rounded-2xl p-4 sm:p-5", className)}>{children}</section>;
}
