import raw from "@/data/problems.json";
import type { Problem } from "./types";

/** Official Striver A2Z practice problems, in sheet order (see README for provenance). */
export const PROBLEMS = raw as Problem[];
export const PROBLEM_IDS: ReadonlySet<string> = new Set(PROBLEMS.map((p) => p.id));
export const TOPICS: string[] = [...new Set(PROBLEMS.map((p) => p.topic))];

export function isSafeUrl(url: string | undefined): url is string {
  if (!url) return false;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:";
  } catch {
    return false;
  }
}

/** 1-based position of each problem in the official sheet order, e.g. tuf-401 → 1. */
export const PROBLEM_NUMBER: ReadonlyMap<string, number> = new Map(PROBLEMS.map((p, i) => [p.id, i + 1]));
