import { AppShell } from "@/components/layout/app-shell";
import { TrackerProvider } from "@/providers/tracker-provider";

export default function TrackerLayout({ children }: { children: React.ReactNode }) {
  return (
    <TrackerProvider>
      <AppShell>{children}</AppShell>
    </TrackerProvider>
  );
}
