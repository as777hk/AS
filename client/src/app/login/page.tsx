import { Suspense } from "react";
import LoginClient from "./login-client";
export default function LoginPage() {
  return <Suspense fallback={<main className="container section"><div className="skeleton-hero"/><div className="skeleton-line"/></main>}><LoginClient /></Suspense>;
}
