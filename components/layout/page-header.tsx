export function PageHeader({ title, srOnly = false }: { title: string; srOnly?: boolean }) {
  return (
    <div className={srOnly ? "sr-only" : "mb-5"}>
      <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{title}</h1>
    </div>
  );
}
