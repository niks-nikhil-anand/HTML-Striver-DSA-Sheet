"use client";

import { Button } from "@/components/ui/button";

export default function Error({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center px-4 text-center">
      <div className="grid gap-3">
        <h1 className="text-2xl font-semibold">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">Your saved progress is untouched.</p>
        <Button className="justify-self-center" onClick={reset}>Try again</Button>
      </div>
    </main>
  );
}
