import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-screen place-items-center px-4 text-center">
      <div className="grid gap-3">
        <p className="text-sm text-muted-foreground">404</p>
        <h1 className="text-2xl font-semibold">That page doesn&apos;t exist</h1>
        <Link href="/" className={buttonVariants({ className: "justify-self-center" })}>Back to dashboard</Link>
      </div>
    </main>
  );
}
