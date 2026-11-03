import { Suspense } from "react";
import StudiosClient from "./studios-client";
export default function StudiosPage() {
  return <Suspense fallback={<main className="container section"><div className="skeleton-hero"/><div className="skeleton-line"/></main>}><StudiosClient /></Suspense>;
}
