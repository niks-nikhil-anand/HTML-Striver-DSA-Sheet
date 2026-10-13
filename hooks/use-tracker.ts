"use client";

import { useContext } from "react";
import { TrackerContext, type TrackerValue } from "@/providers/tracker-provider";

export function useTracker(): TrackerValue {
  const v = useContext(TrackerContext);
  if (!v) throw new Error("useTracker must be used inside <TrackerProvider>");
  return v;
}
