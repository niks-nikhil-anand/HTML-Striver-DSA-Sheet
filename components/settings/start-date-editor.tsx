"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { isIsoDate } from "@/lib/dates";

export function StartDateEditor({ current, onSave }: { current: string; onSave: (iso: string) => void }) {
  const [draft, setDraft] = useState(current);
  return (
    <div className="mt-1 flex gap-2">
      <Input id="start" type="date" value={draft} onChange={(e) => setDraft(e.target.value)} className="h-9" />
      <Button size="sm" className="h-9" disabled={!isIsoDate(draft) || draft === current} onClick={() => onSave(draft)}>
        Save
      </Button>
    </div>
  );
}
