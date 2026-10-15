"use client";

import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { Tooltip } from "@base-ui/react/tooltip";
import { CalendarDays } from "lucide-react";
import { Panel } from "@/components/common/panel";
import { SectionTitle } from "@/components/common/section-title";
import { useTracker } from "@/hooks/use-tracker";
import { buildActivityHeatmap, type ActivityRange } from "@/lib/activity-heatmap";
import { addDays, formatDate } from "@/lib/dates";

const levelNames = ["No problems", "1 problem", "2–3 problems", "4–5 problems", "6+ problems"];

export function ActivityHeatmap() {
  const { progress, today, setUi } = useTracker();
  const range = progress.prefs.ui?.activityRange ?? "year";
  const cellSize = range === "7d" ? 32 : range === "30d" ? 24 : 10;
  const activity = useMemo(() => buildActivityHeatmap(progress.completed, today, range), [progress.completed, today, range]);
  const [activeDate, setActiveDate] = useState(today);
  const [inspected, setInspected] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const date = inspected ?? activeDate;
  const selected = activity.weeks.flat().find((day) => day?.date === date);

  useEffect(() => {
    const region = scrollRef.current;
    if (region) region.scrollLeft = region.scrollWidth;
  }, [today, range]);

  function move(event: KeyboardEvent<HTMLButtonElement>, current: string) {
    const columns = range === "7d" ? 7 : 10;
    const offsets: Record<string, number> = range === "year" ? { ArrowLeft: -7, ArrowRight: 7, ArrowUp: -1, ArrowDown: 1 } : { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -columns, ArrowDown: columns };
    const target = event.key === "Home" ? activity.start : event.key === "End" ? today : event.key in offsets ? addDays(current, offsets[event.key]) : null;
    if (!target) return;
    event.preventDefault();
    if (target < activity.start || target > today) return;
    setActiveDate(target);
    scrollRef.current?.querySelector<HTMLButtonElement>(`[data-date="${target}"]`)?.focus();
  }

  return (
    <Panel className="min-w-0">
      <SectionTitle icon={<CalendarDays className="size-4 text-success" />} title="Practice activity" />
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <p><strong className="font-medium text-foreground">{activity.total} {activity.total === 1 ? "problem" : "problems"} solved</strong> across {activity.activeDays} active {activity.activeDays === 1 ? "day" : "days"}</p>
        <label className="flex items-center gap-2">
          <span className="sr-only">Activity date range</span>
          <select aria-label="Activity date range" value={range} onChange={(event) => {
            setActiveDate(today);
            setInspected(null);
            setUi({ activityRange: event.target.value as ActivityRange });
          }} className="h-9 rounded-lg border border-input bg-background px-2.5 text-xs text-foreground focus-visible:outline-2 focus-visible:outline-ring">
            <option value="year">Last 12 months</option>
            <option value="30d">Last 30 days</option>
            <option value="7d">Last 7 days</option>
          </select>
        </label>
      </div>
      <Tooltip.Provider>
      <div ref={scrollRef} role="region" aria-label="Practice activity calendar. Scroll to explore; use arrow keys on a day to navigate." tabIndex={0} className="overflow-x-auto rounded-lg pb-2 focus-visible:outline-2 focus-visible:outline-ring">
        <div className="w-max min-w-full pr-1">
          {range === "year" && <div aria-hidden="true" className="mb-2 ml-8 grid h-4 text-[10px] text-muted-foreground" style={{ gridTemplateColumns: `repeat(${activity.weeks.length}, ${cellSize}px)`, gap: 3 }}>
            {activity.months.map((month) => <span key={month.key} className="whitespace-nowrap" style={{ gridColumn: month.week + 1, gridRow: 1 }}>{month.label}</span>)}
          </div>}
          <div className="flex gap-2">
            {range === "year" && <div aria-hidden="true" className="grid w-6 shrink-0 gap-[3px] text-[9px] text-muted-foreground" style={{ gridTemplateRows: `repeat(7, ${cellSize}px)`, lineHeight: `${cellSize}px` }}>
              {["", "Mon", "", "Wed", "", "Fri", ""].map((label, index) => <span key={index}>{label}</span>)}
            </div>}
            <div className={range === "year" ? "flex gap-[3px]" : "grid gap-1.5"} style={range === "year" ? undefined : { gridTemplateColumns: `repeat(${range === "7d" ? 7 : 10}, ${cellSize}px)` }} onMouseLeave={() => setInspected(null)}>
              {activity.weeks.map((week, index) => (
                <div key={index} className={range === "year" ? "grid grid-rows-7 gap-[3px]" : "contents"}>
                  {week.map((day, weekday) => day ? (
                    <Tooltip.Root key={day.date}>
                    <Tooltip.Trigger
                      delay={100}
                      closeOnClick={false}
                      type="button"
                      data-date={day.date}
                      data-level={day.level}
                      aria-label={`${formatDate(day.date)}: ${day.count} ${day.count === 1 ? "problem" : "problems"} solved`}
                      aria-current={day.date === today ? "date" : undefined}
                      tabIndex={day.date === (activeDate < activity.start ? today : activeDate) ? 0 : -1}
                      onFocus={() => { setActiveDate(day.date); setInspected(null); }}
                      onMouseEnter={() => setInspected(day.date)}
                      onClick={() => setActiveDate(day.date)}
                      onKeyDown={(event) => move(event, day.date)}
                      style={{ width: cellSize, height: cellSize }}
                      className={`activity-cell rounded-[2px] text-[10px] font-medium focus-visible:z-10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${day.level >= 3 ? "text-white dark:text-background" : "text-foreground"}`}
                    >
                      {range !== "year" && <span aria-hidden="true">{Number(day.date.slice(-2))}</span>}
                    </Tooltip.Trigger>
                    <Tooltip.Portal>
                      <Tooltip.Positioner side="top" sideOffset={8} className="z-[70]">
                        <Tooltip.Popup className="max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-popover px-3 py-2 text-xs text-popover-foreground shadow-lg">
                          <p className="font-medium">{day.count} {day.count === 1 ? "problem" : "problems"} solved</p>
                          <p className="mt-0.5 text-muted-foreground">{formatDate(day.date)}</p>
                        </Tooltip.Popup>
                      </Tooltip.Positioner>
                    </Tooltip.Portal>
                    </Tooltip.Root>
                  ) : range === "year" ? <span key={weekday} aria-hidden="true" style={{ width: cellSize, height: cellSize }} /> : null)}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      </Tooltip.Provider>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-[11px] text-muted-foreground">
        <p aria-live="polite" aria-atomic="true" className="min-h-4">{selected ? `${formatDate(selected.date, { month: "short", day: "numeric", year: "numeric" })} · ${selected.count} ${selected.count === 1 ? "problem" : "problems"} solved` : "Focus or tap a day to see its activity."}</p>
        <div className="flex items-center gap-1.5" aria-label="Activity intensity: no problems, 1, 2 to 3, 4 to 5, 6 or more">
          <span>Less</span>
          {levelNames.map((name, level) => <span key={level} data-level={level} className="activity-cell size-2.5 rounded-[2px]" title={name} aria-hidden="true" />)}
          <span>More</span>
        </div>
      </div>
      {activity.total === 0 && <p className="mt-2 text-xs text-muted-foreground">Complete a problem to light up your activity calendar.</p>}
      <p className="mt-2 text-[10px] text-muted-foreground">{formatDate(activity.start, { month: "short", day: "numeric", year: "numeric" })} – {formatDate(today, { month: "short", day: "numeric", year: "numeric" })}{range === "year" ? " · Scroll horizontally to explore." : ""}</p>
    </Panel>
  );
}
