import { Suspense } from "react";
import BuilderClient from "./BuilderClient";

export const dynamic = "force-dynamic";

export default function Page() {
  return (
    <Suspense fallback={<div>Loading builder...</div>}>
      <BuilderClient />
    </Suspense>
  );
}