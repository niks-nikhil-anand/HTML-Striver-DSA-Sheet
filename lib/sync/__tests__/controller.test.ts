import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultProgress } from "@/lib/progress";
import type { SnapshotDTO } from "@/lib/api-types";
import { PROBLEMS } from "@/lib/problems";
import { api, ApiClientError } from "../api-client";
import { SyncController } from "../controller";

vi.mock("../api-client", async (original) => {
  const actual = await original<typeof import("../api-client")>();
  return { ...actual, api: { getSnapshot: vi.fn(), putProgress: vi.fn(), putPlan: vi.fn(), patchPreferences: vi.fn(), importData: vi.fn(), resetAll: vi.fn(), exportText: vi.fn() } };
});
const snapshot = (): SnapshotDTO => ({ ...defaultProgress(), rowUpdatedAt: {} });
function setup() {
  let progress = defaultProgress();
  const ev = {
    apply: vi.fn((p) => { progress = p; }),
    onAchievements: vi.fn(),
    onMode: vi.fn(), onStatus: vi.fn(), notify: vi.fn(),
  };
  const controller = new SyncController(ev);
  return { controller, ev, get: () => progress };
}

describe("API persistence", () => {
  beforeEach(() => { vi.useFakeTimers(); vi.mocked(api.getSnapshot).mockResolvedValue(snapshot()); vi.mocked(api.putProgress).mockResolvedValue({ updatedAt: "2026-10-15T00:00:00Z" } as never); });
  afterEach(() => { vi.useRealTimers(); vi.resetAllMocks(); });

  it("blocks writes until a valid server snapshot has loaded", async () => {
    const { controller } = setup();
    const next = defaultProgress(); next.notes[PROBLEMS[0].id] = "draft";
    controller.track(defaultProgress(), next);
    await vi.advanceTimersByTimeAsync(1000);
    expect(api.putProgress).not.toHaveBeenCalled();
    await controller.start();
    controller.track(defaultProgress(), next);
    await vi.advanceTimersByTimeAsync(500);
    expect(api.putProgress).toHaveBeenCalledWith(PROBLEMS[0].id, expect.objectContaining({ note: "draft" }));
    controller.destroy();
  });

  it("propagates load failures and never enters guest mode", async () => {
    vi.mocked(api.getSnapshot).mockRejectedValue(new ApiClientError("UNAUTHENTICATED", 401, "Sign in required"));
    const { controller, ev } = setup();
    await expect(controller.start()).rejects.toThrow("Sign in required");
    expect(controller.mode).toBe("unauthenticated");
    expect(ev.apply).not.toHaveBeenCalled();
    controller.destroy();
  });

  it("saves theme and sidebar through the preferences API", async () => {
    const { controller } = setup(); await controller.start();
    const next = defaultProgress(); next.prefs.ui = { theme: "dark", sidebarCollapsed: true };
    controller.track(defaultProgress(), next);
    await vi.advanceTimersByTimeAsync(1000);
    expect(api.patchPreferences).toHaveBeenCalledWith(expect.objectContaining({ ui: next.prefs.ui }));
    controller.destroy();
  });

  it("keeps rejected drafts and retries them with subsequent edits", async () => {
    const { controller } = setup(); await controller.start();
    vi.mocked(api.putProgress).mockRejectedValueOnce(new ApiClientError("VALIDATION", 400, "Rejected"));
    const next = defaultProgress();
    next.completed[PROBLEMS[0].id] = { date: "2026-10-15", at: 1 };
    next.notes[PROBLEMS[0].id] = "draft";
    controller.track(defaultProgress(), next);
    await vi.advanceTimersByTimeAsync(0);
    expect(controller.hasPending()).toBe(true);
    await expect(controller.reset()).rejects.toThrow("Retry saving");
    const edited = { ...next, notes: { [PROBLEMS[0].id]: "fixed draft" } };
    controller.track(next, edited);
    await vi.advanceTimersByTimeAsync(0);
    expect(api.putProgress).toHaveBeenLastCalledWith(PROBLEMS[0].id, expect.objectContaining({ completed: true, note: "fixed draft" }));
    expect(controller.hasPending()).toBe(false);
    controller.destroy();
  });


  it("sends a complete exit snapshot even while the normal preference queue is busy", async () => {
    const { controller } = setup(); await controller.start();
    vi.mocked(api.patchPreferences).mockImplementationOnce(() => new Promise(() => {})).mockResolvedValue(undefined);
    const before = defaultProgress();
    const changed = defaultProgress(); changed.prefs.ui!.problemPage = 3;
    controller.track(before, changed);
    await vi.advanceTimersByTimeAsync(0);
    const final = { ...changed, prefs: { ...changed.prefs, ui: { ...changed.prefs.ui!, problemLayout: "grid" as const, problemScrollY: 867 } } };
    controller.track(changed, final);
    controller.flushOnExit(final);
    expect(api.patchPreferences).toHaveBeenCalledTimes(2);
    expect(api.patchPreferences).toHaveBeenLastCalledWith({ filters: final.prefs.filters, ui: final.prefs.ui, celebratedMilestones: final.prefs.celebratedMilestones });
    controller.flushOnExit(final);
    expect(api.patchPreferences).toHaveBeenCalledTimes(2);
    controller.destroy();
  });

  it("waits for an in-flight save before resetting and reloading", async () => {
    const { controller } = setup(); await controller.start();
    let finish!: (value: never) => void;
    vi.mocked(api.putProgress).mockImplementation(() => new Promise((resolve) => { finish = resolve; }));
    const next = defaultProgress(); next.notes[PROBLEMS[0].id] = "draft";
    controller.track(defaultProgress(), next);
    await vi.advanceTimersByTimeAsync(500);
    const reset = controller.reset();
    expect(api.resetAll).not.toHaveBeenCalled();
    finish({ updatedAt: "2026-10-15T00:00:00Z" } as never);
    await vi.advanceTimersByTimeAsync(25);
    await reset;
    expect(api.resetAll).toHaveBeenCalledOnce();
    expect(api.getSnapshot).toHaveBeenCalledTimes(2);
    controller.destroy();
  });

  it("publishes a newly committed award once and restores it silently in a fresh controller", async () => {
    const before = snapshot();
    before.completed = Object.fromEntries(PROBLEMS.slice(0, 24).map((p) => [p.id, { date: "2026-10-15", at: 1 }]));
    vi.mocked(api.getSnapshot).mockResolvedValue(before);
    const earned = [{ tag: "DSA-025", unlockedAt: "2026-10-15T12:00:00Z" }];
    const saved = { updatedAt: "2026-10-15T12:00:00Z", achievements: earned, newAchievements: earned };
    vi.mocked(api.putProgress).mockResolvedValueOnce(saved as never);
    const first = setup();
    await first.controller.start();
    const after = { ...before, completed: { ...before.completed, [PROBLEMS[24].id]: { date: "2026-10-15", at: 2 } } };
    first.controller.track(before, after);
    await vi.advanceTimersByTimeAsync(0);
    expect(first.ev.onAchievements).toHaveBeenLastCalledWith(earned, earned);
    expect(first.controller.hasPending()).toBe(false);
    first.controller.destroy();

    vi.mocked(api.getSnapshot).mockResolvedValue({ ...after, achievements: earned });
    const reopened = setup();
    await reopened.controller.start();
    expect(reopened.get().completed[PROBLEMS[24].id]).toBeDefined();
    expect(reopened.ev.onAchievements).toHaveBeenCalledExactlyOnceWith(earned, []);
    await reopened.controller.refresh();
    expect(reopened.ev.onAchievements.mock.calls.every(([, newly]) => newly.length === 0)).toBe(true);
    reopened.controller.destroy();
  });

  it("ignores an award response after its page has closed", async () => {
    let finish!: (value: never) => void;
    vi.mocked(api.putProgress).mockImplementationOnce(() => new Promise((resolve) => { finish = resolve; }));
    const { controller, ev } = setup();
    await controller.start();
    ev.onAchievements.mockClear();
    const next = defaultProgress();
    next.completed[PROBLEMS[0].id] = { date: "2026-10-15", at: 1 };
    controller.track(defaultProgress(), next);
    await vi.advanceTimersByTimeAsync(0);
    controller.destroy();
    const earned = [{ tag: "DSA-025", unlockedAt: "2026-10-15T12:00:00Z" }];
    finish({ updatedAt: "2026-10-15T12:00:00Z", achievements: earned, newAchievements: earned } as never);
    await vi.advanceTimersByTimeAsync(0);
    expect(ev.onAchievements).not.toHaveBeenCalled();
  });

});
