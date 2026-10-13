"use client";

import { useRouter } from "next/navigation";
import { Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTracker } from "@/hooks/use-tracker";

export function PageHeader({ title, showJump = true, srOnly = false }: { title: string; showJump?: boolean; srOnly?: boolean }) {
  const router = useRouter();
  const { todayPlan, clearFilters, setFilters } = useTracker();
  return (
    <div className={srOnly ? "sr-only" : "mb-5 flex flex-wrap items-center justify-between gap-3"}>
      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
      {showJump && todayPlan && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            clearFilters();
            setFilters({ date: "today" });
            router.push("/problems");
          }}
        >
          <Target /> Jump to today&apos;s tasks
        </Button>
      )}
    </div>
  );
}
