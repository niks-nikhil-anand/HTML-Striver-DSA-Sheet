"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useTracker } from "@/hooks/use-tracker";

/** Offered once: this device has progress, the account is empty. Merge, never overwrite. */
export function ClaimLocalDialog() {
  const { claimOffer, claimLocal, dismissClaim } = useTracker();
  const [busy, setBusy] = useState(false);
  const done = claimOffer ? Object.keys(claimOffer.completed).length : 0;
  const notes = claimOffer ? Object.keys(claimOffer.notes).length : 0;

  return (
    <Dialog open={!!claimOffer} onOpenChange={(open) => !open && !busy && dismissClaim()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Move this device&apos;s progress to your account?</DialogTitle>
          <DialogDescription>
            This browser has {done} solved problem{done === 1 ? "" : "s"} and {notes} note{notes === 1 ? "" : "s"}, and your account is empty. Moving them keeps everything and syncs it across your devices.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" disabled={busy} onClick={dismissClaim}>Not now</Button>
          <Button
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await claimLocal();
                toast.success("Progress moved to your account");
              } catch (e) {
                toast.error("Couldn't move your progress", { description: e instanceof Error ? e.message : undefined });
              } finally {
                setBusy(false);
              }
            }}
          >
            {busy ? "Moving…" : "Move it"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
