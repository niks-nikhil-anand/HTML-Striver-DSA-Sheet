export function MilestonesLoading() {
  return <div role="status" aria-label="Loading milestones" className="grid gap-5 motion-safe:animate-pulse">
    <div className="h-36 rounded-2xl bg-muted" />
    <div className="h-20 rounded-xl bg-muted" />
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{Array.from({ length: 6 }, (_, i) => <div key={i} className="h-52 rounded-xl bg-muted" />)}</div>
    <span className="sr-only">Loading milestones…</span>
  </div>;
}
