"use client";

import { CalendarCheck } from "lucide-react";
import Image from "next/image";
import { Panel } from "@/components/common/panel";
import { QuoteCard } from "@/components/common/quote-card";
import { SectionTitle } from "@/components/common/section-title";
import { useTracker } from "@/hooks/use-tracker";
import { STREAK_QUOTES, dailyQuote } from "@/lib/quotes";
import { Timeline } from "./timeline";

export function PlanView() {
  const { today } = useTracker();
  return (
    <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(16rem,20rem)]">
      <div className="grid min-w-0 gap-5">
        <Panel>
          <SectionTitle icon={<CalendarCheck className="size-4 text-primary" />} title="Daily plan" />
          <Timeline />
        </Panel>
        <QuoteCard label="Keep showing up" quote={dailyQuote(STREAK_QUOTES, today, 1)} />
      </div>
      <figure className="glass rise mx-auto w-full max-w-md overflow-hidden rounded-2xl p-2 xl:sticky xl:top-24">
        <Image
          src="/images/small-progress-big-results.png"
          alt="Motivation poster: Small progress every day adds up to big results."
          width={1091}
          height={1442}
          sizes="(min-width: 1280px) 20rem, (min-width: 640px) 28rem, 92vw"
          className="h-auto w-full rounded-xl"
        />
      </figure>
    </div>
  );
}
