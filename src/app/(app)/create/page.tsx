import { Suspense } from "react";
import CreateClient from "./create-client";

export default function CreatePage() {
  return (
    <Suspense
      fallback={
        <div className="p-8 text-sm text-[var(--pf-muted)]">Loading studio…</div>
      }
    >
      <CreateClient />
    </Suspense>
  );
}
